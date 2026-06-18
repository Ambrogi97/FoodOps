const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const PedidoMostrador = require('../models/PedidoMostrador')

router.get('/', auth, async (req, res) => {
  try {
    const enCurso  = await PedidoMostrador.find({ usuario: req.usuario.id, estado: 'en_curso' }).sort('createdAt')
    const cerradas = await PedidoMostrador.find({ usuario: req.usuario.id, estado: 'cerrada' }).sort('-createdAt').limit(5)
    res.json({ enCurso, cerradas })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const count  = await PedidoMostrador.countDocuments({ usuario: req.usuario.id })
    const pedido = await PedidoMostrador.create({ ...req.body, numero: count + 1, usuario: req.usuario.id })
    res.status(201).json(pedido)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const pedido = await PedidoMostrador.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      req.body,
      { new: true }
    )
    if (!pedido) return res.status(404).json({ message: 'No encontrado' })
    res.json(pedido)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await PedidoMostrador.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
