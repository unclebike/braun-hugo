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



function computeNoteSpans(notes: Array<{ text: string }>, narrowMax: number, wideMin: number): string[] {
  const types = notes.map(n => n.text.length < narrowMax ? 1 : n.text.length >= wideMin ? 3 : 2);
  const result = [...types];
  let i = 0;
  while (i < result.length) {
    if (result[i] === 1) {
      const start = i;
      while (i < result.length && result[i] === 1) i++;
      const len = i - start;
      const rem = len % 3;
      if (rem === 1 && len >= 4) {
        for (let j = i - 4; j < i; j++) result[j] = 2;
      } else if (rem === 2) {
        for (let j = i - 2; j < i; j++) result[j] = 2;
      }
    } else {
      i++;
    }
  }
  for (let j = 0; j < result.length - 1; j++) {
    if (result[j] === 1 && result[j + 1] === 2) {
      result[j + 1] = 4; j++;
    } else if (result[j] === 2 && result[j + 1] === 1) {
      result[j] = 4; j++;
    }
  }
  for (let k = 0; k < result.length; k++) {
    if (result[k] === 1) {
      const prevOk = k > 0 && (result[k - 1] === 1 || result[k - 1] === 4);
      const nextOk = k < result.length - 1 && (result[k + 1] === 1 || result[k + 1] === 4);
      if (!prevOk && !nextOk) result[k] = 3;
    } else if (result[k] === 2) {
      const prevIs2 = k > 0 && result[k - 1] === 2;
      const nextIs2 = k < result.length - 1 && result[k + 1] === 2;
      if (!prevIs2 && !nextIs2) result[k] = 3;
    }
  }
  return result.map(String);
}

export const NotesList = ({
  jobId,
  notes,
  listId = 'notes-list',
}: {
  jobId: string;
  notes: JobDetailPageProps['notes'];
  listId?: string;
}) => {
  const spans = computeNoteSpans(notes, 12, 38);
  const mobileSpans = computeNoteSpans(notes, 8, 24);
  return (
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
      <div class="py-6 text-center border border-dashed border-border rounded-xl" data-cols-mobile="3" data-cols="3">
        <p class="text-xs text-muted-foreground">No tasks yet.</p>
      </div>
    ) : (
       notes.map((note, idx) => (
            <div key={idx} class={`group relative p-2 rounded-xl border border-border bg-card transition-all cursor-pointer ${note.completed ? 'opacity-60 grayscale-[0.5]' : 'hover:border-brand/50'}`} data-cols={spans[idx]} data-cols-mobile={mobileSpans[idx]} data-task-card="1" {...(note.text.length < 8 ? { 'data-short': '1' } : {})} data-task-text={note.text} data-task-idx={String(idx)} data-task-job-id={jobId} data-task-list-id={listId} data-task-date={new Date(note.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} {...(note.source?.excerpt ? { 'data-task-context': note.source.excerpt } : {})} {...(note.source?.message_id ? { 'data-task-thread-id': note.source.message_id } : {})}>
              <div class="task-meta">
                <span class="task-date">{new Date(note.timestamp).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div class="task-chk">
                <input
                  type="checkbox"
                  class="uk-checkbox w-6 h-6 rounded-md border-2"
                  checked={note.completed ? true : undefined}
                  hx-post={`/admin/jobs/${jobId}/notes/toggle`}
                  hx-vals={JSON.stringify({ noteIndex: idx })}
                  hx-target="closest [data-notes-list]"
                  hx-select={`#${listId} > *`}
                  hx-swap="innerHTML"
                />
              </div>
              <div class="task-content">
                <div class="flex items-center gap-1.5 min-w-0">
                  <p class={`task-txt text-xs leading-snug font-medium ${note.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{note.text}</p>
                  {note.source?.type === 'sms' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0 opacity-50"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
                </div>
              </div>
              <div class="task-actions">
                <button type="button" class="task-action task-action-open" data-action="open" title="Open">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span>Open</span>
                </button>
                <button type="button" class="task-action task-action-edit" data-action="edit" title="Edit">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  <span>Edit</span>
                </button>
                <button type="button" class="task-action task-action-complete"
                  hx-post={`/admin/jobs/${jobId}/notes/toggle`}
                  hx-vals={JSON.stringify({ noteIndex: idx })}
                  hx-target="closest [data-notes-list]"
                  hx-select={`#${listId} > *`}
                  hx-swap="innerHTML"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span>{note.completed ? 'Reopen' : 'Done'}</span>
                </button>
                <button type="button" class="task-action task-action-delete"
                  hx-post={`/admin/jobs/${jobId}/notes/delete`}
                  hx-vals={JSON.stringify({ noteIndex: idx })}
                  hx-target="closest [data-notes-list]"
                  hx-select={`#${listId} > *`}
                  hx-swap="innerHTML"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
                     ))
     )}
  </div>
  );
};

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
      class="rounded-2xl border shadow-sm overflow-hidden"
      style={`background:var(--badge-mauve-bg); border-color:${hasUnread ? 'var(--badge-mauve)' : 'var(--badge-mauve-border)'};`}
      hx-get={`/admin/jobs/${jobId}/sms-thread-card`}
      hx-trigger="every 15s"
      hx-swap="outerHTML"
    >
      {smsThreadMessage ? (
        <div class="grid gap-3 p-4">
          <div class="p-3 rounded-xl border" style="background:var(--bg-card); border-color:var(--badge-mauve-border);">
            <div class="flex items-start justify-between gap-2 mb-1">
              <p class="text-sm leading-relaxed text-foreground italic flex-1">
                {smsThreadMessage.body ? `"${smsThreadMessage.body}"` : 'Conversation linked.'}
              </p>
              {hasUnread && <span class="text-caption-2 font-semibold shrink-0" style="color:var(--badge-mauve);">● Unread</span>}
            </div>
            <p class="text-caption-2 text-muted-foreground font-medium uppercase tracking-widest">
              {updatedLabel ? `Last updated ${updatedLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            class="uk-btn uk-btn-primary w-full py-2.5 font-semibold rounded-xl shadow-md shadow-brand/10"
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
        <div class="py-6 px-4 text-center">
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

export const WorkTimeline = ({
  jobId, intervals, isActive, isPaused, estimatedMinutes, isCompleted,
}: {
  jobId: string;
  intervals: Array<{ started: string; ended: string | null }>;
  isActive: boolean;
  isPaused: boolean;
  estimatedMinutes: number;
  isCompleted: boolean;
}) => {
  const jobStartMs = intervals.length > 0 ? new Date(`${intervals[0].started}Z`).getTime() : null;
  const jobEndMs = isCompleted
    ? Math.max(...intervals.map(i => i.ended ? new Date(`${i.ended}Z`).getTime() : Date.now()))
    : Date.now();
  const totalElapsedMins = jobStartMs ? (jobEndMs - jobStartMs) / 60000 : 0;
  const totalSpan = Math.max(estimatedMinutes, Math.ceil(totalElapsedMins));
  const estimatePct = Math.min(99, (estimatedMinutes / totalSpan) * 100);
  const totalWorkedMins = intervals.reduce((sum, i) => sum + intervalMinutes(i.started, i.ended), 0);

  const segments = jobStartMs ? intervals.map(interval => {
    const leftMins = (new Date(`${interval.started}Z`).getTime() - jobStartMs) / 60000;
    const rightMins = interval.ended
      ? (new Date(`${interval.ended}Z`).getTime() - jobStartMs) / 60000
      : totalElapsedMins;
    return {
      left: Math.min(100, (leftMins / totalSpan) * 100),
      width: Math.min(100 - (leftMins / totalSpan) * 100, ((rightMins - leftMins) / totalSpan) * 100),
      active: !interval.ended,
    };
  }) : [];

  const isOver = totalWorkedMins > estimatedMinutes;

  return (
    <div class="space-y-3">
      <div class="flex gap-2">
        {isActive && (
          <button type="button" class="uk-btn uk-btn-default btn-yellow flex-1 h-10 rounded-xl font-bold" hx-post={`/admin/jobs/${jobId}/pause`} hx-target="#page-content" hx-select="#page-content">Pause</button>
        )}
        {isPaused && (
          <button type="button" class="uk-btn uk-btn-default btn-yellow flex-1 h-10 rounded-xl font-bold" hx-post={`/admin/jobs/${jobId}/resume`} hx-target="#page-content" hx-select="#page-content">Resume</button>
        )}
        {(isActive || isPaused) && (
          <button type="button" class="uk-btn uk-btn-primary flex-1 h-10 rounded-xl font-bold shadow-md shadow-brand/20" hx-post={`/admin/jobs/${jobId}/status`} hx-vals='{"status": "complete"}' hx-target="#page-content" hx-select="#page-content">END JOB</button>
        )}
        {isCompleted && (
          <div class="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 border" style="background:var(--badge-yellow-bg);border-color:var(--badge-yellow-border);">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="color:var(--badge-yellow);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/></svg>
            <span class="text-caption-2 font-semibold uppercase tracking-widest" style="color:var(--badge-yellow);">Work Completed</span>
          </div>
        )}
      </div>

      {intervals.length > 0 && (
        <div class="space-y-1.5">
          <div class="relative h-6 rounded-full overflow-hidden" style="background:var(--badge-yellow-border);">
            {segments.map((seg, i) => (
              <div
                key={i}
                class={`absolute top-0 h-full rounded-sm${seg.active ? ' animate-pulse' : ''}`}
                style={`left:${seg.left.toFixed(2)}%;width:${Math.max(0.5, seg.width).toFixed(2)}%;background:${isOver && !seg.active ? 'var(--destructive)' : 'var(--brand)'};opacity:${seg.active ? '1' : '0.8'};`}
              />
            ))}
            {estimatePct > 1 && estimatePct < 99 && (
              <div class="absolute top-0 h-full w-px z-10" style={`left:${estimatePct.toFixed(2)}%;background:var(--muted-foreground);opacity:0.5;`} />
            )}
          </div>
          <div class="flex justify-between items-baseline">
            <span class={`text-caption-2 font-semibold tabular-nums${isOver ? ' text-destructive' : ' text-brand'}`}>
              {Math.round(totalWorkedMins)}min{isActive ? ' ●' : ''}
            </span>
            <span class="text-caption-2 text-muted-foreground">{estimatedMinutes}min est.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ServiceTasksList = ({ jobId, tasks, serviceName }: { jobId: string; tasks: ServiceTask[]; serviceName: string }) => {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed || t.answer).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const requiredPending = tasks.filter(t => Boolean(t.is_required) && !t.completed && !t.answer);
  const allDone = pct === 100;

  const hxAttrs = (taskId: string, action: string) => ({
    [`hx-post`]: `/admin/jobs/${jobId}/service-tasks/${taskId}/${action}`,
    [`hx-target`]: '#service-tasks-list',
    [`hx-select`]: '#service-tasks-list',
    [`hx-swap`]: 'outerHTML',
  });

  return (
     <div id="service-tasks-list" class="rounded-2xl border border-border shadow-sm overflow-hidden" style="background:var(--bg-mantle);">
      <div style="padding:12px 16px 10px; background:var(--bg-inset)">
        <div class="flex items-center justify-between mb-2">
          <span class={`text-caption-2 font-semibold tabular-nums uppercase tracking-wider ${allDone ? 'text-brand' : 'text-muted-foreground'}`}>
            {done}/{total} complete
          </span>
          {allDone ? (
            <span class="text-caption-2 font-semibold text-brand uppercase tracking-wider">✓ Done</span>
          ) : requiredPending.length > 0 ? (
            <span class="text-caption-2 font-semibold text-destructive uppercase tracking-wider">{requiredPending.length} required</span>
          ) : null}
        </div>
        <div class="h-1 rounded-full overflow-hidden" style="background:var(--border);">
          <div
            class="h-full rounded-full"
            style={`width:${pct}%;background:${allDone ? 'var(--brand)' : 'var(--badge-primary)'};transition:width .3s ease;`}
          />
        </div>
      </div>

      <div style="border-top:1px solid var(--border);">
        {tasks.map((task, idx) => {
          const isDone = Boolean(task.completed || task.answer);
          const isRequired = Boolean(task.is_required);
          const isLast = idx === tasks.length - 1;
           return (
             <div
               key={task.id}
               class={`flex items-start gap-3 px-4 py-3${!isLast ? ' border-b border-border' : ''}${isDone ? ' opacity-60' : ''}`} style="background:var(--bg-card);"
             >
               <div class="flex-1 min-w-0">
                 <div class="flex items-center gap-2 mb-2">
                   <p class={`text-sm font-medium leading-snug${isDone ? ' line-through text-muted-foreground' : ''}`}>
                     {task.title}
                   </p>
                   {isRequired && !isDone && (
                     <span class="text-caption-2 font-semibold uppercase tracking-wider text-destructive border border-current rounded px-1 shrink-0">Required</span>
                   )}
                   {isDone && (
                     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-brand shrink-0" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                   )}
                 </div>

                 {task.type === 'check' && (
                   <button type="button" class={`text-caption-2 font-semibold uppercase tracking-wider px-3 py-1 rounded-lg border transition-all${isDone ? ' border-brand text-brand' : ' border-border text-muted-foreground hover:border-brand/50 hover:text-brand'}`} {...hxAttrs(task.id, 'toggle')}>
                     {isDone ? 'Undo' : 'Mark done'}
                   </button>
                 )}

                 {task.type === 'yesno' && !isDone && (
                   <div class="flex gap-2">
                     <button type="button" class="text-caption-2 font-semibold uppercase tracking-wider px-3 py-1 rounded-lg border border-border text-muted-foreground hover:border-brand/50 hover:text-brand transition-all" {...hxAttrs(task.id, 'answer')} hx-vals='{"answer":"yes"}'>Yes</button>
                     <button type="button" class="text-caption-2 font-semibold uppercase tracking-wider px-3 py-1 rounded-lg border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-all" {...hxAttrs(task.id, 'answer')} hx-vals='{"answer":"no"}'>No</button>
                   </div>
                 )}

                 {task.type === 'yesno' && isDone && (
                   <div class="flex items-center gap-2">
                     <span class={`text-caption-2 font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg${task.answer === 'yes' ? ' bg-brand/10 text-brand' : ' bg-destructive/10 text-destructive'}`}>
                       {task.answer === 'yes' ? 'Yes' : 'No'}
                     </span>
                     <button type="button" class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors" {...hxAttrs(task.id, 'clear')}>Clear</button>
                   </div>
                 )}

                 {task.type === 'text' && !isDone && (
                   <form class="flex gap-2 mt-1" hx-post={`/admin/jobs/${jobId}/service-tasks/${task.id}/answer`} hx-target="#service-tasks-list" hx-select="#service-tasks-list" hx-swap="outerHTML">
                     <input type="text" name="answer" class="uk-input text-xs h-8 flex-1 rounded-lg" placeholder="Type answer…" required />
                     <button type="submit" class="uk-btn uk-btn-default uk-btn-sm text-caption-2 font-semibold rounded-lg">Save</button>
                   </form>
                 )}

                 {task.type === 'text' && isDone && (
                   <div class="flex items-center gap-2">
                     <span class="text-xs italic text-muted-foreground">"{task.answer}"</span>
                     <button type="button" class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors" {...hxAttrs(task.id, 'clear')}>Edit</button>
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

function timeAgo(ts: string): string {
  const d = new Date(`${ts}Z`);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

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
  const loggedMinutes = actualDuration !== null ? actualDuration : completedIntervalMinutes > 0 ? completedIntervalMinutes : null;

  return (
    <Layout title={`${customerName} - ${serviceName}`}>
      <div class="job-content-wrap">
        <div class="mx-auto max-w-[1400px]">

          {/* Customer Command & Status Panel */}
          <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-6">
            <div class="job-cp-top flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-sm" style="background:var(--badge-primary-bg);color:var(--badge-primary);" aria-hidden="true">
                {(customerName?.charAt(0) ?? '?').toUpperCase()}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <a href="/admin/jobs" class="text-muted-foreground hover:text-foreground transition-colors shrink-0" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-push-url="true" aria-label="Back to Jobs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Back to Jobs</title><path d="M19 12H5m7 7-7-7 7-7"/></svg>
                  </a>
                  <h2 class="text-base font-black tracking-tight leading-none truncate" style="margin:0;">{customerName}</h2>
                </div>
                <p class="text-caption-2 text-muted-foreground uppercase tracking-wider truncate">{serviceName}</p>
              </div>
              <div class="flex gap-1.5 shrink-0">
                {customer?.phone && (
                  <a href={`tel:${customer.phone}`} class="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-brand/10 hover:text-brand transition-colors" aria-label={`Call ${customerName}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Call customer</title><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07a19.5 19.74 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </a>
                )}
                {customer?.email && (
                  <a href={`mailto:${customer.email}`} class="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-brand/10 hover:text-brand transition-colors" aria-label={`Email ${customerName}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Email customer</title><path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/></svg>
                  </a>
                )}
                {customer?.id && (
                  <a href={`/admin/customers/${customer.id}/edit`} class="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-brand/10 hover:text-brand transition-colors" hx-get={`/admin/customers/${customer.id}/edit`} hx-target="#page-content" hx-select="#page-content" hx-push-url="true" aria-label="View customer profile">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Customer profile</title><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div class="job-stat-chips border-t border-border px-3">
              {!job.started_at && (
                <button type="button" aria-label="Start Job" class="job-stat-chip-btn" hx-post={`/admin/jobs/${job.id}/status`} hx-vals='{"status": "in_progress"}' hx-target="#page-content" hx-select="#page-content" style="color:var(--brand);border-color:var(--brand);background:var(--badge-primary-bg);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
              )}
              {isRunning && (
                <button type="button" aria-label="Pause Job" class="job-stat-chip-btn" hx-post={`/admin/jobs/${job.id}/pause`} hx-target="#page-content" hx-select="#page-content" style="color:var(--badge-primary);border-color:var(--badge-primary);background:var(--badge-primary-bg);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                </button>
              )}
              {isPaused && (
                <button type="button" aria-label="Resume Job" class="job-stat-chip-btn" hx-post={`/admin/jobs/${job.id}/resume`} hx-target="#page-content" hx-select="#page-content" style="color:var(--brand);border-color:var(--brand);background:var(--badge-primary-bg);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
              )}
              {(isRunning || isPaused) && (
                <button type="button" aria-label="End Job" class="job-stat-chip-btn" hx-post={`/admin/jobs/${job.id}/status`} hx-vals='{"status": "complete"}' hx-target="#page-content" hx-select="#page-content" style="color:var(--destructive);border-color:var(--destructive);background:var(--destructive-soft);">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                </button>
              )}
              <a href="#logistics" class="job-stat-chip" style="text-decoration:none; color:inherit;">
                <span class="job-stat-chip-label">Time</span>
                <span class="job-stat-chip-value">{isRunning ? '● Live' : loggedMinutes !== null ? `${loggedMinutes}min` : '—'} / {job.duration_minutes}min</span>
              </a>
              <button
                type="button"
                class={`job-stat-chip job-stat-chip-msg${smsThreadMessage?.is_read === 0 ? ' job-stat-chip-msg--unread' : ''}`}
                {...(canOpenSms ? {
                  'data-sms-thread-modal-open': 'true',
                  'data-sms-thread-modal-title': smsTitle,
                  'hx-get': `/admin/inbox/${smsThreadMessage?.id}/sms-thread-panel`,
                  'hx-target': '#sms-thread-modal-body',
                  'hx-swap': 'innerHTML',
                  'hx-indicator': '#sms-thread-modal-loading',
                } : {})}
                disabled={!canOpenSms}
              >
                <div class="job-stat-chip-msg-header">
                  <span class="job-stat-chip-label">{smsThreadMessage?.is_read === 0 ? '● Messages' : 'Messages'}</span>
                  {smsThreadMessage && <span class="job-stat-chip-time">{timeAgo(smsThreadMessage.updated_at)}</span>}
                </div>
                <span class="job-stat-chip-preview">
                  {smsThreadMessage?.body
                    ? smsThreadMessage.body.length > 48 ? `${smsThreadMessage.body.slice(0, 48)}…` : smsThreadMessage.body
                    : canOpenSms ? 'Tap to open thread' : 'No thread'}
                </span>
              </button>
              <div class="job-stat-chip job-stat-chip-status">
                <span class="job-stat-chip-label">Status</span>
                <span class="job-stat-chip-value">{job.status.replace(/_/g, ' ')}</span>
                <select name="status" data-current={job.status} hx-post={`/admin/jobs/${job.id}/status`} hx-target="#page-content" hx-select="#page-content" hx-trigger="change">
                  {STATUS_OPTIONS.map((status) => (
                    <option value={status} selected={job.status === status} key={status}>{status.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {completeBlocked && completeBlockers && completeBlockers.length > 0 && (
            <div class="mb-6 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6">
              <div class="flex items-start gap-3 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-destructive mt-0.5 shrink-0"><title>Blocked</title><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div>
                  <p class="text-sm font-bold text-destructive mb-1">Cannot complete — required checklist items unfinished</p>
                  <ul class="text-xs text-muted-foreground space-y-0.5">
                    {completeBlockers.map((b, i) => <li key={i}>• {b}</li>)}
                  </ul>
                </div>
              </div>
              <details class="group">
                <summary class="text-xs font-semibold uppercase tracking-widest text-destructive/80 cursor-pointer hover:text-destructive">Override & complete anyway →</summary>
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
                    <button type="submit" class="uk-btn uk-btn-sm font-bold uppercase tracking-widest rounded-xl" style="background:var(--destructive);color:#fff;border-color:var(--destructive);">
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
                  <div class="flex items-center justify-between mb-4 px-1">
                    <h3 class="text-sm sm:text-lg font-bold tracking-tight leading-none">Service Checklist</h3>
                  </div>
                  <ServiceTasksList jobId={job.id} tasks={serviceTasks} serviceName={service?.name || 'Service'} />
                </section>
              )}

              <section id="tasks">
                <div class="flex items-center justify-between mb-4 px-1">
                  <h3 class="text-sm sm:text-lg font-bold tracking-tight leading-none">Notes</h3>
                  {notes.length > 0 && <span class="text-caption-2 font-semibold tabular-nums" style="color:var(--badge-peach);">{notes.length}</span>}
                </div>

                <div class="rounded-2xl border shadow-sm overflow-hidden" style="background:var(--badge-peach-bg); border-color:var(--badge-peach-border);">
                  <div class="p-3">
                    <NotesList jobId={job.id} notes={notes} listId="notes-main-list" />
                  </div>
                  <div class="border-t border-border p-2">
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
                        class="uk-input border-0 focus:ring-0 bg-transparent text-sm font-medium placeholder:text-muted-foreground/50 h-10 px-3 flex-1 rounded-xl"
                        placeholder="New task..."
                        required
                      />
                      <button type="submit" class="uk-btn uk-btn-primary px-5 rounded-xl font-bold shadow-md text-sm">Add</button>
                    </form>
                  </div>
                </div>
               </section>

              <section id="conversation">
                <div class="flex items-center justify-between mb-4 px-1">
                  <h3 class="text-sm sm:text-lg font-bold tracking-tight leading-none">Messages</h3>
                </div>
                <SmsThreadCard jobId={job.id} smsThreadMessage={smsThreadMessage} customerName={customerName} />
              </section>

              <section id="billing">
                <div class="flex items-center justify-between mb-4 px-1">
                  <h3 class="text-sm sm:text-lg font-bold tracking-tight leading-none">Billing</h3>
                  <span class="text-sm font-bold tabular-nums" style="color:var(--badge-teal);">{money(subtotal)}</span>
                </div>

                <div class="rounded-2xl border shadow-sm overflow-hidden" style="background:var(--badge-teal-bg); border-color:var(--badge-teal-border);">
                  <div class="divide-y divide-border/50">
                    {lineItems.map((line) => (
                      <details class="group" key={line.id}>
                        <summary class={`p-4 ${line.parent_id ? 'pl-8' : ''} cursor-pointer list-none select-none`}>
                          <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                              <p class="text-sm font-semibold text-foreground leading-tight">{line.description}</p>
                              <p class="text-caption-2 text-muted-foreground mt-1 uppercase font-semibold tracking-tighter">
                                {line.quantity} × {money(line.unit_price_cents)} • <span class="text-brand/80">{line.kind}</span>
                              </p>
                            </div>
                            <div class="text-right shrink-0 flex flex-col items-end gap-1">
                              <p class="text-sm font-bold text-foreground">{money(line.total_cents)}</p>
                              <span class="text-caption-2 text-muted-foreground/50 uppercase font-semibold tracking-widest group-open:hidden">Edit</span>
                            </div>
                          </div>
                        </summary>
                        <div class={`px-4 pb-4 bg-surface ${line.parent_id ? 'pl-8' : ''}`}>
                          <form
                            hx-post={`/admin/jobs/${job.id}/line-items/edit`}
                            hx-target="#page-content"
                            hx-select="#page-content"
                            hx-swap="innerHTML"
                            class="grid gap-3 pt-3"
                          >
                            <input type="hidden" name="lineId" value={line.id} />
                            <div class="grid gap-1.5">
                              <label for={`edit-desc-${line.id}`} class="text-caption-2 font-semibold uppercase tracking-widest text-muted-foreground ml-1">Description</label>
                              <input id={`edit-desc-${line.id}`} type="text" name="description" class="uk-input text-xs h-10 rounded-xl border-2 border-border bg-card font-semibold" value={line.description} required />
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                              <div class="grid gap-1.5">
                                <label for={`edit-price-${line.id}`} class="text-caption-2 font-semibold uppercase tracking-widest text-muted-foreground ml-1">Unit Price</label>
                                <div class="relative">
                                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                                  <input id={`edit-price-${line.id}`} type="number" name="unit_price" class="uk-input text-xs h-10 rounded-xl border-2 border-border bg-card pl-6 font-semibold" min={0} step={0.01} value={(line.unit_price_cents / 100).toFixed(2)} required />
                                </div>
                              </div>
                              <div class="grid gap-1.5">
                                <label for={`edit-qty-${line.id}`} class="text-caption-2 font-semibold uppercase tracking-widest text-muted-foreground ml-1">Quantity</label>
                                <input id={`edit-qty-${line.id}`} type="number" name="quantity" class="uk-input text-xs h-10 rounded-xl border-2 border-border bg-card font-semibold" min={1} step={1} value={line.quantity} required />
                              </div>
                            </div>
                            <div class="flex gap-2">
                              <button type="submit" class="uk-btn uk-btn-primary flex-1 py-2 text-caption-2 font-semibold uppercase tracking-widest h-10 rounded-xl shadow-sm">Save</button>
                              {line.is_custom === 1 && (
                                <button
                                  type="button"
                                  class="uk-btn uk-btn-destructive py-2 text-caption-2 font-semibold uppercase tracking-widest h-10 rounded-xl px-4"
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
                          </form>
                        </div>
                      </details>
                    ))}
                    {lineItems.length === 0 && (
                      <div class="p-8 text-center text-xs text-muted-foreground italic">No billing items recorded.</div>
                    )}
                  </div>

                  <details class="border-t border-border">
                    <summary class="px-4 py-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-surface transition-colors list-none select-none">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="text-brand"><path d="M12 5v14M5 12h14"/></svg>
                      <span class="text-caption-2 font-semibold uppercase tracking-widest text-brand">Add Item</span>
                    </summary>
                    <div class="p-4 bg-surface">
                      <form hx-post={`/admin/jobs/${job.id}/line-items/add`} hx-target="#page-content" hx-select="#page-content" hx-swap="innerHTML" class="grid gap-3">
                        <div class="grid gap-1.5">
                          <label for="new-line-desc" class="text-caption-2 font-semibold uppercase tracking-widest text-muted-foreground ml-1">New Line Description</label>
                          <input id="new-line-desc" type="text" name="description" class="uk-input text-xs h-10 rounded-xl border-2 border-border bg-card font-semibold" placeholder="e.g. Extra deep cleaning" required />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                          <div class="grid gap-1.5">
                            <label for="new-line-price" class="text-caption-2 font-semibold uppercase tracking-widest text-muted-foreground ml-1">Unit Price</label>
                            <div class="relative">
                              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                              <input id="new-line-price" type="number" name="unit_price" class="uk-input text-xs h-10 rounded-xl border-2 border-border bg-card pl-6 font-semibold" min={0} step={0.01} placeholder="0.00" required />
                            </div>
                          </div>
                          <div class="grid gap-1.5">
                            <label for="new-line-qty" class="text-caption-2 font-semibold uppercase tracking-widest text-muted-foreground ml-1">Quantity</label>
                            <input id="new-line-qty" type="number" name="quantity" class="uk-input text-xs h-10 rounded-xl border-2 border-border bg-card font-semibold" min={1} step={1} value="1" required />
                          </div>
                        </div>
                        <button type="submit" class="uk-btn uk-btn-default w-full py-2 text-caption-2 font-semibold uppercase tracking-widest h-10 mt-1 rounded-xl shadow-sm">Add Billing Item</button>
                      </form>
                    </div>
                  </details>
                </div>
              </section>
            </div>

            <aside class="grid gap-8 content-start">
              <section id="logistics">
                <div class="flex items-center justify-between mb-4 px-1">
                  <h3 class="text-sm sm:text-lg font-bold tracking-tight leading-none">Logistics & Timing</h3>
                  <span class="text-caption-2 font-semibold" style="color:var(--badge-yellow);">{dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}</span>
                </div>
                <div class="rounded-2xl border shadow-sm overflow-hidden" style="background:var(--badge-yellow-bg); border-color:var(--badge-yellow-border);">
                  <div class="p-4 space-y-4">
                    <div class="space-y-3 rounded-xl p-3" style="background:var(--bg-card); border:1px solid var(--badge-yellow-border);">
                      <p class="text-caption-2 font-semibold uppercase tracking-widest" style="color:var(--badge-yellow);">Work Execution</p>
                      {!job.started_at ? (
                        <button type="button" class="uk-btn uk-btn-primary w-full h-12 rounded-xl font-bold shadow-lg shadow-brand/20 transition-all hover:scale-[1.02] text-base" hx-post={`/admin/jobs/${job.id}/status`} hx-vals='{"status": "in_progress"}' hx-target="#page-content" hx-select="#page-content">START JOB</button>
                      ) : (
                        <WorkTimeline jobId={job.id} intervals={workIntervals} isActive={isRunning} isPaused={isPaused} estimatedMinutes={job.duration_minutes} isCompleted={Boolean(job.completed_at)} />
                      )}
                    </div>
                    <div class="rounded-xl p-3 border" style="background:var(--bg-card); border-color:var(--badge-yellow-border);">
                      <p class="text-caption-2 font-semibold uppercase tracking-widest mb-2" style="color:var(--badge-yellow);">Execution Metrics</p>
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <p class="text-caption-2 font-semibold text-muted-foreground/70 uppercase">Start Time</p>
                          <p class="text-xs font-bold">{job.started_at ? new Date(`${job.started_at}Z`).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                        </div>
                        <div>
                          <p class="text-caption-2 font-semibold text-muted-foreground/70 uppercase">End Time</p>
                          <p class="text-xs font-bold">{job.completed_at ? new Date(`${job.completed_at}Z`).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                        </div>
                        <div class="col-span-2 pt-2 mt-1 border-t" style="border-color:var(--badge-yellow-border);">
                          <p class="text-caption-2 font-semibold text-muted-foreground/70 uppercase">Actual Duration</p>
                          <p class="text-sm font-bold text-brand">{actualDuration !== null ? `${actualDuration} min` : completedIntervalMinutes > 0 ? `${completedIntervalMinutes} min logged` : 'Calculating...'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <details class="border-t border-border">
                    <summary class="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface transition-colors list-none select-none">
                      <span class="text-caption-2 font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Schedule</span>
                      <span class="text-xs font-medium text-muted-foreground/70 flex-1 truncate">{dateLabel} · {timeLabel || 'TBD'} · {providerName} · {job.duration_minutes}min</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0 text-muted-foreground"><path d="M6 9l6 6 6-6"/></svg>
                    </summary>
                    <div class="p-4 pt-2">
                      <form class="autosave grid gap-x-3 gap-y-3 grid-cols-2" hx-post={`/admin/jobs/${job.id}`} hx-target="#page-content" hx-select="#page-content" hx-swap="none" hx-trigger="input delay:800ms, change" hx-sync="this:queue last">
                        <input type="hidden" name="_section" value="details" />
                        <div class="space-y-1">
                          <label class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground ml-1" for="scheduled-date">Service Date</label>
                          <input id="scheduled-date" name="scheduled_date" type="date" class="uk-input rounded-xl border-2 font-semibold h-10 px-2 text-xs" value={job.scheduled_date} />
                        </div>
                        <div class="space-y-1">
                          <label class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground ml-1" for="scheduled-time">Arrival Time</label>
                          <input id="scheduled-time" name="scheduled_start_time" type="time" class="uk-input rounded-xl border-2 font-semibold h-10 px-2 text-xs" value={job.scheduled_start_time} />
                        </div>
                        <div class="space-y-1">
                          <label class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground ml-1" for="duration">Duration</label>
                          <div class="relative">
                            <input id="duration" name="duration_minutes" type="number" min={1} class="uk-input rounded-xl border-2 font-semibold h-10 pr-8 pl-2 text-xs" value={job.duration_minutes} />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-caption-2 font-semibold text-muted-foreground uppercase">Min</span>
                          </div>
                        </div>
                        <div class="space-y-1">
                          <label class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground ml-1" for="provider-id">Provider</label>
                          <select id="provider-id" name="provider_id" class="uk-select rounded-xl border-2 font-semibold h-10 px-2 text-xs">
                            <option value="">Unassigned</option>
                            {team.map((p) => <option key={p.id} value={p.id} selected={assignedProviderId === p.id}>{p.first_name} {p.last_name}</option>)}
                          </select>
                        </div>
                        <div class="space-y-1">
                          <label class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground ml-1" for="base-price">Base Price</label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                            <input id="base-price" name="base_price" type="number" step="0.01" class="uk-input rounded-xl border-2 font-semibold h-10 pl-6 pr-2 text-xs" value={(job.base_price_cents / 100).toFixed(2)} />
                          </div>
                        </div>
                        <div class="space-y-1">
                          <label class="text-caption-2 font-semibold uppercase tracking-wider text-muted-foreground ml-1" for="total-price">Total Price</label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                            <input id="total-price" name="total_price" type="number" step="0.01" class="uk-input rounded-xl border-2 font-semibold h-10 pl-6 pr-2 text-xs" value={(job.total_price_cents / 100).toFixed(2)} />
                          </div>
                        </div>
                        <div class="col-span-2 flex items-center justify-between mt-1">
                          <p class="text-caption-2 text-muted-foreground/60 font-medium italic flex items-center gap-1.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><title>Auto-save</title><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2"/></svg>
                            Changes auto-save
                          </p>
                          <span class="save-indicator font-semibold text-caption-2 uppercase tracking-widest text-brand"></span>
                        </div>
                      </form>
                    </div>
                  </details>
                </div>
              </section>



              <div class="mt-4 pt-8 border-t border-border">
                <button
                  type="button"
                  class="delete-btn w-full py-3 font-semibold uppercase tracking-widest text-caption-2 rounded-xl shadow-sm"
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
