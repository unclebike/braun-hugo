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
.inbox-list { overflow: hidden; }
.inbox-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  text-decoration: none;
  color: var(--text);
  transition: background .12s;
  border-bottom: 1px solid var(--border);
}
.inbox-row:last-child { border-bottom: none; }
.inbox-row:hover { background: var(--sidebar-hover-bg); }
.inbox-row--unread { background: var(--badge-primary-bg); }
.inbox-row--unread:hover { background: var(--sidebar-hover-bg); }

.inbox-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: transparent;
}
.inbox-row--unread .inbox-dot { background: var(--badge-primary); }

.inbox-sender {
  width: 160px;
  flex-shrink: 0;
  min-width: 0;
}
.inbox-sender-name {
  display: block;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
  font-weight: 400;
}
.inbox-row--unread .inbox-sender-name { color: var(--text); font-weight: 600; }

.inbox-subject-line {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.inbox-row--unread .inbox-subject-line { color: var(--text); font-weight: 500; }

.inbox-subject-sub { display: none; }

.inbox-source {
  font-size: 0.7rem !important;
  padding: 1px 6px !important;
  border-radius: 4px !important;
  flex-shrink: 0;
  opacity: 0.75;
  letter-spacing: 0.02em;
}

.inbox-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
  min-width: 108px;
  text-align: right;
}

@media (max-width: 767px) {
  .inbox-row { align-items: flex-start; padding: 10px 12px; gap: 8px; }
  .inbox-sender { width: auto; flex: 1; min-width: 0; }
  .inbox-subject-line { display: none; }
  .inbox-subject-sub {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
  }
  .inbox-source { display: none; }
  .inbox-date { min-width: auto; font-size: 0.75rem; padding-top: 1px; }
}
`;

export const InboxPage = ({ items, title }: { items: InboxItem[]; title: string }) => (
  <Layout title={title}>
    <style>{INBOX_CSS}</style>

    <div class="page-header">
      <h2>{title}</h2>
    </div>

    <div class="p-4 md:p-8">
      {items.length === 0 ? (
        <div class="uk-card uk-card-body">
          <p class="text-sm text-muted-foreground text-center py-8">No messages.</p>
        </div>
      ) : (
        <div class="uk-card inbox-list">
          {items.map((item) => (
            <a
              key={item.id}
              href={`/admin/inbox/${item.id}`}
              hx-get={`/admin/inbox/${item.id}`}
              hx-target="#page-content"
              hx-select="#page-content"
              hx-push-url="true"
              class={`inbox-row${!item.is_read ? ' inbox-row--unread' : ''}`}
            >
              <div class="inbox-dot" />

              <StatusIcon status={item.status} />

              <div class="inbox-sender">
                <span class="inbox-sender-name">{item.sender}</span>
                <span class="inbox-subject-sub">{item.subject}</span>
              </div>

              <span class="inbox-subject-line">{item.subject}</span>

              <span class={`inbox-source ${SOURCE_CLS[item.source] || 'uk-label'}`}>
                {item.source}
              </span>

              <span class="inbox-date">{item.date}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  </Layout>
);
