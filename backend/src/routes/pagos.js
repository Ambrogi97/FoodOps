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

// POST /api/pagos/suscribir — crea la suscripción y devuelve el link de MP
router.post('/suscribir', auth, async (req, res) => {
  try {
    const { plan } = req.body
    if (!PLANES_MP[plan]) return res.status(400).json({ message: 'Plan inválido' })

    const user = await User.findById(req.usuario.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    const { monto, label } = PLANES_MP[plan]

    const mpRes = await mpFetch('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        reason: label,
        auto_recurring: {
          frequency:          1,
          frequency_type:     'months',
          transaction_amount: monto,
          currency_id:        'ARS',
        },
        back_url:           `${process.env.FRONTEND_URL}/dashboard?pago=ok`,
        payer_email:        user.email,
        status:             'pending',
        external_reference: `${user._id}|${plan}`,
      }),
    })

    const data = await mpRes.json()
    if (!mpRes.ok) {
      console.error('MP error suscribir:', data)
      return res.status(500).json({ message: 'Error al crear suscripción en Mercado Pago' })
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

    if (type === 'preapproval' && data?.id) {
      const mpRes = await mpFetch(`/preapproval/${data.id}`)
      const sub   = await mpRes.json()

      const [userId, plan] = (sub.external_reference || '').split('|')
      if (!userId || !plan || !PLANES_MP[plan]) return res.sendStatus(200)

      if (sub.status === 'authorized') {
        await User.findByIdAndUpdate(userId, {
          plan,
          trialEndsAt:        null,
          mpSubscriptionId:   data.id,
          subscriptionStatus: 'active',
        })
        console.log(`Plan actualizado a ${plan} para usuario ${userId}`)
      } else if (sub.status === 'cancelled') {
        await User.findByIdAndUpdate(userId, { subscriptionStatus: 'cancelled' })
      } else if (sub.status === 'paused') {
        await User.findByIdAndUpdate(userId, { subscriptionStatus: 'paused' })
      }
    }

    res.sendStatus(200)
  } catch (e) {
    console.error('Webhook error:', e)
    res.sendStatus(200) // siempre 200 para que MP no reintente indefinidamente
  }
})

module.exports = router
