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

const SOURCE_CHIP: Record<string, string> = {
  contact: 'uk-label uk-label-primary',
  newsletter: 'uk-label uk-label-secondary',
  registration: 'uk-label',
  sms: 'uk-label uk-label-secondary',
};

export const InboxPage = ({ items, title }: { items: InboxItem[]; title: string }) => (
  <Layout title={title}>
    <div class="page-header">
      <h2>{title}</h2>
    </div>

    <div class="p-4 md:p-8">
      {items.length === 0 ? (
        <div class="uk-card uk-card-body">
          <p class="text-sm text-muted-foreground text-center py-8">No messages.</p>
        </div>
      ) : (
        <div class="uk-card" style="overflow:hidden;">
          {items.map((item, i) => (
            <a
              key={item.id}
              href={`/admin/inbox/${item.id}`}
              hx-get={`/admin/inbox/${item.id}`}
              hx-target="#page-content"
              hx-select="#page-content"
              hx-push-url="true"
              style={`
                display:flex;
                align-items:center;
                gap:10px;
                padding:10px 16px;
                border-bottom:${i < items.length - 1 ? '1px solid var(--border)' : 'none'};
                background:${!item.is_read ? 'var(--badge-primary-bg)' : 'transparent'};
                text-decoration:none;
                transition:background .1s;
                cursor:pointer;
              `}
              onmouseover="this.style.background='var(--sidebar-hover-bg)'"
              onmouseout={`this.style.background='${!item.is_read ? 'var(--badge-primary-bg)' : 'transparent'}'`}
            >
              <div style={`width:6px;height:6px;border-radius:50%;flex-shrink:0;background:${!item.is_read ? 'var(--badge-primary)' : 'transparent'};`} />

              <div style="flex-shrink:0;">
                <StatusIcon status={item.status} />
              </div>

              <span style={`width:140px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-sm,1.4rem);${!item.is_read ? 'font-weight:700;color:var(--text);' : 'font-weight:400;color:var(--text-secondary);'}`}>
                {item.sender}
              </span>

              <span style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;">
                <span style={`overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-sm,1.4rem);${!item.is_read ? 'font-weight:500;color:var(--text);' : 'color:var(--text-secondary);'}`}>
                  {item.subject}
                </span>
                <span class={SOURCE_CHIP[item.source] || 'uk-label'} style="flex-shrink:0;">
                  <span class="badge-label">{item.source}</span>
                </span>
              </span>

              <span style="font-size:11px;color:var(--text-secondary);flex-shrink:0;white-space:nowrap;">
                {item.date}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  </Layout>
);
