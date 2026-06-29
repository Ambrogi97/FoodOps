const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const User    = require('../models/User')

const MP_BASE = 'https://api.mercadopago.com'

const mpFetch = (path, options = {}) =>
  fetch(`${MP_BASE}${path}`, {
    ...options,
    headers: {
      Authorization:   `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type':  'application/json',
      ...(options.headers || {}),
    },
  })

const PLANES_MP = {
  basico:  { monto: 20000, label: 'FoodOps — Plan Básico' },
  premium: { monto: 35000, label: 'FoodOps — Plan Premium' },
}

// POST /api/pagos/suscribir — crea preferencia de pago y devuelve el link de MP
router.post('/suscribir', auth, async (req, res) => {
  try {
    const { plan } = req.body
    if (!PLANES_MP[plan]) return res.status(400).json({ message: 'Plan inválido' })

    const user = await User.findById(req.usuario.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    const { monto, label } = PLANES_MP[plan]
    const frontendUrl = process.env.FRONTEND_URL || 'https://foodops-app.vercel.app'

    const mpRes = await mpFetch('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [{
          title:      label,
          quantity:   1,
          unit_price: monto,
          currency_id: 'ARS',
        }],
        back_urls: {
          success: `${frontendUrl}/dashboard?pago=ok&plan=${plan}`,
          failure: `${frontendUrl}/dashboard?pago=error`,
          pending: `${frontendUrl}/dashboard?pago=pendiente`,
        },
        auto_return:        'approved',
        external_reference: `${user._id}|${plan}`,
        notification_url:   `${process.env.BACKEND_URL || 'https://foodops-6acc.onrender.com'}/api/pagos/webhook`,
      }),
    })

    const data = await mpRes.json()
    if (!mpRes.ok) {
      console.error('MP error suscribir:', JSON.stringify(data))
      return res.status(500).json({ message: `Error MP: ${data.message || JSON.stringify(data)}` })
    }

    res.json({ init_point: data.init_point })
  } catch (e) {
    console.error('Error suscribir:', e)
    res.status(500).json({ message: 'Error al procesar el pago' })
  }
})

// POST /api/pagos/webhook — notificaciones de Mercado Pago (sin auth)
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body

    if (type === 'payment' && data?.id) {
      const mpRes  = await mpFetch(`/v1/payments/${data.id}`)
      const pago   = await mpRes.json()

      if (pago.status !== 'approved') return res.sendStatus(200)

      const [userId, plan] = (pago.external_reference || '').split('|')
      if (!userId || !plan || !PLANES_MP[plan]) return res.sendStatus(200)

      // Acceso por 30 días desde el pago
      const vence = new Date()
      vence.setDate(vence.getDate() + 30)

      await User.findByIdAndUpdate(userId, {
        plan,
        trialEndsAt:        vence,
        mpSubscriptionId:   String(data.id),
        subscriptionStatus: 'active',
      })
      console.log(`Plan ${plan} activado para usuario ${userId} hasta ${vence.toISOString()}`)
    }

    res.sendStatus(200)
  } catch (e) {
    console.error('Webhook error:', e)
    res.sendStatus(200)
  }
})

module.exports = router
