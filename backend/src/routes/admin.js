const express   = require('express')
const router    = express.Router()
const adminAuth = require('../middleware/adminAuth')
const User      = require('../models/User')

const PLANES = ['basico', 'profesional', 'premium']

// GET /api/admin/usuarios
router.get('/usuarios', adminAuth, async (req, res) => {
  try {
    const usuarios = await User.find({}, '-password').sort({ createdAt: -1 })
    res.json(usuarios)
  } catch {
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
})

// PUT /api/admin/usuarios/:id/plan
router.put('/usuarios/:id/plan', adminAuth, async (req, res) => {
  try {
    const { plan } = req.body
    if (!PLANES.includes(plan)) {
      return res.status(400).json({ message: 'Plan inválido' })
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { plan },
      { new: true, select: '-password' }
    )
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Error al actualizar plan' })
  }
})

// PUT /api/admin/usuarios/:id/role
router.put('/usuarios/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' })
    }
    // Prevent removing your own admin role
    if (req.params.id === req.usuario.id) {
      return res.status(400).json({ message: 'No podés cambiar tu propio rol' })
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    )
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Error al actualizar rol' })
  }
})

module.exports = router
