// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

interface TwilioConfigProps {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  enabled: boolean;
}

interface SmsTemplate {
  id: string;
  event_type: string;
  label: string;
  body_template: string;
  is_active: number;
}

interface SmsStats {
  total: number;
  sent: number;
  received: number;
  failed: number;
  total_segments: number;
}

interface Props {
  config: TwilioConfigProps | null;
  templates: SmsTemplate[];
  stats: SmsStats | null;
}

const segmentCount = (len: number) => len <= 160 ? 1 : Math.ceil(len / 153);

export const SmsSettingsPage = ({ config, templates, stats }: Props) => (
  <Layout title="SMS Settings">
    <div class="page-header">
      <h2>SMS Settings</h2>
    </div>
    <div class="p-4 md:p-8">
      <div class="grid gap-4 md:gap-6" style="max-width: 800px;">

        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-3">Twilio Configuration</h3>
          <form hx-post="/admin/sms-settings" hx-target="#page-content" hx-select="#page-content" class="grid gap-3">
            <div class="grid gap-1">
              <label class="text-sm font-medium" for="twilio-sid">Account SID</label>
              <input type="text" name="account_sid" id="twilio-sid" class="uk-input" value={config?.accountSid || ''} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off" autocapitalize="off" spellcheck="false" />
            </div>
            <div class="grid gap-1">
              <label class="text-sm font-medium" for="twilio-token">Auth Token</label>
              <input type="password" name="auth_token" id="twilio-token" class="uk-input" value={config?.authToken || ''} placeholder="Your Twilio auth token" autocomplete="off" autocapitalize="off" spellcheck="false" />
            </div>
            <div class="grid gap-1">
              <label class="text-sm font-medium" for="twilio-phone">Phone Number (E.164)</label>
              <input type="tel" name="phone_number" id="twilio-phone" class="uk-input" value={config?.phoneNumber || ''} placeholder="+18005551234" autocomplete="tel" inputmode="tel" />
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" name="enabled" id="twilio-enabled" value="1" checked={!!config?.enabled} class="uk-checkbox" />
              <label for="twilio-enabled" class="text-sm">Enable SMS sending</label>
            </div>
            <div>
              <button type="submit" class="uk-btn uk-btn-primary uk-btn-sm">Save Twilio Config</button>
            </div>
          </form>
        </div>

        {stats && (
          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">SMS Usage</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span class="text-muted-foreground block">Total</span>
                <span class="font-semibold text-lg">{stats.total || 0}</span>
              </div>
              <div>
                <span class="text-muted-foreground block">Sent</span>
                <span class="font-semibold text-lg">{stats.sent || 0}</span>
              </div>
              <div>
                <span class="text-muted-foreground block">Received</span>
                <span class="font-semibold text-lg">{stats.received || 0}</span>
              </div>
              <div>
                <span class="text-muted-foreground block">Failed</span>
                <span class="font-semibold text-lg" style="color:var(--destructive,#dc2626);">{stats.failed || 0}</span>
              </div>
            </div>
            {stats.total_segments > 0 && (
              <p class="text-xs text-muted-foreground mt-2">Total segments: {stats.total_segments} (each segment ≈ $0.0079 USD)</p>
            )}
          </div>
        )}

        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-2">Message Templates</h3>
          <p class="text-sm text-muted-foreground mb-3">
            Available variables: {'{{first_name}} {{last_name}} {{service_name}} {{date}} {{time}} {{provider_name}} {{total}}'}
          </p>
          <div class="grid gap-3">
            {templates.map((tpl) => (
              <form
                hx-post={`/admin/sms-templates/${tpl.id}`}
                hx-swap="none"
                class="grid gap-2"
                style="border-bottom:1px solid var(--border);padding-bottom:12px;"
              >
                <div class="flex items-start justify-between gap-2">
                  <label class="text-sm font-medium leading-tight" for={`tpl-body-${tpl.id}`}>{tpl.label}</label>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <input
                      type="checkbox"
                      name="is_active"
                      value="1"
                      checked={!!tpl.is_active}
                      class="uk-checkbox"
                    />
                    <span class="text-xs text-muted-foreground">{tpl.event_type}</span>
                  </div>
                </div>
                <textarea
                  name="body_template"
                  id={`tpl-body-${tpl.id}`}
                  class="uk-textarea text-sm"
                  rows={3}
                  autocapitalize="off"
                  spellcheck="false"
                  style="font-family:monospace;resize:vertical;"
                  oninput={`var c=this.value.length;var s=c<=160?1:Math.ceil(c/153);this.closest('form').querySelector('.tpl-chars').textContent=c+' chars · '+s+' segment'+(s>1?'s':'');`}
                >{tpl.body_template}</textarea>
                <div class="flex items-center justify-between">
                  <span class="tpl-chars text-xs text-muted-foreground">
                    {tpl.body_template.length} chars · {segmentCount(tpl.body_template.length)} segment{segmentCount(tpl.body_template.length) > 1 ? 's' : ''}
                  </span>
                  <button type="submit" class="uk-btn uk-btn-default uk-btn-sm">Save</button>
                </div>
              </form>
            ))}
          </div>
        </div>

        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-2">Webhook URLs</h3>
          <p class="text-sm text-muted-foreground mb-2">Configure these in your Twilio phone number settings:</p>
          <div class="grid gap-2 text-sm">
            <div>
              <span class="text-muted-foreground block">Inbound SMS Webhook:</span>
              <code class="block mt-1 break-all" style="font-size:12px;">https://api.unclebike.xyz/webhooks/twilio/inbound</code>
            </div>
            <div>
              <span class="text-muted-foreground block">Status Callback:</span>
              <code class="block mt-1 break-all" style="font-size:12px;">https://api.unclebike.xyz/webhooks/twilio/status</code>
            </div>
          </div>
        </div>

      </div>
    </div>
  </Layout>
);
