// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx } from 'hono/jsx';
import type {} from './components';
import { Layout } from './layout';

export interface ServiceTask {
  id: string;
  title: string;
  type: string;
  is_required: number;
  sort_order: number;
  completed: number;
  answer: string | null;
  completed_at: string | null;
}

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
    started_at?: string | null;
    completed_at?: string | null;
    paused_at?: string | null;
    is_paused?: number;
  };
  customer?: { id: string; first_name: string; last_name: string; email?: string; phone?: string };
  service?: { id: string; name: string; description?: string };
  territory?: { id: string; name: string };
  team: Array<{ id: string; first_name: string; last_name: string }>;
  assignedProviderId: string | null;
  workIntervals: Array<{ started: string; ended: string | null }>;
  serviceTasks: ServiceTask[];
  completeBlocked?: boolean;
  completeBlockers?: string[];
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
  <div
    id={listId}
    data-notes-list="1"
    class="grid-masonry gap-2"
    hx-get={`/admin/jobs/${jobId}/notes-list`}
    hx-trigger="taskAdded from:body"
    hx-target={`#${listId}`}
    hx-swap="outerHTML"
  >
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
                 hx-select={`#${listId} > *`}
                 hx-swap="innerHTML"
               />
             </div>
             <div class="flex-1 min-w-0">
               <p class={`text-[15px] leading-relaxed font-medium ${note.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{note.text}</p>
               <div class="flex items-center gap-3 mt-2">
                  <span class="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-tight">
                    {new Date(note.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {note.source?.type === 'sms' && <span class="uk-label uk-label-secondary"><span class="badge-label">SMS</span></span>}
               </div>
               <TaskSourceContext source={note.source} />
             </div>
             <button
               type="button"
                class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 -mr-1 hover:text-destructive text-muted-foreground"
                hx-post={`/admin/jobs/${jobId}/notes/delete`}
               hx-vals={JSON.stringify({ noteIndex: idx })}
               hx-target="closest [data-notes-list]"
               hx-select={`#${listId} > *`}
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
      class={`rounded-2xl border bg-card shadow-sm overflow-hidden ${hasUnread ? 'border-destructive shadow-destructive/5' : 'border-border'}`}
      hx-get={`/admin/jobs/${jobId}/sms-thread-card`}
      hx-trigger="every 15s"
      hx-swap="outerHTML"
    >
      <div class="flex items-center justify-between px-4 pt-4 pb-3">
        <div class="flex items-center gap-3">
          <div class={`w-8 h-8 rounded-xl flex items-center justify-center ${hasUnread ? 'bg-destructive text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><title>SMS Message</title><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <h3 class="text-sm font-bold leading-none">Conversation</h3>
            <p class="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold tracking-wider">SMS Thread</p>
          </div>
        </div>
        {hasUnread && (
          <span class="uk-label uk-label-destructive"><span class="badge-label">New Message</span></span>
        )}
      </div>

      {smsThreadMessage ? (
        <div class="grid gap-3 px-4 pb-4">
          <div class="bg-muted/30 p-3 rounded-xl border border-border/50">
            <p class="text-sm leading-relaxed text-foreground italic">
              {smsThreadMessage.body ? `"${smsThreadMessage.body}"` : 'Conversation linked.'}
            </p>
            <p class="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-widest">
              {updatedLabel ? `Last updated ${updatedLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            class="uk-btn uk-btn-primary w-full py-2.5 font-bold rounded-xl shadow-md shadow-brand/10"
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
        <div class="py-6 px-4 pb-4 text-center">
          <p class="text-sm text-muted-foreground">No active conversation linked to this job.</p>
        </div>
      )}
    </div>
  );
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const fmtTime = (iso: string) =>
  new Date(`${iso}Z`).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });

const intervalMinutes = (started: string, ended: string | null): number => {
  const s = new Date(`${started}Z`).getTime();
  const e = ended ? new Date(`${ended}Z`).getTime() : Date.now();
  return Math.max(0, Math.round((e - s) / 60000));
};

export const WorkIntervals = ({
  jobId,
  intervals,
  isActive,
}: {
  jobId: string;
  intervals: Array<{ started: string; ended: string | null }>;
  isActive: boolean;
}) => {
  const completedMinutes = intervals
    .filter(i => i.ended)
    .reduce((sum, i) => sum + intervalMinutes(i.started, i.ended), 0);
  const openInterval = intervals.find(i => !i.ended);
  const totalLabel = openInterval
    ? `${completedMinutes} min logged + current session`
    : `${completedMinutes} min total`;

  return (
    <div id="work-intervals">
      {intervals.length > 0 && (
        <div class="grid gap-1.5 mb-3">
          {intervals.map((interval, i) => {
            const mins = intervalMinutes(interval.started, interval.ended);
            return (
              <div key={i} class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">
                  {fmtTime(interval.started)} — {interval.ended ? fmtTime(interval.ended) : <span class="text-brand font-bold">running</span>}
                </span>
                <span class="font-bold tabular-nums">{mins} min</span>
              </div>
            );
          })}
          <div class="flex items-center justify-between text-xs pt-1.5 mt-0.5 border-t border-border/50">
            <span class="font-black uppercase tracking-widest text-[9px]">Total worked</span>
            <span class="font-black text-brand">{totalLabel}</span>
          </div>
        </div>
      )}
      <div class="flex flex-wrap gap-2">
        {isActive && (
          <button
            type="button"
            class="uk-btn uk-btn-default uk-btn-sm font-black"
            style="border-color:var(--badge-primary);color:var(--badge-primary);"
            hx-post={`/admin/jobs/${jobId}/pause`}
            hx-target="#page-content"
            hx-select="#page-content"
          >
            Pause
          </button>
        )}
        {!isActive && intervals.length > 0 && (
          <button
            type="button"
            class="uk-btn uk-btn-primary uk-btn-sm font-black"
            hx-post={`/admin/jobs/${jobId}/resume`}
            hx-target="#page-content"
            hx-select="#page-content"
          >
            Resume
          </button>
        )}
      </div>
    </div>
  );
};

export const ServiceTasksList = ({ jobId, tasks, serviceName }: { jobId: string; tasks: ServiceTask[]; serviceName: string }) => {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed || t.answer).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const requiredPending = tasks.filter(t => t.is_required && !t.completed && !t.answer);

  return (
    <div id="service-tasks-list">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-black uppercase tracking-widest text-muted-foreground">{serviceName} Checklist</span>
           {requiredPending.length > 0 && (
             <span class="uk-label uk-label-destructive text-caption-2" style="padding:1px 6px;">
               <span class="badge-label">{requiredPending.length} required</span>
             </span>
           )}
        </div>
        <span class="text-xs font-bold text-muted-foreground">{done}/{total}</span>
      </div>

      <div class="mb-3 h-1.5 rounded-full overflow-hidden" style="background:var(--border);">
        <div class="h-full rounded-full transition-all" style={`width:${pct}%;background:${pct === 100 ? 'var(--brand)' : 'var(--badge-primary)'};`} />
      </div>

       <div class="grid-masonry gap-2">
          {tasks.map((task) => {
           const isDone = Boolean(task.completed || task.answer);
           return (
             <div key={task.id} class={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isDone ? 'border-border/40 opacity-70' : task.is_required ? 'border-destructive/30 bg-destructive/3' : 'border-border'}`}>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <p class={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                   {task.is_required && !isDone && (
                     <span class="text-caption-2" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--destructive);border:1px solid currentColor;border-radius:4px;padding:1px 4px;font-weight:var(--fw-caption-2);">Required</span>
                   )}
                </div>

                {task.type === 'check' && (
                  <button
                    type="button"
                    class={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-all ${isDone ? 'border-brand/30 text-brand bg-brand/5' : 'border-border hover:border-brand/40 text-muted-foreground hover:text-brand'}`}
                    hx-post={`/admin/jobs/${jobId}/service-tasks/${task.id}/toggle`}
                    hx-target="#service-tasks-list"
                    hx-select="#service-tasks-list"
                    hx-swap="outerHTML"
                  >
                    {isDone ? '✓ Done — click to undo' : 'Mark done'}
                  </button>
                )}

                {task.type === 'yesno' && !isDone && (
                  <div class="flex gap-2 mt-1">
                    <button
                      type="button"
                      class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-border hover:border-brand/40 hover:text-brand text-muted-foreground transition-all"
                      hx-post={`/admin/jobs/${jobId}/service-tasks/${task.id}/answer`}
                      hx-vals='{"answer":"yes"}'
                      hx-target="#service-tasks-list"
                      hx-select="#service-tasks-list"
                      hx-swap="outerHTML"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-border hover:border-destructive/40 hover:text-destructive text-muted-foreground transition-all"
                      hx-post={`/admin/jobs/${jobId}/service-tasks/${task.id}/answer`}
                      hx-vals='{"answer":"no"}'
                      hx-target="#service-tasks-list"
                      hx-select="#service-tasks-list"
                      hx-swap="outerHTML"
                    >
                      No
                    </button>
                  </div>
                )}

                {task.type === 'yesno' && isDone && (
                  <div class="flex items-center gap-2 mt-1">
                    <span class={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${task.answer === 'yes' ? 'bg-brand/10 text-brand' : 'bg-destructive/10 text-destructive'}`}>
                      {task.answer === 'yes' ? 'Yes' : 'No'}
                    </span>
                    <button
                      type="button"
                      class="text-[9px] text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-widest font-bold"
                      hx-post={`/admin/jobs/${jobId}/service-tasks/${task.id}/clear`}
                      hx-target="#service-tasks-list"
                      hx-select="#service-tasks-list"
                      hx-swap="outerHTML"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {task.type === 'text' && !isDone && (
                  <form
                    class="mt-1 flex gap-2"
                    hx-post={`/admin/jobs/${jobId}/service-tasks/${task.id}/answer`}
                    hx-target="#service-tasks-list"
                    hx-select="#service-tasks-list"
                    hx-swap="outerHTML"
                    hx-on="htmx:afterRequest: if(event.detail.xhr?.status < 300) this.reset();"
                  >
                    <input
                      type="text"
                      name="answer"
                      class="uk-input text-xs h-8 rounded-lg border border-border/60 bg-card flex-1"
                      placeholder="Type answer and press enter..."
                      required
                    />
                    <button type="submit" class="uk-btn uk-btn-default uk-btn-sm rounded-lg text-[10px] font-black">Save</button>
                  </form>
                )}

                {task.type === 'text' && isDone && (
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs italic text-muted-foreground">"{task.answer}"</span>
                    <button
                      type="button"
                      class="text-[9px] text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-widest font-bold"
                      hx-post={`/admin/jobs/${jobId}/service-tasks/${task.id}/clear`}
                      hx-target="#service-tasks-list"
                      hx-select="#service-tasks-list"
                      hx-swap="outerHTML"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const JobDetailPage = ({ job, customer, service, territory, team, assignedProviderId, workIntervals, serviceTasks, completeBlocked, completeBlockers, notes, smsThreadMessage, lineItems }: JobDetailPageProps) => {
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
  const canOpenSms = Boolean(smsThreadMessage);
  const smsTitle = customer ? `${customer.first_name} ${customer.last_name}`.trim() : '';

  const completedIntervalMinutes = workIntervals
    .filter(i => i.ended)
    .reduce((sum, i) => sum + intervalMinutes(i.started, i.ended), 0);
  const actualDuration = workIntervals.length > 0 && job.completed_at
    ? completedIntervalMinutes
    : job.started_at && job.completed_at
      ? Math.round((new Date(`${job.completed_at}Z`).getTime() - new Date(`${job.started_at}Z`).getTime()) / 60000)
      : null;
  const isRunning = job.status === 'in_progress' && !job.is_paused && Boolean(job.started_at) && !job.completed_at;
  const isPaused = job.status === 'in_progress' && Boolean(job.is_paused) && !job.completed_at;

  return (
    <Layout title={`${customerName} - ${serviceName}`}>
      <div class="page-header" style="display:flex; align-items:center; gap:12px; min-height:56px;">
        <a
          href="/admin/jobs"
          class="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border-2 border-border hover:bg-muted transition-colors"
          hx-get="/admin/jobs"
          hx-target="#page-content"
          hx-select="#page-content"
          hx-push-url="true"
          aria-label="Back to Jobs"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Back to Jobs</title><path d="M19 12H5m7 7-7-7 7-7"/></svg>
        </a>

         <div class="flex-1 min-w-0">
           <h2 style="font-size:var(--text-lg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0; font-weight:900; letter-spacing:-0.02em;">{customerName}</h2>
           <p class="text-caption-2" style="margin:2px 0 0; letter-spacing:0.05em; text-transform:uppercase; opacity:0.55; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{serviceName}</p>
         </div>

         <select
           name="status"
           class="status-select shrink-0 font-bold text-caption-2"
           style="height:28px; padding:0 22px 0 8px;"
           data-current={job.status}
          hx-post={`/admin/jobs/${job.id}/status`}
          hx-target="#page-content"
          hx-select="#page-content"
          hx-trigger="change"
        >
          {STATUS_OPTIONS.map((status) => (
            <option value={status} selected={job.status === status} key={status}>
              {status.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

         <button
           type="button"
           class="shrink-0 uk-btn uk-btn-primary uk-btn-sm font-black text-footnote"
           style="height:36px; padding:0 14px; border-radius:10px; letter-spacing:0.04em;"
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
      </div>

      <div class="p-3 sm:p-4 lg:p-8">
        <div class="mx-auto max-w-[1400px]">
          <div class="grid grid-cols-3 gap-3 mb-6 sm:grid-cols-3 lg:grid-cols-4 lg:mb-8">
            <div class="bg-card border border-border p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
              <p class="text-[9px] sm:text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Schedule</p>
              <p class="text-sm sm:text-xl font-black leading-tight">{dateLabel}</p>
              <p class="text-[10px] sm:text-sm font-bold text-muted-foreground mt-0.5">{timeLabel || 'TBD'}</p>
            </div>
            <div class="bg-card border border-border p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
              <p class="text-[9px] sm:text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Provider</p>
              <p class="text-sm sm:text-xl font-black leading-tight truncate">{providerName}</p>
              <p class="text-[10px] sm:text-sm font-bold text-muted-foreground mt-0.5">{job.duration_minutes} min</p>
            </div>
            <div class="bg-brand border border-brand p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
              <p class="text-[9px] sm:text-[10px] uppercase font-black text-on-brand/70 tracking-widest mb-1">Revenue</p>
              <p class="text-sm sm:text-2xl font-black text-on-brand leading-tight">{money(job.total_price_cents)}</p>
              <p class="text-[10px] sm:text-[11px] font-bold text-on-brand/80 mt-0.5 hidden sm:block">{lineItems.length} items</p>
            </div>
            <div class="hidden lg:block bg-card border border-border p-5 rounded-2xl shadow-sm">
              <p class="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1.5">Job ID</p>
              <p class="text-xl font-bold font-mono">#{job.id.slice(0, 8).toUpperCase()}</p>
              <p class="text-sm font-bold text-muted-foreground mt-0.5 truncate">{territory?.name || '—'}</p>
            </div>
          </div>

          {completeBlocked && completeBlockers && completeBlockers.length > 0 && (
            <div class="mb-6 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6">
              <div class="flex items-start gap-3 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-destructive mt-0.5 shrink-0"><title>Blocked</title><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div>
                  <p class="text-sm font-black text-destructive mb-1">Cannot complete — required checklist items unfinished</p>
                  <ul class="text-xs text-muted-foreground space-y-0.5">
                    {completeBlockers.map((b, i) => <li key={i}>• {b}</li>)}
                  </ul>
                </div>
              </div>
              <details class="group">
                <summary class="text-xs font-black uppercase tracking-widest text-destructive/80 cursor-pointer hover:text-destructive">Override & complete anyway →</summary>
                <div class="mt-4">
                  <p class="text-xs text-muted-foreground mb-3">Provide a reason. This will be flagged to management.</p>
                  <form
                    hx-post={`/admin/jobs/${job.id}/complete-override`}
                    hx-target="#page-content"
                    hx-select="#page-content"
                    class="grid gap-3"
                  >
                    <textarea
                      name="reason"
                      class="uk-textarea text-sm rounded-xl border-2 border-destructive/40 bg-card"
                      rows={3}
                      placeholder="Reason for overriding required tasks..."
                      required
                    />
                    <button type="submit" class="uk-btn uk-btn-sm font-black uppercase tracking-widest rounded-xl" style="background:var(--destructive);color:#fff;border-color:var(--destructive);">
                      Override & Mark Complete
                    </button>
                  </form>
                </div>
              </details>
            </div>
          )}

          <div class="grid gap-8 lg:grid-cols-[1fr,380px]">
            <div class="grid gap-8 content-start">

              {serviceTasks.length > 0 && (
                <section id="service-tasks">
                  <div class="flex items-center gap-3 mb-6">
                    <div class="w-2 h-8 rounded-full" style="background:var(--badge-primary);" />
                    <h3 class="text-xl font-black tracking-tight">{service?.name || 'Service'} Checklist</h3>
                  </div>
                  <div class="uk-card uk-card-body border border-border rounded-2xl shadow-sm bg-card/50">
                    <ServiceTasksList jobId={job.id} tasks={serviceTasks} serviceName={service?.name || 'Service'} />
                  </div>
                </section>
              )}

              <section id="tasks">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-8 bg-brand rounded-full" />
                    <h3 class="text-xl font-black tracking-tight">Active Tasks & Notes</h3>
                  </div>
                   <span class="text-footnote" style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--badge-neutral-bg);border:1px solid var(--badge-neutral-border);color:var(--text);">{notes.length}</span>
                </div>
                
                <div class="mb-6">
                  <NotesList jobId={job.id} notes={notes} listId="notes-main-list" />
                </div>

                <div class="bg-card border-2 border-border p-2 rounded-2xl shadow-sm focus-within:border-brand transition-colors">
                  <form
                    hx-post={`/admin/jobs/${job.id}/notes/add`}
                    hx-target="#notes-main-list"
                    hx-select="#notes-main-list > *"
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
                    <form hx-post={`/admin/jobs/${job.id}/line-items/add`} hx-target="#page-content" hx-select="#page-content" hx-swap="innerHTML" class="grid gap-3">
                      <div class="grid gap-1.5">
                        <label for="new-line-desc" class="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Line Description</label>
                        <input id="new-line-desc" type="text" name="description" class="uk-input text-xs h-10 rounded-xl border-2 border-border/60 bg-card font-bold" placeholder="e.g. Extra deep cleaning" required />
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        <div class="grid gap-1.5">
                          <label for="new-line-price" class="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Unit Price</label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                            <input id="new-line-price" type="number" name="unit_price" class="uk-input text-xs h-10 rounded-xl border-2 border-border/60 bg-card pl-6 font-bold" min={0} step={0.01} placeholder="0.00" required />
                          </div>
                        </div>
                        <div class="grid gap-1.5">
                          <label for="new-line-qty" class="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity</label>
                          <input id="new-line-qty" type="number" name="quantity" class="uk-input text-xs h-10 rounded-xl border-2 border-border/60 bg-card font-bold" min={1} step={1} value="1" required />
                        </div>
                      </div>
                      <button type="submit" class="uk-btn uk-btn-default w-full py-2 text-[10px] font-black uppercase tracking-widest h-10 mt-1 rounded-xl shadow-sm">Add Billing Item</button>
                    </form>
                  </div>
                </div>
              </section>
            </div>

            <aside class="grid gap-8 content-start">
              <SmsThreadCard
                jobId={job.id}
                smsThreadMessage={smsThreadMessage}
                customerName={customerName}
              />

              <section id="logistics">
                <div class="flex items-center gap-3 mb-4 px-1">
                  <h3 class="text-lg font-black tracking-tight leading-none">Logistics & Timing</h3>
                </div>
                
                <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div class="p-4 grid gap-6">
                    <form
                      class="autosave grid gap-x-3 gap-y-3 grid-cols-2"
                      hx-post={`/admin/jobs/${job.id}`}
                      hx-target="#page-content"
                      hx-select="#page-content"
                      hx-swap="none"
                      hx-trigger="input delay:800ms, change"
                      hx-sync="this:queue last"
                    >
                      <input type="hidden" name="_section" value="details" />
                      
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="scheduled-date">Service Date</label>
                        <input id="scheduled-date" name="scheduled_date" type="date" class="uk-input rounded-xl border-2 font-bold h-10 px-2 text-xs" value={job.scheduled_date} />
                      </div>
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="scheduled-time">Arrival Time</label>
                        <input id="scheduled-time" name="scheduled_start_time" type="time" class="uk-input rounded-xl border-2 font-bold h-10 px-2 text-xs" value={job.scheduled_start_time} />
                      </div>
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="duration">Duration</label>
                        <div class="relative">
                          <input id="duration" name="duration_minutes" type="number" min={1} class="uk-input rounded-xl border-2 font-bold h-10 pr-8 pl-2 text-xs" value={job.duration_minutes} />
                          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground uppercase">Min</span>
                        </div>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="provider-id">Provider</label>
                        <select id="provider-id" name="provider_id" class="uk-select rounded-xl border-2 font-bold h-10 px-2 text-xs">
                          <option value="">Unassigned</option>
                          {team.map((p) => <option key={p.id} value={p.id} selected={assignedProviderId === p.id}>{p.first_name} {p.last_name}</option>)}
                        </select>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="base-price">Base Price</label>
                        <div class="relative">
                          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                          <input id="base-price" name="base_price" type="number" step="0.01" class="uk-input rounded-xl border-2 font-bold h-10 pl-6 pr-2 text-xs" value={(job.base_price_cents / 100).toFixed(2)} />
                        </div>
                      </div>
                      <div class="space-y-1">
                        <label class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="total-price">Total Price</label>
                        <div class="relative">
                          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                          <input id="total-price" name="total_price" type="number" step="0.01" class="uk-input rounded-xl border-2 font-bold h-10 pl-6 pr-2 text-xs" value={(job.total_price_cents / 100).toFixed(2)} />
                        </div>
                      </div>
                      
                      <div class="col-span-2 flex items-center justify-between mt-1">
                        <p class="text-[9px] text-muted-foreground/60 font-medium italic flex items-center gap-1.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Auto-save</title><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2"/></svg>
                          Changes auto-save
                        </p>
                        <span class="save-indicator font-black text-[9px] uppercase tracking-widest text-brand"></span>
                      </div>
                    </form>

                    <div class="pt-4 border-t border-border/50">
                       <div class="space-y-4">
                         <div class="space-y-3">
                           <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Work Execution</p>
                           <div class="flex flex-wrap gap-2">
                             {!job.started_at ? (
                               <button
                                 type="button"
                                 class="uk-btn uk-btn-primary flex-1 h-10 rounded-xl font-black shadow-lg shadow-brand/20 transition-all hover:scale-[1.02]"
                                 hx-post={`/admin/jobs/${job.id}/status`}
                                 hx-vals='{"status": "in_progress"}'
                                 hx-target="#page-content"
                                 hx-select="#page-content"
                               >
                                 START JOB
                               </button>
                             ) : job.completed_at ? (
                               <div class="flex-1 bg-muted/50 border border-border/50 h-10 rounded-xl flex items-center justify-center gap-2">
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-brand"><title>Completed</title><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/></svg>
                                 <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Work Completed</span>
                               </div>
                             ) : (
                               <>
                                 {isRunning && (
                                   <button
                                     type="button"
                                     class="uk-btn uk-btn-default h-10 rounded-xl font-black"
                                     style="border-color:var(--badge-primary);color:var(--badge-primary);"
                                     hx-post={`/admin/jobs/${job.id}/pause`}
                                     hx-target="#page-content"
                                     hx-select="#page-content"
                                   >
                                     Pause
                                   </button>
                                 )}
                                 {isPaused && (
                                   <button
                                     type="button"
                                     class="uk-btn uk-btn-primary h-10 rounded-xl font-black"
                                     hx-post={`/admin/jobs/${job.id}/resume`}
                                     hx-target="#page-content"
                                     hx-select="#page-content"
                                   >
                                     Resume
                                   </button>
                                 )}
                                 <button
                                   type="button"
                                   class="uk-btn uk-btn-primary flex-1 h-10 rounded-xl font-black bg-secondary border-secondary shadow-lg shadow-secondary/20 transition-all hover:scale-[1.02]"
                                   hx-post={`/admin/jobs/${job.id}/status`}
                                   hx-vals='{"status": "complete"}'
                                   hx-target="#page-content"
                                   hx-select="#page-content"
                                 >
                                   END JOB
                                 </button>
                               </>
                             )}
                           </div>
                           {workIntervals.length > 0 && (
                             <WorkIntervals jobId={job.id} intervals={workIntervals} isActive={isRunning} />
                           )}
                         </div>

                         <div class="bg-muted/30 rounded-xl p-3 border border-border/40">
                           <p class="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Execution Metrics</p>
                           <div class="grid grid-cols-2 gap-3">
                             <div>
                               <p class="text-[9px] font-bold text-muted-foreground/70 uppercase">Start Time</p>
                               <p class="text-xs font-black">{job.started_at ? new Date(`${job.started_at}Z`).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                             </div>
                             <div>
                               <p class="text-[9px] font-bold text-muted-foreground/70 uppercase">End Time</p>
                               <p class="text-xs font-black">{job.completed_at ? new Date(`${job.completed_at}Z`).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                             </div>
                             <div class="col-span-2 pt-2 mt-1 border-t border-border/30">
                               <p class="text-[9px] font-bold text-muted-foreground/70 uppercase">Actual Duration</p>
                               <p class="text-sm font-black text-brand">{actualDuration !== null ? `${actualDuration} min` : completedIntervalMinutes > 0 ? `${completedIntervalMinutes} min logged` : 'Calculating...'}</p>
                             </div>
                           </div>
                         </div>
                       </div>
                    </div>
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
