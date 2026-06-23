const express  = require('express')
const bcrypt    = require('bcryptjs')
const { register, login } = require('../controllers/authController')
const auth      = require('../middleware/auth')
const User      = require('../models/User')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.usuario.id, '-password')
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Error al obtener perfil' })
  }
})

router.put('/me', auth, async (req, res) => {
  try {
    const { nombre, restaurante, password, newPassword } = req.body
    const user = await User.findById(req.usuario.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    if (nombre)      user.nombre      = nombre
    if (restaurante) user.restaurante = restaurante

    if (newPassword) {
      if (!password) return res.status(400).json({ message: 'Ingresá la contraseña actual' })
      const ok = await user.comparePassword(password)
      if (!ok) return res.status(400).json({ message: 'Contraseña actual incorrecta' })
      user.password = newPassword
    }

    await user.save()
    const { password: _, ...data } = user.toObject()
    res.json(data)
  } catch {
    res.status(500).json({ message: 'Error al actualizar perfil' })
  }
})

module.exports = router
