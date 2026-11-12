// Escapa texto para insertarlo de forma segura en HTML (emails, etc.)
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Orígenes del frontend permitidos (CORS y links en emails)
function allowedOrigins() {
  return [
    'http://localhost:5173',
    ...(process.env.FRONTEND_URL || '').split(',').map(s => s.trim().replace(/\/$/, '')),
  ].filter(Boolean)
}

// Devuelve el origen si está permitido; si no, el FRONTEND_URL por defecto
function safeFrontendUrl(origin) {
  const list = allowedOrigins()
  if (typeof origin === 'string' && list.includes(origin.replace(/\/$/, ''))) return origin.replace(/\/$/, '')
  return list[1] || list[0]
}

// String recortado con largo máximo; '' si no es string
function str(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

module.exports = { escapeHtml, allowedOrigins, safeFrontendUrl, str }

// Respuesta de error uniforme para las rutas:
// datos inválidos → 400 con el motivo; cualquier otra cosa → 500 genérico
function responderError(req, res, e) {
  if (e?.name === 'ValidationError') {
    const primero = Object.values(e.errors || {})[0]
    // "items.0.precio" → "precio" (solo dentro de las comillas del nombre del campo)
    const message = (primero?.message || 'Datos inválidos').replace(/"(?:\w+\.)+(\w+)"/g, '"$1"')
    return res.status(400).json({ message })
  }
  if (e?.name === 'CastError') {
    return res.status(400).json({ message: 'Datos inválidos: revisá los valores ingresados' })
  }
  console.error('[' + req.method + ' ' + req.originalUrl + ']', e)
  return res.status(500).json({ message: 'Error interno del servidor' })
}

module.exports.responderError = responderError
