const express   = require('express')
const router    = express.Router()
const { responderError } = require('../utils/security')
const auth      = require('../middleware/auth')
const Descuento = require('../models/Descuento')

router.get('/', auth, async (req, res) => {
  try {
    const descuentos = await Descuento.find({ usuario: req.propietarioId }).sort('-createdAt')
    res.json(descuentos)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, tipo, valor, estado } = req.body
    if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' })
    if (tipo === 'porcentaje' && Number(valor) > 100) return res.status(400).json({ message: 'Un descuento porcentual no puede superar el 100%' })
    const descuento = await Descuento.create({
      nombre,
      tipo:    tipo    || 'sin_importe',
      valor:   valor   ?? null,
      estado:  estado  || 'activo',
      usuario: req.propietarioId,
    })
    res.status(201).json(descuento)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, tipo, valor, estado } = req.body
    if (tipo === 'porcentaje' && Number(valor) > 100) return res.status(400).json({ message: 'Un descuento porcentual no puede superar el 100%' })
    const descuento = await Descuento.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { nombre, tipo, valor: valor ?? null, estado },
      { new: true }
    )
    if (!descuento) return res.status(404).json({ message: 'No encontrado' })
    res.json(descuento)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await Descuento.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    res.json({ ok: true })
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
