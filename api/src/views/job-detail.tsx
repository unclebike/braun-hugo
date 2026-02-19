// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx } from 'hono/jsx';
import { StatusBadge, StatusIcon } from './components';
import { Layout } from './layout';

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

const TaskSourceContext = ({ source }: { source?: JobDetailPageProps['notes'][number]['source'] }) => {
  if (!source || source.type !== 'sms' || !source.excerpt) return null;
  return (
    <details class="mt-1.5 border-l-2 border-border pl-3 ml-1">
      <summary class="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
        View Context
      </summary>
      <div class="mt-2 text-xs italic text-muted-foreground line-clamp-3 overflow-hidden">
        "{source.excerpt}"
      </div>
      {source.message_id && (
        <a
          href={`/admin/inbox/${source.message_id}`}
          class="uk-link text-[10px] uppercase font-bold mt-1.5 inline-block"
          hx-get={`/admin/inbox/${source.message_id}`}
          hx-target="#page-content"
          hx-select="#page-content"
          hx-push-url="true"
        >
          Open thread →
        </a>
      )}
    </details>
  );
};

export const NotesList = ({
  jobId,
  notes,
  listId = 'notes-list',
}: {
  jobId: string;
  notes: JobDetailPageProps['notes'];
  listId?: string;
}) => (
  <div id={listId} data-notes-list="1" class="grid gap-3">
    {notes.length === 0 ? (
      <div class="py-8 text-center border-2 border-dashed border-border rounded-xl">
        <p class="text-sm text-muted-foreground">No tasks or notes assigned to this job.</p>
      </div>
    ) : (
      notes.map((note, idx) => (
        <div key={idx} class={`group relative flex items-start gap-4 p-4 rounded-xl border border-border bg-card transition-all ${note.completed ? 'opacity-60 grayscale-[0.5]' : 'hover:border-brand/50'}`}>
          <div class="pt-0.5">
            <input
              type="checkbox"
              class="uk-checkbox w-5 h-5 rounded-md border-2"
              checked={note.completed ? true : undefined}
              hx-post={`/admin/jobs/${jobId}/notes/toggle`}
              hx-vals={JSON.stringify({ noteIndex: idx })}
              hx-target="closest [data-notes-list]"
              hx-select="#notes-list > *"
              hx-swap="innerHTML"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class={`text-[15px] leading-relaxed font-medium ${note.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{note.text}</p>
            <div class="flex items-center gap-3 mt-2">
               <span class="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-tight">
                 {new Date(note.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
               </span>
               {note.source?.type === 'sms' && <span class="uk-label uk-label-secondary text-[9px] px-1.5 py-0.5">SMS</span>}
            </div>
            <TaskSourceContext source={note.source} />
          </div>
          <button
            type="button"
             class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 -mr-1 hover:text-destructive text-muted-foreground"
             hx-post={`/admin/jobs/${jobId}/notes/delete`}
            hx-vals={JSON.stringify({ noteIndex: idx })}
            hx-target="closest [data-notes-list]"
            hx-select="#notes-list > *"
            hx-swap="innerHTML"
            data-confirm="arm"
            title="Delete task"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>Delete task</title><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      ))
    )}
  </div>
);

export const SmsThreadCard = ({ jobId, smsThreadMessage, customerName }: {
  jobId: string;
  smsThreadMessage: JobDetailPageProps['smsThreadMessage'];
  customerName?: string | null;
}) => {
  const hasUnread = !!smsThreadMessage && smsThreadMessage.is_read === 0;
  const updatedLabel = smsThreadMessage
    ? new Date(`${smsThreadMessage.updated_at}Z`).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      id="job-sms-thread-card"
      class={`uk-card uk-card-body border-2 ${hasUnread ? 'border-destructive shadow-lg shadow-destructive/5' : 'border-border shadow-sm'}`}
      hx-get={`/admin/jobs/${jobId}/sms-thread-card`}
      hx-trigger="every 15s"
      hx-swap="outerHTML"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class={`w-10 h-10 rounded-full flex items-center justify-center ${hasUnread ? 'bg-destructive text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><title>SMS Message</title><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold leading-none">Conversation</h3>
            <p class="text-[11px] text-muted-foreground mt-1 uppercase font-semibold tracking-wider">SMS Thread</p>
          </div>
        </div>
        {hasUnread && (
          <span class="uk-label uk-label-destructive px-3 py-1 font-bold">New Message</span>
        )}
      </div>

      {smsThreadMessage ? (
        <div class="grid gap-4">
          <div class="bg-muted/40 p-4 rounded-xl border border-border/50">
            <p class="text-sm leading-relaxed text-foreground italic">
              {smsThreadMessage.body ? `"${smsThreadMessage.body}"` : 'Conversation linked.'}
            </p>
            <p class="text-[10px] text-muted-foreground mt-3 font-medium uppercase tracking-widest">
              {updatedLabel ? `Last updated ${updatedLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            class="uk-btn uk-btn-primary w-full py-2.5 font-bold shadow-md shadow-brand/10"
            data-sms-thread-modal-open="true"
            data-sms-thread-modal-title={customerName || ''}
            hx-get={`/admin/inbox/${smsThreadMessage.id}/sms-thread-panel`}
            hx-target="#sms-thread-modal-body"
            hx-swap="innerHTML"
            hx-indicator="#sms-thread-modal-loading"
          >
            Open Chat Interface
          </button>
        </div>
      ) : (
        <div class="py-6 text-center">
          <p class="text-sm text-muted-foreground">No active conversation linked to this job.</p>
        </div>
      )}
    </div>
  );
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const JobDetailPage = ({ job, customer, service, territory, team, assignedProviderId, notes, smsThreadMessage, lineItems }: JobDetailPageProps) => {
  const subtotal = lineItems.reduce((sum, line) => sum + line.total_cents, 0);
  const customerName = customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Unassigned customer';
  const serviceName = service?.name || job.custom_service_name || 'Custom Service';
  const providerName = assignedProviderId
    ? (() => {
      const p = team.find(t => t.id === assignedProviderId);
      return p ? `${p.first_name} ${p.last_name}`.trim() : 'Assigned';
    })()
    : 'Unassigned';
  const dateLabel = (() => {
    try {
      const d = new Date(`${job.scheduled_date}T00:00:00`);
      return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return job.scheduled_date;
    }
  })();
  const timeLabel = job.scheduled_start_time ? job.scheduled_start_time : '';
  const scheduleLabel = `${dateLabel}${timeLabel ? ` at ${timeLabel}` : ''}`;
  const canOpenSms = Boolean(smsThreadMessage);
  const smsTitle = customer ? `${customer.first_name} ${customer.last_name}`.trim() : '';

  return (
    <Layout title={`${customerName} - ${serviceName}`}>
      <div class="page-header page-header--rich bg-card border-b border-border sticky top-0 z-[100] shadow-sm">
        <div class="page-header-info">
          <div class="flex items-center gap-4">
            <div class="avatar bg-brand/10 text-brand font-black w-12 h-12 text-lg rounded-2xl flex items-center justify-center">
              {customer?.first_name?.[0]}{customer?.last_name?.[0]}
            </div>
            <div>
              <h2 class="text-2xl font-black tracking-tight leading-none">{customerName}</h2>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-sm font-bold text-muted-foreground">{serviceName}</span>
                <span class="w-1 h-1 rounded-full bg-border" />
                <span class="text-sm font-bold text-muted-foreground">{territory?.name || 'No Territory'}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="page-header-actions gap-3">
          <div class="hidden sm:flex flex-col items-end text-right mr-4">
            <span class="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Current Status</span>
            <select
              name="status"
              class="status-select font-bold py-1 px-4 text-xs h-8"
              data-current={job.status}
              hx-post={`/admin/jobs/${job.id}/status`}
              hx-target="#page-content"
              hx-select="#page-content"
              hx-trigger="change"
            >
              {STATUS_OPTIONS.map((status) => (
                <option value={status} selected={job.status === status} key={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            class="uk-btn uk-btn-primary uk-btn-sm font-bold h-10 px-6 rounded-xl shadow-lg shadow-brand/20 transition-all hover:scale-[1.02]"
            data-sms-thread-modal-open={canOpenSms ? 'true' : undefined}
            data-sms-thread-modal-title={canOpenSms ? smsTitle : undefined}
            hx-get={canOpenSms ? `/admin/inbox/${smsThreadMessage?.id}/sms-thread-panel` : undefined}
            hx-target={canOpenSms ? '#sms-thread-modal-body' : undefined}
            hx-swap={canOpenSms ? 'innerHTML' : undefined}
            hx-indicator={canOpenSms ? '#sms-thread-modal-loading' : undefined}
            disabled={!canOpenSms}
          >
            Message
          </button>
          <a href="/admin/jobs" class="uk-btn uk-btn-default uk-btn-sm h-10 w-10 p-0 rounded-xl flex items-center justify-center border-2 border-border hover:bg-muted" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Back to Jobs</title><path d="M19 12H5m7 7-7-7 7-7"/></svg>
          </a>
        </div>
      </div>

      <div class="p-4 lg:p-8">
        <div class="mx-auto max-w-[1400px]">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-card border border-border p-5 rounded-2xl shadow-sm">
              <p class="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1.5">Job Identifier</p>
              <p class="text-xl font-bold font-mono">#{job.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div class="bg-card border border-border p-5 rounded-2xl shadow-sm">
              <p class="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1.5">Scheduled For</p>
              <p class="text-xl font-bold text-foreground">{dateLabel}</p>
              <p class="text-sm font-bold text-muted-foreground mt-0.5">{timeLabel || 'TBD'}</p>
            </div>
            <div class="bg-card border border-border p-5 rounded-2xl shadow-sm">
              <p class="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1.5">Assigned Provider</p>
              <p class="text-xl font-bold text-foreground truncate">{providerName}</p>
              <p class="text-sm font-bold text-muted-foreground mt-0.5">{job.duration_minutes} min duration</p>
            </div>
            <div class="bg-brand border border-brand p-5 rounded-2xl shadow-md shadow-brand/10">
              <p class="text-[10px] uppercase font-black text-on-brand/70 tracking-widest mb-1.5">Total Revenue</p>
              <p class="text-2xl font-black text-on-brand">{money(job.total_price_cents)}</p>
              <p class="text-[11px] font-bold text-on-brand/80 mt-0.5">{lineItems.length} Billing Items</p>
            </div>
          </div>

          <div class="grid gap-8 lg:grid-cols-[1fr,380px]">
            <div class="grid gap-8 content-start">
              <section id="tasks">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-8 bg-brand rounded-full" />
                    <h3 class="text-xl font-black tracking-tight">Active Tasks & Notes</h3>
                  </div>
                  <span class="uk-badge bg-muted text-muted-foreground font-bold px-3 py-1.5 rounded-lg border border-border/50 shadow-sm">{notes.length}</span>
                </div>
                
                <div class="mb-6">
                  <NotesList jobId={job.id} notes={notes} listId="notes-main-list" />
                </div>

                <div class="bg-card border-2 border-border p-2 rounded-2xl shadow-sm focus-within:border-brand transition-colors">
                  <form
                    hx-post={`/admin/jobs/${job.id}/notes/add`}
                    hx-target="#notes-main-list"
                    hx-select="#notes-list > *"
                    hx-swap="innerHTML"
                    hx-on="htmx:afterRequest: const xhr=event.detail.xhr; if(!xhr||xhr.status<200||xhr.status>=300) return; this.querySelector('input').value='';"
                    class="flex gap-2"
                  >
                    <input
                      type="text"
                      name="text"
                      class="uk-input border-0 focus:ring-0 bg-transparent text-base font-medium placeholder:text-muted-foreground/50 h-12 px-4 flex-1"
                      placeholder="Type a new task and press enter..."
                      required
                    />
                    <button type="submit" class="uk-btn uk-btn-primary px-8 rounded-xl font-black shadow-md">Add Task</button>
                  </form>
                </div>
              </section>

              <section id="logistics">
                <div class="flex items-center gap-3 mb-6">
                  <div class="w-2 h-8 bg-muted-foreground rounded-full" />
                  <h3 class="text-xl font-black tracking-tight">Logistics & Logistics</h3>
                </div>
                
                <div class="uk-card uk-card-body border border-border rounded-2xl shadow-sm bg-card/50">
                  <form
                    class="autosave grid gap-6 sm:grid-cols-2"
                    hx-post={`/admin/jobs/${job.id}`}
                    hx-target="#page-content"
                    hx-select="#page-content"
                    hx-swap="none"
                    hx-trigger="input delay:800ms, change"
                    hx-sync="this:queue last"
                  >
                    <input type="hidden" name="_section" value="details" />
                    
                    <div class="space-y-2">
                      <label class="text-[11px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="scheduled-date">Scheduled Date</label>
                      <input id="scheduled-date" name="scheduled_date" type="date" class="uk-input rounded-xl border-2 font-bold h-12" value={job.scheduled_date} />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[11px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="scheduled-time">Start Time</label>
                      <input id="scheduled-time" name="scheduled_start_time" type="time" class="uk-input rounded-xl border-2 font-bold h-12" value={job.scheduled_start_time} />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[11px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="duration">Duration (Min)</label>
                      <input id="duration" name="duration_minutes" type="number" min={1} class="uk-input rounded-xl border-2 font-bold h-12" value={job.duration_minutes} />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[11px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="provider-id">Assigned Team Member</label>
                      <select id="provider-id" name="provider_id" class="uk-select rounded-xl border-2 font-bold h-12">
                        <option value="">Unassigned</option>
                        {team.map((p) => <option key={p.id} value={p.id} selected={assignedProviderId === p.id}>{p.first_name} {p.last_name}</option>)}
                      </select>
                    </div>
                    
                    <div class="sm:col-span-2 pt-4 flex items-center justify-between border-t border-border/50">
                      <p class="text-xs text-muted-foreground italic flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Auto-save</title><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2"/></svg>
                        Changes auto-save instantly
                      </p>
                      <span class="save-indicator font-black text-xs uppercase tracking-widest"></span>
                    </div>
                  </form>
                </div>
              </section>
            </div>

            <aside class="grid gap-8 content-start">
              <SmsThreadCard
                jobId={job.id}
                smsThreadMessage={smsThreadMessage}
                customerName={customerName}
              />

              <section id="billing">
                <div class="flex items-center justify-between mb-4 px-1">
                  <h3 class="text-lg font-black tracking-tight leading-none">Job Billing</h3>
                  <span class="text-sm font-bold text-brand">{money(subtotal)}</span>
                </div>
                
                <div class="uk-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div class="divide-y divide-border/50">
                    {lineItems.map((line) => (
                      <div class={`p-4 ${line.parent_id ? 'bg-muted/20 pl-8' : ''}`} key={line.id}>
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0">
                            <p class="text-sm font-bold text-foreground leading-tight">{line.description}</p>
                            <p class="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                              {line.quantity} × {money(line.unit_price_cents)} • <span class="text-brand/80">{line.kind}</span>
                            </p>
                          </div>
                          <div class="text-right shrink-0">
                            <p class="text-sm font-black text-foreground">{money(line.total_cents)}</p>
                            {line.is_custom === 1 && (
                              <button
                                type="button"
                                class="text-[10px] text-destructive uppercase font-black tracking-widest mt-1 hover:underline"
                                hx-post={`/admin/jobs/${job.id}/line-items/delete`}
                                hx-vals={JSON.stringify({ lineId: line.id })}
                                hx-target="#page-content"
                                hx-select="#page-content"
                                data-confirm="arm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {lineItems.length === 0 && (
                      <div class="p-8 text-center text-xs text-muted-foreground italic">No billing items recorded.</div>
                    )}
                  </div>

                  <div class="p-4 bg-muted/30 border-t border-border">
                    <form hx-post={`/admin/jobs/${job.id}/line-items/add`} hx-target="#page-content" hx-select="#page-content" hx-swap="innerHTML" class="grid gap-2">
                      <input type="text" name="description" class="uk-input text-xs h-9 rounded-lg border-border/60 bg-card" placeholder="Custom line description" required />
                      <div class="grid grid-cols-2 gap-2">
                        <input type="number" name="unit_price" class="uk-input text-xs h-9 rounded-lg border-border/60 bg-card" min={0} step={0.01} placeholder="Price $" required />
                        <input type="number" name="quantity" class="uk-input text-xs h-9 rounded-lg border-border/60 bg-card" min={1} step={1} value="1" required />
                      </div>
                      <button type="submit" class="uk-btn uk-btn-default w-full py-1.5 text-[10px] font-black uppercase tracking-widest h-9 mt-1">Add Line Item</button>
                    </form>
                  </div>
                </div>
              </section>

              <section id="contact">
                <div class="uk-card p-6 rounded-2xl border-2 border-border/40 bg-card shadow-sm hover:border-border transition-colors">
                  <h3 class="text-xs uppercase font-black text-muted-foreground tracking-widest mb-4">Contact Profile</h3>
                  {customer ? (
                    <div class="grid gap-4">
                      <a href={`tel:${customer.phone}`} class="flex items-center gap-3 group text-foreground no-underline">
                        <div class="w-10 h-10 rounded-xl bg-muted group-hover:bg-brand/10 group-hover:text-brand flex items-center justify-center transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Call Customer</title><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.74 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </div>
                        <span class="text-sm font-black group-hover:text-brand transition-colors">{customer.phone || 'No Phone'}</span>
                      </a>
                      <a href={`mailto:${customer.email}`} class="flex items-center gap-3 group text-foreground no-underline">
                        <div class="w-10 h-10 rounded-xl bg-muted group-hover:bg-brand/10 group-hover:text-brand flex items-center justify-center transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Email Customer</title><path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/></svg>
                        </div>
                        <span class="text-sm font-black group-hover:text-brand transition-colors truncate">{customer.email || 'No Email'}</span>
                      </a>
                      <a 
                        href={`/admin/customers/${customer.id}/edit`} 
                        class="uk-btn uk-btn-default w-full py-2.5 font-bold rounded-xl mt-2 text-xs border-2"
                        hx-get={`/admin/customers/${customer.id}/edit`} 
                        hx-target="#page-content" 
                        hx-select="#page-content" 
                        hx-push-url="true"
                      >
                        View Full Customer Profile
                      </a>
                    </div>
                  ) : (
                    <p class="text-xs text-muted-foreground italic">No customer profile linked.</p>
                  )}
                </div>
              </section>

              <div class="mt-4 pt-8 border-t border-border/50">
                <button
                  type="button"
                  class="delete-btn w-full py-3 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-sm"
                  hx-post={`/admin/jobs/${job.id}/delete`}
                  data-confirm="arm"
                  hx-target="#page-content"
                >
                  Permanently Delete Job
                </button>
              </div>

            </aside>
          </div>
        </div>
      </div>
    </Layout>
  );
};
