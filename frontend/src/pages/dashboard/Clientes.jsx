import { useState, useEffect } from 'react'
import { clientesService } from '../../services/api'
import './Clientes.css'

const VACIO = { nombre: '', telefono: '', email: '', notas: '' }

const AVATAR_COLORS = ['#6366f1','#f97316','#22c55e','#3b82f6','#ec4899','#14b8a6','#f59e0b','#8b5cf6']
const avatarColor = (nombre) => AVATAR_COLORS[nombre.charCodeAt(0) % AVATAR_COLORS.length]
const inicial     = (nombre) => nombre[0].toUpperCase()

export default function Clientes() {
  const [clientes, setClientes]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [busqueda, setBusqueda]   = useState('')
  const [cargando, setCargando]   = useState(true)
  const [creando, setCreando]     = useState(false)
  const [editando, setEditando]   = useState(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [form, setForm]           = useState(VACIO)

  useEffect(() => {
    clientesService.listar()
      .then(data => { setClientes(data); setCargando(false) })
      .catch(e   => { console.error(e); setCargando(false) })
  }, [])

  const cliente = clientes.find(c => c.id === selected)

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda) ||
    c.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  const abrirCrear = () => { setForm(VACIO); setCreando(true) }

  const guardarCrear = async () => {
    if (!form.nombre.trim()) return
    try {
      const nuevo = await clientesService.crear(form)
      setClientes(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setCreando(false)
    } catch (e) { console.error(e) }
  }

  const abrirEditar = () => {
    setForm({ nombre: cliente.nombre, telefono: cliente.telefono, email: cliente.email, notas: cliente.notas })
    setEditando(cliente.id)
  }

  const guardarEditar = async () => {
    if (!form.nombre.trim()) return
    try {
      const actualizado = await clientesService.actualizar(editando, form)
      setClientes(prev => prev.map(c => c.id === editando ? actualizado : c).sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setEditando(null)
    } catch (e) { console.error(e) }
  }

  const eliminar = async (id) => {
    try {
      await clientesService.eliminar(id)
      setClientes(prev => prev.filter(c => c.id !== id))
      setSelected(null)
      setConfirmarEliminar(null)
    } catch (e) { console.error(e) }
  }

  if (cargando) return (
    <div className="cli-layout cli-layout--center">Cargando...</div>
  )

  return (
    <div className="cli-layout">
      <div className="cli-body">

        {/* Sidebar */}
        <aside className="cli-sidebar">
          <div className="cli-sidebar-top">
            <div className="cli-sidebar-header">
              <span className="cli-sidebar-title">Todos los clientes</span>
              <span className="cli-sidebar-count">{clientes.length}</span>
            </div>
            <input
              className="cli-search"
              type="text"
              placeholder="Buscar por nombre, teléfono..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <button className="cli-btn-nuevo" onClick={abrirCrear}>+ Nuevo cliente</button>
          </div>

          <div className="cli-list">
            {filtrados.length === 0 ? (
              <div className="cli-list-empty">
                <span>{busqueda ? '🔍' : '👥'}</span>
                <p>{busqueda ? 'Sin resultados' : 'No hay clientes todavía'}</p>
              </div>
            ) : (
              filtrados.map(c => (
                <button
                  key={c.id}
                  className={`cli-card ${selected === c.id ? 'cli-card--active' : ''}`}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                >
                  <div className="cli-card-avatar" style={{ background: avatarColor(c.nombre) }}>
                    {inicial(c.nombre)}
                  </div>
                  <div className="cli-card-info">
                    <span className="cli-card-nombre">{c.nombre}</span>
                    <span className="cli-card-sub">
                      {c.telefono ? `📞 ${c.telefono}` : c.email ? `✉ ${c.email}` : 'Sin contacto'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Panel derecho */}
        <div className="cli-panel">
          {!cliente ? (
            <div className="cli-panel-empty">
              <div className="cli-panel-empty-icon">👥</div>
              <p>Seleccioná un cliente</p>
              <span>para ver su información de contacto y notas</span>
            </div>
          ) : (
            <div className="cli-detalle">

              {/* Hero */}
              <div className="cli-detalle-hero">
                <div className="cli-detalle-avatar" style={{ background: avatarColor(cliente.nombre) }}>
                  {inicial(cliente.nombre)}
                </div>
                <div className="cli-detalle-hero-info">
                  <h2 className="cli-detalle-nombre">{cliente.nombre}</h2>
                  {(cliente.telefono || cliente.email) && (
                    <span className="cli-detalle-contacto-rapido">
                      {cliente.telefono || cliente.email}
                    </span>
                  )}
                </div>
                <div className="cli-detalle-btns">
                  <button className="cli-btn-primary" onClick={abrirEditar}>Editar</button>
                  <button className="cli-btn-danger" onClick={() => setConfirmarEliminar(cliente.id)}>Eliminar</button>
                </div>
              </div>

              {/* Info cards */}
              <div className="cli-info-grid">
                <div className="cli-info-card">
                  <span className="cli-info-icon">📞</span>
                  <div className="cli-info-content">
                    <span className="cli-info-label">Teléfono</span>
                    <span className={`cli-info-value ${!cliente.telefono ? 'cli-info-value--muted' : ''}`}>
                      {cliente.telefono || 'No registrado'}
                    </span>
                  </div>
                </div>
                <div className="cli-info-card">
                  <span className="cli-info-icon">✉️</span>
                  <div className="cli-info-content">
                    <span className="cli-info-label">Email</span>
                    <span className={`cli-info-value ${!cliente.email ? 'cli-info-value--muted' : ''}`}>
                      {cliente.email || 'No registrado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="cli-notas-section">
                <span className="cli-notas-label">📝 Notas</span>
                {cliente.notas
                  ? <div className="cli-notas">{cliente.notas}</div>
                  : <div className="cli-notas cli-notas--empty">Sin notas</div>
                }
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Modal crear */}
      {creando && (
        <div className="cli-modal-overlay" onClick={() => setCreando(false)}>
          <div className="cli-modal" onClick={e => e.stopPropagation()}>
            <h3 className="cli-modal-title">Nuevo cliente</h3>
            <FormCliente form={form} setForm={setForm} autoFocus />
            <div className="cli-modal-actions">
              <button className="cli-btn-secondary" onClick={() => setCreando(false)}>Cancelar</button>
              <button className="cli-btn-primary" onClick={guardarCrear} disabled={!form.nombre.trim()}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="cli-modal-overlay" onClick={() => setEditando(null)}>
          <div className="cli-modal" onClick={e => e.stopPropagation()}>
            <h3 className="cli-modal-title">Editar cliente</h3>
            <FormCliente form={form} setForm={setForm} autoFocus />
            <div className="cli-modal-actions">
              <button className="cli-btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="cli-btn-primary" onClick={guardarEditar} disabled={!form.nombre.trim()}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (() => {
        const c = clientes.find(x => x.id === confirmarEliminar)
        return (
          <div className="cli-modal-overlay" onClick={() => setConfirmarEliminar(null)}>
            <div className="cli-modal" onClick={e => e.stopPropagation()}>
              <div className="cli-modal-avatar" style={{ background: avatarColor(c?.nombre || '') }}>
                {c ? inicial(c.nombre) : '?'}
              </div>
              <h3 className="cli-modal-title">¿Eliminar cliente?</h3>
              <p className="cli-modal-sub">Vas a eliminar a <strong>{c?.nombre}</strong>. Esta acción no se puede deshacer.</p>
              <div className="cli-modal-actions">
                <button className="cli-btn-secondary" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
                <button className="cli-btn-confirm-danger" onClick={() => eliminar(confirmarEliminar)}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

function FormCliente({ form, setForm, autoFocus }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <div className="cli-form">
      <div className="cli-form-field">
        <label>Nombre *</label>
        <input type="text" value={form.nombre} onChange={set('nombre')} placeholder="Ej: María García" autoFocus={autoFocus} />
      </div>
      <div className="cli-form-row">
        <div className="cli-form-field">
          <label>Teléfono</label>
          <input type="text" value={form.telefono} onChange={set('telefono')} placeholder="11 1234-5678" />
        </div>
        <div className="cli-form-field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="mail@ejemplo.com" />
        </div>
      </div>
      <div className="cli-form-field">
        <label>Notas</label>
        <textarea value={form.notas} onChange={set('notas')} placeholder="Alergias, preferencias de mesa, ocasiones especiales..." />
      </div>
    </div>
  )
}
