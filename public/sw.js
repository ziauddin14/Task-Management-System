// Web Push Service Worker — a plain, hand-written script (no build-tool/workbox involved; matches
// favicon.png's own placement as a static /public asset served as-is). Two responsibilities only:
// show an OS-level notification when a push arrives, and navigate to the relevant task when it's
// clicked. Everything else (caching, offline support) is deliberately out of scope — this feature
// is Web Push, not an offline-first app.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Payload shape sent by the backend (notification.service.js's sendPushForNotification):
// { title, body, icon, data: { notificationId, taskCodeNumber } }. Falls back gracefully if the
// payload is missing or isn't JSON — a push must always show SOME notification, never fail silently.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: 'اطلاع', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'اطلاع';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.png',
    badge: payload.icon || '/favicon.png',
    dir: 'rtl',
    lang: 'ur',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click target reuses the EXACT SAME pattern the existing in-app NotificationDrawer already uses
// (Dashboard's own search-by-codeNumber, /?search=<codeNumber>) — there is no dedicated per-task
// page to link to instead. Falls back to the app root when the notification has no task
// (e.g. an admin broadcast). Focuses an already-open tab if one exists, rather than always opening
// a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const codeNumber = event.notification.data && event.notification.data.taskCodeNumber;
  const targetUrl = codeNumber ? `/?search=${encodeURIComponent(codeNumber)}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
