const express  = require('express')
const router   = express.Router()
const auth     = require('../middleware/auth')
const Categoria = require('../models/Categoria')
const Producto  = require('../models/Producto')

router.get('/', auth, async (req, res) => {
  try {
    const categorias = await Categoria.find({ usuario: req.usuario.id }).sort('nombre')
    res.json(categorias)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const categoria = await Categoria.create({ nombre: nombre.trim(), usuario: req.usuario.id })
    res.status(201).json(categoria)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const categoria = await Categoria.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' })
    await Producto.deleteMany({ categoria: req.params.id, usuario: req.usuario.id })
    res.json({ message: 'Categoría eliminada' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
