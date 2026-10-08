const STATIC = 'static-v2';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC);
    await Promise.allSettled(['/offline.html', '/icons/icon-192.png'].map((u) => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== STATIC && key !== 'assets-cache-v1') {
          return caches.delete(key);
        }
      })
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
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : ((event.notification.data && event.notification.data.orderId) ? `/orders/${event.notification.data.orderId}` : '/');
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
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
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
         fetch('/api/push', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ subscription: subscription.toJSON() })
         }).catch(console.error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (
    event.request.method !== 'GET' || 
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
          if (res.ok && res.type === 'basic') {
            const resClone = res.clone();
            caches.open('assets-cache-v1').then(cache => {
              cache.put(event.request, resClone);
            });
          }
          return res;
        });
      })
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});
