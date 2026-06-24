const express  = require('express')
const router   = express.Router()
const auth     = require('../middleware/auth')
const Producto = require('../models/Producto')

router.get('/', auth, async (req, res) => {
  try {
    const productos = await Producto.find({ usuario: req.propietarioId }).sort('nombre')
    res.json(productos)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, categoria, precio, costo, imagen, descripcion,
      areaImpresion, controlStock, venderSinStock, permitirVenderSolo,
      tiempoPrepMin, receta, activo } = req.body
    if (!nombre?.trim() || !categoria || precio == null)
      return res.status(400).json({ message: 'Faltan campos requeridos' })
    const ultimo = await Producto.findOne({ usuario: req.propietarioId }).sort('-codigo')
    const codigo = (ultimo?.codigo || 0) + 1
    const producto = await Producto.create({
      nombre: nombre.trim(), categoria, precio: Number(precio),
      costo: Number(costo) || 0, imagen: imagen || '', descripcion: descripcion || '',
      activo: activo !== false, codigo,
      areaImpresion:      areaImpresion      || '',
      controlStock:       controlStock       || false,
      venderSinStock:     venderSinStock     || false,
      permitirVenderSolo: permitirVenderSolo !== false,
      tiempoPrepMin:      tiempoPrepMin      || null,
      receta:             receta             || [],
      usuario: req.propietarioId,
    })
    res.status(201).json(producto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, categoria, precio, costo, imagen, descripcion,
      areaImpresion, controlStock, venderSinStock, permitirVenderSolo,
      tiempoPrepMin, receta, activo } = req.body
    const producto = await Producto.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      {
        nombre: nombre?.trim(), categoria, precio: Number(precio),
        costo: Number(costo) || 0, imagen: imagen ?? '', descripcion: descripcion ?? '',
        activo: activo !== false,
        areaImpresion:      areaImpresion      ?? '',
        controlStock:       controlStock       ?? false,
        venderSinStock:     venderSinStock     ?? false,
        permitirVenderSolo: permitirVenderSolo !== false,
        tiempoPrepMin:      tiempoPrepMin      || null,
        receta:             receta             ?? [],
      },
      { new: true }
    )
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json(producto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id/stock', auth, async (req, res) => {
  try {
    const { stockActual } = req.body
    const producto = await Producto.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      { stockActual: Number(stockActual) || 0 },
      { new: true }
    )
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json(producto)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const producto = await Producto.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' })
    res.json({ message: 'Producto eliminado' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
