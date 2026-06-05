import { useState } from 'react'
import './Ingredientes.css'

const UNIDADES = ['kg', 'g', 'l', 'ml', 'unid.']

const INGREDIENTES_INICIALES = [
  { id: 1,  nombre: 'Aceitunas',     unidad: 'kg',    merma: 0,   costo: 13750 },
  { id: 2,  nombre: 'Aceto',         unidad: 'l',     merma: 0,   costo: 20000 },
  { id: 3,  nombre: 'Albahaca',      unidad: 'kg',    merma: 5,   costo: 10000 },
  { id: 4,  nombre: 'Anchoa',        unidad: 'kg',    merma: 0,   costo: 130000 },
  { id: 5,  nombre: 'Azul',          unidad: 'kg',    merma: 0,   costo: 31300 },
  { id: 6,  nombre: 'Cebolla',       unidad: 'kg',    merma: 10,  costo: 300 },
  { id: 7,  nombre: 'Harina',        unidad: 'kg',    merma: 0,   costo: 1700 },
  { id: 8,  nombre: 'Muzza',         unidad: 'kg',    merma: 0,   costo: 8800 },
  { id: 9,  nombre: 'Salsa',         unidad: 'kg',    merma: 0,   costo: 6200 },
  { id: 10, nombre: 'Jamón crudo',   unidad: 'kg',    merma: 5,   costo: 79000 },
  { id: 11, nombre: 'Cerveza',       unidad: 'l',     merma: 0,   costo: 4200 },
  { id: 12, nombre: 'Caja',          unidad: 'unid.', merma: 0,   costo: 0 },
]

const fmt = (n) => n > 0 ? `$${n.toLocaleString('es-AR')}` : '—'

export default function Ingredientes() {
  const [ingredientes, setIngredientes]           = useState(INGREDIENTES_INICIALES)
  const [selected, setSelected]                   = useState(null)
  const [busqueda, setBusqueda]                   = useState('')
  const [editando, setEditando]                   = useState(null)
  const [creando, setCreando]                     = useState(false)
  const [nuevo, setNuevo]                         = useState({ nombre: '', unidad: 'kg', merma: 0, costo: '' })
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [nextId, setNextId]                       = useState(13)

  const filtrados  = ingredientes.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  const ingrediente = ingredientes.find(i => i.id === selected)

  const guardarEdicion = () => {
    if (!editando.nombre.trim()) return
    setIngredientes(ingredientes.map(i => i.id === editando.id
      ? { ...editando, merma: Number(editando.merma), costo: Number(editando.costo) }
      : i
    ))
    setEditando(null)
  }

  const crearIngrediente = () => {
    if (!nuevo.nombre.trim()) return
    setIngredientes([...ingredientes, {
      id: nextId,
      nombre: nuevo.nombre.trim(),
      unidad: nuevo.unidad,
      merma: Number(nuevo.merma) || 0,
      costo: Number(nuevo.costo) || 0,
    }])
    setNextId(nextId + 1)
    setCreando(false)
    setNuevo({ nombre: '', unidad: 'kg', merma: 0, costo: '' })
  }

  const eliminarIngrediente = (id) => {
    setIngredientes(ingredientes.filter(i => i.id !== id))
    setSelected(null)
    setConfirmarEliminar(null)
  }

  return (
    <div className="ing-layout">

      {/* Tabla */}
      <div className="ing-main">
        <div className="ing-toolbar">
          <input
            className="ing-search"
            type="text"
            placeholder="Buscar ingrediente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <button className="ing-btn-primary" onClick={() => setCreando(true)}>+ Nuevo ingrediente</button>
        </div>

        <div className="ing-table-wrap">
          <table className="ing-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Unidad</th>
                <th>Merma %</th>
                <th style={{ textAlign: 'right' }}>Costo / unidad</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={4} className="ing-table-empty">No se encontraron ingredientes</td></tr>
              ) : filtrados.map(i => (
                <tr
                  key={i.id}
                  className={selected === i.id ? 'ing-row--active' : ''}
                  onClick={() => setSelected(selected === i.id ? null : i.id)}
                >
                  <td className="ing-nombre">{i.nombre}</td>
                  <td>{i.unidad}</td>
                  <td>{i.merma > 0 ? `${i.merma}%` : '—'}</td>
                  <td className="ing-costo">{fmt(i.costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel detalle */}
      <div className="ing-detalle">
        {!ingrediente ? (
          <div className="ing-detalle-empty">
            <span>🧂</span>
            <p>Seleccioná un ingrediente</p>
            <span>para ver sus detalles</span>
          </div>
        ) : (
          <div className="ing-detalle-content">
            <div className="ing-detalle-header">
              <h3 className="ing-detalle-nombre">{ingrediente.nombre}</h3>
              <span className="ing-detalle-unidad">{ingrediente.unidad}</span>
            </div>

            <div className="ing-detalle-metrics">
              <div className="ing-metric">
                <span>Costo por {ingrediente.unidad}</span>
                <strong>{fmt(ingrediente.costo)}</strong>
              </div>
              <div className="ing-metric">
                <span>Merma</span>
                <strong>{ingrediente.merma > 0 ? `${ingrediente.merma}%` : '—'}</strong>
              </div>
              {ingrediente.merma > 0 && ingrediente.costo > 0 && (
                <div className="ing-metric">
                  <span>Costo real (con merma)</span>
                  <strong className="ing-costo-real">
                    ${Math.round(ingrediente.costo / (1 - ingrediente.merma / 100)).toLocaleString('es-AR')}
                  </strong>
                </div>
              )}
            </div>

            <div className="ing-detalle-actions">
              <button className="ing-btn-primary" style={{ width: '100%' }} onClick={() => setEditando({ ...ingrediente })}>Editar</button>
              <button className="ing-btn-danger" onClick={() => setConfirmarEliminar(ingrediente.id)}>Eliminar</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo ingrediente */}
      {creando && (
        <div className="ing-modal-overlay" onClick={() => { setCreando(false); setNuevo({ nombre: '', unidad: 'kg', merma: 0, costo: '' }) }}>
          <div className="ing-modal" onClick={e => e.stopPropagation()}>
            <h3 className="ing-modal-title">Nuevo ingrediente</h3>
            <div className="ing-form">
              <div className="ing-field">
                <label>Nombre</label>
                <input type="text" placeholder="Ej: Tomate" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} autoFocus />
              </div>
              <div className="ing-form-row">
                <div className="ing-field">
                  <label>Unidad</label>
                  <select value={nuevo.unidad} onChange={e => setNuevo({ ...nuevo, unidad: e.target.value })}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="ing-field">
                  <label>Merma %</label>
                  <input type="number" min="0" max="100" placeholder="0" value={nuevo.merma} onChange={e => setNuevo({ ...nuevo, merma: e.target.value })} />
                </div>
              </div>
              <div className="ing-field">
                <label>Costo por unidad</label>
                <input type="number" placeholder="0" value={nuevo.costo} onChange={e => setNuevo({ ...nuevo, costo: e.target.value })} />
              </div>
            </div>
            <div className="ing-modal-actions">
              <button className="ing-btn-secondary" onClick={() => { setCreando(false); setNuevo({ nombre: '', unidad: 'kg', merma: 0, costo: '' }) }}>Cancelar</button>
              <button className="ing-btn-primary" onClick={crearIngrediente} disabled={!nuevo.nombre.trim()}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="ing-modal-overlay" onClick={() => setEditando(null)}>
          <div className="ing-modal" onClick={e => e.stopPropagation()}>
            <h3 className="ing-modal-title">Editar ingrediente</h3>
            <div className="ing-form">
              <div className="ing-field">
                <label>Nombre</label>
                <input type="text" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} autoFocus />
              </div>
              <div className="ing-form-row">
                <div className="ing-field">
                  <label>Unidad</label>
                  <select value={editando.unidad} onChange={e => setEditando({ ...editando, unidad: e.target.value })}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="ing-field">
                  <label>Merma %</label>
                  <input type="number" min="0" max="100" value={editando.merma} onChange={e => setEditando({ ...editando, merma: e.target.value })} />
                </div>
              </div>
              <div className="ing-field">
                <label>Costo por unidad</label>
                <input type="number" value={editando.costo} onChange={e => setEditando({ ...editando, costo: e.target.value })} />
              </div>
            </div>
            <div className="ing-modal-actions">
              <button className="ing-btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="ing-btn-primary" onClick={guardarEdicion}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar !== null && (
        <div className="ing-modal-overlay" onClick={() => setConfirmarEliminar(null)}>
          <div className="ing-modal" onClick={e => e.stopPropagation()}>
            <h3 className="ing-modal-title">¿Eliminar ingrediente?</h3>
            <p className="ing-modal-sub">Vas a eliminar <strong>{ingredientes.find(i => i.id === confirmarEliminar)?.nombre}</strong>. Esta acción no se puede deshacer.</p>
            <div className="ing-modal-actions">
              <button className="ing-btn-secondary" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
              <button className="ing-btn-confirm-danger" onClick={() => eliminarIngrediente(confirmarEliminar)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
