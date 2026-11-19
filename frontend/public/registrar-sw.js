// Registra el service worker (notificaciones y funcionamiento sin conexión).
// Está en un archivo aparte porque la política de seguridad (CSP) no permite scripts en línea.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
