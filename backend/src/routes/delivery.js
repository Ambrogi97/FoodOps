const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const PedidoDelivery = require('../models/PedidoDelivery')

router.get('/', auth, async (req, res) => {
  try {
    const uid = req.usuario.id
    const [enPreparacion, listoParaEntregar, enviados, entregados] = await Promise.all([
      PedidoDelivery.find({ usuario: uid, estado: 'en_preparacion' }).sort('createdAt'),
      PedidoDelivery.find({ usuario: uid, estado: 'listo_para_entregar' }).sort('createdAt'),
      PedidoDelivery.find({ usuario: uid, estado: 'enviado' }).sort('-createdAt').limit(5),
      PedidoDelivery.find({ usuario: uid, estado: 'entregado' }).sort('-createdAt').limit(5),
    ])
    res.json({ enPreparacion, listoParaEntregar, enviados, entregados })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const count  = await PedidoDelivery.countDocuments({ usuario: req.usuario.id })
    const pedido = await PedidoDelivery.create({ ...req.body, numero: count + 1, usuario: req.usuario.id })
    res.status(201).json(pedido)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const pedido = await PedidoDelivery.findOneAndUpdate(
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
    await PedidoDelivery.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
