import { useState, useEffect } from 'react'
import {
  ShoppingBag, ShieldCheck, Users,
  Plus, X, ChevronLeft, Check,
} from 'lucide-react'
import TiendaOnline from './TiendaOnline'
import ConfigSalasYMesas from './ConfigSalasYMesas'
import { getSession, usuariosService, rolesService } from '../../services/api'
import './Configuracion.css'

/* ── Top tabs ─────────────────────────────────────────────────────── */
const TOP_TABS = [
  { id: 'general', label: 'Configuración general' },
  { id: 'salas',   label: 'Salas y mesas' },
]

/* ── Sidebar sections ─────────────────────────────────────────────── */
const SECCIONES = [
  { id: 'tienda',    label: 'Tienda Online',   Icon: ShoppingBag },
  { id: 'usuarios',  label: 'Usuarios',         Icon: Users },
  { id: 'roles',     label: 'Roles de usuario', Icon: ShieldCheck },
]


const PERMISOS_GRUPOS = [
  {
    grupo: 'MÓDULOS',
    permisos: [
      'Ver Restaurante',
      'Ver Monitor de Cocina',
      'Ver Productos',
      'Ver Proveedores',
      'Ver Clientes',
      'Ver Ventas',
      'Ver Finanzas',
      'Ver Reportes',
      'Ver Gastos',
      'Ver Carta Online',
      'Ver Configuración',
    ],
  },
  {
    grupo: 'RESTAURANTE',
    permisos: [
      'Cerrar venta de mesa',
      'Imprimir ticket de mesa',
      'Adicionar ítems a mesa',
      'Cancelar ítems de mesa',
      'Listar descuentos',
      'Crear descuentos',
      'Editar descuentos',
      'Eliminar descuentos',
    ],
  },
  {
    grupo: 'DELIVERY',
    permisos: [
      'Listar pedidos',
      'Crear pedido',
      'Actualizar pedido',
      'Eliminar pedido',
    ],
  },
  {
    grupo: 'VENTAS',
    permisos: [
      'Listar ventas',
      'Ver resumen y estadísticas',
    ],
  },
  {
    grupo: 'PRODUCTOS',
    permisos: [
      'Listar productos',
      'Crear producto',
      'Actualizar producto',
      'Eliminar producto',
      'Ver costo del producto',
      'Gestionar stock',
      'Gestionar ingredientes',
    ],
  },
]

/* ── Helpers ──────────────────────────────────────────────────────── */
const fmtDate = s => {
  if (!s) return '-'
  const d = new Date(s)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${mi}:${ss}`
}

/* ── SeccionUsuarios ──────────────────────────────────────────────── */
function SeccionUsuarios() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel]         = useState(null)
  const [panel, setPanel]     = useState(null)   // null | 'detalle' | 'nuevo'
  const [form, setForm]       = useState({ email: '', nombre: '', password: '', confirm: '', role: 'camarero' })
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const { user: me }          = getSession()

  const load = () => {
    setLoading(true)
    usuariosService.listar()
      .then(lista => { setItems(lista); setLoading(false) })
      .catch(() => { setItems([]); setLoading(false) })
  }

  useEffect(load, [])

  const openNuevo = () => {
    setForm({ email: '', nombre: '', password: '', confirm: '', role: 'camarero' })
    setErr('')
    setSel(null)
    setPanel('nuevo')
  }

  const handleCreate = async e => {
    e.preventDefault()
    if (!form.email || !form.nombre || !form.password) { setErr('Completá todos los campos requeridos'); return }
    if (form.password !== form.confirm) { setErr('Las contraseñas no coinciden'); return }
    setSaving(true); setErr('')
    try {
      await usuariosService.crear({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        role: form.role,
      })
      load()
      setPanel(null)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!window.confirm('¿Eliminar este usuario?')) return
    try {
      await usuariosService.eliminar(id)
      load(); setPanel(null); setSel(null)
    } catch (e) {
      alert(e.message)
    }
  }

  const ROL_LABELS = { encargado: 'Encargado', camarero: 'Camarero', repartidor: 'Repartidor' }
  const rolLabel = r => ROL_LABELS[r] || r

  return (
    <div className="cfg-split">
      {/* List */}
      <div className="cfg-main">
        <div className="cfg-toolbar">
          <h2 className="cfg-title">USUARIOS</h2>
          <button className="cfg-btn-dark" onClick={openNuevo}>
            <Plus size={14} /> Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <p className="cfg-loading">Cargando...</p>
        ) : (
          <div className="cfg-table-wrap">
            <table className="cfg-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Nombre</th>
                  <th>Último Login</th>
                </tr>
              </thead>
              <tbody>
                {items.map(u => (
                  <tr
                    key={u._id || u.id}
                    className={`cfg-row${sel?._id === (u._id || u.id) ? ' cfg-row--active' : ''}`}
                    onClick={() => { setSel({ ...u, _id: u._id || u.id }); setPanel('detalle') }}
                  >
                    <td className="cfg-td-bold">{u.email}</td>
                    <td>{rolLabel(u.role)}</td>
                    <td>{u.nombre}</td>
                    <td className="cfg-td-muted">{fmtDate(u.updatedAt || u.createdAt)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={4} className="cfg-td-empty">No hay usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="cfg-detail">
        {panel === null && (
          <div className="cfg-detail-empty">
            <ChevronLeft size={18} />
            <span>Seleccioná un item del listado</span>
          </div>
        )}

        {panel === 'detalle' && sel && (
          <>
            <div className="cfg-detail-hdr cfg-detail-hdr--orange">
              <span className="cfg-detail-title">{sel.email?.toUpperCase()}</span>
              <button className="cfg-icon-btn cfg-icon-btn--white" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="cfg-detail-body">
              {[
                ['Usuario',       sel.email],
                ['Contraseña',    '••••••••'],
                ['Nombre',        sel.nombre],
                ['E-mail',        sel.email],
                ['Rol',           rolLabel(sel.role)],
                ['Activo',        'Sí'],
                ['Último Login',  fmtDate(sel.updatedAt || sel.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="cfg-meta-row">
                  <span className="cfg-meta-key">{k}</span>
                  <span className="cfg-meta-val">{v}</span>
                </div>
              ))}
            </div>
            {sel._id !== me?.id && (
              <div className="cfg-detail-ftr">
                <button className="cfg-btn-danger" onClick={() => handleDelete(sel._id)}>
                  Eliminar
                </button>
              </div>
            )}
          </>
        )}

        {panel === 'nuevo' && (
          <>
            <div className="cfg-detail-hdr cfg-detail-hdr--orange">
              <span className="cfg-detail-title">NUEVO USUARIO</span>
              <button className="cfg-icon-btn cfg-icon-btn--white" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="cfg-detail-body">
              <form id="form-nuevo-usr" onSubmit={handleCreate} className="cfg-form">
                <div className="cfg-field">
                  <label>Usuario *</label>
                  <input
                    className="cfg-input" type="email"
                    placeholder="email@ejemplo.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="cfg-field">
                  <label>Contraseña *</label>
                  <input
                    className="cfg-input" type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div className="cfg-field">
                  <label>Reingresar contraseña *</label>
                  <input
                    className="cfg-input" type="password"
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
                <div className="cfg-field">
                  <label>Rol *</label>
                  <select
                    className="cfg-input"
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="camarero">Camarero</option>
                    <option value="repartidor">Repartidor</option>
                    <option value="encargado">Encargado</option>
                  </select>
                </div>
                <div className="cfg-field">
                  <label>Nombre *</label>
                  <input
                    className="cfg-input"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                {err && <p className="cfg-err">{err}</p>}
              </form>
            </div>
            <div className="cfg-detail-ftr">
              <button className="cfg-btn-cancel" onClick={() => setPanel(null)}>Cancelar</button>
              <button
                className="cfg-btn-save"
                form="form-nuevo-usr"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── SeccionRoles ─────────────────────────────────────────────────── */
function SeccionRoles() {
  const [roles, setRoles]     = useState([])
  const [conteos, setConteos] = useState({})
  const [sel, setSel]         = useState(null)
  const [panel, setPanel]     = useState(null)   // null | 'detalle' | 'nuevo'
  const [form, setForm]       = useState({ nombre: '' })
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  const load = () => {
    rolesService.listar().then(setRoles).catch(() => {})
    usuariosService.listar()
      .then(lista => {
        const c = {}
        lista.forEach(u => { c[u.role] = (c[u.role] || 0) + 1 })
        setConteos(c)
      })
      .catch(() => {})
  }

  useEffect(load, [])

  const openDetalle = r => { setSel({ ...r }); setPanel('detalle') }

  const togglePerm = p => {
    setSel(s => {
      const tiene = s.permisos.includes(p)
      return { ...s, permisos: tiene ? s.permisos.filter(x => x !== p) : [...s.permisos, p] }
    })
  }

  const handleSave = async () => {
    setSaving(true); setErr('')
    try {
      const updated = await rolesService.actualizar(sel._id, { nombre: sel.nombre, permisos: sel.permisos })
      setRoles(prev => prev.map(r => r._id === updated._id ? updated : r))
      setSel(updated)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const handleCreate = async () => {
    if (!form.nombre.trim()) return
    setSaving(true); setErr('')
    try {
      const nuevo = await rolesService.crear({ nombre: form.nombre.trim() })
      setRoles(prev => [...prev, nuevo])
      setPanel(null)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!window.confirm('¿Eliminar este rol?')) return
    try {
      await rolesService.eliminar(id)
      setRoles(prev => prev.filter(r => r._id !== id))
      setPanel(null); setSel(null)
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="cfg-split">
      {/* List */}
      <div className="cfg-main">
        <div className="cfg-toolbar">
          <h2 className="cfg-title">ROLES DE USUARIO</h2>
          <button className="cfg-btn-dark" onClick={() => { setForm({ nombre: '' }); setErr(''); setSel(null); setPanel('nuevo') }}>
            <Plus size={14} /> Nuevo Rol
          </button>
        </div>
        <div className="cfg-table-wrap">
          <table className="cfg-table">
            <thead>
              <tr><th>Rol</th><th>Usuarios</th></tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr
                  key={r._id}
                  className={`cfg-row${sel?._id === r._id ? ' cfg-row--active' : ''}`}
                  onClick={() => openDetalle(r)}
                >
                  <td className="cfg-td-bold">{r.nombre}</td>
                  <td className="cfg-td-muted">{conteos[r.key] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail */}
      <div className="cfg-detail">
        {panel === null && (
          <div className="cfg-detail-empty">
            <ChevronLeft size={18} />
            <span>Seleccioná un item del listado</span>
          </div>
        )}

        {panel === 'detalle' && sel && (
          <>
            <div className="cfg-detail-hdr cfg-detail-hdr--orange">
              <span className="cfg-detail-title">{sel.nombre.toUpperCase()}</span>
              <button className="cfg-icon-btn cfg-icon-btn--white" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="cfg-detail-body">
              <div className="cfg-form">
                <div className="cfg-field">
                  <label>Nombre</label>
                  <input
                    className="cfg-input"
                    value={sel.nombre}
                    onChange={e => setSel(s => ({ ...s, nombre: e.target.value }))}
                  />
                </div>

                <div className="cfg-permisos-sep">PERMISOS</div>

                {PERMISOS_GRUPOS.map(g => (
                  <div key={g.grupo} className="cfg-permisos-grupo">
                    <p className="cfg-permisos-titulo">{g.grupo}</p>
                    {g.permisos.map(p => {
                      const activo = sel.permisos.includes(p)
                      return (
                        <div key={p} className="cfg-permiso-row cfg-permiso-row--click" onClick={() => togglePerm(p)}>
                          <span className={`cfg-permiso-check${activo ? ' cfg-permiso-check--on' : ' cfg-permiso-check--off'}`}>
                            {activo ? <Check size={10} /> : <X size={10} />}
                          </span>
                          <span>{p}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
                {err && <p className="cfg-err">{err}</p>}
              </div>
            </div>
            <div className="cfg-detail-ftr">
              {!sel.esFijo && (
                <button className="cfg-btn-danger" onClick={() => handleDelete(sel._id)}>Eliminar</button>
              )}
              <button className="cfg-btn-save" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        )}

        {panel === 'nuevo' && (
          <>
            <div className="cfg-detail-hdr cfg-detail-hdr--orange">
              <span className="cfg-detail-title">NUEVO ROL</span>
              <button className="cfg-icon-btn cfg-icon-btn--white" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="cfg-detail-body">
              <div className="cfg-form">
                <div className="cfg-field">
                  <label>Nombre *</label>
                  <input
                    className="cfg-input"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                {err && <p className="cfg-err">{err}</p>}
              </div>
            </div>
            <div className="cfg-detail-ftr">
              <button className="cfg-btn-cancel" onClick={() => setPanel(null)}>Cancelar</button>
              <button className="cfg-btn-save" disabled={saving} onClick={handleCreate}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────── */
const SPLIT_SECS = new Set(['usuarios', 'roles'])

export default function Configuracion({ tabInicial = 'general' }) {
  const [topTab, setTopTab] = useState(tabInicial)
  const [activa, setActiva] = useState('tienda')

  useEffect(() => { setTopTab(tabInicial) }, [tabInicial])

  const isSplit = SPLIT_SECS.has(activa)

  return (
    <div className="config-wrap">

      {/* Top tabs */}
      <div className="config-top-tabs">
        {TOP_TABS.map(t => (
          <button
            key={t.id}
            className={`config-top-tab${topTab === t.id ? ' config-top-tab--active' : ''}`}
            onClick={() => setTopTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {topTab === 'general' && (
        <div className="config-layout">
          <nav className="config-nav">
            <p className="config-nav-title">Configuración</p>
            {SECCIONES.map(s => (
              <button
                key={s.id}
                className={`config-nav-item${activa === s.id ? ' config-nav-item--active' : ''}`}
                onClick={() => setActiva(s.id)}
              >
                <s.Icon size={16} />
                {s.label}
              </button>
            ))}
          </nav>

          <div className={`config-content${isSplit ? ' config-content--flush' : ''}`}>
            {activa === 'tienda'    && <TiendaOnline />}
            {activa === 'usuarios'  && <SeccionUsuarios />}
            {activa === 'roles'     && <SeccionRoles />}
          </div>
        </div>
      )}

      {topTab === 'salas' && <ConfigSalasYMesas />}
    </div>
  )
}
