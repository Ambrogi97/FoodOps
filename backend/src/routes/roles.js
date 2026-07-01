const express = require('express')
const auth    = require('../middleware/auth')
const Role    = require('../models/Role')
const User    = require('../models/User')

const router = express.Router()

function soloOwner(req, res, next) {
  if (req.usuario.cuentaPadreId) {
    return res.status(403).json({ message: 'Solo el propietario puede gestionar roles' })
  }
  next()
}

// GET /api/roles/mis-permisos — devuelve los permisos del usuario logueado según su rol
router.get('/mis-permisos', auth, async (req, res) => {
  try {
    const user = await User.findById(req.usuario.id, 'role cuentaPadreId')
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    // El dueño (sin cuentaPadreId) tiene acceso total
    if (!user.cuentaPadreId) return res.json({ esOwner: true, permisos: [] })

    // Sub-usuario: buscar permisos de su rol en la cuenta del dueño
    const role = await Role.findOne({ propietarioId: user.cuentaPadreId, key: user.role })
    res.json({ esOwner: false, permisos: role?.permisos || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al obtener permisos' })
  }
})

const ROLES_FIJOS = [
  { key: 'encargado', nombre: 'Encargado', esFijo: true, permisos: [
    'Ver Restaurante', 'Ver Monitor de Cocina', 'Ver Productos', 'Ver Clientes', 'Ver Ventas',
    'Cerrar venta de mesa', 'Imprimir ticket de mesa', 'Adicionar ítems a mesa', 'Cancelar ítems de mesa',
    'Listar descuentos', 'Crear descuentos', 'Editar descuentos', 'Eliminar descuentos',
    'Listar pedidos', 'Crear pedido', 'Actualizar pedido', 'Eliminar pedido',
    'Listar ventas', 'Ver resumen y estadísticas',
    'Listar productos', 'Crear producto', 'Actualizar producto', 'Gestionar stock',
  ]},
  { key: 'camarero', nombre: 'Camarero', esFijo: true, permisos: [
    'Ver Restaurante', 'Ver Monitor de Cocina',
    'Cerrar venta de mesa', 'Imprimir ticket de mesa', 'Adicionar ítems a mesa', 'Cancelar ítems de mesa',
    'Listar descuentos',
    'Listar pedidos',
    'Listar productos',
  ]},
  { key: 'repartidor', nombre: 'Repartidor', esFijo: true, permisos: [
    'Ver Restaurante',
    'Ver Monitor de Cocina',
    'Listar pedidos',
    'Actualizar pedido',
  ]},
]

// Inicializa los roles fijos si el propietario no los tiene aún
async function inicializarRoles(propietarioId) {
  const keysFijos = ROLES_FIJOS.map(r => r.key)
  await Role.deleteMany({ propietarioId, esFijo: true, key: { $nin: keysFijos } })
  for (const r of ROLES_FIJOS) {
    const existe = await Role.findOne({ propietarioId, key: r.key })
    if (!existe) {
      await Role.create({ propietarioId, nombre: r.nombre, key: r.key, permisos: r.permisos, esFijo: r.esFijo })
    }
  }
}

// GET /api/roles
router.get('/', auth, async (req, res) => {
  try {
    await inicializarRoles(req.propietarioId)
    const roles = await Role.find({ propietarioId: req.propietarioId }).sort({ createdAt: 1 })
    res.json(roles)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al obtener roles' })
  }
})

// POST /api/roles
router.post('/', auth, soloOwner, async (req, res) => {
  try {
    const { nombre, permisos } = req.body
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' })
    const key = nombre.trim().toLowerCase().replace(/\s+/g, '_')
    const existe = await Role.findOne({ propietarioId: req.propietarioId, key })
    if (existe) return res.status(400).json({ message: 'Ya existe un rol con ese nombre' })
    const role = await Role.create({ propietarioId: req.propietarioId, nombre: nombre.trim(), key, permisos: permisos || [] })
    res.status(201).json(role)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al crear rol' })
  }
})

// PUT /api/roles/:id
router.put('/:id', auth, soloOwner, async (req, res) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, propietarioId: req.propietarioId })
    if (!role) return res.status(404).json({ message: 'Rol no encontrado' })
    const { nombre, permisos } = req.body
    if (nombre) role.nombre = nombre.trim()
    if (permisos !== undefined) role.permisos = permisos
    await role.save()
    res.json(role)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al actualizar rol' })
  }
})

// DELETE /api/roles/:id
router.delete('/:id', auth, soloOwner, async (req, res) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, propietarioId: req.propietarioId })
    if (!role) return res.status(404).json({ message: 'Rol no encontrado' })
    if (role.esFijo) return res.status(400).json({ message: 'No se puede eliminar un rol del sistema' })
    await role.deleteOne()
    res.json({ message: 'Rol eliminado' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al eliminar rol' })
  }
})

module.exports = router
