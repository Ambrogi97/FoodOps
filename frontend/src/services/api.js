const API_URL = 'http://localhost:3000'

// Caché en memoria para evitar re-fetching al cambiar de tab
const _cache = {}
const TTL    = 20_000  // 20 segundos

const _leer  = (clave)        => { const e = _cache[clave]; return e && Date.now() - e.ts < TTL ? e.data : null }
const _guardar = (clave, data) => { _cache[clave] = { data, ts: Date.now() }; return data }
const _invalidar = (...prefijos) => { prefijos.forEach(p => Object.keys(_cache).filter(k => k.startsWith(p)).forEach(k => delete _cache[k])) }

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
  if (res.status === 401 || res.status === 403) {
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
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export const getSession = () => {
  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || 'null')
  return { token, user }
}

export const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// ── Mappers ─────────────────────────────────────────────────────────────────

const mapCat  = c => ({ id: c._id, nombre: c.nombre })
const mapProd = p => ({ id: p._id, nombre: p.nombre, categoriaId: p.categoria, precio: p.precio, costo: p.costo, activo: p.activo, imagen: p.imagen || '', descripcion: p.descripcion || '' })
const mapIng  = i => ({ id: i._id, nombre: i.nombre, unidad: i.unidad, costo: i.costo, stockActual: i.stockActual ?? 0, stockMinimo: i.stockMinimo ?? 0 })
const mapZona = z => ({ id: z._id, label: z.label, removible: z.removible })
const mapMesa = m => ({ id: m._id, numero: m.numero, zona: m.zona, estado: m.estado, col: m.col, row: m.row, hora: m.hora || null, items: m.items || [] })
const mapVenta = v => ({ id: v._id, mesa: v.mesa, inicio: v.inicio, cierre: v.cierre, estado: v.estado, items: v.items || [] })

// ── Categorias ───────────────────────────────────────────────────────────────

export const categoriasService = {
  listar: async () => (await requestCacheado('/api/categorias')).map(mapCat),
  crear:      async (data) => { _invalidar('/api/categorias', '/api/productos'); return mapCat(await request('/api/categorias', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/categorias'); return mapCat(await request(`/api/categorias/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id) => { _invalidar('/api/categorias', '/api/productos'); return request(`/api/categorias/${id}`, { method: 'DELETE' }) },
}

// ── Productos ────────────────────────────────────────────────────────────────

export const productosService = {
  listar:     async () => (await requestCacheado('/api/productos')).map(mapProd),
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
  eliminar:    async (id) => { _invalidar('/api/mesas'); return request(`/api/mesas/${id}`, { method: 'DELETE' }) },
}

// ── Ventas ───────────────────────────────────────────────────────────────────

export const ventasService = {
  listar: async () => (await requestCacheado('/api/ventas')).map(mapVenta),
  crear:  async (data) => { _invalidar('/api/ventas'); return mapVenta(await request('/api/ventas', { method: 'POST', body: JSON.stringify(data) })) },
}

// ── Gastos ───────────────────────────────────────────────────────────────────

const mapGasto = g => ({ id: g._id, descripcion: g.descripcion, monto: g.monto, categoria: g.categoria, fecha: g.fecha })

export const gastosService = {
  listar:  async () => (await requestCacheado('/api/gastos')).map(mapGasto),
  crear:   async (data) => { _invalidar('/api/gastos'); return mapGasto(await request('/api/gastos', { method: 'POST', body: JSON.stringify(data) })) },
  eliminar: async (id) => { _invalidar('/api/gastos'); return request(`/api/gastos/${id}`, { method: 'DELETE' }) },
}

// ── Proveedores ───────────────────────────────────────────────────────────────

const mapProveedor = p => ({ id: p._id, nombre: p.nombre, rubro: p.rubro || '', telefono: p.telefono || '', email: p.email || '', notas: p.notas || '' })

export const proveedoresService = {
  listar:     async () => (await requestCacheado('/api/proveedores')).map(mapProveedor),
  crear:      async (data) => { _invalidar('/api/proveedores'); return mapProveedor(await request('/api/proveedores', { method: 'POST', body: JSON.stringify(data) })) },
  actualizar: async (id, data) => { _invalidar('/api/proveedores'); return mapProveedor(await request(`/api/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(data) })) },
  eliminar:   async (id) => { _invalidar('/api/proveedores'); return request(`/api/proveedores/${id}`, { method: 'DELETE' }) },
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
