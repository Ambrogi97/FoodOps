const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const Gasto   = require('../models/Gasto')

router.get('/', auth, async (req, res) => {
  try {
    const gastos = await Gasto.find({ usuario: req.usuario.id }).sort('-fecha')
    res.json(gastos)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { descripcion, monto, categoria, fecha } = req.body
    if (!descripcion?.trim() || !monto || !categoria || !fecha) {
      return res.status(400).json({ message: 'Faltan campos requeridos' })
    }
    const gasto = await Gasto.create({
      descripcion: descripcion.trim(),
      monto: Number(monto),
      categoria,
      fecha,
      usuario: req.usuario.id,
    })
    res.status(201).json(gasto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const gasto = await Gasto.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!gasto) return res.status(404).json({ message: 'Gasto no encontrado' })
    res.json({ message: 'Gasto eliminado' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
