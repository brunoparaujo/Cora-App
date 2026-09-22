const CORA_SW_VERSION = 'cora-v4.7.1-install-fix';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// V4.7.1:
// ainda não fazemos cache offline,
// mas mantemos um fetch handler para o fluxo de PWA.
self.addEventListener('fetch', event => {
  const request = event.request;
  
  if (request.method !== 'GET') return;
  
  const url = new URL(request.url);
  
  if (url.origin !== self.location.origin) return;
  
  event.respondWith(fetch(request));
});