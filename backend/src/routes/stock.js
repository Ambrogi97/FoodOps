const express         = require('express')
const router          = express.Router()
const { responderError } = require('../utils/security')
const auth            = require('../middleware/auth')
const Ingrediente     = require('../models/Ingrediente')
const MovimientoStock = require('../models/MovimientoStock')

// Listar ingredientes con info de stock
router.get('/', auth, async (req, res) => {
  try {
    const ingredientes = await Ingrediente.find({ usuario: req.propietarioId }).sort('nombre')
    res.json(ingredientes)
  } catch (e) {
    return responderError(req, res, e)
  }
})

// Registrar movimiento (entrada o salida)
router.post('/:id/movimiento', auth, async (req, res) => {
  try {
    const { tipo, cantidad, descripcion, fecha } = req.body
    if (!tipo || !cantidad || !fecha) return res.status(400).json({ message: 'Faltan campos requeridos' })
    if (!['entrada', 'salida'].includes(tipo)) return res.status(400).json({ message: 'Tipo de movimiento inválido' })
    if (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0 || Number(cantidad) > 100000)
      return res.status(400).json({ message: 'La cantidad debe ser un número entre 0 y 100.000' })

    const ingrediente = await Ingrediente.findOne({ _id: req.params.id, usuario: req.propietarioId })
    if (!ingrediente) return res.status(404).json({ message: 'Ingrediente no encontrado' })

    const delta = tipo === 'entrada' ? Number(cantidad) : -Number(cantidad)
    ingrediente.stockActual = (ingrediente.stockActual || 0) + delta
    await ingrediente.save()

    const movimiento = await MovimientoStock.create({
      ingrediente: req.params.id,
      tipo,
      cantidad:    Number(cantidad),
      descripcion: descripcion?.trim() || '',
      fecha,
      usuario:     req.propietarioId,
    })

    res.status(201).json({ ingrediente, movimiento })
  } catch (e) {
    return responderError(req, res, e)
  }
})

// Actualizar stock mínimo
router.put('/:id/minimo', auth, async (req, res) => {
  try {
    const { stockMinimo } = req.body
    const ingrediente = await Ingrediente.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { stockMinimo: Number(stockMinimo) || 0 },
      { new: true }
    )
    if (!ingrediente) return res.status(404).json({ message: 'Ingrediente no encontrado' })
    res.json(ingrediente)
  } catch (e) {
    return responderError(req, res, e)
  }
})

// Actualizar unidad
router.put('/:id/unidad', auth, async (req, res) => {
  try {
    const { unidad } = req.body
    if (!unidad?.trim()) return res.status(400).json({ message: 'La unidad no puede estar vacía' })
    const ingrediente = await Ingrediente.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { unidad: unidad.trim() },
      { new: true }
    )
    if (!ingrediente) return res.status(404).json({ message: 'Ingrediente no encontrado' })
    res.json(ingrediente)
  } catch (e) {
    return responderError(req, res, e)
  }
})

// Historial de movimientos de un ingrediente
router.get('/:id/movimientos', auth, async (req, res) => {
  try {
    const movimientos = await MovimientoStock.find({ ingrediente: req.params.id, usuario: req.propietarioId })
      .sort('-createdAt')
      .limit(30)
    res.json(movimientos)
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
