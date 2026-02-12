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
  notes: Array<{ id: string; content: string; created_at: string }>;
}

const STATUS_OPTIONS = ['created', 'assigned', 'enroute', 'in_progress', 'complete', 'cancelled'];

const statusClass = (status: string) => {
  if (status === 'complete') return 'uk-label uk-label-primary';
  if (status === 'cancelled') return 'uk-label uk-label-destructive';
  if (status === 'enroute' || status === 'in_progress') return 'uk-label uk-label-secondary';
  return 'uk-label';
};

export const JobDetailPage = ({ job, customer, service, territory, team, assignedProviderId, notes }: JobDetailPageProps) => {
  return (
    <Layout title={`Job ${job.id}`}>
      <div class="flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold">Job {job.id.slice(0, 8)}</h2>
          <span class={statusClass(job.status)}>{job.status.replace('_', ' ')}</span>
        </div>
        <a href="/admin/jobs" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
      </div>

      <div class="p-8">
        <div class="grid gap-6" style="max-width: 800px;">
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
                    <label class="uk-form-label" for="base-price">Base Price (cents)</label>
                    <input id="base-price" name="base_price_cents" type="number" min={0} class="uk-input" value={job.base_price_cents} />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="total-price">Total Price (cents)</label>
                    <input id="total-price" name="total_price_cents" type="number" min={0} class="uk-input" value={job.total_price_cents} />
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

          <div class="uk-card uk-card-body">
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

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Status</h3>
              <form hx-post={`/admin/jobs/${job.id}/status`} hx-target="#page-content" hx-select="#page-content" class="flex items-end gap-3">
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
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Notes</h3>
              <div class="grid gap-3 mb-4">
                {notes.map((note) => (
                  <div key={note.id} class="border border-border rounded-md p-3">
                    <p class="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p class="text-xs text-muted-foreground mt-2">{new Date(note.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {notes.length === 0 && <p class="text-sm text-muted-foreground">No notes yet.</p>}
              </div>

              <form hx-post={`/admin/jobs/${job.id}/notes`} hx-target="#page-content" hx-select="#page-content">
                <div class="grid gap-2">
                  <label class="uk-form-label" for="note-content">Add Note</label>
                  <textarea id="note-content" name="content" class="uk-textarea" rows={3}></textarea>
                </div>
                <div class="mt-3">
                  <button type="submit" class="uk-btn uk-btn-default">Add Note</button>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
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
        </div>
      </div>
    </Layout>
  );
};
