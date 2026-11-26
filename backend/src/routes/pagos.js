const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const auth    = require('../middleware/auth')
const mongoose = require('mongoose')
const User    = require('../models/User')
const PagoMP  = require('../models/PagoMP')
const { avisarCambioPlan } = require('../utils/emailsPlan')

function verificarFirmaMP(req) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.warn('MP_WEBHOOK_SECRET no configurado — firma no verificada')
    return true
  }
  const xSignature = req.headers['x-signature']
  const xRequestId = req.headers['x-request-id'] || ''
  if (!xSignature) return false

  const parts = {}
  xSignature.split(',').forEach(p => {
    const [k, v] = p.split('=')
    if (k && v) parts[k.trim()] = v.trim()
  })
  const { ts, v1 } = parts
  if (!ts || !v1) return false

  const dataId   = req.query.id || req.body?.data?.id || ''
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

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

const MONEDA = 'ARS'

const PLANES_MP = {
  basico:  { monto: 20000, label: 'FoodOps — Plan Básico' },
  premium: { monto: 35000, label: 'FoodOps — Plan Premium' },
}

const DIA_MS = 24 * 60 * 60 * 1000

// Nuevo vencimiento: 30 días desde hoy más lo que le quedaba sin usar (antes se pisaba con
// hoy + 30 y quien renovaba antes de tiempo perdía esos días).
//  - Mismo plan: los días restantes se suman tal cual.
//  - Cambio de plan pago: se convierten por precio (10 días de Básico = 10 × 20.000/35.000 de Premium).
//  - Prueba gratuita: los días de prueba que queden se suman tal cual.
function venceConRenovacion(cuenta, planNuevo, ahora = Date.now()) {
  const restante = Math.max(0, (cuenta.trialEndsAt ? new Date(cuenta.trialEndsAt).getTime() : 0) - ahora)
  const actual = Object.hasOwn(PLANES_MP, cuenta.plan) ? PLANES_MP[cuenta.plan] : null
  const credito = actual ? restante * actual.monto / PLANES_MP[planNuevo].monto : restante
  return new Date(ahora + 30 * DIA_MS + Math.round(credito))
}

// POST /api/pagos/suscribir — crea preferencia de pago y devuelve el link de MP
router.post('/suscribir', auth, async (req, res) => {
  try {
    // El plan lo paga el dueño de la cuenta (antes un empleado podía iniciar un pago que se
    // acreditaba a su propio usuario y no al restaurante)
    if (req.usuario.cuentaPadreId) {
      return res.status(403).json({ message: 'Solo el dueño de la cuenta puede pagar el plan' })
    }
    const { plan } = req.body
    if (typeof plan !== 'string' || !Object.hasOwn(PLANES_MP, plan)) return res.status(400).json({ message: 'Plan inválido' })

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
          currency_id: MONEDA,
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
      // El detalle queda en el log del servidor; al usuario no se le muestra la respuesta cruda de Mercado Pago
      return res.status(502).json({ message: 'No se pudo iniciar el pago con Mercado Pago. Probá de nuevo en unos minutos.' })
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
    if (!verificarFirmaMP(req)) {
      console.warn('Webhook MP rechazado: firma inválida')
      return res.sendStatus(401)
    }

    const { type, data } = req.body

    if (type === 'payment' && data?.id) {
      const paymentId = String(data.id)

      // Aviso repetido de un pago ya acreditado: no se suman otros 30 días
      if (await PagoMP.exists({ paymentId })) return res.sendStatus(200)

      const mpRes = await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`)
      // Si Mercado Pago no responde, devolvemos error para que reintente el aviso más tarde
      if (!mpRes.ok) {
        console.error('Webhook MP: no se pudo consultar el pago', paymentId, mpRes.status)
        return res.sendStatus(502)
      }
      const pago = await mpRes.json()

      if (pago.status !== 'approved') return res.sendStatus(200)

      const [refId, plan] = (pago.external_reference || '').split('|')
      if (!mongoose.isValidObjectId(refId) || !Object.hasOwn(PLANES_MP, plan)) return res.sendStatus(200)

      // El monto y la moneda tienen que ser exactamente los del plan
      const { monto } = PLANES_MP[plan]
      if (Number(pago.transaction_amount) !== monto || pago.currency_id !== MONEDA) {
        console.warn(`Webhook MP: pago ${paymentId} rechazado — pagó ${pago.transaction_amount} ${pago.currency_id}, el plan ${plan} es ${monto} ${MONEDA}`)
        return res.sendStatus(200)
      }

      // El plan es de la cuenta: si el pago quedó a nombre de un empleado (pagos viejos), va al dueño
      const pagador = await User.findById(refId, 'cuentaPadreId').lean()
      if (!pagador) {
        console.warn(`Webhook MP: pago ${paymentId} de un usuario que ya no existe (${refId})`)
        return res.sendStatus(200)
      }
      const userId = String(pagador.cuentaPadreId || pagador._id)
      const cuenta = await User.findById(userId, 'plan trialEndsAt').lean()
      if (!cuenta) return res.sendStatus(200)

      const vence = venceConRenovacion(cuenta, plan)

      // Primero se registra el pago: si dos avisos llegan a la vez, el índice único deja pasar uno solo
      try {
        await PagoMP.create({ paymentId, usuario: userId, plan, monto, moneda: MONEDA, venceEl: vence })
      } catch (e) {
        if (e?.code === 11000) return res.sendStatus(200)
        throw e
      }

      try {
        const user = await User.findByIdAndUpdate(userId, {
          plan,
          trialEndsAt:        vence,
          mpSubscriptionId:   paymentId,
          subscriptionStatus: 'active',
        })
        if (!user) console.warn(`Webhook MP: pago ${paymentId} de un usuario que ya no existe (${userId})`)
        // user es el documento de antes del cambio: trae el plan anterior
        else avisarCambioPlan({ user, planAnterior: user.plan, plan, vence, monto, origen: 'pago' })
      } catch (e) {
        // No se pudo activar el plan: se borra el registro para que el reintento de Mercado Pago lo acredite
        await PagoMP.deleteOne({ paymentId }).catch(() => {})
        throw e
      }
      console.log(`Plan ${plan} activado para usuario ${userId} hasta ${vence.toISOString()}`)
    }

    res.sendStatus(200)
  } catch (e) {
    console.error('Webhook error:', e)
    // 500 para que Mercado Pago reintente el aviso (antes respondía 200 y el pago quedaba sin acreditar)
    res.sendStatus(500)
  }
})

module.exports = router
