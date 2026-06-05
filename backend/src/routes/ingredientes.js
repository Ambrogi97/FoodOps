const express     = require('express')
const router      = express.Router()
const auth        = require('../middleware/auth')
const Ingrediente = require('../models/Ingrediente')

router.get('/', auth, async (req, res) => {
  try {
    const ingredientes = await Ingrediente.find({ usuario: req.usuario.id }).sort('nombre')
    res.json(ingredientes)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, unidad, costo, stockActual } = req.body
    if (!nombre?.trim() || !unidad) return res.status(400).json({ message: 'Faltan campos requeridos' })
    const ingrediente = await Ingrediente.create({
      nombre: nombre.trim(),
      unidad,
      costo:       Number(costo)       || 0,
      stockActual: Number(stockActual) || 0,
      usuario: req.usuario.id,
    })
    res.status(201).json(ingrediente)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, unidad, costo, stockActual } = req.body
    const update = { nombre: nombre?.trim(), unidad, costo: Number(costo) || 0 }
    if (stockActual !== undefined) update.stockActual = Number(stockActual) || 0
    const ingrediente = await Ingrediente.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      update,
      { returnDocument: 'after' }
    )
    if (!ingrediente) return res.status(404).json({ message: 'Ingrediente no encontrado' })
    res.json(ingrediente)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const ingrediente = await Ingrediente.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!ingrediente) return res.status(404).json({ message: 'Ingrediente no encontrado' })
    res.json({ message: 'Ingrediente eliminado' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
