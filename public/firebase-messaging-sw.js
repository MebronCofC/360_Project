/*
  Firebase Cloud Messaging Service Worker
  This enables receiving background push notifications in the web app.
*/

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification?.data?.click_action || '/my-tickets';
  event.waitUntil(clients.openWindow(url));
});
