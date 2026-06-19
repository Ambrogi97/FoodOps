const express   = require('express')
const router    = express.Router()
const auth      = require('../middleware/auth')
const Descuento = require('../models/Descuento')

router.get('/', auth, async (req, res) => {
  try {
    const descuentos = await Descuento.find({ usuario: req.usuario.id }).sort('-createdAt')
    res.json(descuentos)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, tipo, valor, estado } = req.body
    if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' })
    const descuento = await Descuento.create({
      nombre,
      tipo:    tipo    || 'sin_importe',
      valor:   valor   ?? null,
      estado:  estado  || 'activo',
      usuario: req.usuario.id,
    })
    res.status(201).json(descuento)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, tipo, valor, estado } = req.body
    const descuento = await Descuento.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      { nombre, tipo, valor: valor ?? null, estado },
      { new: true }
    )
    if (!descuento) return res.status(404).json({ message: 'No encontrado' })
    res.json(descuento)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await Descuento.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
