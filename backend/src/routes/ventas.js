const express = require('express')
const router  = express.Router()
const { responderError } = require('../utils/security')
const auth    = require('../middleware/auth')
const Venta   = require('../models/Venta')

router.get('/', auth, async (req, res) => {
  try {
    const ventas = await Venta.find({ usuario: req.propietarioId }).sort('-createdAt')
    res.json(ventas)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { mesa, inicio, cierre, items, personas, metodoPago, tipo } = req.body
    if (!mesa || !inicio) return res.status(400).json({ message: 'Faltan campos requeridos' })

    const ultima = await Venta.findOne({ usuario: req.propietarioId }).sort('-numero')
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
      usuario:    req.propietarioId,
    })
    res.status(201).json(venta)
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
