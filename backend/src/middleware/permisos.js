// Permisos por módulo para sub-usuarios (camarero, encargado, repartidor, roles propios).
// El dueño de la cuenta tiene acceso total y no pasa por acá.
//
// Cada ruta se asocia a los módulos del dashboard que la usan ("Ver <Módulo>").
// Alcanza con tener uno de los permisos listados.
//   read  → GET
//   write → POST / PUT / PATCH / DELETE
//   post / put / delete → pisan a write para ese método puntual
// Si un método no aparece, queda permitido para cualquier sub-usuario.

const R  = 'Ver Restaurante'
const MC = 'Ver Monitor de Cocina'
const P  = 'Ver Productos'
const PR = 'Ver Proveedores'
const CL = 'Ver Clientes'
const V  = 'Ver Ventas'
const F  = 'Ver Finanzas'
const RE = 'Ver Reportes'
const G  = 'Ver Gastos'
const CO = 'Ver Carta Online'
const CF = 'Ver Configuración'
const AS = 'Ver Asistente'

const REGLAS = {
  '/api/productos':                     { write: [P] },
  '/api/categorias':                    { write: [P] },
  '/api/ingredientes':                  { write: [P] },
  '/api/stock':                         { read: [P], write: [P] },
  '/api/uploads':                       { write: [P] },
  // Atender una mesa (PUT: estado, ítems, personas) es del uso diario. Crear y borrar mesas
  // (sueltas, en bloque o todas) es armar el plano del salón: solo Configuración.
  // Antes un camarero con "Ver Restaurante" podía borrar todas las mesas.
  '/api/mesas':                         { write: [R, MC, CF], post: [CF], delete: [CF] },
  '/api/zonas':                         { write: [R, CF] },
  '/api/mostrador':                     { read: [R], write: [R] },
  '/api/delivery':                      { read: [R], write: [R] },
  '/api/ventas':                        { read: [V, F, RE], write: [R] },
  '/api/descuentos':                    { read: [R, V], write: [V] },
  '/api/clientes':                      { read: [CL], write: [CL] },
  '/api/cuentas-corrientes':            { read: [CL], write: [CL] },
  '/api/proveedores':                   { read: [PR], write: [PR] },
  '/api/cuentas-corrientes-proveedores':{ read: [PR], write: [PR] },
  '/api/gastos':                        { read: [G, F, RE], write: [G] },
  '/api/categorias-gasto':              { read: [G, F, RE], write: [G] },
  '/api/config':                        { write: [CO, CF] },
  '/api/pedidos-online':                { write: [CO, MC] },
  '/api/resenas':                       { read: [CO] },
  '/api/usuarios':                      { read: [CF] },
  '/api/asistente':                     { read: [AS], write: [AS] },
}

// Rutas que cualquier sub-usuario necesita para que el dashboard funcione
const EXCEPCIONES = new Set(['/api/roles/mis-permisos'])

function permisosRequeridos(req) {
  if (EXCEPCIONES.has((req.baseUrl + req.path).replace(/\/$/, ''))) return null
  const regla = REGLAS[req.baseUrl]
  if (!regla) return null
  // Regla por método (post / put / delete) si la hay; si no, read/write
  const porMetodo = regla[req.method.toLowerCase()]
  if (porMetodo) return porMetodo
  return req.method === 'GET' ? regla.read || null : regla.write || null
}

module.exports = { permisosRequeridos }
