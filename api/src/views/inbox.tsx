// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx } from 'hono/jsx';
import { StatusIcon } from './components';
import { Layout } from './layout';

export interface InboxItem {
  id: string;
  source: string;
  status: string;
  sender: string;
  subject: string;
  is_read: boolean;
  date: string;
}

const SOURCE_CLS: Record<string, string> = {
  contact:      'uk-label uk-label-primary',
  newsletter:   'uk-label uk-label-secondary',
  registration: 'uk-label',
  sms:          'uk-label uk-label-secondary',
};

const INBOX_CSS = `
.inbox-shell {
  display: grid;
  grid-template-columns: 300px 1fr;
  height: 100dvh;
  overflow: hidden;
}
.inbox-pane-list {
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-card);
}
.inbox-pane-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-card);
}
.inbox-pane-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}
.inbox-list-scroll { overflow-y: auto; flex: 1; }

.inbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  text-decoration: none;
  color: var(--text);
  transition: background .12s;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.inbox-row:last-child { border-bottom: none; }
.inbox-row:hover { background: var(--sidebar-hover-bg); }
.inbox-row--unread { background: var(--badge-primary-bg); }
.inbox-row--unread:hover { background: var(--sidebar-hover-bg); }
.inbox-row--active { background: var(--sidebar-active-bg) !important; }

.inbox-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: transparent;
}
.inbox-row--unread .inbox-dot { background: var(--badge-primary); }

.inbox-thread {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.inbox-thread-sender {
  display: block;
  font-size: var(--text-footnote);
  font-weight: var(--fw-footnote);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: var(--lh-footnote);
}
.inbox-row--unread .inbox-thread-sender { color: var(--text); font-weight: var(--fw-callout); }

.inbox-thread-subject {
  display: block;
  font-size: var(--text-caption-1);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
  line-height: var(--lh-caption-1);
  margin-top: 1px;
}

.inbox-thread-date {
  font-size: var(--text-caption-1);
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
  opacity: 0.75;
  align-self: flex-start;
  padding-top: 1px;
}

.inbox-pane-detail {
  overflow-y: auto;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}
.inbox-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  opacity: 0.5;
}

.inbox-back-btn { display: none !important; }

@media (max-width: 768px) {
  .inbox-shell { display: block; height: auto; overflow: visible; }
  .inbox-pane-header { padding: calc(12px + var(--safe-top)) 16px 12px calc(52px + var(--safe-left)); }
  .inbox-pane-list { min-height: 50dvh; }
  .inbox-pane-detail {
    position: fixed;
    inset: 0;
    z-index: 200;
    transform: translateX(100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto;
    background: var(--bg);
  }
  .inbox-detail--populated { transform: translateX(0); }
  .inbox-back-btn { display: inline-flex !important; }
}
`;

const InboxEmptyState = () => (
  <div class="inbox-empty-state">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
    <span>Select a message</span>
  </div>
);

export const InboxShell = ({
  items,
  title,
  activeId,
  detail,
}: {
  items: InboxItem[];
  title: string;
  activeId?: string;
  detail?: unknown;
}) => (
  <Layout title={title}>
    <style>{INBOX_CSS}</style>
    <div class="inbox-shell">

      <div class="inbox-pane-list">
        <div class="inbox-pane-header">
          <h2 class="inbox-pane-title">{title}</h2>
        </div>
        <div class="inbox-list-scroll">
           {items.length === 0 ? (
             <p class="text-subheadline" style="padding:24px 16px;color:var(--text-secondary);">No messages.</p>
           ) : (
            items.map((item) => (
              <a
                key={item.id}
                href={`/admin/inbox/${item.id}`}
                hx-get={`/admin/inbox/${item.id}`}
                hx-target="#inbox-detail"
                hx-select="#inbox-detail"
                hx-swap="outerHTML"
                hx-push-url="true"
                {...{'hx-on::after-swap': "document.querySelectorAll('.inbox-row--active').forEach(function(r){r.classList.remove('inbox-row--active')});this.classList.add('inbox-row--active')"}}
                class={`inbox-row${!item.is_read ? ' inbox-row--unread' : ''}${item.id === activeId ? ' inbox-row--active' : ''}`}
              >
                <div class="inbox-dot" />
                <StatusIcon status={item.status} />
                <div class="inbox-thread">
                  <span class="inbox-thread-sender">{item.sender}</span>
                  <span class="inbox-thread-subject">{item.subject}</span>
                </div>
                <span class="inbox-thread-date">{item.date}</span>
              </a>
            ))
          )}
        </div>
      </div>

      <div id="inbox-detail" class={`inbox-pane-detail${detail ? ' inbox-detail--populated' : ''}`}>
        {detail ?? <InboxEmptyState />}
      </div>

    </div>
  </Layout>
);
