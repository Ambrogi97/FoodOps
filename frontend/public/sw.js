const CACHE = 'foodops-v2'

// Al instalar: pre-cachear la shell mínima
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/', '/favicon.svg']))
      .then(() => self.skipWaiting())
  )
})

// Al activar: limpiar caches viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Fetch: network-first para API, cache-first para assets estáticos
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Siempre red para API y tracking calls
  if (url.pathname.startsWith('/api/') || url.hostname !== location.hostname) return

  // Cache-first para la carta (solo rutas con userId, no /carta/ solo)
  const esCarta = url.pathname.match(/^\/carta\/.+/) || url.pathname === '/'
  if (esCarta) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request)
          .then(res => {
            if (res.ok) {
              const clone = res.clone()
              e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, clone)))
            }
            return res
          })
          .catch(() => cached || new Response('Sin conexión', { status: 503, statusText: 'Offline' }))
        return cached ? cached : networkFetch
      })
    )
    return
  }
})

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'FoodOps', {
      body:  data.body  || 'Nuevo pedido recibido',
      icon:  data.icon  || '/favicon.svg',
      badge: '/favicon.svg',
      tag:   'nuevo-pedido',
      renotify: true,
    })
  )
})

// Click en notificación → abrir dashboard
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const dashWin = wins.find(w => w.url.includes('/dashboard'))
      if (dashWin) return dashWin.focus()
      return clients.openWindow('/dashboard')
    })
  )
})
