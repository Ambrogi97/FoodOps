const express        = require('express')
const router         = express.Router()
const User           = require('../models/User')
const Categoria      = require('../models/Categoria')
const Producto       = require('../models/Producto')
const PedidoOnline   = require('../models/PedidoOnline')
const ConfigTienda   = require('../models/ConfigTienda')
const { enviarEmail } = require('../utils/email')

const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

function emailConfirmacionPedido({ restaurante, numero, pedido, totalFinal, descuento }) {
  const tipoLabel = pedido.tipo === 'delivery' ? 'Delivery' : pedido.tipo === 'takeaway' ? 'Retiro en el local' : `Mesa ${pedido.mesaNumero}`
  const itemsHtml = pedido.items.map(i => `
    <tr>
      <td style="padding:8px 0;color:#374151;font-size:14px;">(${i.cantidad}) ${i.nombre}</td>
      <td style="padding:8px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${fmt(i.precio * i.cantidad)}</td>
    </tr>`).join('')

  const subtotal = pedido.items.reduce((a, i) => a + i.precio * i.cantidad, 0)
  const montoDesc = descuento > 0 ? Math.round(subtotal * descuento / 100) : 0

  return /* html */`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

      <tr><td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">${restaurante}</h1>
      </td></tr>

      <tr><td style="padding:32px 32px 8px;text-align:center;">
        <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="font-size:32px;">✅</span>
        </div>
        <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:24px;font-weight:800;">¡Pedido confirmado!</h2>
        <p style="margin:0;color:#6b7280;font-size:15px;">Hola <strong>${pedido.clienteNombre}</strong>, tu pedido ya fue confirmado y está próximo a prepararse.</p>
      </td></tr>

      <tr><td style="padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:16px 20px;">
          <tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Pedido:</span> <strong style="color:#1a1a2e;">#${numero}</strong></td></tr>
          <tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Fecha:</span> <strong style="color:#1a1a2e;">${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></td></tr>
          <tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Tipo:</span> <strong style="color:#1a1a2e;">${tipoLabel}</strong></td></tr>
          ${pedido.tipo === 'delivery' && pedido.direccion ? `<tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Dirección:</span> <strong style="color:#1a1a2e;">${pedido.direccion}</strong></td></tr>` : ''}
          ${pedido.formaPago ? `<tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Forma de pago:</span> <strong style="color:#1a1a2e;">${pedido.formaPago}</strong></td></tr>` : ''}
        </table>
      </td></tr>

      <tr><td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
          <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:12px;"></td></tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:14px;">Subtotal</td>
            <td style="padding:4px 0;color:#6b7280;font-size:14px;text-align:right;">${fmt(subtotal)}</td>
          </tr>
          ${montoDesc > 0 ? `<tr>
            <td style="padding:4px 0;color:#16a34a;font-size:14px;">Descuento (${descuento}%)</td>
            <td style="padding:4px 0;color:#16a34a;font-size:14px;text-align:right;">-${fmt(montoDesc)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0 0;color:#1a1a2e;font-size:17px;font-weight:800;">Total</td>
            <td style="padding:8px 0 0;color:#1a1a2e;font-size:17px;font-weight:800;text-align:right;">${fmt(totalFinal)}</td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:0 32px 32px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:13px;">¿Dudas? Contactanos por cualquier medio.</p>
      </td></tr>

      <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Powered by <strong style="color:#e85d2b;">FoodOps</strong></p>
      </td></tr>

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
        }),
      }).catch(e => console.error('Error enviando email pedido:', e))
    }

    res.status(201).json({ id: pedido._id, numero })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
