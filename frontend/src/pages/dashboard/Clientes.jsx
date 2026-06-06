import { useState, useEffect } from 'react'
import { clientesService } from '../../services/api'
import './Clientes.css'

const VACIO = { nombre: '', telefono: '', email: '', notas: '' }

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

  const abrirEditar = () => { setForm({ nombre: cliente.nombre, telefono: cliente.telefono, email: cliente.email, notas: cliente.notas }); setEditando(cliente.id) }

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
    <div className="cli-layout" style={{ alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Cargando...
    </div>
  )

  return (
    <div className="cli-layout">
      <div className="cli-body">

        {/* Sidebar */}
        <aside className="cli-sidebar">
          <div className="cli-sidebar-top">
            <input
              className="cli-search"
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <button className="cli-btn-nuevo" onClick={abrirCrear}>+ Nuevo cliente</button>
          </div>

          <div className="cli-list">
            {filtrados.length === 0 ? (
              <p className="cli-list-empty">
                {busqueda ? 'Sin resultados' : 'No hay clientes todavía'}
              </p>
            ) : (
              filtrados.map(c => (
                <button
                  key={c.id}
                  className={`cli-card ${selected === c.id ? 'cli-card--active' : ''}`}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                >
                  <span className="cli-card-nombre">{c.nombre}</span>
                  <span className="cli-card-sub">
                    {c.telefono || c.email || 'Sin contacto'}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Panel derecho */}
        <div className="cli-panel">
          {!cliente ? (
            <div className="cli-panel-empty">
              <span>👥</span>
              <p>Seleccioná un cliente</p>
              <span>para ver sus datos</span>
            </div>
          ) : (
            <>
              <div className="cli-detalle-header">
                <h2 className="cli-detalle-nombre">{cliente.nombre}</h2>
                <div className="cli-detalle-actions">
                  <button className="cli-btn-primary" onClick={abrirEditar}>Editar</button>
                  <button className="cli-btn-danger" onClick={() => setConfirmarEliminar(cliente.id)}>Eliminar</button>
                </div>
              </div>

              <div className="cli-fields">
                <div className="cli-field">
                  <span className="cli-field-label">Teléfono</span>
                  {cliente.telefono
                    ? <span className="cli-field-value">{cliente.telefono}</span>
                    : <span className="cli-field-value cli-field-value--muted">No registrado</span>
                  }
                </div>

                <div className="cli-field">
                  <span className="cli-field-label">Email</span>
                  {cliente.email
                    ? <span className="cli-field-value">{cliente.email}</span>
                    : <span className="cli-field-value cli-field-value--muted">No registrado</span>
                  }
                </div>

                <div className="cli-field">
                  <span className="cli-field-label">Notas</span>
                  {cliente.notas
                    ? <div className="cli-notas">{cliente.notas}</div>
                    : <span className="cli-field-value cli-field-value--muted">Sin notas</span>
                  }
                </div>
              </div>
            </>
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
      <div className="cli-form-field">
        <label>Teléfono</label>
        <input type="text" value={form.telefono} onChange={set('telefono')} placeholder="Ej: 11 1234-5678" />
      </div>
      <div className="cli-form-field">
        <label>Email</label>
        <input type="email" value={form.email} onChange={set('email')} placeholder="Ej: maria@mail.com" />
      </div>
      <div className="cli-form-field">
        <label>Notas</label>
        <textarea value={form.notas} onChange={set('notas')} placeholder="Ej: Alérgica al maní, prefiere mesa en terraza..." />
      </div>
    </div>
  )
}
