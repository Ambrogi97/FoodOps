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

// "dd/mm/aaaa" que exista en el calendario (rechaza "31/02/2026" o texto cualquiera)
function fechaValida(f) {
  const m = typeof f === 'string' && f.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return false
  const [d, mes, a] = [+m[1], +m[2], +m[3]]
  const dt = new Date(Date.UTC(a, mes - 1, d))
  return a >= 2000 && a <= 2100 && dt.getUTCFullYear() === a && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === d
}

// Registrar movimiento (entrada o salida)
router.post('/:id/movimiento', auth, async (req, res) => {
  try {
    const { tipo, cantidad, descripcion, fecha } = req.body
    if (!tipo || !cantidad || !fecha) return res.status(400).json({ message: 'Faltan campos requeridos' })
    if (!['entrada', 'salida'].includes(tipo)) return res.status(400).json({ message: 'Tipo de movimiento inválido' })
    if (!Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0 || Number(cantidad) > 100000)
      return res.status(400).json({ message: 'La cantidad debe ser un número entre 0 y 100.000' })
    if (!fechaValida(fecha)) return res.status(400).json({ message: 'La fecha no es válida (dd/mm/aaaa)' })

    const cant  = Number(cantidad)
    const delta = tipo === 'entrada' ? cant : -cant
    // Una sola operación atómica en la base: dos movimientos simultáneos ya no se pisan
    // (antes se leía el stock, se sumaba y se guardaba, y se perdían movimientos).
    // Una salida solo se aplica si hay stock suficiente: el stock no puede quedar negativo.
    const ingrediente = await Ingrediente.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId, ...(tipo === 'salida' ? { stockActual: { $gte: cant } } : {}) },
      { $inc: { stockActual: delta } },
      { returnDocument: 'after' },
    )
    if (!ingrediente) {
      const existe = await Ingrediente.findOne({ _id: req.params.id, usuario: req.propietarioId }).select('stockActual unidad').lean()
      if (!existe) return res.status(404).json({ message: 'Ingrediente no encontrado' })
      return res.status(400).json({
        code: 'STOCK_INSUFICIENTE',
        message: `No hay stock suficiente: hay ${Math.round((existe.stockActual || 0) * 100) / 100} ${existe.unidad || ''}`.trim(),
      })
    }

    let movimiento
    try {
      movimiento = await MovimientoStock.create({
        ingrediente: req.params.id,
        tipo,
        cantidad:    cant,
        descripcion: typeof descripcion === 'string' ? descripcion.trim().slice(0, 300) : '',
        fecha:       fecha.trim(),
        usuario:     req.propietarioId,
      })
    } catch (e) {
      // Sin el registro del movimiento se deshace el cambio de stock para no dejarlo inconsistente
      await Ingrediente.updateOne({ _id: req.params.id, usuario: req.propietarioId }, { $inc: { stockActual: -delta } }).catch(() => {})
      throw e
    }

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
      { returnDocument: 'after' }
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
      { returnDocument: 'after' }
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
