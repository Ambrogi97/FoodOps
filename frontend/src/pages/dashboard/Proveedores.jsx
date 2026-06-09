import { useState, useEffect } from 'react'
import { proveedoresService } from '../../services/api'
import { Truck, Search, Phone, Mail, FileText } from 'lucide-react'
import './Proveedores.css'

const VACIO = { nombre: '', rubro: '', telefono: '', email: '', notas: '' }

const AVATAR_COLORS = ['#6366f1','#f97316','#22c55e','#3b82f6','#ec4899','#14b8a6','#f59e0b','#8b5cf6']
const avatarColor = (nombre) => AVATAR_COLORS[nombre.charCodeAt(0) % AVATAR_COLORS.length]
const inicial     = (nombre) => nombre[0].toUpperCase()

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [selected, setSelected]       = useState(null)
  const [busqueda, setBusqueda]       = useState('')
  const [cargando, setCargando]       = useState(true)
  const [creando, setCreando]         = useState(false)
  const [editando, setEditando]       = useState(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [form, setForm]               = useState(VACIO)

  useEffect(() => {
    proveedoresService.listar()
      .then(data => { setProveedores(data); setCargando(false) })
      .catch(e   => { console.error(e); setCargando(false) })
  }, [])

  const proveedor = proveedores.find(p => p.id === selected)

  const filtrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.rubro.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.telefono.includes(busqueda) ||
    p.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  const abrirCrear = () => { setForm(VACIO); setCreando(true) }

  const guardarCrear = async () => {
    if (!form.nombre.trim()) return
    try {
      const nuevo = await proveedoresService.crear(form)
      setProveedores(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setCreando(false)
    } catch (e) { console.error(e) }
  }

  const abrirEditar = () => {
    setForm({ nombre: proveedor.nombre, rubro: proveedor.rubro, telefono: proveedor.telefono, email: proveedor.email, notas: proveedor.notas })
    setEditando(proveedor.id)
  }

  const guardarEditar = async () => {
    if (!form.nombre.trim()) return
    try {
      const actualizado = await proveedoresService.actualizar(editando, form)
      setProveedores(prev => prev.map(p => p.id === editando ? actualizado : p).sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setEditando(null)
    } catch (e) { console.error(e) }
  }

  const eliminar = async (id) => {
    try {
      await proveedoresService.eliminar(id)
      setProveedores(prev => prev.filter(p => p.id !== id))
      setSelected(null)
      setConfirmarEliminar(null)
    } catch (e) { console.error(e) }
  }

  if (cargando) return (
    <div className="prov-layout prov-layout--center">Cargando...</div>
  )

  return (
    <div className="prov-layout">
      <div className="prov-body">

        {/* Sidebar */}
        <aside className="prov-sidebar">
          <div className="prov-sidebar-top">
            <div className="prov-sidebar-header">
              <span className="prov-sidebar-title">Todos los proveedores</span>
              <span className="prov-sidebar-count">{proveedores.length}</span>
            </div>
            <input
              className="prov-search"
              type="text"
              placeholder="Buscar por nombre o rubro..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <button className="prov-btn-nuevo" onClick={abrirCrear}>+ Nuevo proveedor</button>
          </div>

          <div className="prov-list">
            {filtrados.length === 0 ? (
              <div className="prov-list-empty">
                <span>{busqueda ? <Search size={32} color="#94a3b8" /> : <Truck size={32} color="#94a3b8" />}</span>
                <p>{busqueda ? 'Sin resultados' : 'No hay proveedores todavía'}</p>
              </div>
            ) : (
              filtrados.map(p => (
                <button
                  key={p.id}
                  className={`prov-card ${selected === p.id ? 'prov-card--active' : ''}`}
                  onClick={() => setSelected(selected === p.id ? null : p.id)}
                >
                  <div className="prov-card-avatar" style={{ background: avatarColor(p.nombre) }}>
                    {inicial(p.nombre)}
                  </div>
                  <div className="prov-card-info">
                    <span className="prov-card-nombre">{p.nombre}</span>
                    <span className="prov-card-sub">
                      {p.rubro || p.telefono || p.email || 'Sin datos'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Panel derecho */}
        <div className="prov-panel">
          {!proveedor ? (
            <div className="prov-panel-empty">
              <div className="prov-panel-empty-icon"><Truck size={40} color="#94a3b8" /></div>
              <p>Seleccioná un proveedor</p>
              <span>para ver su información de contacto y notas</span>
            </div>
          ) : (
            <div className="prov-detalle">

              <div className="prov-detalle-hero">
                <div className="prov-detalle-avatar" style={{ background: avatarColor(proveedor.nombre) }}>
                  {inicial(proveedor.nombre)}
                </div>
                <div className="prov-detalle-hero-info">
                  <h2 className="prov-detalle-nombre">{proveedor.nombre}</h2>
                  {proveedor.rubro && <span className="prov-rubro-badge">{proveedor.rubro}</span>}
                </div>
                <div className="prov-detalle-btns">
                  <button className="prov-btn-primary" onClick={abrirEditar}>Editar</button>
                  <button className="prov-btn-danger" onClick={() => setConfirmarEliminar(proveedor.id)}>Eliminar</button>
                </div>
              </div>

              <div className="prov-info-grid">
                <div className="prov-info-card">
                  <span className="prov-info-icon"><Phone size={16} color="#22c55e" /></span>
                  <div className="prov-info-content">
                    <span className="prov-info-label">Teléfono</span>
                    <span className={`prov-info-value ${!proveedor.telefono ? 'prov-info-value--muted' : ''}`}>
                      {proveedor.telefono || 'No registrado'}
                    </span>
                  </div>
                </div>
                <div className="prov-info-card">
                  <span className="prov-info-icon"><Mail size={16} color="#3b82f6" /></span>
                  <div className="prov-info-content">
                    <span className="prov-info-label">Email</span>
                    <span className={`prov-info-value ${!proveedor.email ? 'prov-info-value--muted' : ''}`}>
                      {proveedor.email || 'No registrado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="prov-notas-section">
                <span className="prov-notas-label"><FileText size={14} color="#94a3b8" /> Notas</span>
                {proveedor.notas
                  ? <div className="prov-notas">{proveedor.notas}</div>
                  : <div className="prov-notas prov-notas--empty">Sin notas</div>
                }
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Modal crear */}
      {creando && (
        <div className="prov-modal-overlay">
          <div className="prov-modal">
            <h3 className="prov-modal-title">Nuevo proveedor</h3>
            <FormProveedor form={form} setForm={setForm} autoFocus />
            <div className="prov-modal-actions">
              <button className="prov-btn-secondary" onClick={() => setCreando(false)}>Cancelar</button>
              <button className="prov-btn-primary" onClick={guardarCrear} disabled={!form.nombre.trim()}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="prov-modal-overlay">
          <div className="prov-modal">
            <h3 className="prov-modal-title">Editar proveedor</h3>
            <FormProveedor form={form} setForm={setForm} autoFocus />
            <div className="prov-modal-actions">
              <button className="prov-btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="prov-btn-primary" onClick={guardarEditar} disabled={!form.nombre.trim()}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (() => {
        const p = proveedores.find(x => x.id === confirmarEliminar)
        return (
          <div className="prov-modal-overlay" onClick={() => setConfirmarEliminar(null)}>
            <div className="prov-modal" onClick={e => e.stopPropagation()}>
              <div className="prov-modal-avatar" style={{ background: avatarColor(p?.nombre || '') }}>
                {p ? inicial(p.nombre) : '?'}
              </div>
              <h3 className="prov-modal-title">¿Eliminar proveedor?</h3>
              <p className="prov-modal-sub">Vas a eliminar a <strong>{p?.nombre}</strong>. Esta acción no se puede deshacer.</p>
              <div className="prov-modal-actions">
                <button className="prov-btn-secondary" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
                <button className="prov-btn-confirm-danger" onClick={() => eliminar(confirmarEliminar)}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

function FormProveedor({ form, setForm, autoFocus }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <div className="prov-form">
      <div className="prov-form-row">
        <div className="prov-form-field prov-form-field--wide">
          <label>Nombre *</label>
          <input type="text" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Distribuidora García" autoFocus={autoFocus} />
        </div>
        <div className="prov-form-field">
          <label>Rubro</label>
          <input type="text" value={form.rubro} onChange={set('rubro')} placeholder="Ej: Carnes, Verduras..." />
        </div>
      </div>
      <div className="prov-form-row">
        <div className="prov-form-field">
          <label>Teléfono</label>
          <input type="text" value={form.telefono} onChange={set('telefono')} placeholder="11 1234-5678" />
        </div>
        <div className="prov-form-field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="mail@ejemplo.com" />
        </div>
      </div>
      <div className="prov-form-field">
        <label>Notas</label>
        <textarea value={form.notas} onChange={set('notas')} placeholder="Días de entrega, condiciones de pago, productos habituales..." />
      </div>
    </div>
  )
}
