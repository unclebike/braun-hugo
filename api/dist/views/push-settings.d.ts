export declare const PUSH_MANIFEST: {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: string;
    background_color: string;
    theme_color: string;
    icons: {
        src: string;
        sizes: string;
        type: string;
        purpose: string;
    }[];
};
export declare const PUSH_SERVICE_WORKER_SCRIPT = "\nself.addEventListener('install', function(event) {\n  event.waitUntil(self.skipWaiting());\n});\n\nself.addEventListener('activate', function(event) {\n  event.waitUntil(self.clients.claim());\n});\n\nasync function fetchPendingPushItems() {\n  const subscription = await self.registration.pushManager.getSubscription();\n  if (!subscription || !subscription.endpoint) return [];\n\n  const response = await fetch('/admin/push/pending?endpoint=' + encodeURIComponent(subscription.endpoint), {\n    method: 'GET',\n    credentials: 'include',\n    headers: {\n      'Accept': 'application/json'\n    }\n  });\n\n  if (!response.ok) return [];\n  const payload = await response.json();\n  if (!payload || !Array.isArray(payload.notifications)) return [];\n  return payload.notifications;\n}\n\nself.addEventListener('push', function(event) {\n  event.waitUntil((async function() {\n    try {\n      var items = await fetchPendingPushItems();\n      if (!items.length) {\n        await self.registration.showNotification('GOATkit update', {\n          body: 'Open the app for the latest activity.',\n          data: { url: '/admin' },\n          tag: 'goatkit-fallback'\n        });\n        return;\n      }\n\n      for (var i = 0; i < items.length; i++) {\n        var item = items[i] || {};\n        await self.registration.showNotification(item.title || 'GOATkit update', {\n          body: item.body || 'Open the app for details.',\n          data: { url: item.url || '/admin' },\n          tag: item.id ? ('goatkit-' + item.id) : undefined,\n          renotify: false,\n        });\n      }\n    } catch (_error) {\n      await self.registration.showNotification('GOATkit update', {\n        body: 'Open the app for the latest activity.',\n        data: { url: '/admin' },\n        tag: 'goatkit-fallback-error'\n      });\n    }\n  })());\n});\n\nself.addEventListener('notificationclick', function(event) {\n  event.notification.close();\n  var target = '/admin';\n  if (event.notification && event.notification.data && typeof event.notification.data.url === 'string') {\n    target = event.notification.data.url;\n  }\n\n  event.waitUntil((async function() {\n    var clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });\n    for (var i = 0; i < clientsList.length; i++) {\n      var client = clientsList[i];\n      try {\n        var parsed = new URL(client.url);\n        if (parsed.origin === self.location.origin) {\n          if ('focus' in client) {\n            await client.focus();\n          }\n          if ('navigate' in client) {\n            await client.navigate(target);\n          }\n          return;\n        }\n      } catch (_error) {\n      }\n    }\n\n    if (self.clients.openWindow) {\n      await self.clients.openWindow(target);\n    }\n  })());\n});\n";
export declare const PushSettingsPage: () => import("hono/jsx/jsx-dev-runtime").JSX.Element;
//# sourceMappingURL=push-settings.d.ts.map