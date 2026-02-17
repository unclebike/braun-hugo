/** @jsx jsx */
import { html } from 'hono/html';
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

export const PUSH_MANIFEST = {
  name: 'Zenbooker Admin',
  short_name: 'Zenbooker',
  start_url: '/admin',
  scope: '/admin/',
  display: 'standalone',
  background_color: '#eff1f5',
  theme_color: '#dc8a78',
  icons: [
    {
      src: '/images/uncle-logo.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/images/uncle-logo.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any',
    },
  ],
};

export const PUSH_SERVICE_WORKER_SCRIPT = `
self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

async function fetchPendingPushItems() {
  const subscription = await self.registration.pushManager.getSubscription();
  if (!subscription || !subscription.endpoint) return [];

  const response = await fetch('/admin/push/pending?endpoint=' + encodeURIComponent(subscription.endpoint), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) return [];
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.notifications)) return [];
  return payload.notifications;
}

self.addEventListener('push', function(event) {
  event.waitUntil((async function() {
    try {
      var items = await fetchPendingPushItems();
      if (!items.length) {
        await self.registration.showNotification('Zenbooker update', {
          body: 'Open the app for the latest activity.',
          data: { url: '/admin' },
          tag: 'zenbooker-fallback'
        });
        return;
      }

      for (var i = 0; i < items.length; i++) {
        var item = items[i] || {};
        await self.registration.showNotification(item.title || 'Zenbooker update', {
          body: item.body || 'Open the app for details.',
          data: { url: item.url || '/admin' },
          tag: item.id ? ('zenbooker-' + item.id) : undefined,
          renotify: false,
        });
      }
    } catch (_error) {
      await self.registration.showNotification('Zenbooker update', {
        body: 'Open the app for the latest activity.',
        data: { url: '/admin' },
        tag: 'zenbooker-fallback-error'
      });
    }
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var target = '/admin';
  if (event.notification && event.notification.data && typeof event.notification.data.url === 'string') {
    target = event.notification.data.url;
  }

  event.waitUntil((async function() {
    var clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < clientsList.length; i++) {
      var client = clientsList[i];
      try {
        var parsed = new URL(client.url);
        if (parsed.origin === self.location.origin) {
          if ('focus' in client) {
            await client.focus();
          }
          if ('navigate' in client) {
            await client.navigate(target);
          }
          return;
        }
      } catch (_error) {
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(target);
    }
  })());
});
`;

export const PushSettingsPage = () => (
  <Layout title="Push Notifications">
    <div class="flex items-center justify-between px-4 pl-14 py-4 md:px-8 md:pl-8 md:py-5 bg-white border-b border-border sticky top-0 z-50">
      <h2 class="text-xl font-semibold">Push Notifications</h2>
    </div>

    <div class="p-4 md:p-8">
      <div class="grid gap-4 md:gap-6" style="max-width:800px;">
        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-2">Staff Device Alerts</h3>
          <p class="text-sm text-muted-foreground mb-3">
            Enable browser push on this device so staff get alerted for new jobs and new messages.
          </p>

          <div id="push-status" class="text-sm mb-4 px-3 py-2 rounded" style="background:var(--surface-elevated,#eff1f5);color:var(--text-primary,#333);border:1px solid var(--border,#ccd0da);">
            Checking push support...
          </div>

          <div class="grid gap-2 mb-4">
            <label class="flex items-center gap-2 text-sm" for="push-notify-jobs">
              <input id="push-notify-jobs" type="checkbox" class="uk-checkbox" checked />
              <span>Notify on new jobs</span>
            </label>
            <label class="flex items-center gap-2 text-sm" for="push-notify-messages">
              <input id="push-notify-messages" type="checkbox" class="uk-checkbox" checked />
              <span>Notify on new messages</span>
            </label>
          </div>

          <div class="flex items-center gap-2" style="flex-wrap:wrap;">
            <button id="push-enable-btn" type="button" class="uk-btn uk-btn-primary uk-btn-sm">Enable on this device</button>
            <button id="push-disable-btn" type="button" class="uk-btn uk-btn-default uk-btn-sm">Disable on this device</button>
            <button id="push-test-btn" type="button" class="uk-btn uk-btn-default uk-btn-sm">Send test notification</button>
          </div>

          <p class="text-xs text-muted-foreground mt-3">
            Tip: install the admin as a PWA for the most reliable delivery, especially on iOS.
          </p>
        </div>
      </div>
    </div>

    {html`<script>
(function() {
  var statusEl = document.getElementById('push-status');
  var enableBtn = document.getElementById('push-enable-btn');
  var disableBtn = document.getElementById('push-disable-btn');
  var testBtn = document.getElementById('push-test-btn');
  var jobsCheckbox = document.getElementById('push-notify-jobs');
  var messagesCheckbox = document.getElementById('push-notify-messages');

  var vapidPublicKey = '';

  function setStatus(message, tone) {
    if (!statusEl) return;
    statusEl.textContent = message;

    if (tone === 'ok') {
      statusEl.style.background = 'rgba(34,197,94,0.1)';
      statusEl.style.color = '#15803d';
      statusEl.style.borderColor = 'rgba(21,128,61,0.35)';
      return;
    }

    if (tone === 'error') {
      statusEl.style.background = 'rgba(239,68,68,0.1)';
      statusEl.style.color = '#dc2626';
      statusEl.style.borderColor = 'rgba(220,38,38,0.35)';
      return;
    }

    if (tone === 'warn') {
      statusEl.style.background = 'rgba(245,158,11,0.12)';
      statusEl.style.color = '#b45309';
      statusEl.style.borderColor = 'rgba(180,83,9,0.35)';
      return;
    }

    statusEl.style.background = 'var(--surface-elevated,#eff1f5)';
    statusEl.style.color = 'var(--text-primary,#333)';
    statusEl.style.borderColor = 'var(--border,#ccd0da)';
  }

  function setButtonsEnabled(enabled, isSubscribed) {
    if (enableBtn) enableBtn.disabled = !enabled;
    if (disableBtn) disableBtn.disabled = !enabled || !isSubscribed;
    if (testBtn) testBtn.disabled = !enabled || !isSubscribed;
  }

  function normalizeErrorMessage(prefix, err) {
    var message = '';
    if (err && typeof err.message === 'string') message = err.message;
    else message = String(err || 'unknown error');
    message = message.replace(/\s+/g, ' ').trim();
    if (prefix) return prefix + ': ' + message;
    return message;
  }

  async function safeFetchJson(url, options) {
    var response = await fetch(url, options || {});
    var text = '';
    try {
      text = await response.clone().text();
    } catch (_error) {
      text = '';
    }

    var json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_error) {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      text: text,
      json: json,
    };
  }

  function selectedPreferences() {
    return {
      notifyNewJobs: jobsCheckbox ? !!jobsCheckbox.checked : true,
      notifyNewMessages: messagesCheckbox ? !!messagesCheckbox.checked : true,
    };
  }

  function base64UrlToUint8Array(base64Url) {
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var padding = '='.repeat((4 - (base64.length % 4)) % 4);
    var binary = atob(base64 + padding);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function ensureRegistration() {
    var reg = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
    try {
      await navigator.serviceWorker.ready;
    } catch (_error) {
    }
    return reg;
  }

  async function getCurrentSubscription() {
    var registration = await ensureRegistration();
    return registration.pushManager.getSubscription();
  }

  async function loadServerStatus(endpoint) {
    var query = endpoint ? ('?endpoint=' + encodeURIComponent(endpoint)) : '';
    var result = await safeFetchJson('/admin/push/status' + query, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!result.ok) return null;
    return result.json;
  }

  async function pushSubscribe(subscription) {
    var result = await safeFetchJson('/admin/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        preferences: selectedPreferences(),
      }),
    });

    if (!result.ok) {
      var msg = (result.json && result.json.error) ? result.json.error : (result.text || 'Failed to save subscription');
      throw new Error('Subscribe failed (' + String(result.status) + '): ' + String(msg));
    }
  }

  async function pushUnsubscribe(endpoint) {
    await safeFetchJson('/admin/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ endpoint: endpoint || '' }),
    });
  }

  async function sendTestNotification(endpoint) {
    var result = await safeFetchJson('/admin/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ endpoint: endpoint || '' }),
    });

    if (!result.ok) {
      var message = (result.json && result.json.error) ? result.json.error : (result.text || 'Test push failed');
      throw new Error('Test failed (' + String(result.status) + '): ' + String(message));
    }

    return result.json;
  }

  async function syncPreferencesIfSubscribed() {
    try {
      var subscription = await getCurrentSubscription();
      if (!subscription) return;
      await pushSubscribe(subscription);
    } catch (_error) {
    }
  }

  async function refreshState() {
    try {
      setStatus('Checking push support...', '');

      var response = await safeFetchJson('/admin/push/vapid-public-key', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        var msg = (response.json && response.json.error) ? response.json.error : (response.text || 'Could not load VAPID key');
        throw new Error('VAPID key (' + String(response.status) + '): ' + String(msg));
      }

      var keyPayload = response.json;
      vapidPublicKey = keyPayload && typeof keyPayload.publicKey === 'string' ? keyPayload.publicKey : '';
      if (!vapidPublicKey) throw new Error('VAPID key missing');

      var subscription = await getCurrentSubscription();
      if (!subscription) {
        setStatus('Push is disabled on this device.', 'warn');
        setButtonsEnabled(true, false);
        return;
      }

      var serverStatus = await loadServerStatus(subscription.endpoint);
      if (serverStatus && typeof serverStatus.notifyNewJobs === 'boolean' && jobsCheckbox) {
        jobsCheckbox.checked = serverStatus.notifyNewJobs;
      }
      if (serverStatus && typeof serverStatus.notifyNewMessages === 'boolean' && messagesCheckbox) {
        messagesCheckbox.checked = serverStatus.notifyNewMessages;
      }

      setStatus('Push is enabled on this device.', 'ok');
      setButtonsEnabled(true, true);
    } catch (error) {
      setStatus(normalizeErrorMessage('Push setup failed', error), 'error');
      setButtonsEnabled(false, false);
    }
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    setStatus('This browser does not support web push notifications.', 'error');
    setButtonsEnabled(false, false);
    return;
  }

  if (enableBtn) {
    enableBtn.addEventListener('click', async function() {
      setButtonsEnabled(false, false);
      try {
        var permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatus('Notification permission was not granted.', 'error');
          await refreshState();
          return;
        }

        var registration = await ensureRegistration();
        var subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
          });
        }

        await pushSubscribe(subscription);

        try {
          setStatus('Sending test notification...', 'warn');
          await sendTestNotification(subscription.endpoint);
        } catch (_error) {
        }

        setStatus('Push enabled on this device.', 'ok');
        setButtonsEnabled(true, true);
      } catch (error) {
        setStatus(normalizeErrorMessage('Unable to enable push', error), 'error');
        setButtonsEnabled(true, false);
      }
    });
  }

  if (testBtn) {
    testBtn.addEventListener('click', async function() {
      setButtonsEnabled(false, true);
      try {
        var subscription = await getCurrentSubscription();
        if (!subscription) {
          setStatus('Push is disabled on this device.', 'warn');
          setButtonsEnabled(true, false);
          return;
        }

        setStatus('Sending test notification...', 'warn');
        var result = await sendTestNotification(subscription.endpoint);
        if (result && typeof result.status === 'number') {
          setStatus('Test sent (push service status ' + String(result.status) + ').', 'ok');
        } else {
          setStatus('Test sent.', 'ok');
        }
        setButtonsEnabled(true, true);
      } catch (error) {
        setStatus(normalizeErrorMessage('Unable to send test', error), 'error');
        setButtonsEnabled(true, true);
      }
    });
  }

  if (disableBtn) {
    disableBtn.addEventListener('click', async function() {
      setButtonsEnabled(false, false);
      try {
        var subscription = await getCurrentSubscription();
        if (subscription) {
          await pushUnsubscribe(subscription.endpoint);
          await subscription.unsubscribe();
        }

        setStatus('Push disabled on this device.', 'warn');
        setButtonsEnabled(true, false);
      } catch (error) {
        setStatus('Unable to disable push: ' + (error && error.message ? error.message : 'unknown error'), 'error');
        await refreshState();
      }
    });
  }

  if (jobsCheckbox) jobsCheckbox.addEventListener('change', syncPreferencesIfSubscribed);
  if (messagesCheckbox) messagesCheckbox.addEventListener('change', syncPreferencesIfSubscribed);

  refreshState();
})();
    </script>`}
  </Layout>
);
