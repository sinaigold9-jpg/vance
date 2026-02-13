// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.message || data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: data.link || data.url || '/app',
      },
      vibrate: [200, 100, 200],
      tag: data.tag || 'notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Advance', options)
    );
  } catch (e) {
    console.error('Push event error:', e);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const url = event.notification.data?.url || '/app';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, navigate it
      for (let client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});