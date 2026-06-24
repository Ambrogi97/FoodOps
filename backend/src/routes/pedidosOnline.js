const express       = require('express')
const router        = express.Router()
const auth          = require('../middleware/auth')
const PedidoOnline  = require('../models/PedidoOnline')

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
    res.json(pedido)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
