const express      = require('express')
const router       = express.Router()
const { responderError } = require('../utils/security')
const auth         = require('../middleware/auth')
const Resena       = require('../models/Resena')
const PedidoOnline = require('../models/PedidoOnline')
const mongoose     = require('mongoose')
const { tokenResena, resenaVencida, iguales } = require('../utils/enlaces')

// Valida el link del email: id de pedido + token (HMAC del id). Devuelve el pedido o null.
async function pedidoDelEnlace(pedidoId, token) {
  if (!mongoose.isValidObjectId(pedidoId) || typeof token !== 'string' || !token) return null
  const pedido = await PedidoOnline.findById(pedidoId).select('clienteNombre estado numero usuario createdAt entregadoAt')
  if (!pedido || !iguales(token, tokenResena(pedidoId))) return null
  return pedido
}

// GET reseña pública para un pedido (con token)
router.get('/:pedidoId', async (req, res) => {
  try {
    const pedido = await pedidoDelEnlace(req.params.pedidoId, req.query.token)
    if (!pedido) return res.status(404).json({ message: 'Enlace inválido' })

    const existente = await Resena.findOne({ pedido: pedido._id })
    // Una reseña ya enviada se puede seguir viendo; una sin enviar vence a los 14 días
    if (!existente && resenaVencida(pedido))
      return res.status(410).json({ message: 'El plazo para dejar la reseña de este pedido ya venció.' })

    res.json({
      numero:        pedido.numero || String(pedido._id).slice(-6).toUpperCase(),
      clienteNombre: pedido.clienteNombre,
      yaReseno:      !!existente,
      estrellas:     existente?.estrellas || null,
      comentario:    existente?.comentario || '',
    })
  } catch (e) {
    return responderError(req, res, e)
  }
})

// POST enviar reseña (una sola vez por pedido)
router.post('/:pedidoId', async (req, res) => {
  try {
    const { token, comentario } = req.body
    const estrellas = Number(req.body.estrellas)
    if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5)
      return res.status(400).json({ message: 'Elegí de 1 a 5 estrellas' })

    const pedido = await pedidoDelEnlace(req.params.pedidoId, token)
    if (!pedido) return res.status(404).json({ message: 'Enlace inválido' })
    if (resenaVencida(pedido))
      return res.status(410).json({ message: 'El plazo para dejar la reseña de este pedido ya venció.' })

    try {
      await Resena.create({
        pedido:     pedido._id,
        usuario:    pedido.usuario,
        estrellas,
        comentario: typeof comentario === 'string' ? comentario.trim().slice(0, 1000) : '',
        token,
      })
    } catch (e) {
      // El índice único de "pedido" frena la segunda reseña (también si llegan dos a la vez)
      if (e?.code === 11000) return res.status(409).json({ message: 'Ya dejaste la reseña de este pedido. ¡Gracias!' })
      throw e
    }
    res.json({ ok: true })
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.get('/', auth, async (req, res) => {
  try {
    const resenas = await Resena.find({ usuario: req.propietarioId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('pedido', 'numero clienteNombre createdAt')
    res.json(resenas)
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
