const express        = require('express')
const router         = express.Router()
const User           = require('../models/User')
const Categoria      = require('../models/Categoria')
const Producto       = require('../models/Producto')
const PedidoOnline   = require('../models/PedidoOnline')
const ConfigTienda   = require('../models/ConfigTienda')
const { enviarEmail } = require('../utils/email')

const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

function emailConfirmacionPedido({ restaurante, numero, pedido, totalFinal, descuento, trackingUrl }) {
  const tipoLabel = pedido.tipo === 'delivery' ? 'Delivery' : pedido.tipo === 'takeaway' ? 'Retiro en el local' : `Mesa ${pedido.mesaNumero}`
  const itemsHtml = pedido.items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;">(${i.cantidad}) ${i.nombre}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;text-align:right;font-weight:600;">${fmt(i.precio * i.cantidad)}</td>
    </tr>`).join('')

  const subtotal  = pedido.items.reduce((a, i) => a + i.precio * i.cantidad, 0)
  const montoDesc = descuento > 0 ? Math.round(subtotal * descuento / 100) : 0
  const fecha     = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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
            Hola <strong style="color:#1a1a2e;">${pedido.clienteNombre}</strong>, tu pedido ya fue confirmado<br>y está próximo a prepararse.
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
                  <td style="padding:6px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${pedido.direccion}</td>
                </tr>` : ''}
                ${pedido.formaPago ? `<tr>
                  <td style="padding:6px 0 16px;color:#6b7280;font-size:13px;">Forma de pago</td>
                  <td style="padding:6px 0 16px;color:#1a1a2e;font-size:13px;font-weight:600;">${pedido.formaPago}</td>
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
        <td style="padding:0 48px 28px;text-align:center;">
          <a href="${trackingUrl}" style="display:inline-block;background:#e85d2b;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:8px;letter-spacing:0.3px;">
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
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('restaurante')
    if (!user) return res.status(404).json({ message: 'Restaurante no encontrado' })

    const config = await ConfigTienda.findOne({ usuario: req.params.userId })
    if (!config?.habilitado) {
      return res.json({ habilitado: false, restaurante: user.restaurante })
    }

    const [categorias, productos] = await Promise.all([
      Categoria.find({ usuario: req.params.userId }).sort('nombre'),
      Producto.find({ usuario: req.params.userId }).sort('nombre'),
    ])

    res.json({
      habilitado:    true,
      restaurante:   user.restaurante,
      logo:          config.logo        || null,
      portada:       config.portada     || null,
      colorFondo:    config.colorFondo  || null,
      deliveryCfg:   config.delivery    || null,
      retiroCfg:     config.retiro      || null,
      costoDelivery: config.delivery?.costoEnvio || 0,
      formasPago:    (config.formasPago || []).filter(f => f.habilitado),
      categorias,
      productos,
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// Enviar pedido desde la carta
router.post('/:userId/pedido', async (req, res) => {
  try {
    const {
      items, tipo, mesaNumero, direccion,
      clienteNombre, clienteEmail, clienteTelefono,
      notas, formaPago, descuento = 0,
    } = req.body

    if (!items?.length)  return res.status(400).json({ message: 'El pedido está vacío' })
    if (!tipo)           return res.status(400).json({ message: 'Indicá el tipo de pedido' })
    if (tipo === 'mesa'     && !mesaNumero?.trim())     return res.status(400).json({ message: 'Indicá el número de mesa' })
    if (tipo === 'delivery' && !direccion?.trim())      return res.status(400).json({ message: 'Indicá la dirección de entrega' })
    if (tipo !== 'mesa'    && !clienteEmail?.trim())    return res.status(400).json({ message: 'El email es requerido' })
    if (tipo !== 'mesa'    && !clienteNombre?.trim())   return res.status(400).json({ message: 'El nombre es requerido' })
    if (tipo !== 'mesa'    && !clienteTelefono?.trim()) return res.status(400).json({ message: 'El teléfono es requerido' })

    const total      = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
    const totalFinal = descuento > 0 ? Math.round(total * (1 - descuento / 100)) : total

    const pedido = await PedidoOnline.create({
      usuario:         req.params.userId,
      items,
      tipo,
      mesaNumero:      mesaNumero?.trim()      || '',
      direccion:       direccion?.trim()        || '',
      clienteNombre:   clienteNombre?.trim()    || '',
      clienteEmail:    clienteEmail?.trim()     || '',
      clienteTelefono: clienteTelefono?.trim()  || '',
      formaPago:       formaPago?.trim()        || '',
      descuento,
      notas:           notas?.trim()            || '',
      total,
      totalFinal,
    })

    const numero = pedido._id.toString().slice(-6).toUpperCase()

    const frontendUrl  = process.env.FRONTEND_URL || 'http://localhost:5173'
    const trackingUrl  = `${frontendUrl}/tracking/${pedido._id}`

    // Email de confirmación al cliente (no bloqueante)
    if (pedido.clienteEmail) {
      const user = await User.findById(req.params.userId).select('restaurante')
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
    res.status(500).json({ message: e.message })
  }
})

// Tracking público del pedido (sin auth)
router.get('/tracking/:pedidoId', async (req, res) => {
  try {
    const pedido = await PedidoOnline.findById(req.params.pedidoId)
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' })

    const user = await User.findById(pedido.usuario).select('restaurante logo')

    res.json({
      numero:          pedido._id.toString().slice(-6).toUpperCase(),
      estado:          pedido.estado,
      tipo:            pedido.tipo,
      mesaNumero:      pedido.mesaNumero,
      direccion:       pedido.direccion,
      clienteNombre:   pedido.clienteNombre,
      formaPago:       pedido.formaPago,
      items:           pedido.items,
      total:           pedido.total,
      totalFinal:      pedido.totalFinal,
      descuento:       pedido.descuento,
      createdAt:       pedido.createdAt,
      restaurante:     user?.restaurante || '',
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
