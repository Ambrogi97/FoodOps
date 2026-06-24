const express = require('express')
const auth    = require('../middleware/auth')
const User    = require('../models/User')

const router = express.Router()

// GET /api/usuarios — lista todos los sub-usuarios creados por el usuario actual
router.get('/', auth, async (req, res) => {
  try {
    const usuarios = await User.find(
      { cuentaPadreId: req.usuario.id },
      '-password'
    ).sort({ createdAt: 1 })
    res.json(usuarios)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
})

// POST /api/usuarios — crea un sub-usuario bajo el restaurante del usuario actual
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, email, password, role } = req.body
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' })
    }

    const padre = await User.findById(req.usuario.id, 'restaurante')
    if (!padre) return res.status(404).json({ message: 'Usuario no encontrado' })

    const existe = await User.findOne({ email })
    if (existe) return res.status(400).json({ message: 'El email ya está registrado' })

    const safeRole = ['user', 'admin'].includes(role) ? role : 'user'

    const nuevo = await User.create({
      nombre,
      email,
      password,
      restaurante: padre.restaurante,
      role: safeRole,
      cuentaPadreId: padre._id,
    })

    const { password: _, ...data } = nuevo.toObject()
    res.status(201).json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al crear usuario' })
  }
})

// DELETE /api/usuarios/:id — elimina un sub-usuario que pertenezca al usuario actual
router.delete('/:id', auth, async (req, res) => {
  try {
    const usuario = await User.findOne({ _id: req.params.id, cuentaPadreId: req.usuario.id })
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' })

    await usuario.deleteOne()
    res.json({ message: 'Usuario eliminado' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al eliminar usuario' })
  }
})

module.exports = router
