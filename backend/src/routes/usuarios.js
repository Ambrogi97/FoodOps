const express = require('express')
const auth    = require('../middleware/auth')
const User    = require('../models/User')

const router = express.Router()

function soloOwner(req, res, next) {
  if (req.usuario.cuentaPadreId) {
    return res.status(403).json({ message: 'Solo el propietario puede gestionar usuarios' })
  }
  next()
}

// GET /api/usuarios — lista todos los sub-usuarios del propietario
router.get('/', auth, async (req, res) => {
  try {
    const usuarios = await User.find(
      { cuentaPadreId: req.propietarioId },
      '-password'
    ).sort({ createdAt: 1 })
    res.json(usuarios)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
})

// POST /api/usuarios — crea un sub-usuario (solo el owner puede hacerlo)
router.post('/', auth, soloOwner, async (req, res) => {
  try {
    const { nombre, email, password, role } = req.body
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' })
    }

    if (req.usuario.plan === 'basico') {
      const count = await User.countDocuments({ cuentaPadreId: req.usuario.id })
      if (count >= 3) {
        return res.status(403).json({ message: 'El plan Básico permite un máximo de 3 sub-usuarios. Actualizá a Premium para agregar más.' })
      }
    }

    const padre = await User.findById(req.usuario.id, 'restaurante')
    if (!padre) return res.status(404).json({ message: 'Usuario no encontrado' })

    const existe = await User.findOne({ email: email.toLowerCase() })
    if (existe) return res.status(400).json({ message: 'El email ya está registrado' })

    const safeRole = ['admin', 'encargado', 'camarero', 'repartidor'].includes(role) ? role : 'camarero'

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

// DELETE /api/usuarios/:id — elimina un sub-usuario (solo el owner puede hacerlo)
router.delete('/:id', auth, soloOwner, async (req, res) => {
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
