// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx } from 'hono/jsx';
import { formatTorontoDate, formatTorontoTime } from '../utils/datetime';
import { StatusIcon } from './components';
import { Layout } from './layout';

interface Message {
  id: string;
  source: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  reason: string | null;
  subject: string | null;
  body: string | null;
  metadata: string | null;
  is_read: number;
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsLogRow {
  id: string;
  direction: string;
  body: string;
  status: string;
  created_at: string;
  segments: number;
}

interface Props {
  message: Message;
  smsHistory: SmsLogRow[];
  twilioEnabled: boolean;
  phoneE164: string | null;
  jobOptions: Array<{ id: string; label: string }>;
  selectedJobId: string | null;
  completedTaskSmsIds: string[];
  sendResult?: { success: boolean; error?: string } | null;
  taskResult?: { success: boolean; error?: string; message?: string } | null;
}

interface MessageMeta {
  street_address?: string;
  apt_suite?: string;
  city?: string;
  province?: string;
  country?: string;
  company?: string;
  other?: string;
}

const sourceBadge = (source: string) => {
  const cls: Record<string, string> = {
    contact: 'uk-label uk-label-primary',
    newsletter: 'uk-label uk-label-secondary',
    registration: 'uk-label',
    sms: 'uk-label uk-label-secondary',
  };
  return <span class={cls[source] || 'uk-label'}>{source}</span>;
};

const statusBadge = (status: string) => {
  const cls: Record<string, string> = {
    new: 'uk-label uk-label-destructive',
    read: 'uk-label uk-label-secondary',
    replied: 'uk-label uk-label-primary',
    archived: 'uk-label',
  };
  if (status === 'read') {
    return <StatusIcon status="read" />;
  }
  return <span class={cls[status] || 'uk-label'}>{status}</span>;
};

const smsStatusBadge = (status: string) => {
  if (status === 'sent') {
    return (
      <span title="sent" style="display:inline-flex;align-items:center;opacity:0.88;color:inherit;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6L9 17L4 12"></path>
        </svg>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span title="delivered" style="display:inline-flex;align-items:center;opacity:0.94;color:inherit;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 7L9 16L6 13"></path>
          <path d="M22 7L13 16L12 15"></path>
        </svg>
      </span>
    );
  }
  const map: Record<string, { cls: string; label: string }> = {
    failed: { cls: 'uk-label uk-label-destructive', label: 'failed' },
    undelivered: { cls: 'uk-label uk-label-destructive', label: 'undelivered' },
    queued: { cls: 'uk-label', label: 'queued' },
    received: { cls: 'uk-label uk-label-secondary', label: 'received' },
  };
  const info = map[status] || { cls: 'uk-label', label: status };
  return <span class={info.cls} style="font-size:10px;padding:1px 6px;">{info.label}</span>;
};

const formatDate = (d: string | null) => {
  if (!d) return '-';
  return formatTorontoDate(`${d}Z`, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || '-';
};

const formatTime = (d: string) => {
  return formatTorontoTime(`${d}Z`, { hour: '2-digit', minute: '2-digit' }) || d;
};

const smsBodyText = (sms: SmsLogRow) => (typeof sms.body === 'string' ? sms.body.trim() : '');

export const SmsHistoryList = ({
  smsHistory,
  messageId,
  canCreateTask,
  jobOptions,
  selectedJobId,
  completedTaskSmsIds,
}: {
  smsHistory: SmsLogRow[];
  messageId: string;
  canCreateTask: boolean;
  jobOptions: Array<{ id: string; label: string }>;
  selectedJobId: string | null;
  completedTaskSmsIds: string[];
}) => {
  const completedSet = new Set(completedTaskSmsIds);
  return (
    <div style="display:flex;flex-direction:column;gap:8px;">
      {smsHistory.length > 0 && (
        smsHistory
          .filter((sms) => smsBodyText(sms).length > 0)
          .map((sms) => {
            const taskCompleted = completedSet.has(sms.id);
            return (
              <div key={sms.id} style={`display:flex;${sms.direction === 'outbound' ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}`}>
                <div style={`max-width:80%;padding:8px 12px;border-radius:12px;display:flex;flex-direction:column;gap:6px;${sms.direction === 'outbound'
                  ? 'background:var(--brand,#dc8a78);color:var(--on-brand, #1e1e2e);border:1px solid rgba(0,0,0,0.06);border-bottom-right-radius:4px;'
                  : 'background:var(--surface-elevated,#eff1f5);color:var(--text-primary,#333);border:1px solid var(--border,#ccd0da);border-bottom-left-radius:4px;'}`}>
                  <div class="text-sm" style="white-space:pre-wrap;word-break:break-word;">{smsBodyText(sms)}</div>
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style={`font-size:11px;opacity:0.7;${sms.direction === 'outbound' ? 'color:#fff;' : ''}`}>{formatTime(sms.created_at)}</span>
                    <div style="display:flex;align-items:center;gap:6px;">
                      {sms.direction === 'outbound' && smsStatusBadge(sms.status)}
                      {sms.direction === 'inbound' && canCreateTask && !taskCompleted && (
                        <button
                          type="button"
                          class="uk-btn uk-btn-default uk-btn-small"
                          data-sms-task-url={`/admin/inbox/${messageId}/sms-task`}
                          data-sms-log-id={sms.id}
                          data-selected-job-id={selectedJobId || ''}
                          data-job-options={JSON.stringify(jobOptions)}
                          data-task-suggested-title={smsBodyText(sms).replace(/\s+/g, ' ').slice(0, 72)}
                          aria-label="Add task to job"
                          title="Add task to job"
                          style="padding:0;min-height:24px;min-width:24px;width:24px;height:24px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 5V19"></path>
                            <path d="M5 12H19"></path>
                          </svg>
                        </button>
                      )}
                      {sms.direction === 'inbound' && canCreateTask && taskCompleted && (
                        <span
                          class="uk-label uk-label-secondary"
                          title="Task complete"
                          style="padding:0;min-width:24px;height:24px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(34,197,94,0.14);color:#15803d;border:1px solid rgba(21,128,61,0.35);"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M20 6L9 17L4 12"></path>
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
      )}
    </div>
  );
};

export const SmsThreadPanel = ({ messageId, smsHistory, twilioEnabled, phoneE164, customerName, jobOptions, selectedJobId, completedTaskSmsIds, sendResult, taskResult }: {
  messageId: string;
  smsHistory: SmsLogRow[];
  twilioEnabled: boolean;
  phoneE164: string | null;
  customerName?: string | null;
  jobOptions: Array<{ id: string; label: string }>;
  selectedJobId: string | null;
  completedTaskSmsIds: string[];
  sendResult?: { success: boolean; error?: string } | null;
  taskResult?: { success: boolean; error?: string; message?: string } | null;
}) => {
  if (!twilioEnabled || !phoneE164) return null;
  const visibleSms = smsHistory.filter((sms) => smsBodyText(sms).length > 0);
  const lastSms = visibleSms.length > 0 ? visibleSms[visibleSms.length - 1] : null;
  const canCreateTask = jobOptions.length > 0;

  return (
  <div id="sms-thread-panel" class="uk-card uk-card-body">
     <div class="flex items-start justify-between gap-3 pb-3 mb-3" style="border-bottom:1px solid var(--border);" data-sms-thread-header="1">
      <div class="min-w-0">
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Thread</p>
        {customerName && (
          <span data-sms-thread-customer-name="1" style="display:none;">{customerName}</span>
        )}
        <h3 class="text-sm font-semibold truncate" style="margin-top:2px;" data-sms-thread-phone="1">{phoneE164}</h3>
        <p class="text-xs text-muted-foreground" style="margin-top:2px;">
          {visibleSms.length} message{visibleSms.length === 1 ? '' : 's'}
          {lastSms ? ` • Last ${formatTime(lastSms.created_at)}` : ''}
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          class="uk-btn uk-btn-default uk-btn-sm"
          data-sms-thread-modal-open="move"
          data-sms-thread-modal-title={customerName || ''}
          aria-label="Open conversation full screen"
          style="padding:0 10px;"
        >
          Full screen
        </button>
        <span class="uk-label uk-label-secondary">Live</span>
      </div>
    </div>

    {sendResult && !sendResult.success && (
      <div class="text-sm mb-3 px-3 py-2 rounded bg-red-50 text-red-700" data-sms-send-result="error" style="background:rgba(239,68,68,0.1);color:#dc2626;">
        {`Failed: ${sendResult.error}`}
      </div>
    )}

    {taskResult && (
      <div class={`text-sm mb-3 px-3 py-2 rounded ${taskResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
           style={taskResult.success ? 'background:rgba(34,197,94,0.1);color:#15803d;' : 'background:rgba(239,68,68,0.1);color:#dc2626;'}>
        {taskResult.success ? (taskResult.message || 'Task added to job') : `Task not added: ${taskResult.error}`}
      </div>
    )}

    {!canCreateTask && (
      <p class="text-xs text-muted-foreground mb-3" style="margin-top:0;">No jobs found for this customer yet.</p>
    )}

    <div data-sms-thread-body="1">
      {(visibleSms.length > 0 || sendResult) && (
        <div
          id="sms-history-scroll"
          style="max-height:400px;overflow-y:auto;padding:8px 0;"
        >
          <div
            id="sms-history"
            hx-get={`/admin/inbox/${messageId}/sms-thread`}
            hx-trigger="load, every 5s"
            hx-vals={`js:{_ts: Date.now()}`}
            hx-swap="innerHTML"
          >
            <SmsHistoryList
              smsHistory={smsHistory}
              messageId={messageId}
              canCreateTask={canCreateTask}
              jobOptions={jobOptions}
              selectedJobId={selectedJobId}
              completedTaskSmsIds={completedTaskSmsIds}
            />
          </div>
        </div>
      )}
      <form
        hx-post={`/admin/inbox/${messageId}/sms-reply`}
        hx-target="#sms-thread-panel"
        hx-swap="outerHTML"
        style="margin-top:12px;display:flex;flex-direction:column;gap:8px;"
      >
        <textarea
          name="sms_body"
          class="uk-textarea"
          rows={3}
          placeholder="Write a reply..."
          style="resize:vertical;min-height:84px;font-size:16px;"
          maxlength={1600}
          oninput="var c=this.value.length;var s=c<=160?1:Math.ceil(c/153);var n=this.form&&this.form.querySelector('[data-sms-counter]');if(n){n.textContent=c+' chars · '+s+' segment'+(s>1?'s':'');}"
        ></textarea>
        <div class="flex items-center justify-between gap-3" style="flex-wrap:wrap;">
          <span class="text-xs text-muted-foreground" data-sms-counter>0 chars · 1 segment</span>
          <button
            type="submit"
            class="uk-btn uk-btn-primary uk-btn-sm"
            data-sms-send-success={sendResult?.success ? 'true' : 'false'}
            style={sendResult?.success
              ? 'min-width:110px;background:#16a34a;border-color:#15803d;color:#fff;'
              : 'min-width:110px;'}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};

export const MessageDetailPage = ({ message, smsHistory, twilioEnabled, phoneE164, jobOptions, selectedJobId, completedTaskSmsIds, sendResult, taskResult }: Props) => {
  let meta: MessageMeta | null = null;
  if (message.metadata) {
    try {
      meta = JSON.parse(message.metadata) as MessageMeta;
    } catch {
      meta = null;
    }
  }
  const senderName = [message.first_name, message.last_name].filter(Boolean).join(' ') || message.email || 'Unknown';
  const showMessageBody = Boolean(message.body && message.body.trim().length > 0);
  const hasSmsContent = smsHistory.some((sms) => sms.body && sms.body.trim().length > 0);
  const showSmsPanel = twilioEnabled && !!phoneE164 && (hasSmsContent || !!sendResult || !!taskResult);
  const hasMetaDetails = Boolean(
    meta && Object.values(meta).some((val) => typeof val === 'string' && val.trim().length > 0)
  );

  return (
    <Layout title={`Message — ${senderName}`}>
      <div class="page-header">
        <div class="page-header-info">
          <h2 style="white-space:normal;word-break:break-word;">{senderName}</h2>
        </div>
        <div class="page-header-actions">
          {message.status !== 'archived' && (
            <button
              type="button"
              class="uk-btn uk-btn-default uk-btn-sm"
              hx-post={`/admin/inbox/${message.id}/archive`}
              hx-target="#page-content"
              hx-select="#page-content"
              aria-label="Archive message"
              title="Archive message"
              style="padding:0 10px;"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="4" rx="1"></rect>
                <path d="M5 8V20H19V8"></path>
                <path d="M10 12H14"></path>
              </svg>
            </button>
          )}
          <a
            href="/admin/inbox"
            class="uk-btn uk-btn-default uk-btn-sm"
            hx-get="/admin/inbox"
            hx-target="#page-content"
            hx-select="#page-content"
            hx-push-url="true"
            aria-label="Back to inbox"
            title="Back to inbox"
            style="padding:0 10px;position:relative;"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 18L9 12L15 6"></path>
            </svg>
            <span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Back to inbox</span>
          </a>
        </div>
      </div>

      <div class="p-4 md:p-8" style="padding-bottom:96px;">
        <div class="grid gap-4 md:gap-6" style="max-width: 800px;">

          <div class="uk-card uk-card-body">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="min-w-0">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Sender</p>
                <h3 class="text-sm font-semibold leading-tight break-words" style="margin-top:2px;">{senderName}</h3>
              </div>
              <div class="flex flex-wrap justify-end items-center gap-1.5 shrink-0" style="max-width:52%;">
                {sourceBadge(message.source)}
                {statusBadge(message.status)}
              </div>
            </div>
            <p class="text-xs text-muted-foreground" style="margin-bottom:10px;">Received {formatDate(message.created_at)}</p>

            <div class="grid gap-1.5 text-sm">
              {message.first_name && (
                <div class="flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5" style="background:var(--surface-elevated);">
                  <span class="text-[11px] uppercase tracking-wide text-muted-foreground">Name</span>
                  <p class="font-medium leading-tight break-words text-right">{message.first_name} {message.last_name}</p>
                </div>
              )}
              {message.email && (
                <div class="flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5" style="background:var(--surface-elevated);">
                  <span class="text-[11px] uppercase tracking-wide text-muted-foreground">Email</span>
                  <p class="font-medium leading-tight text-right" style="max-width:70%;"><a href={`mailto:${message.email}`} class="uk-link break-all">{message.email}</a></p>
                </div>
              )}
              {message.phone && (
                <div class="flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5" style="background:var(--surface-elevated);">
                  <span class="text-[11px] uppercase tracking-wide text-muted-foreground">Phone</span>
                  <p class="font-medium leading-tight text-right"><a href={`tel:${message.phone}`} class="uk-link">{message.phone}</a></p>
                </div>
              )}
              {message.postal_code && (
                <div class="flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5" style="background:var(--surface-elevated);">
                  <span class="text-[11px] uppercase tracking-wide text-muted-foreground">Postal</span>
                  <p class="font-medium leading-tight text-right">{message.postal_code}</p>
                </div>
              )}
              {message.reason && (
                <div class="flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5" style="background:var(--surface-elevated);">
                  <span class="text-[11px] uppercase tracking-wide text-muted-foreground">Reason</span>
                  <p class="font-medium leading-tight text-right" style="text-transform: capitalize;">{message.reason}</p>
                </div>
              )}
            </div>
          </div>

          {showMessageBody && (
            <div class="uk-card uk-card-body">
              <h3 class="text-base font-semibold mb-4">Message</h3>
              <div class="text-sm leading-relaxed whitespace-pre-wrap" style="color: #333;">{message.body}</div>
            </div>
          )}

          {hasMetaDetails && meta && (
            <div class="uk-card uk-card-body">
              <h3 class="text-base font-semibold mb-4">Additional Details</h3>
              <div class="grid gap-3 sm:grid-cols-2 text-sm">
                {meta.street_address && (
                  <div>
                    <span class="text-muted-foreground">Street Address</span>
                    <p class="font-medium">{meta.street_address}</p>
                  </div>
                )}
                {meta.apt_suite && (
                  <div>
                    <span class="text-muted-foreground">Apt/Suite</span>
                    <p class="font-medium">{meta.apt_suite}</p>
                  </div>
                )}
                {meta.city && (
                  <div>
                    <span class="text-muted-foreground">City</span>
                    <p class="font-medium">{meta.city}</p>
                  </div>
                )}
                {meta.province && (
                  <div>
                    <span class="text-muted-foreground">Province</span>
                    <p class="font-medium">{meta.province}</p>
                  </div>
                )}
                {meta.country && (
                  <div>
                    <span class="text-muted-foreground">Country</span>
                    <p class="font-medium">{meta.country}</p>
                  </div>
                )}
                {meta.company && (
                  <div>
                    <span class="text-muted-foreground">Company</span>
                    <p class="font-medium">{meta.company}</p>
                  </div>
                )}
                {meta.other && (
                  <div class="sm:col-span-2">
                    <span class="text-muted-foreground">Other</span>
                    <p class="font-medium">{meta.other}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {showSmsPanel && (
            <SmsThreadPanel
              messageId={message.id}
              smsHistory={smsHistory}
              twilioEnabled={twilioEnabled}
              phoneE164={phoneE164}
              customerName={senderName}
              jobOptions={jobOptions}
              selectedJobId={selectedJobId}
              completedTaskSmsIds={completedTaskSmsIds}
              sendResult={sendResult}
              taskResult={taskResult}
            />
          )}

        </div>
      </div>
    </Layout>
  );
};
