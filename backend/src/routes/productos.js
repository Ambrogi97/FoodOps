const express  = require('express')
const router   = express.Router()
const auth     = require('../middleware/auth')
const Producto = require('../models/Producto')

router.get('/', auth, async (req, res) => {
  try {
    const productos = await Producto.find({ usuario: req.usuario.id }).sort('nombre')
    res.json(productos)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, categoria, precio, costo } = req.body
    if (!nombre?.trim() || !categoria || precio == null) {
      return res.status(400).json({ message: 'Faltan campos requeridos' })
    }
    const producto = await Producto.create({
      nombre: nombre.trim(),
      categoria,
      precio: Number(precio),
      costo: Number(costo) || 0,
      usuario: req.usuario.id,
    })
    res.status(201).json(producto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, categoria, precio } = req.body
    const producto = await Producto.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      { nombre: nombre?.trim(), categoria, precio: Number(precio) },
      { returnDocument: 'after' }
    )
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json(producto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const producto = await Producto.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json({ message: 'Producto eliminado' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
