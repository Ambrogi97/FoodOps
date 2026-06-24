const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Caché en memoria para evitar re-fetching al cambiar de tab
const _cache = {}
const TTL    = 20_000  // 20 segundos

const _leer  = (clave)        => { const e = _cache[clave]; return e && Date.now() - e.ts < TTL ? e.data : null }
const _guardar = (clave, data) => { _cache[clave] = { data, ts: Date.now() }; return data }
const _invalidar  = (...prefijos) => { prefijos.forEach(p => Object.keys(_cache).filter(k => k.startsWith(p)).forEach(k => delete _cache[k])) }
const _limpiarCache = () => { Object.keys(_cache).forEach(k => delete _cache[k]) }

const requestCacheado = async (clave) => _leer(clave) ?? _guardar(clave, await request(clave))

const request = async (path, options = {}) => {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    return
  }
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || 'Error en la solicitud')
  return json
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const authService = {
  async register(data) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Error al registrar')
    return json
  },

  async login(data) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Error al iniciar sesión')
    return json
  },
}

export const saveSession  = (token, user) => {
  _limpiarCache()
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export const getSession = () => {
  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || 'null')
  return { token, user }
}

export const clearSession = () => {
  _limpiarCache()
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// ── Mappers ─────────────────────────────────────────────────────────────────

const mapCat  = c => ({
  id: c._id, nombre: c.nombre,
  areaImpresion:     c.areaImpresion     || '',
  tiempoPrepDefecto: c.tiempoPrepDefecto || 0,
})
const mapProd = p => ({
  id: p._id, nombre: p.nombre, categoriaId: p.categoria ? String(p.categoria) : '',
  precio: p.precio, costo: p.costo || 0, activo: p.activo !== false,
  imagen: p.imagen || '', descripcion: p.descripcion || '',
  codigo:             p.codigo             || null,
  areaImpresion:      p.areaImpresion      || '',
  controlStock:       p.controlStock       || false,
  venderSinStock:     p.venderSinStock     || false,
  permitirVenderSolo: p.permitirVenderSolo !== false,
  tiempoPrepMin:      p.tiempoPrepMin      || null,
  stockActual:        p.stockActual        ?? 0,
  receta: (p.receta || []).map(r => ({
    ingredienteId: r.ingredienteId ? String(r.ingredienteId) : '',
    cantNeta:      r.cantNeta  || 0,
    unidad:        r.unidad    || '',
  })),
})
const mapIng  = i => ({
  id: i._id, nombre: i.nombre, unidad: i.unidad, costo: i.costo || 0,
  stockActual:  i.stockActual  ?? 0,
  stockMinimo:  i.stockMinimo  ?? 0,
  merma:        i.merma        ?? 0,
  controlStock: i.controlStock || false,
  categoria:    i.categoria    || 'Varios',
})
const mapZona = z => ({ id: z._id, label: z.label, removible: z.removible })
const mapMesa = m => ({ id: m._id, numero: m.numero, zona: m.zona, estado: m.estado, col: m.col, row: m.row, hora: m.hora || null, personas: m.personas || null, items: m.items || [] })
const mapVenta = v => ({
  id:         v._id,
  numero:     v.numero || null,
  mesa:       v.mesa,
  inicio:     v.inicio,
  cierre:     v.cierre,
  estado:     v.estado,
  tipo:       v.tipo       || 'salon',
  metodoPago: v.metodoPago || 'Efectivo',
  personas:   v.personas   || 1,
  items:      v.items      || [],
})

// ── Categorias ───────────────────────────────────────────────────────────────

export const categoriasService = {
  listar: async () => (await requestCacheado('/api/categorias')).map(mapCat),
  crear:      async (data) => { _invalidar('/api/categorias', '/api/productos'); return mapCat(await request('/api/categorias', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/categorias'); return mapCat(await request(`/api/categorias/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id) => { _invalidar('/api/categorias', '/api/productos'); return request(`/api/categorias/${id}`, { method: 'DELETE' }) },
}

// ── Productos ────────────────────────────────────────────────────────────────

export const productosService = {
  listar:     async () => { _invalidar('/api/productos'); return (await request('/api/productos')).map(mapProd) },
  crear:      async (data) => { _invalidar('/api/productos'); return mapProd(await request('/api/productos', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/productos'); return mapProd(await request(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id) => { _invalidar('/api/productos'); return request(`/api/productos/${id}`, { method: 'DELETE' }) },
  uploadImagen: async (file) => {
    const token = localStorage.getItem('token')
    const form  = new FormData()
    form.append('imagen', file)
    const res = await fetch(`${API_URL}/api/uploads/producto`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Error al subir imagen')
    return json.url
  },
}

// ── Ingredientes ─────────────────────────────────────────────────────────────

export const ingredientesService = {
  listar:     async () => (await requestCacheado('/api/ingredientes')).map(mapIng),
  crear:      async (data) => { _invalidar('/api/ingredientes', '/api/stock'); return mapIng(await request('/api/ingredientes', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/ingredientes', '/api/stock'); return mapIng(await request(`/api/ingredientes/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id) => { _invalidar('/api/ingredientes', '/api/stock'); return request(`/api/ingredientes/${id}`, { method: 'DELETE' }) },
}

// ── Zonas ────────────────────────────────────────────────────────────────────

export const zonasService = {
  listar:  async () => (await requestCacheado('/api/zonas')).map(mapZona),
  crear:   async (data) => { _invalidar('/api/zonas'); return mapZona(await request('/api/zonas', { method: 'POST', body: JSON.stringify(data) })) },
  eliminar: async (id) => { _invalidar('/api/zonas', '/api/mesas'); return request(`/api/zonas/${id}`, { method: 'DELETE' }) },
}

// ── Mesas ────────────────────────────────────────────────────────────────────

export const mesasService = {
  listar:      async () => (await requestCacheado('/api/mesas')).map(mapMesa),
  listarFresh: async () => { const data = await request('/api/mesas'); _guardar('/api/mesas', data); return data.map(mapMesa) },
  crearVarias: async (mesas) => { _invalidar('/api/mesas'); return (await request('/api/mesas/bulk', { method: 'POST', body: JSON.stringify({ mesas }) })).map(mapMesa) },
  actualizar:  async (id, data) => { _invalidar('/api/mesas'); return mapMesa(await request(`/api/mesas/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:      async (id) => { _invalidar('/api/mesas'); return request(`/api/mesas/${id}`, { method: 'DELETE' }) },
  eliminarTodas: async ()  => { _invalidar('/api/mesas'); return request('/api/mesas/all', { method: 'DELETE' }) },
}

// ── Ventas ───────────────────────────────────────────────────────────────────

export const ventasService = {
  listar: async () => (await requestCacheado('/api/ventas')).map(mapVenta),
  crear:  async (data) => { _invalidar('/api/ventas'); return mapVenta(await request('/api/ventas', { method: 'POST', body: JSON.stringify(data) })) },
}

// ── Gastos ───────────────────────────────────────────────────────────────────

const mapGasto = g => ({
  id:               g._id,
  descripcion:      g.descripcion   || '',
  comentario:       g.comentario    || g.descripcion || '',
  importe:          g.importe       ?? g.monto ?? 0,
  monto:            g.monto         ?? 0,
  proveedor:        g.proveedor     || '',
  categoria:        g.categoria     || '',
  categoriaId:      g.categoriaId   ? String(g.categoriaId) : null,
  estadoPago:       g.estadoPago    || 'pagado',
  medioPago:        g.medioPago     || '',
  fecha:            g.fecha,
  fechaVencimiento: g.fechaVencimiento || null,
})

export const gastosService = {
  listar:     async ()         => { _invalidar('/api/gastos'); return (await request('/api/gastos')).map(mapGasto) },
  crear:      async (data)     => { _invalidar('/api/gastos'); return mapGasto(await request('/api/gastos', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/gastos'); return mapGasto(await request(`/api/gastos/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id)       => { _invalidar('/api/gastos'); return request(`/api/gastos/${id}`, { method: 'DELETE' }) },
}

// ── Categorías de Gasto ───────────────────────────────────────────────────────
const mapCatGasto = c => ({
  id:                  c._id,
  nombre:              c.nombre,
  categoriaFinanciera: c.categoriaFinanciera || 'Gastos administrativos',
  activo:              c.activo !== false,
  parent:              c.parent ? String(c.parent) : null,
})

export const categoriasGastoService = {
  listar:     async ()         => (await request('/api/categorias-gasto')).map(mapCatGasto),
  crear:      async (data)     => mapCatGasto(await request('/api/categorias-gasto', { method: 'POST', body: JSON.stringify(data) })),
  actualizar: async (id, data) => mapCatGasto(await request(`/api/categorias-gasto/${id}`, { method: 'PUT', body: JSON.stringify(data) })),
  eliminar:   async (id)       => request(`/api/categorias-gasto/${id}`, { method: 'DELETE' }),
}

// ── Proveedores ───────────────────────────────────────────────────────────────

const mapProveedor = p => ({
  id:       p._id,
  nombre:   p.nombre,
  rubro:    p.rubro    || '',
  telefono: p.telefono || '',
  email:    p.email    || '',
  notas:    p.notas    || '',
  activo:   p.activo   !== false,
  calle:    p.calle    || '',
  numero:   p.numero   || '',
  piso:     p.piso     || '',
  ciudad:   p.ciudad   || '',
})

export const proveedoresService = {
  listar:     async () => (await requestCacheado('/api/proveedores')).map(mapProveedor),
  crear:      async (data) => { _invalidar('/api/proveedores'); return mapProveedor(await request('/api/proveedores', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/proveedores'); return mapProveedor(await request(`/api/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id) => { _invalidar('/api/proveedores'); return request(`/api/proveedores/${id}`, { method: 'DELETE' }) },
}

// ── Clientes ──────────────────────────────────────────────────────────────────

const mapCliente = c => ({
  id:               c._id,
  nombre:           c.nombre,
  email:            c.email            || '',
  telefono:         c.telefono         || '',
  numeroTributario: c.numeroTributario || '',
  fechaNacimiento:  c.fechaNacimiento  || null,
  direccion:        c.direccion        || '',
  comentario:       c.comentario       || '',
  origen:           c.origen           || 'Local',
  grupo:            c.grupo            || '',
  activo:           c.activo           !== false,
  createdAt:        c.createdAt,
})

export const clientesService = {
  listar:     async () => { _invalidar('/api/clientes'); return (await request('/api/clientes')).map(mapCliente) },
  crear:      async (data) => { _invalidar('/api/clientes'); return mapCliente(await request('/api/clientes', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/clientes'); return mapCliente(await request(`/api/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id) => { _invalidar('/api/clientes'); return request(`/api/clientes/${id}`, { method: 'DELETE' }) },
}

// ── Cuentas Corrientes ────────────────────────────────────────────────────────

const mapTx = t => ({
  id:         t._id,
  clienteId:  t.clienteId?._id ? String(t.clienteId._id) : String(t.clienteId || ''),
  clienteNombre: t.clienteId?.nombre || '',
  tipo:       t.tipo       || 'cargo',
  monto:      t.monto      || 0,
  medioPago:  t.medioPago  || '',
  caja:       t.caja       || 'Principal',
  fechaPago:  t.fechaPago  || null,
  comentario: t.comentario || '',
  createdAt:  t.createdAt,
})

export const cuentasCorrientesService = {
  listar:             async () => (await request('/api/cuentas-corrientes')).map(mapTx),
  listarPorCliente:   async (clienteId) => (await request(`/api/cuentas-corrientes/cliente/${clienteId}`)).map(mapTx),
  crear:              async (data) => { _invalidar('/api/cuentas-corrientes'); return mapTx(await request('/api/cuentas-corrientes', { method: 'POST', body: JSON.stringify(data) })) },
  eliminar:           async (id) => { _invalidar('/api/cuentas-corrientes'); return request(`/api/cuentas-corrientes/${id}`, { method: 'DELETE' }) },
}

// ── Pedidos Online ────────────────────────────────────────────────────────────

const mapPedidoOnline = p => ({
  _id:           p._id,
  items:         p.items,
  tipo:          p.tipo,
  mesaNumero:    p.mesaNumero,
  clienteNombre: p.clienteNombre,
  notas:         p.notas,
  total:         p.total,
  estado:        p.estado,
  createdAt:     p.createdAt,
})

export const pedidosOnlineService = {
  listar:          async () => (await request('/api/pedidos-online')).map(mapPedidoOnline),
  actualizarEstado: async (id, estado) => mapPedidoOnline(await request(`/api/pedidos-online/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) })),
}

// ── Stock ────────────────────────────────────────────────────────────────────

export const stockService = {
  listar:              async () => (await requestCacheado('/api/stock')).map(mapIng),
  registrarMovimiento: async (id, data) => { _invalidar('/api/stock'); return request(`/api/stock/${id}/movimiento`, { method: 'POST', body: JSON.stringify(data) }) },
  actualizarMinimo:    async (id, stockMinimo) => { _invalidar('/api/stock'); return request(`/api/stock/${id}/minimo`,  { method: 'PUT', body: JSON.stringify({ stockMinimo }) }) },
  actualizarUnidad:    async (id, unidad)      => { _invalidar('/api/stock'); return request(`/api/stock/${id}/unidad`, { method: 'PUT', body: JSON.stringify({ unidad }) }) },
  listarMovimientos:   async (id) => request(`/api/stock/${id}/movimientos`),
  actualizarIngrediente: async (id, data) => {
    _invalidar('/api/ingredientes', '/api/stock')
    return mapIng(await request(`/api/ingredientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }))
  },
  actualizarProductoStock: async (id, stockActual) => {
    _invalidar('/api/productos')
    return mapProd(await request(`/api/productos/${id}/stock`, { method: 'PUT', body: JSON.stringify({ stockActual }) }))
  },
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminService = {
  listarUsuarios:   async ()            => request('/api/admin/usuarios'),
  cambiarPlan:      async (id, plan)    => request(`/api/admin/usuarios/${id}/plan`,  { method: 'PUT', body: JSON.stringify({ plan }) }),
  cambiarRol:       async (id, role)    => request(`/api/admin/usuarios/${id}/role`,  { method: 'PUT', body: JSON.stringify({ role }) }),
  eliminarUsuario:  async (id)          => request(`/api/admin/usuarios/${id}`,       { method: 'DELETE' }),
}

// ── Config tienda ──────────────────────────────────────────────────────────────

const uploadFile = async (path, fieldName, file) => {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append(fieldName, file)
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token'); localStorage.removeItem('user')
    window.location.href = '/login'; return
  }
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || 'Error al subir archivo')
  return json
}

export const configService = {
  getTienda:         async ()            => request('/api/config/tienda'),
  saveTienda:        async (data)        => request('/api/config/tienda', { method: 'PUT', body: JSON.stringify(data) }),
  saveColorFondo:    async (colorFondo)  => request('/api/config/tienda', { method: 'PUT', body: JSON.stringify({ colorFondo }) }),
  uploadLogo:     async (file) => uploadFile('/api/config/tienda/logo',    'logo',    file),
  deleteLogo:     async ()     => request('/api/config/tienda/logo',    { method: 'DELETE' }),
  uploadPortada:  async (file) => uploadFile('/api/config/tienda/portada', 'portada', file),
  deletePortada:  async ()     => request('/api/config/tienda/portada', { method: 'DELETE' }),
}

// ── Delivery ─────────────────────────────────────────────────────────────────
export const deliveryService = {
  listar:     async ()         => request('/api/delivery'),
  crear:      async (data)     => request('/api/delivery', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: async (id, data) => request(`/api/delivery/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar:   async (id)       => request(`/api/delivery/${id}`, { method: 'DELETE' }),
}

// ── Descuentos ────────────────────────────────────────────────────────────────
const mapDescuento = d => ({
  id:         d._id,
  nombre:     d.nombre,
  tipo:       d.tipo       || 'sin_importe',
  valor:      d.valor      ?? null,
  estado:     d.estado     || 'activo',
  vecesUsado: d.vecesUsado || 0,
  montoUsado: d.montoUsado || 0,
  ultimaVez:  d.ultimaVez  || null,
  createdAt:  d.createdAt,
})

export const descuentosService = {
  listar:     async ()         => (await request('/api/descuentos')).map(mapDescuento),
  crear:      async (data)     => mapDescuento(await request('/api/descuentos', { method: 'POST', body: JSON.stringify(data) })),
  actualizar: async (id, data) => mapDescuento(await request(`/api/descuentos/${id}`, { method: 'PUT', body: JSON.stringify(data) })),
  eliminar:   async (id)       => request(`/api/descuentos/${id}`, { method: 'DELETE' }),
}

// ── Cuentas Corrientes Proveedores ────────────────────────────────────────────

const mapTxProv = t => ({
  id:               t._id,
  proveedorId:      t.proveedorId?._id ? String(t.proveedorId._id) : String(t.proveedorId || ''),
  proveedorNombre:  t.proveedorId?.nombre || '',
  tipo:             t.tipo       || 'cargo',
  monto:            t.monto      || 0,
  medioPago:        t.medioPago  || '',
  fechaPago:        t.fechaPago  || null,
  comentario:       t.comentario || '',
  createdAt:        t.createdAt,
})

export const cuentasCorrientesProveedoresService = {
  listar:            async () => (await request('/api/cuentas-corrientes-proveedores')).map(mapTxProv),
  listarPorProveedor: async (id) => (await request(`/api/cuentas-corrientes-proveedores/proveedor/${id}`)).map(mapTxProv),
  crear:             async (data) => { _invalidar('/api/cuentas-corrientes-proveedores'); return mapTxProv(await request('/api/cuentas-corrientes-proveedores', { method: 'POST', body: JSON.stringify(data) })) },
  eliminar:          async (id)   => { _invalidar('/api/cuentas-corrientes-proveedores'); return request(`/api/cuentas-corrientes-proveedores/${id}`, { method: 'DELETE' }) },
}

// ── Perfil (usuario actual) ───────────────────────────────────────────────────

export const perfilService = {
  getMe:    async ()       => request('/auth/me'),
  updateMe: async (data)   => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
}

// ── Usuarios del restaurante ──────────────────────────────────────────────────

export const usuariosService = {
  listar:   async ()       => request('/api/usuarios'),
  crear:    async (data)   => request('/api/usuarios', { method: 'POST', body: JSON.stringify(data) }),
  eliminar: async (id)     => request(`/api/usuarios/${id}`, { method: 'DELETE' }),
}

// ── Roles del restaurante ─────────────────────────────────────────────────────

export const rolesService = {
  listar:    async ()         => request('/api/roles'),
  crear:     async (data)     => request('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: async (id, data) => request(`/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar:  async (id)       => request(`/api/roles/${id}`, { method: 'DELETE' }),
}

// ── Mostrador ────────────────────────────────────────────────────────────────
export const mostradorService = {
  listar:     async ()        => request('/api/mostrador'),
  crear:      async (data)    => request('/api/mostrador', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: async (id, data) => request(`/api/mostrador/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar:   async (id)      => request(`/api/mostrador/${id}`, { method: 'DELETE' }),
}

