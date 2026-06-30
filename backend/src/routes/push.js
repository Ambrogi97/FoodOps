const express     = require('express')
const router      = express.Router()
const webPush     = require('web-push')
const auth        = require('../middleware/auth')
const ConfigTienda = require('../models/ConfigTienda')

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    `mailto:${process.env.SMTP_USER || 'noreply@foodops.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// GET clave pública VAPID (para que el cliente pueda suscribirse)
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null })
})

// POST suscribir dispositivo
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body
    if (!subscription) return res.status(400).json({ message: 'subscription requerida' })

    await ConfigTienda.findOneAndUpdate(
      { usuario: req.propietarioId },
      { $addToSet: { pushSuscripciones: subscription } },
      { upsert: true }
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST desuscribir dispositivo
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body
    await ConfigTienda.findOneAndUpdate(
      { usuario: req.propietarioId },
      { $pull: { pushSuscripciones: { endpoint } } }
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// Función interna para enviar notificación push a un restaurante
async function enviarPushNuevoPedido(usuarioId, { numero, tipo }) {
  if (!process.env.VAPID_PUBLIC_KEY) return
  try {
    const config = await ConfigTienda.findOne({ usuario: usuarioId }).select('pushSuscripciones')
    if (!config?.pushSuscripciones?.length) return

    const payload = JSON.stringify({
      title: `🛎️ Nuevo pedido #${numero}`,
      body:  tipo === 'delivery' ? 'Pedido de delivery' : tipo === 'mesa' ? 'Pedido en mesa' : 'Pedido para retirar',
      icon:  '/favicon.svg',
    })

    const muertos = []
    await Promise.all(config.pushSuscripciones.map(async (sub) => {
      try {
        await webPush.sendNotification(sub, payload)
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) muertos.push(sub.endpoint)
      }
    }))

    if (muertos.length) {
      await ConfigTienda.findOneAndUpdate(
        { usuario: usuarioId },
        { $pull: { pushSuscripciones: { endpoint: { $in: muertos } } } }
      )
    }
  } catch {}
}

module.exports = { router, enviarPushNuevoPedido }
