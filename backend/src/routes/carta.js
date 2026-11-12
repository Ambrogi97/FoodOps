const express        = require('express')
const router         = express.Router()
const mongoose       = require('mongoose')
const rateLimit      = require('express-rate-limit')
const User           = require('../models/User')
const Categoria      = require('../models/Categoria')
const Producto       = require('../models/Producto')
const PedidoOnline   = require('../models/PedidoOnline')
const ConfigTienda   = require('../models/ConfigTienda')
const { enviarEmail } = require('../utils/email')
const { escapeHtml, safeFrontendUrl, str } = require('../utils/security')
const { enviarPushNuevoPedido } = require('./push')

const DIAS_KEY_AR = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
function estaAbiertaAhora(seccion) {
  if (!seccion?.habilitado) return false
  const ahoraAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const diaKey  = DIAS_KEY_AR[ahoraAR.getDay()]
  const dia     = (seccion.horarios || []).find(d => d.dia === diaKey)
  if (!dia?.habilitado) return false
  const min = ahoraAR.getHours() * 60 + ahoraAR.getMinutes()
  return (dia.franjas || []).some(f => {
    const [h1, m1] = f.desde.split(':').map(Number)
    const [h2, m2] = f.hasta.split(':').map(Number)
    return min >= h1 * 60 + m1 && min <= h2 * 60 + m2
  })
}

const cartaLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false })

const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

function emailConfirmacionPedido({ restaurante: restauranteRaw, numero, pedido, totalFinal, descuento, trackingUrl: trackingUrlRaw }) {
  // Todo texto que viene del cliente o del restaurante se escapa antes de ir al HTML
  const e           = escapeHtml
  const restaurante = e(restauranteRaw)
  const trackingUrl = trackingUrlRaw ? e(trackingUrlRaw) : ''
  const tipoLabel = pedido.tipo === 'delivery' ? 'Delivery' : pedido.tipo === 'takeaway' ? 'Retiro en el local' : `Mesa ${e(pedido.mesaNumero)}`
  const itemsHtml = pedido.items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;">(${i.cantidad}) ${e(i.nombre)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;text-align:right;font-weight:600;">${fmt(i.precio * i.cantidad)}</td>
    </tr>`).join('')

  const subtotal  = pedido.items.reduce((a, i) => a + i.precio * i.cantidad, 0)
  const montoDesc = descuento > 0 ? Math.round(subtotal * descuento / 100) : 0
  const fecha     = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

  return /* html */`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

      <!-- Header naranja -->
      <tr>
        <td style="background:#e85d2b;padding:28px 0;text-align:center;">
          <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">${restaurante}</span>
        </td>
      </tr>

      <!-- Ícono y título -->
      <tr>
        <td style="padding:36px 48px 8px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td align="center" style="width:72px;height:72px;background:#fff4f0;border-radius:50%;border:3px solid #e85d2b;font-size:36px;line-height:72px;text-align:center;">
              ✓
            </td></tr>
          </table>
          <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#e85d2b;">¡Pedido confirmado!</h1>
          <p style="margin:0;color:#6b7280;font-size:15px;line-height:1.5;">
            Hola <strong style="color:#1a1a2e;">${e(pedido.clienteNombre)}</strong>, tu pedido ya fue confirmado<br>y está próximo a prepararse.
          </p>
        </td>
      </tr>

      <!-- Detalle del pedido -->
      <tr>
        <td style="padding:24px 48px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #f0f0f0;">
            <tr><td style="padding:16px 20px 0;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#e85d2b;text-transform:uppercase;letter-spacing:1px;">Datos del pedido</p>
            </td></tr>
            <tr><td style="padding:0 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;width:40%;">Número</td>
                  <td style="padding:6px 0;color:#1a1a2e;font-size:13px;font-weight:700;">#${numero}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Fecha</td>
                  <td style="padding:6px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${fecha}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Tipo</td>
                  <td style="padding:6px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${tipoLabel}</td>
                </tr>
                ${pedido.tipo === 'delivery' && pedido.direccion ? `<tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Dirección</td>
                  <td style="padding:6px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${e(pedido.direccion)}</td>
                </tr>` : ''}
                ${pedido.formaPago ? `<tr>
                  <td style="padding:6px 0 16px;color:#6b7280;font-size:13px;">Forma de pago</td>
                  <td style="padding:6px 0 16px;color:#1a1a2e;font-size:13px;font-weight:600;">${e(pedido.formaPago)}</td>
                </tr>` : '<tr><td colspan="2" style="padding-bottom:16px;"></td></tr>'}
              </table>
            </td></tr>
          </table>
        </td>
      </tr>

      <!-- Items -->
      <tr>
        <td style="padding:20px 48px 0;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#e85d2b;text-transform:uppercase;letter-spacing:1px;">Tu pedido</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr>
              <td style="padding:12px 0 4px;color:#6b7280;font-size:14px;">Subtotal</td>
              <td style="padding:12px 0 4px;color:#6b7280;font-size:14px;text-align:right;">${fmt(subtotal)}</td>
            </tr>
            ${montoDesc > 0 ? `<tr>
              <td style="padding:4px 0;color:#16a34a;font-size:14px;">Descuento (${descuento}%)</td>
              <td style="padding:4px 0;color:#16a34a;font-size:14px;text-align:right;">-${fmt(montoDesc)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:10px 0 0;color:#1a1a2e;font-size:18px;font-weight:800;border-top:2px solid #e85d2b;">Total</td>
              <td style="padding:10px 0 0;color:#e85d2b;font-size:18px;font-weight:800;text-align:right;border-top:2px solid #e85d2b;">${fmt(totalFinal)}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      ${trackingUrl ? `
      <tr>
        <td style="padding:28px 48px 0;text-align:center;">
          <a href="${trackingUrl}" style="display:inline-block;background:#e85d2b;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:8px;letter-spacing:0.3px;">
            Seguir mi pedido →
          </a>
        </td>
      </tr>` : ''}

      <tr>
        <td style="padding:24px 48px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#aaa;">¿Dudas? Contactanos por cualquier medio.</p>
          <p style="margin:0;font-size:12px;color:#aaa;">Powered by <strong style="color:#e85d2b;">FoodOps</strong></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// Menú público del restaurante
router.get('/:userId', cartaLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId))
      return res.status(404).json({ message: 'Restaurante no encontrado' })

    const user = await User.findById(req.params.userId).select('restaurante')
    if (!user) return res.status(404).json({ message: 'Restaurante no encontrado' })

    const config = await ConfigTienda.findOne({ usuario: req.params.userId })
    if (!config?.habilitado) {
      return res.json({ habilitado: false, restaurante: user.restaurante })
    }

    const [categorias, productos] = await Promise.all([
      Categoria.find({ usuario: req.params.userId }).sort('nombre'),
      Producto.find({ usuario: req.params.userId })
        .select('nombre descripcion precio imagen categoria activo opciones')
        .sort('nombre'),
    ])

    res.json({
      habilitado:      true,
      restaurante:     user.restaurante,
      logo:            config.logo        || null,
      portada:         config.portada     || null,
      colorFondo:      config.colorFondo  || null,
      fondoImagen:     config.fondoImagen || null,
      deliveryAbierto: estaAbiertaAhora(config.delivery),
      retiroAbierto:   estaAbiertaAhora(config.retiro),
      costoDelivery:   config.delivery?.costoEnvio || 0,
      formasPago:      (config.formasPago || []).filter(f => f.habilitado),
      zonaDelivery:    config.zonaDelivery || null,
      categorias,
      productos,
    })
  } catch (e) {
    { console.error('[' + req.method + ' ' + req.originalUrl + ']', e); res.status(500).json({ message: 'Error interno del servidor' }) }
  }
})

// Límite de pedidos por IP y restaurante (los clientes de una misma mesa pueden compartir wifi)
const pedidoLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${rateLimit.ipKeyGenerator(req.ip)}|${req.params.userId}`,
  message: { message: 'Demasiados pedidos seguidos. Esperá unos minutos e intentá de nuevo.' },
})

const EMAIL_RE    = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/
const TELEFONO_RE = /^\+?[0-9\s()-]{6,20}$/
const TIPOS       = ['mesa', 'takeaway', 'delivery']

// Arma los ítems del pedido con precios de la base de datos (nunca los del cliente)
async function construirItems(itemsBody, usuarioId) {
  if (!Array.isArray(itemsBody) || itemsBody.length === 0 || itemsBody.length > 100) return null

  const ids = itemsBody.map(i => i?.productoId)
  if (!ids.every(id => mongoose.isValidObjectId(id))) return null

  const productos = await Producto.find({ _id: { $in: ids }, usuario: usuarioId, activo: true })
    .select('nombre precio opciones').lean()
  const porId = new Map(productos.map(p => [String(p._id), p]))

  const items = []
  for (const it of itemsBody) {
    const producto = porId.get(String(it.productoId))
    const cantidad = Number(it.cantidad)
    if (!producto || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return null

    let precio = producto.precio
    const labels = []
    const opciones = Array.isArray(it.opciones) ? it.opciones : []

    // Una opción por cada grupo que tenga ítems (igual que en la carta)
    const gruposRequeridos = (producto.opciones || []).filter(g => g.items?.length).map(g => g.grupo)
    const gruposElegidos   = opciones.map(op => op?.grupo)
    if (gruposElegidos.length !== gruposRequeridos.length ||
        new Set(gruposElegidos).size !== gruposElegidos.length ||
        !gruposRequeridos.every(g => gruposElegidos.includes(g))) return null

    for (const op of opciones) {
      const grupo = (producto.opciones || []).find(g => g.grupo === op?.grupo)
      const item  = grupo?.items?.find(x => x.label === op?.label)
      if (!item) return null
      precio += item.precio || 0
      labels.push(item.label)
    }
    const nombre = labels.length ? `${producto.nombre} (${labels.join(', ')})` : producto.nombre
    items.push({ nombre, cantidad, precio })
  }
  return items
}

// Enviar pedido desde la carta
router.post('/:userId/pedido', pedidoLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId))
      return res.status(404).json({ message: 'Restaurante no encontrado' })

    const tipo            = str(req.body.tipo, 20)
    const mesaNumero      = str(req.body.mesaNumero, 20)
    const direccion       = str(req.body.direccion, 200)
    const clienteNombre   = str(req.body.clienteNombre, 80)
    const clienteEmail    = str(req.body.clienteEmail, 120).toLowerCase()
    const clienteTelefono = str(req.body.clienteTelefono, 25)
    const notas           = str(req.body.notas, 500)
    const formaPago       = str(req.body.formaPago, 60)

    if (!TIPOS.includes(tipo)) return res.status(400).json({ message: 'Indicá el tipo de pedido' })
    if (tipo === 'mesa'     && !mesaNumero)      return res.status(400).json({ message: 'Indicá el número de mesa' })
    if (tipo === 'delivery' && !direccion)       return res.status(400).json({ message: 'Indicá la dirección de entrega' })
    if (tipo !== 'mesa'     && !clienteEmail)    return res.status(400).json({ message: 'El email es requerido' })
    if (tipo !== 'mesa'     && !clienteNombre)   return res.status(400).json({ message: 'El nombre es requerido' })
    if (tipo !== 'mesa'     && !clienteTelefono) return res.status(400).json({ message: 'El teléfono es requerido' })
    if (clienteEmail    && !EMAIL_RE.test(clienteEmail))       return res.status(400).json({ message: 'El email no es válido' })
    if (clienteTelefono && !TELEFONO_RE.test(clienteTelefono)) return res.status(400).json({ message: 'El teléfono no es válido' })

    const configActual = await ConfigTienda.findOne({ usuario: req.params.userId }).lean()
    if (!configActual?.habilitado)
      return res.status(403).json({ message: 'Este restaurante no está aceptando pedidos online' })

    const items = await construirItems(req.body.items, req.params.userId)
    if (!items) return res.status(400).json({ message: 'El pedido tiene productos inválidos o no disponibles. Actualizá la carta e intentá de nuevo.' })

    // El descuento sale de la forma de pago configurada por el restaurante, no del cliente
    const formasHabilitadas = (configActual.formasPago || []).filter(f => f.habilitado)
    let descuento = 0
    if (formaPago) {
      const fp = formasHabilitadas.find(f => f.nombre === formaPago)
      if (!fp) return res.status(400).json({ message: 'Forma de pago inválida' })
      descuento = Math.min(Math.max(Number(fp.descuento) || 0, 0), 100)
    } else if (formasHabilitadas.length > 0 && tipo !== 'mesa') {
      return res.status(400).json({ message: 'Elegí una forma de pago' })
    }

    // Validar zona de delivery si está configurada y viene coordenadas del cliente
    const config = configActual
    if (tipo === 'delivery' && config.zonaDelivery?.radioKm && req.body.clienteLat && req.body.clienteLng) {
      const clienteLat = Number(req.body.clienteLat)
      const clienteLng = Number(req.body.clienteLng)
      const { lat, lng, radioKm } = config.zonaDelivery
      const R = 6371
      const dLat = (clienteLat - lat) * Math.PI / 180
      const dLng = (clienteLng - lng) * Math.PI / 180
      const a = Math.sin(dLat/2)**2 + Math.cos(lat * Math.PI/180) * Math.cos(clienteLat * Math.PI/180) * Math.sin(dLng/2)**2
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      if (distKm > radioKm) return res.status(400).json({ message: `Lo sentimos, tu dirección está fuera de nuestra zona de delivery (${radioKm} km)` })
    }
    const costoEnvio  = tipo === 'delivery' ? (config?.delivery?.costoEnvio || 0) : 0
    const subtotal    = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
    const total       = subtotal + costoEnvio
    const totalFinal  = descuento > 0 ? Math.round(total * (1 - descuento / 100)) : total

    // Contador atómico: se incrementa recién cuando el pedido es válido
    const configCounter = await ConfigTienda.findOneAndUpdate(
      { usuario: req.params.userId },
      { $inc: { pedidoCounter: 1 } },
      { new: true, projection: { pedidoCounter: 1 } }
    )
    const numero = String(configCounter.pedidoCounter).padStart(4, '0')

    const pedido = await PedidoOnline.create({
      usuario:         req.params.userId,
      items,
      tipo,
      mesaNumero,
      direccion,
      clienteNombre,
      clienteEmail,
      clienteTelefono,
      formaPago,
      descuento,
      costoEnvio,
      notas,
      total,
      totalFinal,
      numero,
    })

    // Solo se aceptan orígenes propios para el link del email (evita links de phishing)
    const frontendUrl = safeFrontendUrl(req.body.frontendOrigin)
    const trackingUrl = `${frontendUrl}/tracking/${pedido._id}`

    const user = await User.findById(req.params.userId).select('restaurante email')

    // Push notification al restaurante
    enviarPushNuevoPedido(req.params.userId, { numero, tipo }).catch(() => {})

    // WhatsApp al cliente (requiere TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM)
    if (process.env.TWILIO_ACCOUNT_SID && pedido.clienteTelefono) {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      twilio.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        to:   `whatsapp:${pedido.clienteTelefono}`,
        body: `✅ ¡Pedido confirmado! #${numero}\n\nYa lo recibimos y pronto empezamos a prepararlo.\n\nSeguí tu pedido: ${trackingUrl}`,
      }).catch(() => {})
    }

    // Email de confirmación al cliente (no bloqueante)
    if (pedido.clienteEmail) {
      enviarEmail({
        to:      pedido.clienteEmail,
        subject: `¡Pedido confirmado! #${numero} — ${user?.restaurante || 'Tu restaurante'}`,
        html:    emailConfirmacionPedido({
          restaurante: user?.restaurante || 'Restaurante',
          numero,
          pedido,
          totalFinal,
          descuento,
          trackingUrl,
        }),
      }).catch(e => console.error('Error enviando email pedido:', e))
    }

    res.status(201).json({ id: pedido._id, numero, trackingUrl })
  } catch (e) {
    console.error('Error creando pedido online:', e)
    res.status(500).json({ message: 'No se pudo enviar el pedido. Intentá de nuevo.' })
  }
})

// El auto-completado de datos del cliente ahora se guarda en su propio navegador
// (antes había un endpoint público que devolvía nombre/teléfono/dirección por email).

// Tracking público del pedido (sin auth)
router.get('/tracking/:pedidoId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.pedidoId))
      return res.status(404).json({ message: 'Pedido no encontrado' })

    const pedido = await PedidoOnline.findById(req.params.pedidoId)
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' })

    const [user, config] = await Promise.all([
      User.findById(pedido.usuario).select('restaurante'),
      ConfigTienda.findOne({ usuario: pedido.usuario }).select('tiempoEstimadoMin'),
    ])

    res.json({
      numero:             pedido.numero || pedido._id.toString().slice(-6).toUpperCase(),
      estado:             pedido.estado,
      tipo:               pedido.tipo,
      mesaNumero:         pedido.mesaNumero,
      direccion:          pedido.direccion,
      clienteNombre:      pedido.clienteNombre,
      formaPago:          pedido.formaPago,
      items:              pedido.items,
      total:              pedido.total,
      totalFinal:         pedido.totalFinal,
      descuento:          pedido.descuento,
      createdAt:          pedido.createdAt,
      restaurante:        user?.restaurante || '',
      tiempoEstimadoMin:  pedido.estado === 'pendiente' ? (config?.tiempoEstimadoMin || 0) : 0,
    })
  } catch (e) {
    { console.error('[' + req.method + ' ' + req.originalUrl + ']', e); res.status(500).json({ message: 'Error interno del servidor' }) }
  }
})

module.exports = router
