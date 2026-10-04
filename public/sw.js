self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'AMR Fast Food', body: event.data ? event.data.text() : 'Update received' };
  }
  
  // Post message to open clients
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ORDER_UPDATE',
        orderId: data.data?.orderId,
        status: data.data?.status
      });
    });
  });

  const status = data.data?.status;
  const options = {
    body: data.body || 'Order update received.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'order-update',
    renotify: true,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: status === 'canceled' || status === 'out_for_delivery'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AMR Fast Food', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window if it matches the target URL or is at least our origin
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Try to re-subscribe if subscription changes
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
         // In a full implementation, we would send this to the server to update the endpoint
         console.log('Subscription updated:', subscription);
      })
  );
});

// Cache strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Never cache server functions, admin, orders, checkout, APIs
  if (
    event.request.method === 'POST' || 
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/admin') || 
    url.pathname.startsWith('/orders') ||
    url.pathname.startsWith('/checkout')
  ) {
    return;
  }
  
  if (url.pathname.startsWith('/assets') || url.pathname.startsWith('/icons')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then(res => {
          return caches.open('assets-cache-v1').then(cache => {
            cache.put(event.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Network first for navigations
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});
