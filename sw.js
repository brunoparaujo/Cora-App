const CORA_SW_VERSION = 'cora-v4.7-pwa';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// V4.7 intentionally does not intercept fetch requests.
// Offline caching and reconnection behavior are implemented in V4.8.