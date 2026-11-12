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
