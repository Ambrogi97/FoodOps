const express       = require('express')
const router        = express.Router()
const { responderError } = require('../utils/security')
const auth          = require('../middleware/auth')
const { referenciaAjena } = require('../utils/pertenencia')
const CategoriaGasto = require('../models/CategoriaGasto')

router.get('/', auth, async (req, res) => {
  try {
    const cats = await CategoriaGasto.find({ usuario: req.propietarioId }).sort('nombre')
    res.json(cats)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, categoriaFinanciera, activo, parent } = req.body
    const ajena = await referenciaAjena(req.propietarioId, [{ modelo: CategoriaGasto, ids: parent, nombre: 'La categoría padre' }])
    if (ajena) return res.status(400).json({ message: ajena })
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const cat = await CategoriaGasto.create({
      nombre: nombre.trim(),
      categoriaFinanciera: categoriaFinanciera || 'Gastos administrativos',
      activo: activo !== false,
      parent: parent || null,
      usuario: req.propietarioId,
    })
    res.status(201).json(cat)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, categoriaFinanciera, activo, parent } = req.body
    const ajena = await referenciaAjena(req.propietarioId, [{ modelo: CategoriaGasto, ids: parent, nombre: 'La categoría padre' }])
    if (ajena) return res.status(400).json({ message: ajena })
    if (parent && String(parent) === req.params.id) return res.status(400).json({ message: 'Una categoría no puede ser su propia categoría padre' })
    const cat = await CategoriaGasto.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { nombre: nombre?.trim(), categoriaFinanciera, activo, parent: parent || null },
      { new: true }
    )
    if (!cat) return res.status(404).json({ message: 'No encontrado' })
    res.json(cat)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await CategoriaGasto.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    res.json({ ok: true })
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
