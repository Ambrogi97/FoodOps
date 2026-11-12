const express = require('express')
const router  = express.Router()
const { responderError } = require('../utils/security')
const auth    = require('../middleware/auth')
const Zona    = require('../models/Zona')
const Mesa    = require('../models/Mesa')

router.get('/', auth, async (req, res) => {
  try {
    const zonas = await Zona.find({ usuario: req.propietarioId }).sort('createdAt')
    res.json(zonas)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { label, removible } = req.body
    if (!label?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const zona = await Zona.create({ label: label.trim(), removible: removible !== false, usuario: req.propietarioId })
    res.status(201).json(zona)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const zona = await Zona.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    if (!zona) return res.status(404).json({ message: 'Zona no encontrada' })
    await Mesa.deleteMany({ zona: req.params.id, usuario: req.propietarioId })
    res.json({ message: 'Zona eliminada' })
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
