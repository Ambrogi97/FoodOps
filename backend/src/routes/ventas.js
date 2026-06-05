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
    const { mesa, inicio, cierre, items } = req.body
    if (!mesa || !inicio || !cierre) return res.status(400).json({ message: 'Faltan campos requeridos' })
    const venta = await Venta.create({ mesa, inicio, cierre, items: items || [], usuario: req.usuario.id })
    res.status(201).json(venta)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
