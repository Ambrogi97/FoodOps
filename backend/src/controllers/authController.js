const jwt = require('jsonwebtoken')
const User = require('../models/User')

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const register = async (req, res) => {
  try {
    const { nombre, email, password, restaurante, plan } = req.body

    if (!nombre || !email || !password || !restaurante) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }

    const user = await User.create({ nombre, email, password, restaurante, plan })
    const token = generateToken(user._id, user.role)

    res.status(201).json({
      token,
      user: { id: user._id, nombre: user.nombre, email: user.email, restaurante: user.restaurante, plan: user.plan, role: user.role }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: error.message })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const token = generateToken(user._id, user.role)

    res.json({
      token,
      user: { id: user._id, nombre: user.nombre, email: user.email, restaurante: user.restaurante, plan: user.plan, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
}

module.exports = { register, login }
