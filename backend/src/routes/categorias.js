const express   = require('express')
const router    = express.Router()
const { responderError } = require('../utils/security')
const auth      = require('../middleware/auth')
const Categoria = require('../models/Categoria')
const Producto  = require('../models/Producto')

router.get('/', auth, async (req, res) => {
  try {
    const categorias = await Categoria.find({ usuario: req.propietarioId }).sort('nombre')
    res.json(categorias)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, areaImpresion, tiempoPrepDefecto } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const categoria = await Categoria.create({
      nombre: nombre.trim(),
      areaImpresion:     areaImpresion     || '',
      tiempoPrepDefecto: tiempoPrepDefecto || 0,
      usuario: req.propietarioId,
    })
    res.status(201).json(categoria)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, areaImpresion, tiempoPrepDefecto } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const categoria = await Categoria.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { nombre: nombre.trim(), areaImpresion: areaImpresion ?? '', tiempoPrepDefecto: tiempoPrepDefecto || 0 },
      { new: true }
    )
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' })
    res.json(categoria)
  } catch (e) {
    return responderError(req, res, e)
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const categoria = await Categoria.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' })
    await Producto.deleteMany({ categoria: req.params.id, usuario: req.propietarioId })
    res.json({ message: 'Categoría eliminada' })
  } catch (e) {
    return responderError(req, res, e)
  }
})

module.exports = router
