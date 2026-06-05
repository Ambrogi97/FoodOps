const API_URL = 'http://localhost:3000'

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
const mapProd = p => ({ id: p._id, nombre: p.nombre, categoriaId: p.categoria, precio: p.precio, costo: p.costo, activo: p.activo })
const mapIng  = i => ({ id: i._id, nombre: i.nombre, unidad: i.unidad, costo: i.costo, stockActual: i.stockActual ?? 0, stockMinimo: i.stockMinimo ?? 0 })
const mapZona = z => ({ id: z._id, label: z.label, removible: z.removible })
const mapMesa = m => ({ id: m._id, numero: m.numero, zona: m.zona, estado: m.estado, col: m.col, row: m.row, hora: m.hora || null, items: m.items || [] })
const mapVenta = v => ({ id: v._id, mesa: v.mesa, inicio: v.inicio, cierre: v.cierre, estado: v.estado, items: v.items || [] })

// ── Categorias ───────────────────────────────────────────────────────────────

export const categoriasService = {
  listar: async () => (await request('/api/categorias')).map(mapCat),
  crear:  async (data) => mapCat(await request('/api/categorias', { method: 'POST', body: JSON.stringify(data) })),
  eliminar: (id) => request(`/api/categorias/${id}`, { method: 'DELETE' }),
}

// ── Productos ────────────────────────────────────────────────────────────────

export const productosService = {
  listar:    async () => (await request('/api/productos')).map(mapProd),
  crear:     async (data) => mapProd(await request('/api/productos', { method: 'POST', body: JSON.stringify(data) })),
  actualizar: async (id, data) => mapProd(await request(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) })),
  eliminar:  (id) => request(`/api/productos/${id}`, { method: 'DELETE' }),
}

// ── Ingredientes ─────────────────────────────────────────────────────────────

export const ingredientesService = {
  listar:    async () => (await request('/api/ingredientes')).map(mapIng),
  crear:     async (data) => mapIng(await request('/api/ingredientes', { method: 'POST', body: JSON.stringify(data) })),
  actualizar: async (id, data) => mapIng(await request(`/api/ingredientes/${id}`, { method: 'PUT', body: JSON.stringify(data) })),
  eliminar:  (id) => request(`/api/ingredientes/${id}`, { method: 'DELETE' }),
}

// ── Zonas ────────────────────────────────────────────────────────────────────

export const zonasService = {
  listar:  async () => (await request('/api/zonas')).map(mapZona),
  crear:   async (data) => mapZona(await request('/api/zonas', { method: 'POST', body: JSON.stringify(data) })),
  eliminar: (id) => request(`/api/zonas/${id}`, { method: 'DELETE' }),
}

// ── Mesas ────────────────────────────────────────────────────────────────────

export const mesasService = {
  listar:      async () => (await request('/api/mesas')).map(mapMesa),
  crearVarias: async (mesas) => (await request('/api/mesas/bulk', { method: 'POST', body: JSON.stringify({ mesas }) })).map(mapMesa),
  actualizar:  async (id, data) => mapMesa(await request(`/api/mesas/${id}`, { method: 'PUT', body: JSON.stringify(data) })),
  eliminar:    (id) => request(`/api/mesas/${id}`, { method: 'DELETE' }),
}

// ── Ventas ───────────────────────────────────────────────────────────────────

export const ventasService = {
  listar: async () => (await request('/api/ventas')).map(mapVenta),
  crear:  async (data) => mapVenta(await request('/api/ventas', { method: 'POST', body: JSON.stringify(data) })),
}

// ── Gastos ───────────────────────────────────────────────────────────────────

const mapGasto = g => ({ id: g._id, descripcion: g.descripcion, monto: g.monto, categoria: g.categoria, fecha: g.fecha })

export const gastosService = {
  listar:  async () => (await request('/api/gastos')).map(mapGasto),
  crear:   async (data) => mapGasto(await request('/api/gastos', { method: 'POST', body: JSON.stringify(data) })),
  eliminar: (id) => request(`/api/gastos/${id}`, { method: 'DELETE' }),
}

// ── Stock ────────────────────────────────────────────────────────────────────

export const stockService = {
  listar:              async () => (await request('/api/stock')).map(mapIng),
  registrarMovimiento: (id, data) => request(`/api/stock/${id}/movimiento`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarMinimo:    (id, stockMinimo) => request(`/api/stock/${id}/minimo`, { method: 'PUT', body: JSON.stringify({ stockMinimo }) }),
  listarMovimientos:   async (id) => request(`/api/stock/${id}/movimientos`),
}
