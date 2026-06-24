const express  = require('express')
const router   = express.Router()
const auth     = require('../middleware/auth')
const Cliente  = require('../models/Cliente')

router.get('/', auth, async (req, res) => {
  try {
    const clientes = await Cliente.find({ usuario: req.propietarioId }).sort('nombre')
    res.json(clientes)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { nombre, email, telefono, numeroTributario, fechaNacimiento, direccion, comentario, origen, grupo } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const cliente = await Cliente.create({
      nombre: nombre.trim(),
      email:            email            || '',
      telefono:         telefono         || '',
      numeroTributario: numeroTributario || '',
      fechaNacimiento:  fechaNacimiento  || null,
      direccion:        direccion        || '',
      comentario:       comentario       || '',
      origen:           origen           || 'Local',
      grupo:            grupo            || '',
      usuario: req.propietarioId,
    })
    res.status(201).json(cliente)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, email, telefono, numeroTributario, fechaNacimiento, direccion, comentario, origen, grupo, activo } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
    const cliente = await Cliente.findOneAndUpdate(
      { _id: req.params.id, usuario: req.propietarioId },
      {
        nombre: nombre.trim(),
        email:            email            ?? '',
        telefono:         telefono         ?? '',
        numeroTributario: numeroTributario ?? '',
        fechaNacimiento:  fechaNacimiento  ?? null,
        direccion:        direccion        ?? '',
        comentario:       comentario       ?? '',
        origen:           origen           || 'Local',
        grupo:            grupo            ?? '',
        activo:           activo           !== false,
      },
      { new: true }
    )
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' })
    res.json(cliente)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const cliente = await Cliente.findOneAndDelete({ _id: req.params.id, usuario: req.propietarioId })
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' })
    res.json({ message: 'Cliente eliminado' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
