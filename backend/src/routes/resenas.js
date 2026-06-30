const express      = require('express')
const router       = express.Router()
const auth         = require('../middleware/auth')
const Resena       = require('../models/Resena')
const PedidoOnline = require('../models/PedidoOnline')
const mongoose     = require('mongoose')

// GET reseña pública para un pedido (con token)
router.get('/:pedidoId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.pedidoId))
      return res.status(404).json({ message: 'Pedido no encontrado' })

    const pedido = await PedidoOnline.findById(req.params.pedidoId).select('clienteNombre estado numero usuario')
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' })

    const { token } = req.query
    if (!token) return res.status(400).json({ message: 'Token requerido' })

    const existente = await Resena.findOne({ pedido: req.params.pedidoId })

    res.json({
      numero:        pedido.numero || req.params.pedidoId.slice(-6).toUpperCase(),
      clienteNombre: pedido.clienteNombre,
      yaReseno:      !!existente,
      estrellas:     existente?.estrellas || null,
      comentario:    existente?.comentario || '',
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// POST enviar reseña
router.post('/:pedidoId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.pedidoId))
      return res.status(404).json({ message: 'Pedido no encontrado' })

    const { token, estrellas, comentario } = req.body
    if (!token || !estrellas) return res.status(400).json({ message: 'Token y estrellas son requeridos' })
    if (estrellas < 1 || estrellas > 5) return res.status(400).json({ message: 'Estrellas debe ser entre 1 y 5' })

    const pedido = await PedidoOnline.findById(req.params.pedidoId).select('usuario')
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' })

    const crypto = require('crypto')
    const tokenEsperado = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret')
      .update(req.params.pedidoId)
      .digest('hex')
      .slice(0, 16)

    if (token !== tokenEsperado) return res.status(403).json({ message: 'Token inválido' })

    await Resena.findOneAndUpdate(
      { pedido: req.params.pedidoId },
      { pedido: req.params.pedidoId, usuario: pedido.usuario, estrellas, comentario: comentario?.trim() || '', token },
      { upsert: true, new: true }
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET reseñas del restaurante (autenticado)
router.get('/', auth, async (req, res) => {
  try {
    const resenas = await Resena.find({ usuario: req.propietarioId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('pedido', 'numero clienteNombre createdAt')
    res.json(resenas)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
