// Permisos por módulo para sub-usuarios (camarero, encargado, repartidor, roles propios).
// El dueño de la cuenta tiene acceso total y no pasa por acá.
//
// Cada ruta se asocia a los módulos del dashboard que la usan ("Ver <Módulo>").
// Alcanza con tener uno de los permisos listados.
//   read  → GET
//   write → POST / PUT / PATCH / DELETE
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

const REGLAS = {
  '/api/productos':                     { write: [P] },
  '/api/categorias':                    { write: [P] },
  '/api/ingredientes':                  { write: [P] },
  '/api/stock':                         { read: [P], write: [P] },
  '/api/uploads':                       { write: [P] },
  '/api/mesas':                         { write: [R, MC, CF] },
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
}

// Rutas que cualquier sub-usuario necesita para que el dashboard funcione
const EXCEPCIONES = new Set(['/api/roles/mis-permisos'])

function permisosRequeridos(req) {
  if (EXCEPCIONES.has(req.baseUrl + req.path)) return null
  const regla = REGLAS[req.baseUrl]
  if (!regla) return null
  return req.method === 'GET' ? regla.read || null : regla.write || null
}

module.exports = { permisosRequeridos }
