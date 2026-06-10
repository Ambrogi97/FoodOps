import { useState, useEffect, useCallback } from 'react'
import { stockService } from '../../services/api'
import { Package } from 'lucide-react'
import './Stock.css'

const hoyInput = () => new Date().toISOString().split('T')[0]
const inputAFecha = (v) => { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}` }
const fmt = (n) => n.toLocaleString('es-AR')
const fmtCosto = (n) => n > 0 ? `$${n.toLocaleString('es-AR')}` : '—'

const estadoStock = (actual, minimo) => {
  if (actual <= 0)           return 'critico'
  if (actual <= minimo)      return 'alerta'
  return 'ok'
}

const ESTADO_CONFIG = {
  ok:      { label: 'OK',      color: '#22c55e', bg: '#f0fdf4' },
  alerta:  { label: 'Alerta',  color: '#eab308', bg: '#fefce8' },
  critico: { label: 'Crítico', color: '#ef4444', bg: '#fef2f2' },
}

const NUEVO_MOV = { tipo: 'entrada', cantidad: '', descripcion: '', fecha: hoyInput() }

export default function Stock() {
  const [ingredientes, setIngredientes]       = useState([])
  const [cargando, setCargando]               = useState(true)
  const [selected, setSelected]               = useState(null)
  const [busqueda, setBusqueda]               = useState('')
  const [movimientos, setMovimientos]         = useState([])
  const [cargandoMov, setCargandoMov]         = useState(false)
  const [showMovModal, setShowMovModal]       = useState(false)
  const [nuevoMov, setNuevoMov]               = useState(NUEVO_MOV)
  const [editandoMinimo, setEditandoMinimo]   = useState(false)
  const [valorMinimo, setValorMinimo]         = useState('')
  const [editandoUnidad, setEditandoUnidad]   = useState(false)
  const [valorUnidad, setValorUnidad]         = useState('')
  const [filtroEstado, setFiltroEstado]       = useState('todos')

  useEffect(() => {
    stockService.listar()
      .then(data => { setIngredientes(data); setCargando(false) })
      .catch(e => { console.error(e); setCargando(false) })
  }, [])

  const cargarMovimientos = useCallback(async (id) => {
    setCargandoMov(true)
    try {
      const data = await stockService.listarMovimientos(id)
      setMovimientos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargandoMov(false)
    }
  }, [])

  const seleccionar = (id) => {
    if (selected === id) { setSelected(null); setMovimientos([]); return }
    setSelected(id)
    setEditandoMinimo(false)
    setEditandoUnidad(false)
    cargarMovimientos(id)
  }

  const registrarMovimiento = async () => {
    if (!nuevoMov.cantidad || Number(nuevoMov.cantidad) <= 0) return
    try {
      const res = await stockService.registrarMovimiento(selected, {
        tipo:        nuevoMov.tipo,
        cantidad:    Number(nuevoMov.cantidad),
        descripcion: nuevoMov.descripcion.trim(),
        fecha:       inputAFecha(nuevoMov.fecha),
      })
      setIngredientes(prev => prev.map(i => i.id === selected
        ? { ...i, stockActual: res.ingrediente.stockActual }
        : i
      ))
      setMovimientos(prev => [res.movimiento, ...prev])
      setShowMovModal(false)
      setNuevoMov(NUEVO_MOV)
    } catch (e) {
      console.error(e)
    }
  }

  const guardarUnidad = async () => {
    if (!valorUnidad.trim()) return
    try {
      const res = await stockService.actualizarUnidad(selected, valorUnidad.trim())
      setIngredientes(prev => prev.map(i => i.id === selected ? { ...i, unidad: res.unidad } : i))
      setEditandoUnidad(false)
    } catch (e) {
      console.error(e)
    }
  }

  const guardarMinimo = async () => {
    try {
      const res = await stockService.actualizarMinimo(selected, Number(valorMinimo) || 0)
      setIngredientes(prev => prev.map(i => i.id === selected
        ? { ...i, stockMinimo: res.stockMinimo }
        : i
      ))
      setEditandoMinimo(false)
    } catch (e) {
      console.error(e)
    }
  }

  const ingrediente = ingredientes.find(i => i.id === selected)

  const filtrados = ingredientes.filter(i => {
    const matchBusq   = i.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const estado      = estadoStock(i.stockActual, i.stockMinimo)
    const matchEstado = filtroEstado === 'todos' || estado === filtroEstado
    return matchBusq && matchEstado
  })

  const resumen = {
    ok:      ingredientes.filter(i => estadoStock(i.stockActual, i.stockMinimo) === 'ok').length,
    alerta:  ingredientes.filter(i => estadoStock(i.stockActual, i.stockMinimo) === 'alerta').length,
    critico: ingredientes.filter(i => estadoStock(i.stockActual, i.stockMinimo) === 'critico').length,
  }

  if (cargando) return (
    <div className="stock-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Cargando...
    </div>
  )

  return (
    <div className="stock-layout">

      {/* Izquierda */}
      <div className="stock-main">

        {/* Resumen */}
        <div className="stock-resumen">
          {['todos', 'ok', 'alerta', 'critico'].map(e => (
            <button
              key={e}
              className={`stock-resumen-btn ${filtroEstado === e ? 'stock-resumen-btn--active' : ''}`}
              style={filtroEstado === e && e !== 'todos' ? { borderColor: ESTADO_CONFIG[e]?.color, color: ESTADO_CONFIG[e]?.color } : {}}
              onClick={() => setFiltroEstado(e)}
            >
              {e === 'todos' ? (
                <>Todos <span className="stock-resumen-num">{ingredientes.length}</span></>
              ) : (
                <>
                  <span className="stock-resumen-dot" style={{ background: ESTADO_CONFIG[e].color }} />
                  {ESTADO_CONFIG[e].label} <span className="stock-resumen-num">{resumen[e]}</span>
                </>
              )}
            </button>
          ))}

          <div className="stock-resumen-sep" />

          <input
            className="stock-search"
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* Tabla */}
        <div className="stock-table-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Stock actual</th>
                <th style={{ textAlign: 'right' }}>Mínimo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="stock-table-empty">No hay ingredientes</td></tr>
              ) : filtrados.map(i => {
                const estado = estadoStock(i.stockActual, i.stockMinimo)
                const cfg    = ESTADO_CONFIG[estado]
                return (
                  <tr
                    key={i.id}
                    className={selected === i.id ? 'stock-row--active' : ''}
                    onClick={() => seleccionar(i.id)}
                  >
                    <td className="stock-nombre">{i.nombre}</td>
                    <td className="stock-unidad">{i.unidad}</td>
                    <td className="stock-cantidad" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(i.stockActual)}</td>
                    <td className="stock-minimo" style={{ textAlign: 'right', color: '#94a3b8' }}>{fmt(i.stockMinimo)}</td>
                    <td>
                      <span className="stock-estado-badge" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Derecha — panel detalle */}
      <div className="stock-panel">
        {!ingrediente ? (
          <div className="stock-panel-empty">
            <span><Package size={36} /></span>
            <p>Seleccioná un ingrediente</p>
            <span>para ver su stock y movimientos</span>
          </div>
        ) : (
          <div className="stock-panel-content">

            {/* Header */}
            <div className="stock-panel-header">
              <h3 className="stock-panel-nombre">{ingrediente.nombre}</h3>
              {editandoUnidad ? (
                <div className="stock-unidad-edit">
                  <input
                    className="stock-unidad-input"
                    value={valorUnidad}
                    onChange={e => setValorUnidad(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') guardarUnidad(); if (e.key === 'Escape') setEditandoUnidad(false) }}
                    autoFocus
                    maxLength={10}
                  />
                  <button className="stock-btn-save" onClick={guardarUnidad}>✓</button>
                  <button className="stock-btn-cancel" onClick={() => setEditandoUnidad(false)}>×</button>
                </div>
              ) : (
                <span
                  className="stock-panel-unidad stock-panel-unidad--editable"
                  onClick={() => { setEditandoUnidad(true); setValorUnidad(ingrediente.unidad) }}
                  title="Clic para editar unidad"
                >{ingrediente.unidad}</span>
              )}
            </div>

            {/* Métricas */}
            <div className="stock-panel-metrics">
              <div className="stock-metric">
                <span>Stock actual</span>
                <strong style={{ color: ESTADO_CONFIG[estadoStock(ingrediente.stockActual, ingrediente.stockMinimo)].color }}>
                  {fmt(ingrediente.stockActual)} {ingrediente.unidad}
                </strong>
              </div>
              <div className="stock-metric">
                <span>Costo unitario</span>
                <strong>{fmtCosto(ingrediente.costo)}</strong>
              </div>
              <div className="stock-metric">
                <span>Mínimo</span>
                {editandoMinimo ? (
                  <div className="stock-minimo-edit">
                    <input
                      type="number"
                      value={valorMinimo}
                      onChange={e => setValorMinimo(e.target.value)}
                      autoFocus
                      min="0"
                    />
                    <button className="stock-btn-save" onClick={guardarMinimo}>✓</button>
                    <button className="stock-btn-cancel" onClick={() => setEditandoMinimo(false)}>×</button>
                  </div>
                ) : (
                  <div className="stock-minimo-row">
                    <strong>{fmt(ingrediente.stockMinimo)} {ingrediente.unidad}</strong>
                    <button
                      className="stock-btn-edit-minimo"
                      onClick={() => { setEditandoMinimo(true); setValorMinimo(ingrediente.stockMinimo) }}
                    >Editar</button>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="stock-panel-actions">
              <button
                className="stock-btn-entrada"
                onClick={() => { setNuevoMov({ ...NUEVO_MOV, tipo: 'entrada' }); setShowMovModal(true) }}
              >+ Entrada</button>
              <button
                className="stock-btn-salida"
                onClick={() => { setNuevoMov({ ...NUEVO_MOV, tipo: 'salida' }); setShowMovModal(true) }}
              >− Salida</button>
            </div>

            {/* Historial */}
            <div className="stock-historial">
              <p className="stock-historial-title">Últimos movimientos</p>
              {cargandoMov ? (
                <p className="stock-historial-empty">Cargando...</p>
              ) : movimientos.length === 0 ? (
                <p className="stock-historial-empty">Sin movimientos registrados</p>
              ) : (
                <div className="stock-historial-list">
                  {movimientos.map((m, i) => (
                    <div key={i} className="stock-mov-item">
                      <span
                        className="stock-mov-tipo"
                        style={{ color: m.tipo === 'entrada' ? '#22c55e' : '#ef4444' }}
                      >
                        {m.tipo === 'entrada' ? '+' : '−'}{fmt(m.cantidad)}
                      </span>
                      <div className="stock-mov-info">
                        <span className="stock-mov-desc">{m.descripcion || (m.tipo === 'entrada' ? 'Entrada de stock' : 'Salida de stock')}</span>
                        <span className="stock-mov-fecha">{m.fecha}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modal registrar movimiento */}
      {showMovModal && (
        <div className="stock-modal-overlay" onClick={() => { setShowMovModal(false); setNuevoMov(NUEVO_MOV) }}>
          <div className="stock-modal" onClick={e => e.stopPropagation()}>
            <h3 className="stock-modal-title">
              {nuevoMov.tipo === 'entrada' ? '+ Entrada de stock' : '− Salida de stock'} — {ingrediente?.nombre}
            </h3>

            <div className="stock-mov-tipos">
              <button
                className={`stock-tipo-btn stock-tipo-btn--entrada ${nuevoMov.tipo === 'entrada' ? 'stock-tipo-btn--active' : ''}`}
                onClick={() => setNuevoMov({ ...nuevoMov, tipo: 'entrada' })}
              >Entrada</button>
              <button
                className={`stock-tipo-btn stock-tipo-btn--salida ${nuevoMov.tipo === 'salida' ? 'stock-tipo-btn--active' : ''}`}
                onClick={() => setNuevoMov({ ...nuevoMov, tipo: 'salida' })}
              >Salida</button>
            </div>

            <div className="stock-form">
              <div className="stock-field">
                <label>Cantidad ({ingrediente?.unidad})</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={nuevoMov.cantidad}
                  onChange={e => setNuevoMov({ ...nuevoMov, cantidad: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="stock-field">
                <label>Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Compra semanal"
                  value={nuevoMov.descripcion}
                  onChange={e => setNuevoMov({ ...nuevoMov, descripcion: e.target.value })}
                />
              </div>
              <div className="stock-field">
                <label>Fecha</label>
                <input
                  type="date"
                  value={nuevoMov.fecha}
                  onChange={e => setNuevoMov({ ...nuevoMov, fecha: e.target.value })}
                />
              </div>
            </div>

            <div className="stock-modal-actions">
              <button className="stock-btn-secondary" onClick={() => { setShowMovModal(false); setNuevoMov(NUEVO_MOV) }}>Cancelar</button>
              <button
                className={nuevoMov.tipo === 'entrada' ? 'stock-btn-entrada' : 'stock-btn-salida'}
                onClick={registrarMovimiento}
                disabled={!nuevoMov.cantidad || Number(nuevoMov.cantidad) <= 0}
              >Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
