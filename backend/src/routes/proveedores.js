const express    = require('express')
const router     = express.Router()
const auth       = require('../middleware/auth')
const Proveedor  = require('../models/Proveedor')

router.get('/', auth, async (req, res) => {
  try {
    const proveedores = await Proveedor.find({ usuario: req.usuario.id }).sort('nombre')
    res.json(proveedores)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, rubro, telefono, email, notas } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const proveedor = await Proveedor.create({
      nombre:   nombre.trim(),
      rubro:    rubro?.trim()    || '',
      telefono: telefono?.trim() || '',
      email:    email?.trim()    || '',
      notas:    notas?.trim()    || '',
      usuario:  req.usuario.id,
    })
    res.status(201).json(proveedor)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, rubro, telefono, email, notas } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const proveedor = await Proveedor.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      { nombre: nombre.trim(), rubro: rubro?.trim() || '', telefono: telefono?.trim() || '', email: email?.trim() || '', notas: notas?.trim() || '' },
      { returnDocument: 'after' }
    )
    if (!proveedor) return res.status(404).json({ message: 'Proveedor no encontrado' })
    res.json(proveedor)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const proveedor = await Proveedor.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id })
    if (!proveedor) return res.status(404).json({ message: 'Proveedor no encontrado' })
    res.json({ message: 'Proveedor eliminado' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
