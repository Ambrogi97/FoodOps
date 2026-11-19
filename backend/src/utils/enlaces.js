// Enlaces públicos que recibe el cliente de la carta (seguimiento y reseña):
// llevan un token que no se puede adivinar y dejan de funcionar con el tiempo.
const crypto = require('crypto')

const HORAS_TRACKING_TRAS_ENTREGA = 48 // el seguimiento sigue visible 2 días después de entregado
const DIAS_TRACKING_MAX           = 7  // tope si el pedido nunca se marca como entregado
const DIAS_RESENA                 = 14 // plazo para dejar la reseña

const HORA = 60 * 60 * 1000
const DIA  = 24 * HORA

// Token aleatorio para el link de seguimiento; en la base se guarda solo su hash
const nuevoTokenTracking = () => crypto.randomBytes(32).toString('hex')
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex')

// Comparación en tiempo constante (no da pistas de cuántos caracteres coinciden)
function iguales(a, b) {
  const A = Buffer.from(String(a ?? ''))
  const B = Buffer.from(String(b ?? ''))
  return A.length === B.length && A.length > 0 && crypto.timingSafeEqual(A, B)
}

function trackingVencido(pedido, ahora = Date.now()) {
  if (pedido.entregadoAt) return ahora > new Date(pedido.entregadoAt).getTime() + HORAS_TRACKING_TRAS_ENTREGA * HORA
  return ahora > new Date(pedido.createdAt).getTime() + DIAS_TRACKING_MAX * DIA
}

// Token de la reseña: HMAC del id del pedido (no hace falta guardarlo)
function tokenResena(pedidoId) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(String(pedidoId))
    .digest('hex')
    .slice(0, 16)
}

function resenaVencida(pedido, ahora = Date.now()) {
  const desde = pedido.entregadoAt || pedido.createdAt
  return ahora > new Date(desde).getTime() + DIAS_RESENA * DIA
}

module.exports = {
  HORAS_TRACKING_TRAS_ENTREGA, DIAS_TRACKING_MAX, DIAS_RESENA,
  nuevoTokenTracking, hashToken, iguales, trackingVencido, tokenResena, resenaVencida,
}
