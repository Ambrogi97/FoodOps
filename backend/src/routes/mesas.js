const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const Mesa    = require('../models/Mesa')

router.get('/', auth, async (req, res) => {
  try {
    const mesas = await Mesa.find({ usuario: req.usuario.id }).sort('numero')
    res.json(mesas)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/bulk', auth, async (req, res) => {
  try {
    const { mesas } = req.body
    if (!Array.isArray(mesas) || mesas.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array de mesas' })
    }
    const docs = mesas.map(m => ({ ...m, usuario: req.usuario.id }))
    const result = await Mesa.insertMany(docs)
    res.status(201).json(result)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { numero, zona, col, row } = req.body
    const mesa = await Mesa.create({ numero, zona, col, row, usuario: req.usuario.id })
    res.status(201).json(mesa)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { estado, col, row, hora, items, personas, numero } = req.body
    const update = {}
    if (numero   !== undefined) update.numero   = numero
    if (estado   !== undefined) update.estado   = estado
    if (col      !== undefined) update.col      = col
    if (row      !== undefined) update.row      = row
    if (hora     !== undefined) update.hora     = hora
    if (items    !== undefined) update.items    = items
    if (personas !== undefined) update.personas = personas
    const mesa = await Mesa.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      update,
      { new: true }
    )
    if (!mesa) return res.status(404).json({ message: 'Mesa no encontrada' })
    res.json(mesa)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const mesa = await Mesa.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!mesa) return res.status(404).json({ message: 'Mesa no encontrada' })
    await Mesa.updateMany(
      { usuario: req.usuario.id, numero: { $gt: mesa.numero } },
      { $inc: { numero: -1 } }
    )
    res.json({ message: 'Mesa eliminada' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
