import { useState, useEffect } from 'react'
import { gastosService } from '../../services/api'
import { Calculator } from 'lucide-react'
import './Gastos.css'

const PERIODOS = ['Hoy', 'Esta semana', 'Este mes']

const CATEGORIAS = [
  { id: 'ingredientes',  label: 'Ingredientes',  color: '#22c55e' },
  { id: 'bebidas',       label: 'Bebidas',        color: '#3b82f6' },
  { id: 'servicios',     label: 'Servicios',      color: '#f97316' },
  { id: 'sueldos',       label: 'Sueldos',        color: '#8b5cf6' },
  { id: 'alquiler',      label: 'Alquiler',       color: '#ef4444' },
  { id: 'mantenimiento', label: 'Mantenimiento',  color: '#eab308' },
  { id: 'otro',          label: 'Otro',           color: '#94a3b8' },
]

const catConfig = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]))

const fmt       = (n) => `$${n.toLocaleString('es-AR')}`
const hoyInput  = () => new Date().toISOString().split('T')[0]            // "YYYY-MM-DD"
const inputAFecha = (v) => {                                              // "YYYY-MM-DD" → "DD/MM/YYYY"
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}
const fechaAInput = (v) => {                                              // "DD/MM/YYYY" → "YYYY-MM-DD"
  const [d, m, y] = v.split('/')
  return `${y}-${m}-${d}`
}

const hoyStr = () => {
  const d = new Date()
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

const filtrarPorPeriodo = (gastos, periodo) => {
  const hoy = hoyStr()
  return gastos.filter(g => {
    const [dia, mes, anio]     = g.fecha.split('/')
    const [diaH, mesH, anioH]  = hoy.split('/')
    if (periodo === 'Hoy') return dia === diaH && mes === mesH && anio === anioH
    if (periodo === 'Esta semana') {
      const diff = (new Date() - new Date(anio, mes - 1, dia)) / (1000 * 60 * 60 * 24)
      return diff < 7
    }
    if (periodo === 'Este mes') return mes === mesH && anio === anioH
    return true
  })
}

const NUEVO_VACIO = { descripcion: '', monto: '', categoria: 'ingredientes', fecha: hoyInput() }

export default function Gastos() {
  const [gastos, setGastos]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo]   = useState('Este mes')
  const [creando, setCreando]   = useState(false)
  const [nuevo, setNuevo]       = useState(NUEVO_VACIO)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)

  useEffect(() => {
    gastosService.listar()
      .then(data => { setGastos(data); setCargando(false) })
      .catch(e => { console.error(e); setCargando(false) })
  }, [])

  const gastosFiltrados = filtrarPorPeriodo(gastos, periodo)
  const totalPeriodo    = gastosFiltrados.reduce((acc, g) => acc + g.monto, 0)

  const porCategoria = CATEGORIAS.map(c => ({
    ...c,
    total: gastosFiltrados.filter(g => g.categoria === c.id).reduce((acc, g) => acc + g.monto, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const crearGasto = async () => {
    if (!nuevo.descripcion.trim() || !nuevo.monto) return
    try {
      const creado = await gastosService.crear({
        descripcion: nuevo.descripcion.trim(),
        monto:       Number(nuevo.monto),
        categoria:   nuevo.categoria,
        fecha:       inputAFecha(nuevo.fecha),
      })
      setGastos([creado, ...gastos])
      setCreando(false)
      setNuevo(NUEVO_VACIO)
    } catch (e) {
      console.error(e)
    }
  }

  const eliminarGasto = async (id) => {
    try {
      await gastosService.eliminar(id)
      setGastos(gastos.filter(g => g.id !== id))
      setConfirmarEliminar(null)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="gastos-layout">

      {/* Izquierda */}
      <div className="gastos-main">

        {/* Toolbar */}
        <div className="gastos-toolbar">
          <div className="gastos-periodo">
            {PERIODOS.map(p => (
              <button
                key={p}
                className={`gastos-periodo-btn ${periodo === p ? 'gastos-periodo-btn--active' : ''}`}
                onClick={() => setPeriodo(p)}
              >{p}</button>
            ))}
          </div>
          <button className="gastos-btn-primary" onClick={() => setCreando(true)}>+ Nuevo gasto</button>
        </div>

        {/* Tabla */}
        <div className="gastos-table-wrap">
          {cargando ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Cargando...</p>
          ) : (
            <table className="gastos-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.length === 0 ? (
                  <tr><td colSpan={5} className="gastos-table-empty">No hay gastos en este período</td></tr>
                ) : gastosFiltrados.map(g => (
                  <tr key={g.id}>
                    <td className="gastos-desc">{g.descripcion}</td>
                    <td>
                      <span
                        className="gastos-cat-badge"
                        style={{ background: catConfig[g.categoria]?.color + '20', color: catConfig[g.categoria]?.color }}
                      >
                        {catConfig[g.categoria]?.label ?? g.categoria}
                      </span>
                    </td>
                    <td className="gastos-fecha">{g.fecha}</td>
                    <td className="gastos-monto">{fmt(g.monto)}</td>
                    <td>
                      <button className="gastos-btn-eliminar" onClick={() => setConfirmarEliminar(g)} title="Eliminar">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Derecha — resumen */}
      <div className="gastos-panel">
        <div className="gastos-panel-total">
          <span>Total {periodo.toLowerCase()}</span>
          <strong>{fmt(totalPeriodo)}</strong>
        </div>

        {porCategoria.length > 0 && (
          <div className="gastos-panel-cats">
            <p className="gastos-panel-subtitle">Por categoría</p>
            {porCategoria.map(c => (
              <div key={c.id} className="gastos-cat-row">
                <div className="gastos-cat-info">
                  <span className="gastos-cat-dot" style={{ background: c.color }} />
                  <span className="gastos-cat-label">{c.label}</span>
                </div>
                <div className="gastos-cat-right">
                  <span className="gastos-cat-monto">{fmt(c.total)}</span>
                  <span className="gastos-cat-pct">
                    {totalPeriodo > 0 ? Math.round((c.total / totalPeriodo) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {gastosFiltrados.length === 0 && !cargando && (
          <div className="gastos-panel-empty">
            <span><Calculator size={36} /></span>
            <p>Sin gastos</p>
            <span>en este período</span>
          </div>
        )}
      </div>

      {/* Modal nuevo gasto */}
      {creando && (
        <div className="gastos-modal-overlay" onClick={() => { setCreando(false); setNuevo(NUEVO_VACIO) }}>
          <div className="gastos-modal" onClick={e => e.stopPropagation()}>
            <h3 className="gastos-modal-title">Nuevo gasto</h3>
            <div className="gastos-form">
              <div className="gastos-field">
                <label>Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Compra de harina"
                  value={nuevo.descripcion}
                  onChange={e => setNuevo({ ...nuevo, descripcion: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="gastos-form-row">
                <div className="gastos-field">
                  <label>Monto</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={nuevo.monto}
                    onChange={e => setNuevo({ ...nuevo, monto: e.target.value })}
                  />
                </div>
                <div className="gastos-field">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={nuevo.fecha}
                    onChange={e => setNuevo({ ...nuevo, fecha: e.target.value })}
                  />
                </div>
              </div>
              <div className="gastos-field">
                <label>Categoría</label>
                <select
                  value={nuevo.categoria}
                  onChange={e => setNuevo({ ...nuevo, categoria: e.target.value })}
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="gastos-modal-actions">
              <button className="gastos-btn-secondary" onClick={() => { setCreando(false); setNuevo(NUEVO_VACIO) }}>Cancelar</button>
              <button
                className="gastos-btn-primary"
                onClick={crearGasto}
                disabled={!nuevo.descripcion.trim() || !nuevo.monto}
              >Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (
        <div className="gastos-modal-overlay" onClick={() => setConfirmarEliminar(null)}>
          <div className="gastos-modal" onClick={e => e.stopPropagation()}>
            <h3 className="gastos-modal-title">¿Eliminar gasto?</h3>
            <p className="gastos-modal-sub">Vas a eliminar <strong>{confirmarEliminar.descripcion}</strong> por <strong>{fmt(confirmarEliminar.monto)}</strong>. Esta acción no se puede deshacer.</p>
            <div className="gastos-modal-actions">
              <button className="gastos-btn-secondary" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
              <button className="gastos-btn-confirm-danger" onClick={() => eliminarGasto(confirmarEliminar.id)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
