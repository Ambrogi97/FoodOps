// Roles de los sub-usuarios: los tres fijos que tiene todo restaurante y la búsqueda de permisos.
// Todo lo que necesite saber "qué puede hacer este empleado" pasa por permisosDeRol, así
// el control de acceso, el menú (mis-permisos) y el Inicio usan siempre la misma respuesta.
const Role = require('../models/Role')

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

// Claves que nunca puede tener un rol propio ni un empleado: 'admin' es el rol del dueño
const KEYS_RESERVADAS = new Set(['admin'])

// Crea los roles fijos que le falten al restaurante. "Crear solo si no existe" en una sola
// operación, para que dos pedidos simultáneos no lo dupliquen.
async function asegurarRolesFijos(propietarioId, soloKey = null) {
  const lista = soloKey ? ROLES_FIJOS.filter(r => r.key === soloKey) : ROLES_FIJOS
  await Promise.all(lista.map(r => Role.updateOne(
    { propietarioId, key: r.key },
    { $setOnInsert: { propietarioId, key: r.key, nombre: r.nombre, permisos: r.permisos, esFijo: true } },
    { upsert: true },
  )))
}

// Permisos de un rol. Si es uno de los fijos y el restaurante todavía no lo tiene (antes recién
// se creaban cuando el dueño abría la pantalla de Roles), se crea en el momento con sus permisos
// de siempre. Un rol propio que no existe no da ningún permiso.
async function permisosDeRol(propietarioId, key) {
  const role = await Role.findOne({ propietarioId, key }).select('permisos').lean()
  if (role) return role.permisos || []
  const fijo = ROLES_FIJOS.find(r => r.key === key)
  if (!fijo) return []
  await asegurarRolesFijos(propietarioId, key)
  return fijo.permisos
}

// ¿Se le puede asignar este rol a un empleado de este restaurante?
async function rolAsignable(propietarioId, key) {
  if (typeof key !== 'string' || !key || KEYS_RESERVADAS.has(key)) return false
  if (ROLES_FIJOS.some(r => r.key === key)) return true
  return !!(await Role.exists({ propietarioId, key }))
}

module.exports = { ROLES_FIJOS, KEYS_RESERVADAS, asegurarRolesFijos, permisosDeRol, rolAsignable }
