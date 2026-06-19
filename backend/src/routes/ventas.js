const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const Venta   = require('../models/Venta')

router.get('/', auth, async (req, res) => {
  try {
    const ventas = await Venta.find({ usuario: req.usuario.id }).sort('-createdAt')
    res.json(ventas)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { mesa, inicio, cierre, items, personas, metodoPago, tipo } = req.body
    if (!mesa || !inicio) return res.status(400).json({ message: 'Faltan campos requeridos' })

    const ultima = await Venta.findOne({ usuario: req.usuario.id }).sort('-numero')
    const numero = (ultima?.numero || 0) + 1

    const venta = await Venta.create({
      numero,
      mesa,
      inicio,
      cierre:     cierre || null,
      items:      items || [],
      personas:   personas || 1,
      metodoPago: metodoPago || 'Efectivo',
      tipo:       tipo || 'salon',
      usuario:    req.usuario.id,
    })
    res.status(201).json(venta)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
