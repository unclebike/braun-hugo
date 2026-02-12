/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

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

const sourceBadge = (source: string) => {
  const cls: Record<string, string> = {
    contact: 'uk-label uk-label-primary',
    newsletter: 'uk-label uk-label-secondary',
    registration: 'uk-label',
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
  return <span class={cls[status] || 'uk-label'}>{status}</span>;
};

const formatDate = (d: string | null) => {
  if (!d) return '-';
  const date = new Date(d + 'Z');
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const MessageDetailPage = ({ message }: { message: Message }) => {
  const meta = message.metadata ? JSON.parse(message.metadata) : null;
  const senderName = [message.first_name, message.last_name].filter(Boolean).join(' ') || message.email || 'Unknown';

  return (
    <Layout title={`Message — ${senderName}`}>
      <div class="flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold">{message.subject || 'No Subject'}</h2>
          {sourceBadge(message.source)}
          {statusBadge(message.status)}
        </div>
        <div class="flex items-center gap-2">
          {message.status !== 'archived' && (
            <button
              type="button"
              class="uk-btn uk-btn-default uk-btn-sm"
              hx-post={`/admin/inbox/${message.id}/archive`}
              hx-target="#page-content"
              hx-select="#page-content"
            >
              Archive
            </button>
          )}
          <a href="/admin/inbox" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/inbox" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
        </div>
      </div>

      <div class="p-8">
        <div class="grid gap-6" style="max-width: 800px;">

          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">Sender</h3>
            <div class="grid gap-3 sm:grid-cols-2 text-sm">
              {message.first_name && (
                <div>
                  <span class="text-muted-foreground">Name</span>
                  <p class="font-medium">{message.first_name} {message.last_name}</p>
                </div>
              )}
              {message.email && (
                <div>
                  <span class="text-muted-foreground">Email</span>
                  <p class="font-medium"><a href={`mailto:${message.email}`} class="uk-link">{message.email}</a></p>
                </div>
              )}
              {message.phone && (
                <div>
                  <span class="text-muted-foreground">Phone</span>
                  <p class="font-medium"><a href={`tel:${message.phone}`} class="uk-link">{message.phone}</a></p>
                </div>
              )}
              {message.postal_code && (
                <div>
                  <span class="text-muted-foreground">Postal Code</span>
                  <p class="font-medium">{message.postal_code}</p>
                </div>
              )}
              {message.reason && (
                <div>
                  <span class="text-muted-foreground">Reason</span>
                  <p class="font-medium" style="text-transform: capitalize;">{message.reason}</p>
                </div>
              )}
              <div>
                <span class="text-muted-foreground">Received</span>
                <p class="font-medium">{formatDate(message.created_at)}</p>
              </div>
            </div>
          </div>

          {message.body && (
            <div class="uk-card uk-card-body">
              <h3 class="text-base font-semibold mb-4">Message</h3>
              <div class="text-sm leading-relaxed whitespace-pre-wrap" style="color: #333;">{message.body}</div>
            </div>
          )}

          {meta && (
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

          <div class="uk-card uk-card-body" style="border: 1px dashed #ccc; opacity: 0.6;">
            <h3 class="text-base font-semibold mb-2">Reply via SMS</h3>
            <p class="text-sm text-muted-foreground">Twilio integration coming soon. You'll be able to reply to {message.phone || message.email} directly from here.</p>
          </div>

        </div>
      </div>
    </Layout>
  );
};
