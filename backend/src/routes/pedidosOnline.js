const express       = require('express')
const router        = express.Router()
const crypto        = require('crypto')
const auth          = require('../middleware/auth')
const PedidoOnline  = require('../models/PedidoOnline')
const { enviarEmail } = require('../utils/email')
const { enviarPushNuevoPedido } = require('./push')

const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

function tokenResena(pedidoId) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret')
    .update(String(pedidoId))
    .digest('hex')
    .slice(0, 16)
}

function emailResena({ numero, clienteNombre, resenaUrl }) {
  return /* html */`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
      <tr><td style="background:#e85d2b;padding:24px 0;text-align:center;">
        <span style="font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:2px;">¿Cómo estuvo tu experiencia?</span>
      </td></tr>
      <tr><td style="padding:36px 48px;text-align:center;">
        <p style="font-size:32px;margin:0 0 12px;">⭐</p>
        <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#1a1a2e;">Hola ${clienteNombre || 'cliente'}!</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.5;">
          Tu pedido <strong>#${numero}</strong> fue entregado.<br>¿Qué te pareció? Tu opinión nos ayuda a mejorar.
        </p>
        <a href="${resenaUrl}" style="display:inline-block;background:#e85d2b;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;">
          Calificar mi pedido →
        </a>
      </td></tr>
      <tr><td style="padding:16px 48px 24px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#aaa;">Powered by <strong style="color:#e85d2b;">FoodOps</strong></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

router.get('/', auth, async (req, res) => {
  try {
    const pedidos = await PedidoOnline.find({ usuario: req.propietarioId })
      .sort({ createdAt: -1 })
      .limit(100)
    res.json(pedidos)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id/estado', auth, async (req, res) => {
  try {
    const { estado } = req.body
    const pedido = await PedidoOnline.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { estado },
      { returnDocument: 'after' }
    )
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' })

    // Al llegar el primer pedido pendiente → push notification
    if (estado === 'pendiente') {
      enviarPushNuevoPedido(req.propietarioId, { numero: pedido.numero, tipo: pedido.tipo })
        .catch(() => {})
    }

    // Al entregar → email de reseña al cliente
    if (estado === 'entregado' && pedido.clienteEmail) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      const token       = tokenResena(pedido._id)
      const resenaUrl   = `${frontendUrl}/resena/${pedido._id}?token=${token}`
      enviarEmail({
        to:      pedido.clienteEmail,
        subject: `¿Cómo estuvo tu pedido #${pedido.numero}?`,
        html:    emailResena({ numero: pedido.numero, clienteNombre: pedido.clienteNombre, resenaUrl }),
      }).catch(() => {})
    }

    res.json(pedido)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
