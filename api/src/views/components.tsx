import { jsx } from 'hono/jsx';
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

const TableView = ({ title, columns, rows, createUrl, extraActions, detailUrlPrefix, deleteUrlPrefix, rawIds }: TableViewProps) => (
  <Layout title={title}>
    <div class="flex items-center justify-between px-4 pl-14 py-4 md:px-8 md:pl-8 md:py-5 bg-white border-b border-border sticky top-0 z-50">
      <h2 class="text-xl font-semibold">{title}</h2>
      <div class="flex items-center gap-2">
        {(extraActions || []).map((action) => (
          <a href={action.url} class="uk-btn uk-btn-default" hx-get={action.url} hx-target="#page-content" hx-select="#page-content" hx-push-url="true" key={action.url}>
            {action.label}
          </a>
        ))}
        {createUrl && <a href={createUrl} class="uk-btn uk-btn-default" hx-get={createUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">+ Create New</a>}
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
                    <article class="border border-border rounded-md p-3 bg-background" key={i}>
                      <div class="flex items-start justify-between gap-2.5">
                        <div class="min-w-0 flex-1">
                          {detailUrl ? (
                            <a
                              href={detailUrl}
                              hx-get={detailUrl}
                              hx-target="#page-content"
                              hx-select="#page-content"
                              hx-push-url="true"
                              class="uk-link font-medium text-primary hover:underline leading-tight block truncate"
                              data-uk-tooltip={typeof primary?.value === 'string' && primary.value.length === 8 ? `title: ${actualId}` : undefined}
                            >
                              {primary?.value}
                            </a>
                          ) : (
                            <p class="font-medium leading-tight truncate">{primary?.value as string | number | boolean | null | undefined}</p>
                          )}
                        </div>
                        {statusEntry && <span class="shrink-0"><StatusBadge status={String(statusEntry.value).toLowerCase()} /></span>}
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
                          <StatusBadge status={String(primary.value).toLowerCase()} />
                        </div>
                      )}

                      {compactMeta.length === 0 && entries[1] && !isEmptyValue(entries[1].value) && (
                        <p class="text-xs text-muted-foreground mt-2 truncate">{entries[1].label}: {stringifyValue(entries[1].value)}</p>
                      )}

                      <div class="flex items-center gap-2 mt-3">
                        {detailUrl && (
                          <a href={detailUrl} class="uk-btn uk-btn-default uk-btn-sm" hx-get={detailUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">View</a>
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
                  {columns.map((col: string) => <th class="text-left py-3 px-4 font-medium text-muted-foreground" key={col}>{col}</th>)}
                  <th class="text-left py-3 px-4 font-medium text-muted-foreground" style="width: 100px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: Record<string, unknown>, i: number) => {
                  const displayId = typeof row.id === 'string' ? row.id : '';
                  const actualId = rawIds ? rawIds[i] : displayId;
                  const values = Object.values(row);
                  const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
                  return (
                    <tr class="border-b border-border hover:bg-muted/50 transition-colors" key={i} style={detailUrl ? 'cursor: pointer;' : ''}>
                      {values.map((val, j: number) => (
                        <td class="py-3 px-4" key={j}>
                           {j === 0 && detailUrl ? (
                             <a
                               href={detailUrl}
                               hx-get={detailUrl}
                               hx-target="#page-content"
                               hx-select="#page-content"
                               hx-push-url="true"
                               class="uk-link font-medium text-primary hover:underline"
                               data-uk-tooltip={typeof val === 'string' && val.length === 8 ? `title: ${actualId}` : undefined}
                             >
                               {val}
                             </a>
                           ) : (isBadgeStatus(val) ? <StatusBadge status={val.toLowerCase()} /> : (val as string | number | boolean | null | undefined))}
                         </td>
                       ))}
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
    <div class="flex items-center justify-between px-8 py-5 bg-white border-b border-border">
      <h2 class="text-xl font-semibold">{title}</h2>
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
    <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2>{title}</h2>
        {subtitle && <p style="color: #666; margin-top: 4px;">{subtitle}</p>}
      </div>
      <div style="display: flex; gap: 10px;">
        {editUrl && (
          <a href={editUrl} class="uk-btn uk-btn-primary" hx-get={editUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">
            Edit
          </a>
        )}
        <a href={backUrl} class="uk-btn uk-btn-default" hx-get={backUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">
          Back
        </a>
      </div>
    </div>
    <div class="uk-card uk-card-body">
       <dl class="divide-y">
        {fields.map(f => (
          <>
            <dt style="font-weight: 500; color: #666;">{f.label}</dt>
            <dd>{f.value || '-'}</dd>
          </>
        ))}
      </dl>
    </div>
     {actions && actions.length > 0 && (
       <div class="uk-card uk-card-body">
         <h3>Actions</h3>
         <div style="display: flex; gap: 10px; margin-top: 12px;">
           {actions.map(action => {
             const variantClass = action.variant === 'primary' ? 'uk-btn-primary' : action.variant === 'danger' ? 'uk-btn-destructive' : 'uk-btn-default';
             return (
                <button 
                  type="button"
                  class={`uk-btn ${variantClass}`}
                  hx-post={action.url}
                  hx-target="#page-content"
                  data-confirm={action.variant === 'danger' ? 'arm' : undefined}
                >
                  {action.label}
                </button>
              );
           })}
         </div>
       </div>
     )}
  </Layout>
);

const StatusBadge = ({ status }: { status: string }) => {
   const normalizedStatus = status.toLowerCase();
   const classMap: Record<string, string> = {
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
   const labelMap: Record<string, string> = {
     active: '✓',
     inactive: '✗',
   };
   const label = labelMap[normalizedStatus] || normalizedStatus.replace('_', ' ');
   return <span class={classMap[normalizedStatus] || 'uk-label'}>{label}</span>;
};

export { TableView, FormView, DetailView, StatusBadge };
export type { FormField, TableViewProps, FormViewProps, DetailViewProps };
