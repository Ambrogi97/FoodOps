import { useState, useEffect } from 'react'
import { ingredientesService } from '../../services/api'
import { FlaskConical } from 'lucide-react'
import './Ingredientes.css'

const UNIDADES = ['kg', 'g', 'l', 'ml', 'unid.']

const fmt = (n) => n > 0 ? `$${n.toLocaleString('es-AR')}` : '—'

export default function Ingredientes() {
  const [ingredientes, setIngredientes]           = useState([])
  const [cargando, setCargando]                   = useState(true)
  const [selected, setSelected]                   = useState(null)
  const [busqueda, setBusqueda]                   = useState('')
  const [editando, setEditando]                   = useState(null)
  const [creando, setCreando]                     = useState(false)
  const [nuevo, setNuevo]                         = useState({ nombre: '', unidad: 'kg', costo: '', stockActual: '' })
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)

  useEffect(() => {
    ingredientesService.listar()
      .then(data => { setIngredientes(data); setCargando(false) })
      .catch(e => { console.error(e); setCargando(false) })
  }, [])

  const filtrados   = ingredientes.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  const ingrediente = ingredientes.find(i => i.id === selected)

  const guardarEdicion = async () => {
    if (!editando.nombre.trim()) return
    try {
      const actualizado = await ingredientesService.actualizar(editando.id, {
        nombre: editando.nombre.trim(),
        unidad: editando.unidad,
        costo:  Number(editando.costo) || 0,
      })
      setIngredientes(ingredientes.map(i => i.id === editando.id ? actualizado : i))
      setEditando(null)
    } catch (e) {
      console.error(e)
    }
  }

  const crearIngrediente = async () => {
    if (!nuevo.nombre.trim()) return
    try {
      const creado = await ingredientesService.crear({
        nombre:      nuevo.nombre.trim(),
        unidad:      nuevo.unidad,
        costo:       Number(nuevo.costo)       || 0,
        stockActual: Number(nuevo.stockActual) || 0,
      })
      setIngredientes([...ingredientes, creado])
      setCreando(false)
      setNuevo({ nombre: '', unidad: 'kg', costo: '', stockActual: '' })
    } catch (e) {
      console.error(e)
    }
  }

  const eliminarIngrediente = async (id) => {
    try {
      await ingredientesService.eliminar(id)
      setIngredientes(ingredientes.filter(i => i.id !== id))
      setSelected(null)
      setConfirmarEliminar(null)
    } catch (e) {
      console.error(e)
    }
  }

  if (cargando) return <div className="ing-layout"><div className="ing-main" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Cargando...</div></div>

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
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>Costo / unidad</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={3} className="ing-table-empty">No se encontraron ingredientes</td></tr>
              ) : filtrados.map(i => (
                <tr
                  key={i.id}
                  className={selected === i.id ? 'ing-row--active' : ''}
                  onClick={() => setSelected(selected === i.id ? null : i.id)}
                >
                  <td className="ing-nombre">{i.nombre}</td>
                  <td>{i.unidad}</td>
                  <td className="ing-costo" style={{ textAlign: 'right' }}>{i.stockActual.toLocaleString('es-AR')}</td>
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
            <span><FlaskConical size={36} /></span>
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
                <span>Stock actual</span>
                <strong>{ingrediente.stockActual.toLocaleString('es-AR')} {ingrediente.unidad}</strong>
              </div>
              <div className="ing-metric">
                <span>Costo por {ingrediente.unidad}</span>
                <strong>{fmt(ingrediente.costo)}</strong>
              </div>
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
        <div className="ing-modal-overlay">
          <div className="ing-modal">
            <h3 className="ing-modal-title">Nuevo ingrediente</h3>
            <div className="ing-form">
              <div className="ing-field">
                <label>Nombre</label>
                <input type="text" placeholder="Ej: Tomate" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} autoFocus />
              </div>
              <div className="ing-field">
                <label>Unidad</label>
                <select value={nuevo.unidad} onChange={e => setNuevo({ ...nuevo, unidad: e.target.value })}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="ing-field">
                <label>Stock inicial</label>
                <input type="number" placeholder="0" value={nuevo.stockActual} onChange={e => setNuevo({ ...nuevo, stockActual: e.target.value })} />
              </div>
              <div className="ing-field">
                <label>Costo por unidad</label>
                <input type="number" placeholder="0" value={nuevo.costo} onChange={e => setNuevo({ ...nuevo, costo: e.target.value })} />
              </div>
            </div>
            <div className="ing-modal-actions">
              <button className="ing-btn-secondary" onClick={() => { setCreando(false); setNuevo({ nombre: '', unidad: 'kg', costo: '', stockActual: '' }) }}>Cancelar</button>
              <button className="ing-btn-primary" onClick={crearIngrediente} disabled={!nuevo.nombre.trim()}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="ing-modal-overlay">
          <div className="ing-modal">
            <h3 className="ing-modal-title">Editar ingrediente</h3>
            <div className="ing-form">
              <div className="ing-field">
                <label>Nombre</label>
                <input type="text" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} autoFocus />
              </div>
              <div className="ing-field">
                <label>Unidad</label>
                <select value={editando.unidad} onChange={e => setEditando({ ...editando, unidad: e.target.value })}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
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
