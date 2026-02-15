/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

interface JobDetailPageProps {
  job: {
    id: string;
    status: string;
    scheduled_date: string;
    scheduled_start_time: string;
    duration_minutes: number;
    base_price_cents: number;
    total_price_cents: number;
    custom_service_name?: string | null;
    created_at: string;
  };
  customer?: { id: string; first_name: string; last_name: string; email?: string; phone?: string };
  service?: { id: string; name: string; description?: string };
  territory?: { id: string; name: string };
  team: Array<{ id: string; first_name: string; last_name: string }>;
  assignedProviderId: string | null;
  notes: Array<{
    text: string;
    timestamp: string;
    completed: number;
    source?: {
      type?: string;
      sms_log_id?: string;
      message_id?: string;
      excerpt?: string;
      received_at?: string;
    };
  }>;
  smsThreadMessage: {
    id: string;
    is_read: number;
    updated_at: string;
    body: string | null;
  } | null;
  lineItems: Array<{
    id: string;
    parent_id: string | null;
    kind: 'service' | 'modifier' | 'rule' | 'custom';
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    is_custom: number;
  }>;
}

const STATUS_OPTIONS = ['created', 'assigned', 'enroute', 'in_progress', 'complete', 'cancelled'];

const statusClass = (status: string) => {
  if (status === 'complete') return 'uk-label uk-label-primary';
  if (status === 'cancelled') return 'uk-label uk-label-destructive';
  if (status === 'enroute' || status === 'in_progress') return 'uk-label uk-label-secondary';
  return 'uk-label';
};

const TaskSourceContext = ({ source }: { source?: JobDetailPageProps['notes'][number]['source'] }) => {
  if (!source || source.type !== 'sms' || !source.excerpt) return null;
  return (
    <details class="mt-1.5">
      <summary class="text-xs text-muted-foreground cursor-pointer" style="display:inline-flex;align-items:center;gap:6px;">
        <span aria-hidden="true">💬</span>
        Message context
      </summary>
      <div class="mt-1 rounded-md border border-border p-2" style="background:var(--surface-elevated);">
        <p class="text-xs" style="margin:0;white-space:pre-wrap;word-break:break-word;">{source.excerpt}</p>
        {source.message_id && (
          <a
            href={`/admin/inbox/${source.message_id}`}
            class="uk-link text-xs"
            hx-get={`/admin/inbox/${source.message_id}`}
            hx-target="#page-content"
            hx-select="#page-content"
            hx-push-url="true"
            style="display:inline-block;margin-top:6px;"
          >
            Open thread
          </a>
        )}
      </div>
    </details>
  );
};

export const NotesList = ({ jobId, notes }: { jobId: string; notes: JobDetailPageProps['notes'] }) => (
  <div id="notes-list">
    {notes.length === 0 ? (
      <p class="text-sm text-muted-foreground">No tasks yet.</p>
    ) : (
      notes.map((note, idx) => (
        <div key={idx} class={`flex items-start gap-3 p-3 border border-border rounded-md ${note.completed ? 'opacity-60' : ''}`}>
           <input
             type="checkbox"
             class="uk-checkbox mt-1"
             checked={note.completed ? true : undefined}
             hx-post={`/admin/jobs/${jobId}/notes/toggle`}
             hx-vals={JSON.stringify({ noteIndex: idx })}
             hx-target="#notes-list"
             hx-select="#notes-list"
             hx-swap="innerHTML"
           />
          <div class="flex-1 min-w-0">
            <p class={`text-sm ${note.completed ? 'line-through text-muted-foreground' : ''}`}>{note.text}</p>
            <p class="text-xs text-muted-foreground mt-1">{new Date(note.timestamp).toLocaleString()}</p>
            <TaskSourceContext source={note.source} />
          </div>
          <button
            type="button"
            class="delete-btn uk-btn uk-btn-small"
            hx-post={`/admin/jobs/${jobId}/notes/delete`}
            hx-vals={JSON.stringify({ noteIndex: idx })}
            hx-target="#notes-list"
            hx-select="#notes-list"
            hx-swap="innerHTML"
            data-confirm="arm"
          >
            ✕
          </button>
        </div>
      ))
    )}
  </div>
);

export const SmsThreadCard = ({ jobId, smsThreadMessage }: {
  jobId: string;
  smsThreadMessage: JobDetailPageProps['smsThreadMessage'];
}) => {
  const hasUnread = !!smsThreadMessage && smsThreadMessage.is_read === 0;
  const updatedLabel = smsThreadMessage
    ? new Date(`${smsThreadMessage.updated_at}Z`).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      id="job-sms-thread-card"
      class="uk-card uk-card-body"
      hx-get={`/admin/jobs/${jobId}/sms-thread-card`}
      hx-trigger="every 8s"
      hx-swap="outerHTML"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold">SMS Thread</h3>
        {hasUnread ? (
          <span class="uk-label uk-label-destructive" style="display:inline-flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;border-radius:999px;background:currentColor;display:inline-block;"></span>
            New message
          </span>
        ) : (
          <span class="text-xs text-muted-foreground">Up to date</span>
        )}
      </div>

      {smsThreadMessage ? (
        <div class="grid gap-3">
          <p class="text-sm text-muted-foreground" style="margin:0;">
            {smsThreadMessage.body ? `Latest: ${smsThreadMessage.body}` : 'SMS conversation is linked to this job.'}
          </p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">{updatedLabel ? `Updated ${updatedLabel}` : ''}</span>
            <a
              href={`/admin/inbox/${smsThreadMessage.id}`}
              class="uk-link"
              hx-get={`/admin/inbox/${smsThreadMessage.id}`}
              hx-target="#page-content"
              hx-select="#page-content"
              hx-push-url="true"
            >
              Open conversation
            </a>
          </div>
        </div>
      ) : (
        <p class="text-sm text-muted-foreground">No SMS conversation linked yet.</p>
      )}
    </div>
  );
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const JobDetailPage = ({ job, customer, service, territory, team, assignedProviderId, notes, smsThreadMessage, lineItems }: JobDetailPageProps) => {
  const subtotal = lineItems.reduce((sum, line) => sum + line.total_cents, 0);
  return (
    <Layout title={`Job ${job.id}`}>
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 pl-14 py-4 sm:px-8 sm:pl-8 sm:py-5 bg-white border-b border-border sticky top-0 z-50">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <h2 class="text-xl font-semibold">Job {job.id.slice(0, 8)}</h2>
          <span class={statusClass(job.status)}>{job.status.replace('_', ' ')}</span>
        </div>
        <a href="/admin/jobs" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
      </div>

      <div class="p-4 sm:p-8">
        <div class="grid gap-4 sm:gap-6" style="max-width: 800px;">
          <div class="uk-card uk-card-body">
            <section>
              <form
                class="autosave"
                hx-post={`/admin/jobs/${job.id}`}
                hx-target="#page-content"
                hx-select="#page-content"
                hx-swap="none"
                hx-trigger="input delay:500ms, change"
                hx-sync="this:queue last"
              >
                <input type="hidden" name="_section" value="details" />
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-semibold">Details</h3>
                  <span class="save-indicator"></span>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="scheduled-date">Date</label>
                    <input id="scheduled-date" name="scheduled_date" type="date" class="uk-input" value={job.scheduled_date} />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="scheduled-time">Start Time</label>
                    <input id="scheduled-time" name="scheduled_start_time" type="time" class="uk-input" value={job.scheduled_start_time} />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="duration">Duration (minutes)</label>
                    <input id="duration" name="duration_minutes" type="number" min={1} class="uk-input" value={job.duration_minutes} />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="base-price">Base Price ($)</label>
                    <input id="base-price" name="base_price" type="number" min={0} step={0.01} class="uk-input" value={(job.base_price_cents / 100).toFixed(2)} />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="total-price">Total Price ($)</label>
                    <input id="total-price" name="total_price" type="number" min={0} step={0.01} class="uk-input" value={(job.total_price_cents / 100).toFixed(2)} />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="provider-id">Assigned Provider</label>
                    <select id="provider-id" name="provider_id" class="uk-select">
                      <option value="">Unassigned</option>
                      {team.map((provider) => (
                        <option key={provider.id} value={provider.id} selected={assignedProviderId === provider.id}>
                          {provider.first_name} {provider.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Status</h3>
              <form hx-post={`/admin/jobs/${job.id}/status`} hx-target="#page-content" hx-select="#page-content" class="grid gap-3 sm:flex sm:items-end">
                <div class="grid gap-2 flex-1">
                  <label class="uk-form-label" for="job-status">Job Status</label>
                  <select id="job-status" name="status" class="uk-select">
                    {STATUS_OPTIONS.map((status) => (
                      <option value={status} selected={job.status === status} key={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" class="uk-btn uk-btn-default">Update Status</button>
              </form>
              <div class="mt-4 rounded-md border border-border p-3" style="background:var(--surface-elevated);">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Pricing subtotal</p>
                <p class="text-lg font-semibold">{money(subtotal)}</p>
                <p class="text-xs text-muted-foreground">{lineItems.length} line item{lineItems.length === 1 ? '' : 's'} in job breakdown</p>
              </div>
            </section>
          </div>

          <div class="uk-card uk-card-body hidden sm:block">
            <h3 class="text-base font-semibold mb-4">Customer</h3>
            {customer ? (
              <div class="grid gap-2 text-sm">
                <p class="font-medium">{customer.first_name} {customer.last_name}</p>
                <p class="text-muted-foreground">{customer.email || '-'}</p>
                <p class="text-muted-foreground">{customer.phone || '-'}</p>
                <div>
                  <a href={`/admin/customers/${customer.id}/edit`} class="uk-link" hx-get={`/admin/customers/${customer.id}/edit`} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Open customer</a>
                </div>
              </div>
            ) : (
              <p class="text-sm text-muted-foreground">No customer linked.</p>
            )}
          </div>

          <SmsThreadCard jobId={job.id} smsThreadMessage={smsThreadMessage} />

          <div class="uk-card uk-card-body hidden sm:block">
            <h3 class="text-base font-semibold mb-4">Service & Territory</h3>
            <div class="grid gap-2 text-sm">
              <div>
                <span class="text-muted-foreground">Service:</span>{' '}
                <span class="font-medium">{service?.name || job.custom_service_name || 'Custom Service'}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Territory:</span>{' '}
                <span class="font-medium">{territory?.name || '-'}</span>
              </div>
            </div>
          </div>

          <details class="uk-card uk-card-body sm:hidden">
            <summary class="text-base font-semibold cursor-pointer">Customer</summary>
            <div class="pt-4">
              {customer ? (
                <div class="grid gap-2 text-sm">
                  <p class="font-medium">{customer.first_name} {customer.last_name}</p>
                  <p class="text-muted-foreground">{customer.email || '-'}</p>
                  <p class="text-muted-foreground">{customer.phone || '-'}</p>
                  <div>
                    <a href={`/admin/customers/${customer.id}/edit`} class="uk-link" hx-get={`/admin/customers/${customer.id}/edit`} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Open customer</a>
                  </div>
                </div>
              ) : (
                <p class="text-sm text-muted-foreground">No customer linked.</p>
              )}
            </div>
          </details>

          <details class="uk-card uk-card-body sm:hidden">
            <summary class="text-base font-semibold cursor-pointer">Service & Territory</summary>
            <div class="grid gap-2 text-sm pt-4">
              <div>
                <span class="text-muted-foreground">Service:</span>{' '}
                <span class="font-medium">{service?.name || job.custom_service_name || 'Custom Service'}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Territory:</span>{' '}
                <span class="font-medium">{territory?.name || '-'}</span>
              </div>
            </div>
          </details>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Price Breakdown</h3>
              <div class="grid gap-2 mb-4">
                {lineItems.length === 0 ? (
                  <p class="text-sm text-muted-foreground">No line items yet.</p>
                ) : (
                  lineItems.map((line) => (
                    <div class="flex items-start gap-3 p-3 border border-border rounded-md" key={line.id}>
                      <div class="flex-1 min-w-0" style={line.parent_id ? 'padding-left: 16px;' : ''}>
                        <div class="flex items-center gap-2 flex-wrap">
                          <p class="text-sm font-medium">{line.description}</p>
                          <span class="text-xs text-muted-foreground">{line.kind}</span>
                        </div>
                        <p class="text-xs text-muted-foreground">{line.quantity} x {money(line.unit_price_cents)}</p>
                      </div>
                      <div class="text-right">
                        <p class="text-sm font-semibold">{money(line.total_cents)}</p>
                        {line.is_custom === 1 ? (
                          <button
                            type="button"
                            class="delete-btn uk-btn uk-btn-small"
                            hx-post={`/admin/jobs/${job.id}/line-items/delete`}
                            hx-vals={JSON.stringify({ lineId: line.id })}
                            hx-target="#page-content"
                            hx-select="#page-content"
                            data-confirm="arm"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>

               <form hx-post={`/admin/jobs/${job.id}/line-items/add`} hx-target="#page-content" hx-select="#page-content" hx-swap="innerHTML" class="grid gap-2 sm:grid-cols-4">
                 <input type="text" name="description" class="uk-input sm:col-span-2" placeholder="Custom line description" required />
                 <input type="number" name="quantity" class="uk-input" min={1} step={1} value="1" required />
                 <input type="number" name="unit_price" class="uk-input" min={0} step={0.01} placeholder="Unit price" required />
                 <div class="sm:col-span-4 flex justify-end">
                   <button type="submit" class="uk-btn uk-btn-default">Add Custom Line</button>
                 </div>
               </form>
            </section>
          </div>

           <div class="uk-card uk-card-body hidden sm:block">
             <section>
               <h3 class="text-base font-semibold mb-4">Task Notes</h3>
               <div class="grid gap-2 mb-4">
                 <NotesList jobId={job.id} notes={notes} />
               </div>

                 <form hx-post={`/admin/jobs/${job.id}/notes/add`} hx-target="#notes-list" hx-select="#notes-list" hx-swap="innerHTML" class="flex gap-2">
                   <input
                     type="text"
                     name="text"
                     class="uk-input flex-1"
                     placeholder="Add a task..."
                     required
                   />
                   <button type="submit" class="uk-btn uk-btn-default">Add</button>
                 </form>
             </section>
           </div>

            <details class="uk-card uk-card-body sm:hidden" hx-on="htmx:afterSettle: this.open = true">
              <summary class="text-base font-semibold cursor-pointer">Task Notes</summary>
              <section class="pt-4">
                <div class="grid gap-2 mb-4">
                  <NotesList jobId={job.id} notes={notes} />
                </div>

                   <form hx-post={`/admin/jobs/${job.id}/notes/add`} hx-target="#notes-list" hx-select="#notes-list" hx-swap="innerHTML" class="grid gap-2 sm:flex">
                     <input
                       type="text"
                       name="text"
                       class="uk-input flex-1"
                       placeholder="Add a task..."
                       required
                     />
                     <button type="submit" class="uk-btn uk-btn-default">Add</button>
                   </form>
              </section>
            </details>

          <div class="uk-card uk-card-body hidden sm:block">
            <section>
              <h3 class="text-base font-semibold mb-3">Delete</h3>
              <button
                type="button"
                class="delete-btn"
                hx-post={`/admin/jobs/${job.id}/delete`}
                data-confirm="arm"
                hx-target="#page-content"
              >
                Delete Job
              </button>
            </section>
          </div>

          <details class="uk-card uk-card-body sm:hidden">
            <summary class="text-base font-semibold cursor-pointer">Delete Job</summary>
            <section class="pt-4">
              <button
                type="button"
                class="delete-btn"
                hx-post={`/admin/jobs/${job.id}/delete`}
                data-confirm="arm"
                hx-target="#page-content"
              >
                Delete Job
              </button>
            </section>
          </details>
        </div>
      </div>

    </Layout>
  );
};
