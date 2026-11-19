// Cambiar el nombre borra la cache vieja en los navegadores que ya la tienen
const CACHE = 'foodops-v3'

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

// Fetch: las páginas (HTML) van primero a la red, así cada versión nueva se ve
// en la primera visita. La copia guardada se usa solo sin conexión o si la red
// tarda demasiado. (Antes era cache-first: después de cada actualización se veía
// la versión anterior hasta recargar.)
const ESPERA_RED_MS = 4000

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // API y otros dominios: siempre directo a la red, sin pasar por acá
  if (url.pathname.startsWith('/api/') || url.hostname !== location.hostname) return

  if (e.request.method !== 'GET' || e.request.mode !== 'navigate') return

  e.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const red = fetch(e.request).then(res => {
      if (res.ok && (url.pathname === '/' || url.pathname.startsWith('/carta/'))) {
        e.waitUntil(cache.put(e.request, res.clone()))
      }
      return res
    })
    red.catch(() => {})   // si gana la copia guardada, el error de red no queda suelto
    const plazo = new Promise(resolve => setTimeout(resolve, ESPERA_RED_MS, null))
    try {
      const res = await Promise.race([red, plazo])
      if (res) return res
      // La red tarda: si hay copia guardada se muestra, si no se sigue esperando
      return (await cache.match(e.request)) || (await red)
    } catch {
      return (await cache.match(e.request)) || (await cache.match('/')) ||
        new Response('Sin conexión', { status: 503, statusText: 'Offline' })
    }
  })())
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
