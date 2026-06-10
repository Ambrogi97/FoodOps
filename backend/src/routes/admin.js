const express          = require('express')
const router           = express.Router()
const adminAuth        = require('../middleware/adminAuth')
const User             = require('../models/User')
const Categoria        = require('../models/Categoria')
const Producto         = require('../models/Producto')
const Ingrediente      = require('../models/Ingrediente')
const MovimientoStock  = require('../models/MovimientoStock')
const Zona             = require('../models/Zona')
const Mesa             = require('../models/Mesa')
const Venta            = require('../models/Venta')
const Gasto            = require('../models/Gasto')
const Proveedor        = require('../models/Proveedor')
const PedidoOnline     = require('../models/PedidoOnline')

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

// DELETE /api/admin/usuarios/:id
router.delete('/usuarios/:id', adminAuth, async (req, res) => {
  try {
    if (req.params.id === req.usuario.id) {
      return res.status(400).json({ message: 'No podés eliminar tu propia cuenta' })
    }
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    const uid = user._id
    await Promise.all([
      Categoria.deleteMany({ usuario: uid }),
      Producto.deleteMany({ usuario: uid }),
      Ingrediente.deleteMany({ usuario: uid }),
      MovimientoStock.deleteMany({ usuario: uid }),
      Zona.deleteMany({ usuario: uid }),
      Mesa.deleteMany({ usuario: uid }),
      Venta.deleteMany({ usuario: uid }),
      Gasto.deleteMany({ usuario: uid }),
      Proveedor.deleteMany({ usuario: uid }),
      PedidoOnline.deleteMany({ usuario: uid }),
    ])
    await user.deleteOne()

    res.json({ message: 'Usuario y todos sus datos eliminados' })
  } catch {
    res.status(500).json({ message: 'Error al eliminar usuario' })
  }
})

module.exports = router
