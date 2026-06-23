import { useState, useEffect } from 'react'
import {
  ShoppingBag, ShieldCheck, Users, CreditCard, Sliders,
  Plus, X, Edit2, ChevronLeft, Check,
} from 'lucide-react'
import TiendaOnline from './TiendaOnline'
import ConfigSalasYMesas from './ConfigSalasYMesas'
import { getSession, adminService, authService } from '../../services/api'
import './Configuracion.css'

/* ── Top tabs ─────────────────────────────────────────────────────── */
const TOP_TABS = [
  { id: 'general', label: 'Configuración general' },
  { id: 'salas',   label: 'Salas y mesas' },
]

/* ── Sidebar sections ─────────────────────────────────────────────── */
const SECCIONES = [
  { id: 'tienda',      label: 'Tienda Online',    Icon: ShoppingBag },
  { id: 'usuarios',    label: 'Usuarios',          Icon: Users },
  { id: 'roles',       label: 'Roles de usuario',  Icon: ShieldCheck },
  { id: 'mediosPago',  label: 'Medios de Pago',    Icon: CreditCard },
  { id: 'preferencias', label: 'Preferencias',     Icon: Sliders },
]

/* ── Static data for Roles ────────────────────────────────────────── */
const ROLES_INIT = [
  { id: 'camarero',  nombre: 'Camarero',  esCamarero: true,  esRepartidor: false },
  { id: 'encargado', nombre: 'Encargado', esCamarero: false, esRepartidor: false },
  { id: 'admin',     nombre: 'Admin',     esCamarero: false, esRepartidor: false },
]

const PERMISOS_GRUPOS = [
  {
    grupo: 'RESTAURANTE',
    permisos: [
      'Cerrar ventas', 'Cobrar mesa', 'Cobrar por ítem',
      'Imprimir control de Mesa', 'Asignar camarero',
      'Crear adiciones', 'Cancelar adiciones',
      'Listar descuentos', 'Crear descuentos', 'Cancelar descuentos',
    ],
  },
  {
    grupo: 'DELIVERY',
    permisos: [
      'Listar', 'Actualizar', 'Crear',
      'Abrir cajón de dinero', 'Crear costos de envío',
      'Cancelar costos de envío', 'Solicitar entregas',
    ],
  },
  {
    grupo: 'VENTAS',
    permisos: [
      'Listar', 'Actualizar', 'Eliminar',
      'Exportar', 'Ver resúmen', 'Mover productos entre ventas',
    ],
  },
  {
    grupo: 'PRODUCTOS',
    permisos: [
      'Listar', 'Actualizar', 'Modificar precio',
      'Activar / desactivar', 'Crear', 'Eliminar', 'Exportar / importar', 'Ver costo',
    ],
  },
]

/* ── Static data for Medios de Pago ──────────────────────────────── */
const MEDIOS_INIT = [
  { id: 'efectivo',      label: 'Efectivo',       activo: true  },
  { id: 'debito',        label: 'Débito',          activo: true  },
  { id: 'credito',       label: 'Crédito',         activo: true  },
  { id: 'mercadopago',   label: 'MercadoPago',     activo: false },
  { id: 'transferencia', label: 'Transferencia',   activo: false },
  { id: 'qr',            label: 'QR',              activo: false },
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
  const [form, setForm]       = useState({ email: '', nombre: '', password: '', confirm: '', role: 'user' })
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const { user: me }          = getSession()

  const load = () => {
    setLoading(true)
    if (me?.role === 'admin') {
      adminService.listarUsuarios()
        .then(d => { setItems(d); setLoading(false) })
        .catch(() => {
          showCurrentUser()
          setLoading(false)
        })
    } else {
      showCurrentUser()
      setLoading(false)
    }
  }

  const showCurrentUser = () => {
    if (me) {
      setItems([{
        _id: me.id, nombre: me.nombre, email: me.email,
        role: me.role, createdAt: new Date().toISOString(),
      }])
    }
  }

  useEffect(load, [])

  const openNuevo = () => {
    setForm({ email: '', nombre: '', password: '', confirm: '', role: 'user' })
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
      await authService.register({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        restaurante: me?.restaurante || 'Local',
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
      await adminService.eliminarUsuario(id)
      load(); setPanel(null); setSel(null)
    } catch (e) {
      alert(e.message)
    }
  }

  const rolLabel = r => r === 'admin' ? 'Admin' : 'Usuario'

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
                ['Superusuario',  sel.role === 'admin' ? 'Sí' : 'No'],
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
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
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
  const [roles, setRoles]   = useState(ROLES_INIT)
  const [sel, setSel]       = useState(null)
  const [panel, setPanel]   = useState(null)   // null | 'detalle' | 'nuevo' | 'editar'
  const [form, setForm]     = useState({ nombre: '', basadoEn: '', esCamarero: false, esRepartidor: false })
  const [perms, setPerms]   = useState({})     // { 'permiso-key': bool }
  const [saving, setSaving] = useState(false)

  const openDetalle = r => {
    setSel(r)
    setPerms({})
    setPanel('detalle')
  }

  const openNuevo = () => {
    setForm({ nombre: '', basadoEn: '', esCamarero: false, esRepartidor: false })
    setSel(null)
    setPanel('nuevo')
  }

  const togglePerm = key => setPerms(p => ({ ...p, [key]: !p[key] }))

  const handleCreate = () => {
    if (!form.nombre.trim()) return
    setRoles(prev => [
      ...prev,
      { id: Date.now().toString(), nombre: form.nombre.trim(), esCamarero: form.esCamarero, esRepartidor: form.esRepartidor },
    ])
    setPanel(null)
  }

  const handleDelete = id => {
    setRoles(prev => prev.filter(r => r.id !== id))
    setPanel(null); setSel(null)
  }

  return (
    <div className="cfg-split">
      {/* List */}
      <div className="cfg-main">
        <div className="cfg-toolbar">
          <h2 className="cfg-title">ROLES DE USUARIO</h2>
          <button className="cfg-btn-dark" onClick={openNuevo}>
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
                  key={r.id}
                  className={`cfg-row${sel?.id === r.id ? ' cfg-row--active' : ''}`}
                  onClick={() => openDetalle(r)}
                >
                  <td className="cfg-td-bold">{r.nombre}</td>
                  <td className="cfg-td-muted">-</td>
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
              <button className="cfg-icon-btn cfg-icon-btn--white" onClick={() => setPanel('editar')}>
                <Edit2 size={14} />
              </button>
            </div>
            <div className="cfg-detail-body">
              <div className="cfg-meta-row">
                <span className="cfg-meta-key">Es camarero</span>
                <span className="cfg-meta-val">{sel.esCamarero ? 'Sí' : 'No'}</span>
              </div>
              <div className="cfg-meta-row">
                <span className="cfg-meta-key">Es repartidor</span>
                <span className="cfg-meta-val">{sel.esRepartidor ? 'Sí' : 'No'}</span>
              </div>

              <div className="cfg-permisos-sep">PERMISOS</div>

              {PERMISOS_GRUPOS.map(g => (
                <div key={g.grupo} className="cfg-permisos-grupo">
                  <p className="cfg-permisos-titulo">{g.grupo}</p>
                  {g.permisos.map(p => {
                    const key = `${sel.id}:${g.grupo}:${p}`
                    return (
                      <div key={p} className="cfg-permiso-row">
                        <span className={`cfg-permiso-check${perms[key] ? ' cfg-permiso-check--on' : ' cfg-permiso-check--off'}`}>
                          {perms[key] ? <Check size={10} /> : <X size={10} />}
                        </span>
                        <span>{p}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            {!['admin'].includes(sel.id) && (
              <div className="cfg-detail-ftr">
                <button className="cfg-btn-danger" onClick={() => handleDelete(sel.id)}>Eliminar</button>
              </div>
            )}
          </>
        )}

        {panel === 'editar' && sel && (
          <>
            <div className="cfg-detail-hdr cfg-detail-hdr--orange">
              <span className="cfg-detail-title">{sel.nombre.toUpperCase()}</span>
              <button className="cfg-icon-btn cfg-icon-btn--white" onClick={() => setPanel('detalle')}>
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
                <div className="cfg-check-row">
                  <label>Es camarero</label>
                  <input
                    type="checkbox"
                    checked={sel.esCamarero}
                    onChange={e => setSel(s => ({ ...s, esCamarero: e.target.checked }))}
                  />
                </div>
                <div className="cfg-check-row">
                  <label>Es repartidor</label>
                  <input
                    type="checkbox"
                    checked={sel.esRepartidor}
                    onChange={e => setSel(s => ({ ...s, esRepartidor: e.target.checked }))}
                  />
                </div>

                <div className="cfg-permisos-sep">PERMISOS</div>

                {PERMISOS_GRUPOS.map(g => (
                  <div key={g.grupo} className="cfg-permisos-grupo">
                    <p className="cfg-permisos-titulo">{g.grupo}</p>
                    {g.permisos.map(p => {
                      const key = `${sel.id}:${g.grupo}:${p}`
                      return (
                        <div key={p} className="cfg-permiso-row cfg-permiso-row--click" onClick={() => togglePerm(key)}>
                          <span className={`cfg-permiso-check${perms[key] ? ' cfg-permiso-check--on' : ' cfg-permiso-check--off'}`}>
                            {perms[key] ? <Check size={10} /> : <X size={10} />}
                          </span>
                          <span>{p}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="cfg-detail-ftr">
              <button className="cfg-btn-cancel" onClick={() => setPanel('detalle')}>Cancelar</button>
              <button
                className="cfg-btn-save"
                disabled={saving}
                onClick={() => {
                  setSaving(true)
                  setRoles(prev => prev.map(r => r.id === sel.id ? sel : r))
                  setTimeout(() => { setSaving(false); setPanel('detalle') }, 300)
                }}
              >
                Guardar cambios
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
                  <label>Nombre</label>
                  <input
                    className="cfg-input"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                <div className="cfg-field">
                  <label>Basado en</label>
                  <select
                    className="cfg-input"
                    value={form.basadoEn}
                    onChange={e => setForm(f => ({ ...f, basadoEn: e.target.value }))}
                  >
                    <option value="">(Ninguno)</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div className="cfg-check-row">
                  <label>Es camarero</label>
                  <input
                    type="checkbox"
                    checked={form.esCamarero}
                    onChange={e => setForm(f => ({ ...f, esCamarero: e.target.checked }))}
                  />
                </div>
                <div className="cfg-check-row">
                  <label>Es repartidor</label>
                  <input
                    type="checkbox"
                    checked={form.esRepartidor}
                    onChange={e => setForm(f => ({ ...f, esRepartidor: e.target.checked }))}
                  />
                </div>
              </div>
            </div>
            <div className="cfg-detail-ftr">
              <button className="cfg-btn-cancel" onClick={() => setPanel(null)}>Cancelar</button>
              <button className="cfg-btn-save" onClick={handleCreate}>Guardar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── SeccionMediosPago ────────────────────────────────────────────── */
function SeccionMediosPago() {
  const [medios, setMedios] = useState(MEDIOS_INIT)
  const toggle = id => setMedios(prev => prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m))

  return (
    <div className="cfg-form-section">
      <h2 className="cfg-section-heading">MEDIOS DE PAGO</h2>
      <p className="cfg-section-desc">Configurá los medios de pago disponibles en tu local.</p>
      <div className="cfg-medios-list">
        {medios.map(m => (
          <div key={m.id} className="cfg-medio-row">
            <span className="cfg-medio-label">{m.label}</span>
            <label className="cfg-toggle">
              <input type="checkbox" checked={m.activo} onChange={() => toggle(m.id)} />
              <span className="cfg-toggle-track">
                <span className="cfg-toggle-thumb" />
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── SeccionPreferencias ──────────────────────────────────────────── */
function SeccionPreferencias() {
  const [prefs, setPrefs] = useState({
    imprimirAlCerrar: true,
    pedirConfirmacion: true,
    mostrarCostos: false,
    modoOscuro: false,
  })
  const toggle = k => setPrefs(p => ({ ...p, [k]: !p[k] }))

  const items = [
    { key: 'imprimirAlCerrar',   label: 'Imprimir ticket al cerrar mesa',         desc: 'Se imprime automáticamente al cerrar una venta' },
    { key: 'pedirConfirmacion',  label: 'Pedir confirmación al eliminar',          desc: 'Solicitar confirmación antes de eliminar ítems' },
    { key: 'mostrarCostos',      label: 'Mostrar costos en el menú',               desc: 'Visible solo para usuarios administradores' },
    { key: 'modoOscuro',         label: 'Modo oscuro',                             desc: 'Cambiar apariencia del sistema' },
  ]

  return (
    <div className="cfg-form-section">
      <h2 className="cfg-section-heading">PREFERENCIAS</h2>
      <p className="cfg-section-desc">Ajustes generales del sistema.</p>
      <div className="cfg-medios-list">
        {items.map(it => (
          <div key={it.key} className="cfg-medio-row cfg-medio-row--tall">
            <div>
              <p className="cfg-medio-label">{it.label}</p>
              <p className="cfg-medio-subdesc">{it.desc}</p>
            </div>
            <label className="cfg-toggle">
              <input type="checkbox" checked={prefs[it.key]} onChange={() => toggle(it.key)} />
              <span className="cfg-toggle-track">
                <span className="cfg-toggle-thumb" />
              </span>
            </label>
          </div>
        ))}
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
            {activa === 'tienda'       && <TiendaOnline />}
            {activa === 'usuarios'     && <SeccionUsuarios />}
            {activa === 'roles'        && <SeccionRoles />}
            {activa === 'mediosPago'   && <SeccionMediosPago />}
            {activa === 'preferencias' && <SeccionPreferencias />}
          </div>
        </div>
      )}

      {topTab === 'salas' && <ConfigSalasYMesas />}
    </div>
  )
}
