// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { Fragment, jsx } from 'hono/jsx';
import { Layout } from './layout';

type FieldType = 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'hidden';

interface FormField {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  value?: string | number | boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  readonly?: boolean;
  attrs?: Record<string, string>;
}

interface TableViewProps {
  title: string;
  columns: string[];
  rows: Record<string, unknown>[];
  createUrl?: string;
  extraActions?: { label: string; url: string }[];
  detailUrlPrefix?: string;
  deleteUrlPrefix?: string;
  rawIds?: string[];
  inlineStatusColumns?: string[];
}

const BADGE_STATUSES = new Set([
  'created',
  'assigned',
  'enroute',
  'in_progress',
  'complete',
  'cancelled',
  'pending',
  'sent',
  'paid',
  'void',
  'active',
  'inactive',
  'manager',
  'provider',
  'zip',
  'radius',
  'geofence',
  'weekly',
  'biweekly',
  'monthly',
  'new',
  'read',
  'replied',
  'archived',
  'contact',
  'newsletter',
  'registration',
]);

const isBadgeStatus = (value: unknown): value is string => typeof value === 'string' && BADGE_STATUSES.has(value.toLowerCase());

const isEmptyValue = (value: unknown) => value === null || value === undefined || value === '' || value === '-';

const mobilePriorityScore = (label: string) => {
  const l = label.toLowerCase();
  if (/(amount|price|total|value)/.test(l)) return 100;
  if (/(status|active|state)/.test(l)) return 95;
  if (/(date|time|booked|created|due)/.test(l)) return 90;
  if (/(service|frequency|duration|territory|area|type|role)/.test(l)) return 80;
  if (/(phone|email|from|subject|event)/.test(l)) return 70;
  return 40;
};

const stringifyValue = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return '';
};

const inferFormHints = (field: FormField): Record<string, string> => {
  const hints: Record<string, string> = {};
  const n = field.name.toLowerCase();
  const t = (field.type || 'text').toLowerCase();

  if (n === 'first_name') hints.autocomplete = 'given-name';
  if (n === 'last_name') hints.autocomplete = 'family-name';

  if (t === 'email' || n.includes('email')) {
    hints.autocomplete = hints.autocomplete || 'email';
    hints.inputmode = 'email';
    hints.autocapitalize = 'off';
    hints.spellcheck = 'false';
  }

  if (t === 'tel' || n.includes('phone') || n.includes('mobile')) {
    hints.autocomplete = hints.autocomplete || 'tel';
    hints.inputmode = 'tel';
    hints.autocapitalize = 'off';
    hints.spellcheck = 'false';
  }

  if (n.includes('postal')) {
    hints.autocomplete = 'postal-code';
    hints.autocapitalize = 'characters';
  }

  if (n === 'address_line_1') hints.autocomplete = 'address-line1';
  if (n === 'address_line_2') hints.autocomplete = 'address-line2';
  if (n === 'address_city') hints.autocomplete = 'address-level2';
  if (n === 'address_state') hints.autocomplete = 'address-level1';
  if (n.includes('country')) hints.autocomplete = 'country-name';

  if (t === 'number') {
    const isDecimal = field.step !== undefined && Number(field.step) !== 1;
    hints.inputmode = isDecimal ? 'decimal' : 'numeric';
  }

  if (n.includes('search') || n === 'q') {
    hints.autocomplete = 'off';
    hints.inputmode = 'search';
  }

  return hints;
};

interface FormViewProps {
  title: string;
  fields: FormField[];
  submitUrl: string;
  cancelUrl: string;
  isEdit?: boolean;
  deleteUrl?: string;
  error?: string;
}

const TableView = ({ title, columns, rows, createUrl, extraActions, detailUrlPrefix, deleteUrlPrefix, rawIds, inlineStatusColumns }: TableViewProps) => {
  const inlineSet = new Set(
    (inlineStatusColumns || []).map((col) => columns.indexOf(col)).filter((i) => i >= 0)
  );
  const visibleColumns = columns.filter((_, i) => !inlineSet.has(i));

  return (
  <Layout title={title}>
    <div class="page-header">
      <h2>{title}</h2>
      <div class="page-header-actions">
        {(extraActions || []).map((action) => (
          <a href={action.url} class="uk-btn uk-btn-default uk-btn-sm" hx-get={action.url} hx-target="#page-content" hx-select="#page-content" hx-push-url="true" key={action.url}>
            {action.label}
          </a>
        ))}
        {createUrl && <a href={createUrl} class="uk-btn uk-btn-default uk-btn-sm" hx-get={createUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">+ Create New</a>}
      </div>
    </div>
    <div class="p-8">
      <div class="uk-card uk-card-body">
        <section>
          {rows.length === 0 ? (
            <div class="text-center py-12 text-muted-foreground">
              <p class="mb-4 text-sm">No {title.toLowerCase()} found.</p>
              {createUrl && <a href={createUrl} class="uk-btn uk-btn-default" hx-get={createUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Create your first</a>}
            </div>
          ) : (
            <>
               <div class="grid gap-3 md:hidden">
                 {rows.map((row: Record<string, unknown>, i: number) => {
                   const displayId = typeof row.id === 'string' ? row.id : '';
                   const actualId = rawIds ? rawIds[i] : displayId;
                   const values = Object.values(row);
                   const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
                  const entries = values.map((value, index) => ({
                    index,
                    label: columns[index] || 'Field',
                    value,
                  }));
                  const primary = entries[0];
                  const statusEntry = entries.find((entry, index) => index > 0 && isBadgeStatus(entry.value));
                  const compactMeta = entries
                    .filter((entry) => entry.index !== 0 && entry !== statusEntry && !isEmptyValue(entry.value))
                    .sort((a, b) => mobilePriorityScore(b.label) - mobilePriorityScore(a.label))
                    .slice(0, 2);
                   return (
                     <article
                       class="border border-border rounded-lg p-3"
                       style="background:var(--bg-card);"
                       key={i}
                     >
                       <div class="flex items-start justify-between gap-3">
                         <div class="min-w-0 flex-1">
                           {detailUrl ? (
                             <a
                               href={detailUrl}
                               hx-get={detailUrl}
                               hx-target="#page-content"
                               hx-select="#page-content"
                               hx-push-url="true"
                               class="uk-link font-semibold leading-snug block truncate"
                               style="color:var(--text);"
                               data-uk-tooltip={typeof primary?.value === 'string' && primary.value.length === 8 ? `title: ${actualId}` : undefined}
                             >
                               {primary?.value}
                             </a>
                           ) : (
                             <p class="font-semibold leading-snug truncate">{primary?.value as string | number | boolean | null | undefined}</p>
                           )}
                         </div>
                         {statusEntry && (
                           <span class="shrink-0" style="margin-top:1px;">
                             <StatusIcon status={String(statusEntry.value).toLowerCase()} />
                           </span>
                         )}
                       </div>

                       {compactMeta.length > 0 && (
                         <div class="grid grid-cols-2 gap-2 mt-2">
                           {compactMeta.map((entry) => (
                             <div class="min-w-0" key={entry.index}>
                               <p class="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{entry.label}</p>
                               <p class="text-xs font-medium truncate">{stringifyValue(entry.value) || '-'}</p>
                             </div>
                           ))}
                         </div>
                       )}

                      {!statusEntry && isBadgeStatus(primary?.value) && (
                        <div class="mt-2">
                          <StatusIcon status={String(primary.value).toLowerCase()} />
                        </div>
                      )}

                      {compactMeta.length === 0 && entries[1] && !isEmptyValue(entries[1].value) && (
                        <p class="text-xs text-muted-foreground mt-2 truncate">{entries[1].label}: {stringifyValue(entries[1].value)}</p>
                      )}

                       <div class="flex items-center justify-between gap-2 mt-3">
                         {detailUrl && (
                           <a
                             href={detailUrl}
                             class="uk-btn uk-btn-default uk-btn-sm"
                             hx-get={detailUrl}
                             hx-target="#page-content"
                             hx-select="#page-content"
                             hx-push-url="true"
                           >
                             View
                           </a>
                         )}
                         {deleteUrlPrefix && (
                           <button
                             type="button"
                             class="delete-btn"
                             data-confirm="arm"
                             hx-post={`${deleteUrlPrefix}/${actualId}/delete`}
                             hx-target="closest article"
                             hx-swap="delete swap:300ms"
                           >
                             Delete
                           </button>
                         )}
                       </div>
                     </article>
                   );
                 })}
               </div>
              <div class="uk-overflow-auto hidden md:block">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  {visibleColumns.map((col: string) => <th class="text-left py-3 px-4 font-medium text-muted-foreground" key={col}>{col}</th>)}
                  <th class="text-left py-3 px-4 font-medium text-muted-foreground" style="width: 100px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: Record<string, unknown>, i: number) => {
                  const displayId = typeof row.id === 'string' ? row.id : '';
                  const actualId = rawIds ? rawIds[i] : displayId;
                  const values = Object.values(row);
                  const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
                  const inlineIcons = [...inlineSet]
                    .map((si) => values[si])
                    .filter((v) => isBadgeStatus(v))
                    .map((v) => <StatusIcon status={String(v).toLowerCase()} />);
                  return (
                    <tr class="border-b border-border hover:bg-muted/50 transition-colors" key={i} style={detailUrl ? 'cursor: pointer;' : ''}>
                      {values.map((val, j: number) => {
                        if (inlineSet.has(j)) return null;
                        if (j === 0) {
                          return (
                            <td class="py-3 px-4" key={j}>
                              {detailUrl ? (
                                <a
                                  href={detailUrl}
                                  hx-get={detailUrl}
                                  hx-target="#page-content"
                                  hx-select="#page-content"
                                  hx-push-url="true"
                                  class="uk-link font-medium text-primary hover:underline"
                                  style="display:inline-flex;align-items:center;gap:6px;"
                                  data-uk-tooltip={typeof val === 'string' && val.length === 8 ? `title: ${actualId}` : undefined}
                                >
                                  {inlineIcons}
                                  {val}
                                </a>
                              ) : (
                                <span style="display:inline-flex;align-items:center;gap:6px;">
                                  {inlineIcons}
                                  {val as string | number | boolean | null | undefined}
                                </span>
                              )}
                            </td>
                          );
                        }
                        return (
                          <td class="py-3 px-4" key={j}>
                            {isBadgeStatus(val) ? <StatusBadge status={val.toLowerCase()} /> : (val as string | number | boolean | null | undefined)}
                          </td>
                        );
                      })}
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-2">
                          {detailUrl && (
                             <a href={detailUrl} class="uk-btn uk-btn-default uk-btn-sm" hx-get={detailUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">View</a>
                           )}
                          {deleteUrlPrefix && (
                            <button
                              type="button"
                              class="delete-btn"
                              data-confirm="arm"
                              hx-post={`${deleteUrlPrefix}/${actualId}/delete`}
                              hx-target="closest tr"
                              hx-swap="delete swap:300ms"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  </Layout>
  );
};

const renderField = (field: FormField) => {
  if (field.readonly) {
    return (
      <p class="text-sm py-2 px-3 bg-muted/50 rounded-md">{String(field.value || '-')}</p>
    );
  }

  const baseProps = {
    id: field.name,
    name: field.name,
    required: field.required,
    placeholder: field.placeholder,
    ...inferFormHints(field),
    ...(field.attrs || {}),
  };

  switch (field.type) {
    case 'textarea':
       return (
         <textarea {...baseProps} rows={4} class="uk-textarea">
           {field.value || ''}
         </textarea>
       );

     case 'select':
       return (
         <select {...baseProps} class="uk-select">
           <option value="">Select...</option>
          {(field.options || []).map(opt => (
            <option key={opt.value} value={opt.value} selected={field.value === opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'checkbox':
      return (
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id={field.name}
            name={field.name}
            checked={Boolean(field.value)}
            class="uk-checkbox"
          />
          <label for={field.name} class="text-sm">{field.label}</label>
        </div>
      );

     case 'number':
       return (
         <input 
           type="number" 
           {...baseProps}
           value={field.value ?? ''}
           min={field.min}
           max={field.max}
           step={field.step || 1}
           class="uk-input"
         />
       );

     case 'hidden':
       return <input type="hidden" {...baseProps} value={field.value ?? ''} />;

      default:
       return (
         <input 
           type={field.type || 'text'} 
           {...baseProps}
           value={field.value ?? ''}
           class="uk-input"
         />
       );
  }
};

const FormView = ({ title, fields, submitUrl, cancelUrl, isEdit, deleteUrl, error }: FormViewProps) => (
  <Layout title={title}>
    <div class="page-header">
      <h2>{title}</h2>
    </div>
    <div class="p-8">
       <div class="uk-card uk-card-body" style="max-width: 720px;">
        <section>
          <form class="form" hx-post={submitUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url={cancelUrl}>
            {error && (
              <div class="mb-4 rounded-md border px-3 py-2 text-sm" style="border-color: #fecaca; background: #fff1f2; color: #b91c1c;">
                {error}
              </div>
            )}
            <div class="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                if (field.type === 'hidden') {
                  return <div key={field.name}>{renderField(field)}</div>;
                }
                if (field.type === 'checkbox') {
                  const isChecked = Boolean(field.value);
                  return (
                    <label class="uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2" key={field.name}>
                       <input type="checkbox" name={field.name} checked={isChecked} role="switch" aria-checked={isChecked ? 'true' : 'false'} class="uk-toggle-switch uk-toggle-switch-primary" />
                       {field.label}
                     </label>
                  );
                }
                const wide = field.type === 'textarea' || field.type === 'select';
                return (
                  <div class={`grid gap-2${wide ? ' sm:col-span-2' : ''}`} key={field.name}>
                    <label for={field.name} class="uk-form-label">{field.label}{field.required && ' *'}</label>
                    {renderField(field)}
                    {field.name === 'address_line_1' && (
                      <div id="address-results" class="mt-2" style="position: relative;"></div>
                    )}
                  </div>
                );
              })}
            </div>
            <div class="flex items-center gap-3 mt-6 sm:col-span-2">
               <button type="submit" class="uk-btn uk-btn-primary">{isEdit ? 'Update' : 'Create'}</button>
               <a href={cancelUrl} class="uk-btn uk-btn-default" hx-get={cancelUrl} hx-target="#page-content" hx-push-url="true">Cancel</a>
              {deleteUrl && (
                <button type="button" class="delete-btn" data-confirm="arm" hx-post={deleteUrl} style="margin-left: auto;">Delete</button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  </Layout>
);

interface DetailViewProps {
  title: string;
  subtitle?: string;
  fields: { label: string; value: unknown }[];
  editUrl?: string;
  backUrl: string;
  actions?: { label: string; url: string; method?: string; variant?: 'primary' | 'secondary' | 'danger' }[];
}

const DetailView = ({ title, subtitle, fields, editUrl, backUrl, actions }: DetailViewProps) => (
  <Layout title={title}>
    <div class="page-header">
      <div class="page-header-info">
        <h2>{title}</h2>
        {subtitle && <p class="text-sm text-muted-foreground" style="margin:2px 0 0;">{subtitle}</p>}
      </div>
      <div class="page-header-actions">
        {editUrl && (
          <a href={editUrl} class="uk-btn uk-btn-primary uk-btn-sm" hx-get={editUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">
            Edit
          </a>
        )}
        <a href={backUrl} class="uk-btn uk-btn-default uk-btn-sm" hx-get={backUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">
          Back
        </a>
      </div>
    </div>
    <div class="p-4 md:p-8">
      <div class="uk-card uk-card-body" style="max-width: 800px;">
        <div class="grid gap-3">
          {fields.map(f => (
            <div class="flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5" style="background:var(--surface-elevated, var(--input-bg));" key={f.label}>
              <span class="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</span>
              <p class="text-sm font-medium text-right">{f.value || '-'}</p>
            </div>
          ))}
        </div>
      </div>
      {actions && actions.length > 0 && (
        <div class="uk-card uk-card-body danger-card" style="max-width: 800px; margin-top: 24px;">
          <h3 class="text-sm font-semibold text-muted-foreground mb-3">Actions</h3>
          <div class="flex flex-wrap gap-2">
            {actions.map(action => {
              const variantClass = action.variant === 'primary' ? 'uk-btn-primary' : action.variant === 'danger' ? 'delete-btn' : 'uk-btn-default';
              const isDelete = action.variant === 'danger';
              return (
                <button
                  type="button"
                  class={isDelete ? 'delete-btn' : `uk-btn ${variantClass} uk-btn-sm`}
                  hx-post={action.url}
                  hx-target="#page-content"
                  data-confirm={isDelete ? 'arm' : undefined}
                  key={action.label}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </Layout>
);

const STATUS_ICON_MAP: Record<string, { cls: string; label: string }> = {
  created:     { cls: 'status-icon--neutral',     label: 'Created' },
  assigned:    { cls: 'status-icon--neutral',     label: 'Assigned' },
  enroute:     { cls: 'status-icon--secondary',   label: 'En route' },
  in_progress: { cls: 'status-icon--secondary',   label: 'In progress' },
  complete:    { cls: 'status-icon--primary',     label: 'Complete' },
  cancelled:   { cls: 'status-icon--destructive', label: 'Cancelled' },
  pending:     { cls: 'status-icon--secondary',   label: 'Pending' },
  sent:        { cls: 'status-icon--neutral',     label: 'Sent' },
  paid:        { cls: 'status-icon--primary',     label: 'Paid' },
  void:        { cls: 'status-icon--destructive', label: 'Void' },
  new:         { cls: 'status-icon--destructive', label: 'New' },
  read:        { cls: 'status-icon--secondary',   label: 'Read' },
  replied:     { cls: 'status-icon--primary',     label: 'Replied' },
  archived:    { cls: 'status-icon--neutral',     label: 'Archived' },
  active:      { cls: 'status-icon--primary',     label: 'Active' },
  inactive:    { cls: 'status-icon--secondary',   label: 'Inactive' },
};

const svgProps = { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };

const StatusIconSvg = ({ status }: { status: string }) => {
  switch (status) {
    case 'created':
      return <svg {...svgProps}><circle cx="12" cy="12" r="9" /></svg>;
    case 'assigned':
      return <svg {...svgProps}><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" /><path d="m16 11 2 2 4-4" /></svg>;
    case 'enroute':
      return <svg {...svgProps}><path d="M5 12h14m-7-7 7 7-7 7" /></svg>;
    case 'in_progress':
      return <svg {...svgProps}><polygon points="6 3 20 12 6 21 6 3" /></svg>;
    case 'complete':
    case 'paid':
      return <svg {...svgProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" /></svg>;
    case 'cancelled':
      return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6m0-6 6 6" /></svg>;
    case 'pending':
      return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case 'sent':
      return <svg {...svgProps}><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>;
    case 'void':
      return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 14.14 14.14" /></svg>;
    case 'new':
      return <svg {...svgProps} fill="currentColor" stroke="none"><circle cx="12" cy="12" r="5" /></svg>;
    case 'read':
      return <svg {...svgProps}><path d="M20 6 9 17l-5-5" /></svg>;
    case 'replied':
      return <svg {...svgProps}><path d="m9 17-5-5 5-5" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>;
    case 'archived':
      return <svg {...svgProps}><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>;
    case 'active':
      return <svg {...svgProps}><path d="M20 6 9 17l-5-5" /></svg>;
    case 'inactive':
      return <svg {...svgProps}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    default:
      return <svg {...svgProps}><circle cx="12" cy="12" r="9" /></svg>;
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  const s = status.toLowerCase();
  const info = STATUS_ICON_MAP[s] || { cls: 'status-icon--neutral', label: s.replace('_', ' ') };
  return (
    <span class={`status-icon ${info.cls}`} title={info.label} aria-label={info.label}>
      <StatusIconSvg status={s} />
    </span>
  );
};

const BADGE_CLASS_MAP: Record<string, string> = {
  created: 'uk-label',
  assigned: 'uk-label',
  enroute: 'uk-label uk-label-secondary',
  in_progress: 'uk-label uk-label-secondary',
  complete: 'uk-label uk-label-primary',
  cancelled: 'uk-label uk-label-destructive',
  pending: 'uk-label uk-label-secondary',
  sent: 'uk-label',
  paid: 'uk-label uk-label-primary',
  void: 'uk-label uk-label-destructive',
  active: 'uk-label uk-label-primary',
  inactive: 'uk-label uk-label-secondary',
  manager: 'uk-label',
  provider: 'uk-label uk-label-secondary',
  zip: 'uk-label',
  radius: 'uk-label uk-label-secondary',
  geofence: 'uk-label uk-label-secondary',
  weekly: 'uk-label',
  biweekly: 'uk-label uk-label-secondary',
  monthly: 'uk-label uk-label-primary',
  new: 'uk-label uk-label-destructive',
  read: 'uk-label uk-label-secondary',
  replied: 'uk-label uk-label-primary',
  archived: 'uk-label',
  contact: 'uk-label uk-label-primary',
  newsletter: 'uk-label uk-label-secondary',
  registration: 'uk-label',
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toLowerCase();
  const hasIcon = s in STATUS_ICON_MAP;
  const label = s.replace('_', ' ');
  return (
    <span class={BADGE_CLASS_MAP[s] || 'uk-label'}>
      {hasIcon && <StatusIconSvg status={s} />}
      <span class="badge-label">{label}</span>
    </span>
  );
};

export { TableView, FormView, DetailView, StatusBadge, StatusIcon };
export type { FormField, TableViewProps, FormViewProps, DetailViewProps };
