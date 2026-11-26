const express = require('express')
const auth    = require('../middleware/auth')
const Role    = require('../models/Role')
const User    = require('../models/User')
const { ROLES_FIJOS, KEYS_RESERVADAS, asegurarRolesFijos, permisosDeRol } = require('../utils/roles')

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
    res.json({ esOwner: false, permisos: await permisosDeRol(user.cuentaPadreId, user.role) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al obtener permisos' })
  }
})

// Borra fijos que ya no existen en el sistema y crea los que falten
async function inicializarRoles(propietarioId) {
  await Role.deleteMany({ propietarioId, esFijo: true, key: { $nin: ROLES_FIJOS.map(r => r.key) } })
  await asegurarRolesFijos(propietarioId)
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
    if (typeof nombre !== 'string' || !nombre.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' })
    const key = nombre.trim().toLowerCase().replace(/\s+/g, '_')
    if (KEYS_RESERVADAS.has(key)) return res.status(400).json({ message: 'Ese nombre está reservado, elegí otro' })
    const existe = await Role.findOne({ propietarioId: req.propietarioId, key })
    if (existe || ROLES_FIJOS.some(r => r.key === key)) return res.status(400).json({ message: 'Ya existe un rol con ese nombre' })
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
    // Si se borra un rol en uso, esos empleados se quedan sin ningún permiso
    const enUso = await User.countDocuments({ cuentaPadreId: req.propietarioId, role: role.key })
    if (enUso) {
      return res.status(400).json({ message: `Hay ${enUso} ${enUso === 1 ? 'empleado' : 'empleados'} con este rol; cambiales el rol antes de borrarlo` })
    }
    await role.deleteOne()
    res.json({ message: 'Rol eliminado' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al eliminar rol' })
  }
})

module.exports = router
