import { useState, useEffect } from 'react'
import { ventasService, descuentosService } from '../../services/api'
import { ChevronLeft, ChevronDown, ChevronUp, Search, Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import './Ventas.css'

// ── Utils ──────────────────────────────────────────────────────────────────
const fmt = n => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const totalVenta = v => v.items.reduce((a, i) => a + (i.precio || 0) * (i.cantidad || 0), 0)

const parseVentaDate = str => {
  if (!str) return null
  const [datePart] = str.split(' ')
  const [d, m, y] = datePart.split('/')
  return new Date(y, m - 1, d)
}

const fmtFechaCorta = d => {
  if (!d) return ''
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`
}

const calcRango = periodo => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy.getTime() + 86_400_000)
  if (periodo === 'hoy')    return { desde: hoy, hasta: manana }
  if (periodo === 'semana') { const d = new Date(hoy); d.setDate(d.getDate() - 6); return { desde: d, hasta: manana } }
  if (periodo === 'mes')    return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: manana }
  return { desde: null, hasta: null }
}

const METODOS = ['Efectivo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Transferencia', 'MercadoPago']

// ── Descuento helpers ──────────────────────────────────────────────────────
const fmtImporte = d => {
  if (d.tipo === 'porcentaje') return `${d.valor}%`
  if (d.tipo === 'fijo')       return fmt(d.valor)
  return '-'
}

const fmtFechaLarga = iso => {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMPTY_DESC = { nombre: '', tipo: 'sin_importe', valor: '', estado: 'activo' }

// ══════════════════════════════════════════════════════════════════════════════
// Tab Ventas
// ══════════════════════════════════════════════════════════════════════════════
function TabVentas({ ventas, cargando }) {
  const [periodo, setPeriodo]       = useState('hoy')
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [filtroMetodo, setFiltroMetodo]   = useState('')
  const [masInfo, setMasInfo]       = useState(false)
  const [selected, setSelected]     = useState(null)

  const { desde, hasta } = calcRango(periodo)

  const ventasFiltradas = ventas.filter(v => {
    const f = parseVentaDate(v.inicio)
    if (!f) return false
    if (desde && f < desde) return false
    if (hasta && f >= hasta) return false
    if (filtroEstado && v.estado !== filtroEstado) return false
    if (filtroMetodo && v.metodoPago !== filtroMetodo) return false
    return true
  })

  const total      = ventasFiltradas.reduce((a, v) => a + totalVenta(v), 0)
  const personas   = ventasFiltradas.reduce((a, v) => a + (v.personas || 1), 0)
  const promedio   = ventasFiltradas.length ? total / ventasFiltradas.length : 0
  const promPers   = personas ? total / personas : 0

  const byMetodo = ventasFiltradas.reduce((acc, v) => {
    const m = v.metodoPago || 'Efectivo'
    acc[m] = (acc[m] || 0) + totalVenta(v)
    return acc
  }, {})

  const ventaSel = selected ? ventas.find(v => v.id === selected) : null

  const metodosUnicos = [...new Set(ventas.map(v => v.metodoPago || 'Efectivo').filter(Boolean))]

  return (
    <div className="ventas-body">

      {/* ── Left panel ── */}
      <div className="ventas-left">

        {/* Filtros */}
        <div className="ventas-filtros">
          <div className="ventas-periodo-pills">
            {[['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes']].map(([v, l]) => (
              <button
                key={v}
                className={`ventas-pill${periodo === v ? ' ventas-pill--active' : ''}`}
                onClick={() => { setPeriodo(v); setSelected(null) }}
              >{l}</button>
            ))}
          </div>
          <div className="ventas-selects">
            <select className="ventas-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Estado de Venta</option>
              <option value="cerrada">Cerrada</option>
              <option value="en_curso">En curso</option>
            </select>
            <select className="ventas-select" value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)}>
              <option value="">Medio de pago</option>
              {metodosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="ventas-stats-bar">
          <div className="ventas-stats-rango">
            <span>Del {fmtFechaCorta(desde)} al {fmtFechaCorta(new Date(hasta?.getTime() - 1))}</span>
            <span className="ventas-stats-reg">{ventasFiltradas.length} registros</span>
          </div>
          <div className="ventas-stats-items">
            <div className="ventas-stats-item">
              <span>Ventas</span>
              <strong>{ventasFiltradas.length}</strong>
            </div>
            <div className="ventas-stats-sep" />
            <div className="ventas-stats-item">
              <span>Promedio por venta</span>
              <strong>{fmt(promedio)}</strong>
            </div>
            <div className="ventas-stats-sep" />
            <div className="ventas-stats-item">
              <span>Personas</span>
              <strong>{personas}</strong>
            </div>
            <div className="ventas-stats-sep" />
            <div className="ventas-stats-item">
              <span>Promedio por persona</span>
              <strong>{fmt(promPers)}</strong>
            </div>
            <div className="ventas-stats-sep" />
            <div className="ventas-stats-item ventas-stats-item--total">
              <span>Total</span>
              <strong>{fmt(total)}</strong>
            </div>
          </div>
        </div>

        {/* MÁS INFO */}
        <div className="ventas-masinfo">
          <button className="ventas-masinfo-toggle" onClick={() => setMasInfo(x => !x)}>
            MÁS INFO {masInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {masInfo && (
            <div className="ventas-masinfo-body">
              <div className="ventas-masinfo-section">
                <p className="ventas-masinfo-label">Medios de Pago</p>
                {Object.keys(byMetodo).length === 0 ? (
                  <p className="ventas-masinfo-empty">Sin datos</p>
                ) : Object.entries(byMetodo).map(([metodo, monto]) => (
                  <div key={metodo} className="ventas-masinfo-row">
                    <span>{metodo}</span>
                    <div className="ventas-masinfo-bar-wrap">
                      <div className="ventas-masinfo-bar" style={{ width: `${Math.round((monto / total) * 100)}%` }} />
                    </div>
                    <span className="ventas-masinfo-monto">{fmt(monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="ventas-table-wrap">
          {cargando ? (
            <p className="ventas-loading">Cargando...</p>
          ) : (
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hora Inicio</th>
                  <th>Hora Cierre</th>
                  <th>Estado</th>
                  <th>Mesa</th>
                  <th>Pago</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.length === 0 ? (
                  <tr><td colSpan={7} className="ventas-table-empty">No hay ventas en este período</td></tr>
                ) : ventasFiltradas.map(v => (
                  <tr
                    key={v.id}
                    className={`ventas-row ventas-row--${v.estado}${selected === v.id ? ' ventas-row--active' : ''}`}
                    onClick={() => setSelected(selected === v.id ? null : v.id)}
                  >
                    <td className="ventas-td-num">{v.numero ?? '-'}</td>
                    <td className="ventas-td-hora">{v.inicio?.split(' ')[1] ?? '-'}</td>
                    <td className="ventas-td-hora">{v.cierre?.split(' ')[1] ?? <span className="ventas-badge ventas-badge--curso">En curso</span>}</td>
                    <td>
                      <span className={`ventas-badge ventas-badge--${v.estado}`}>
                        {v.estado === 'cerrada' ? 'Cerrada' : 'En curso'}
                      </span>
                    </td>
                    <td className="ventas-td-mesa">{v.mesa}</td>
                    <td className="ventas-td-pago">{v.metodoPago || 'Efectivo'}</td>
                    <td className="ventas-td-total">{fmt(totalVenta(v))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="ventas-right">
        {!ventaSel ? (
          <div className="ventas-panel-empty">
            <ChevronLeft size={16} />
            <span>Seleccioná un ítem del listado</span>
          </div>
        ) : (
          <div className="ventas-panel">
            <div className="ventas-panel-header">
              <button className="ventas-panel-back" onClick={() => setSelected(null)}>
                <ChevronLeft size={16} />
              </button>
              <span className="ventas-panel-title">
                {ventaSel.numero ? `#${ventaSel.numero}` : ''} — {ventaSel.mesa}
              </span>
              <span className={`ventas-badge ventas-badge--${ventaSel.estado}`}>
                {ventaSel.estado === 'cerrada' ? 'Cerrada' : 'En curso'}
              </span>
            </div>

            <div className="ventas-panel-body">
              <div className="ventas-panel-meta">
                <div className="ventas-meta-row"><span>Inicio</span><strong>{ventaSel.inicio}</strong></div>
                <div className="ventas-meta-row"><span>Cierre</span><strong>{ventaSel.cierre || '-'}</strong></div>
                <div className="ventas-meta-row"><span>Personas</span><strong>{ventaSel.personas || 1}</strong></div>
                <div className="ventas-meta-row"><span>Medio de pago</span><strong>{ventaSel.metodoPago || 'Efectivo'}</strong></div>
              </div>

              <div className="ventas-panel-items">
                <p className="ventas-panel-section-title">Ítems</p>
                {ventaSel.items.length === 0 ? (
                  <p className="ventas-panel-empty-items">Sin ítems registrados</p>
                ) : ventaSel.items.map((it, i) => (
                  <div key={i} className="ventas-panel-item">
                    <span className="ventas-item-cant">{it.cantidad}×</span>
                    <span className="ventas-item-nombre">{it.nombre}</span>
                    <span className="ventas-item-precio">{fmt(it.precio * it.cantidad)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ventas-panel-footer">
              <span>Total</span>
              <strong>{fmt(totalVenta(ventaSel))}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Descuentos
// ══════════════════════════════════════════════════════════════════════════════
function TabDescuentos() {
  const [descuentos, setDescuentos]     = useState([])
  const [cargando, setCargando]         = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [selected, setSelected]         = useState(null)
  const [modo, setModo]                 = useState(null) // 'crear' | 'editar' | null
  const [form, setForm]                 = useState(EMPTY_DESC)
  const [guardando, setGuardando]       = useState(false)
  const [confirmElim, setConfirmElim]   = useState(false)

  const cargar = async () => {
    try {
      const data = await descuentosService.listar()
      setDescuentos(data)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = descuentos.filter(d => {
    if (busqueda && !d.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroEstado && d.estado !== filtroEstado) return false
    return true
  })

  const activos   = descuentos.filter(d => d.estado === 'activo').length
  const inactivos = descuentos.filter(d => d.estado === 'inactivo').length
  const totalVecesUsado  = descuentos.reduce((a, d) => a + d.vecesUsado, 0)
  const totalMontoUsado  = descuentos.reduce((a, d) => a + d.montoUsado, 0)

  const descSel = selected ? descuentos.find(d => d.id === selected) : null

  const abrirCrear = () => {
    setSelected(null)
    setForm(EMPTY_DESC)
    setModo('crear')
    setConfirmElim(false)
  }

  const abrirEditar = (d) => {
    setForm({ nombre: d.nombre, tipo: d.tipo, valor: d.valor ?? '', estado: d.estado })
    setModo('editar')
    setConfirmElim(false)
  }

  const cerrarPanel = () => {
    setModo(null)
    setSelected(null)
    setConfirmElim(false)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo:   form.tipo,
        valor:  form.tipo !== 'sin_importe' && form.valor !== '' ? Number(form.valor) : null,
        estado: form.estado,
      }
      if (modo === 'crear') {
        const nuevo = await descuentosService.crear(payload)
        setDescuentos(prev => [nuevo, ...prev])
        setSelected(nuevo.id)
        setModo(null)
      } else {
        const upd = await descuentosService.actualizar(selected, payload)
        setDescuentos(prev => prev.map(d => d.id === upd.id ? upd : d))
        setModo(null)
      }
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const eliminar = async () => {
    try {
      await descuentosService.eliminar(selected)
      setDescuentos(prev => prev.filter(d => d.id !== selected))
      cerrarPanel()
    } catch (e) { console.error(e) }
  }

  const mostrarForm = modo === 'crear' || modo === 'editar'

  return (
    <div className="ventas-body">

      {/* ── Left panel ── */}
      <div className="ventas-left">

        {/* Toolbar */}
        <div className="desc-toolbar">
          <div className="desc-search-wrap">
            <Search size={14} className="desc-search-icon" />
            <input
              className="desc-search"
              placeholder="Buscar descuento..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <select className="ventas-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <button className="desc-btn-nuevo" onClick={abrirCrear}>
            <Plus size={14} /> Nuevo descuento
          </button>
        </div>

        {/* Stats */}
        <div className="desc-stats">
          <div className="desc-stat">
            <span className="desc-stat-icon desc-stat-icon--green">✓</span>
            <div><strong>{activos}</strong><span>Activo{activos !== 1 ? 's' : ''}</span></div>
          </div>
          <div className="desc-stat-sep" />
          <div className="desc-stat">
            <span className="desc-stat-icon desc-stat-icon--gray">✕</span>
            <div><strong>{inactivos}</strong><span>Inactivo{inactivos !== 1 ? 's' : ''}</span></div>
          </div>
          <div className="desc-stat-sep" />
          <div className="desc-stat">
            <div><strong>{totalVecesUsado}</strong><span>Descuentos aplicados</span></div>
          </div>
          <div className="desc-stat-sep" />
          <div className="desc-stat">
            <div><strong>{fmt(totalMontoUsado)}</strong><span>Total descontado</span></div>
          </div>
        </div>

        {/* Tabla */}
        <div className="ventas-table-wrap">
          {cargando ? (
            <p className="ventas-loading">Cargando...</p>
          ) : (
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>Veces usado</th>
                  <th style={{ textAlign: 'right' }}>Monto usado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="ventas-table-empty">
                    {busqueda ? 'Sin resultados para la búsqueda' : 'No hay descuentos creados'}
                  </td></tr>
                ) : filtrados.map(d => (
                  <tr
                    key={d.id}
                    className={`ventas-row${selected === d.id ? ' ventas-row--active' : ''}`}
                    onClick={() => { setSelected(d.id === selected ? null : d.id); setModo(null); setConfirmElim(false) }}
                  >
                    <td className="ventas-td-mesa">{d.nombre}</td>
                    <td className="ventas-td-hora">{fmtImporte(d)}</td>
                    <td>
                      <span className={`ventas-badge ventas-badge--${d.estado === 'activo' ? 'cerrada' : 'curso'}`}>
                        {d.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="ventas-td-hora">{d.vecesUsado}</td>
                    <td className="ventas-td-total">{fmt(d.montoUsado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="ventas-right">
        {mostrarForm ? (
          <div className="ventas-panel">
            <div className="ventas-panel-header">
              <button className="ventas-panel-back" onClick={cerrarPanel}><X size={16} /></button>
              <span className="ventas-panel-title">
                {modo === 'crear' ? 'Nuevo descuento' : `Editar: ${descSel?.nombre}`}
              </span>
            </div>
            <div className="ventas-panel-body">
              <div className="desc-form">
                <label className="desc-form-label">Nombre *</label>
                <input
                  className="desc-form-input"
                  placeholder="Ej: Empleados"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                />

                <label className="desc-form-label">Tipo de importe</label>
                <select
                  className="desc-form-input"
                  value={form.tipo}
                  onChange={e => setForm(p => ({ ...p, tipo: e.target.value, valor: '' }))}
                >
                  <option value="sin_importe">Sin importe</option>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="fijo">Monto fijo ($)</option>
                </select>

                {form.tipo !== 'sin_importe' && (
                  <>
                    <label className="desc-form-label">
                      {form.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto'}
                    </label>
                    <input
                      className="desc-form-input"
                      type="number"
                      min="0"
                      placeholder={form.tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 500'}
                      value={form.valor}
                      onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                    />
                  </>
                )}

                <label className="desc-form-label">Estado</label>
                <select
                  className="desc-form-input"
                  value={form.estado}
                  onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="ventas-panel-footer">
              <button className="desc-btn-cancel" onClick={cerrarPanel} disabled={guardando}>Cancelar</button>
              <button className="desc-btn-save" onClick={guardar} disabled={guardando || !form.nombre.trim()}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : !descSel ? (
          <div className="ventas-panel-empty">
            <ChevronLeft size={16} />
            <span>Seleccioná un descuento</span>
          </div>
        ) : (
          <div className="ventas-panel">
            {confirmElim ? (
              <div className="ventas-panel-header ventas-panel-header--confirm">
                <span className="ventas-confirm-text">¿Eliminar {descSel.nombre}?</span>
                <button className="ventas-confirm-btn ventas-confirm-btn--cancel" onClick={() => setConfirmElim(false)}>Cancelar</button>
                <button className="ventas-confirm-btn ventas-confirm-btn--danger" onClick={eliminar}>Eliminar</button>
              </div>
            ) : (
              <div className="ventas-panel-header">
                <button className="ventas-panel-back" onClick={cerrarPanel}><ChevronLeft size={16} /></button>
                <span className="ventas-panel-title">{descSel.nombre}</span>
                <span className={`ventas-badge ventas-badge--${descSel.estado === 'activo' ? 'cerrada' : 'curso'}`}>
                  {descSel.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            )}

            <div className="ventas-panel-body">
              <div className="ventas-panel-meta">
                <div className="ventas-meta-row"><span>Fecha de registro</span><strong>{fmtFechaLarga(descSel.createdAt)}</strong></div>
                <div className="ventas-meta-row"><span>Importe</span><strong>{fmtImporte(descSel)}</strong></div>
                <div className="ventas-meta-row"><span>Veces usado</span><strong>{descSel.vecesUsado}</strong></div>
                <div className="ventas-meta-row"><span>Monto usado</span><strong>{fmt(descSel.montoUsado)}</strong></div>
                <div className="ventas-meta-row"><span>Última vez</span><strong>{fmtFechaLarga(descSel.ultimaVez)}</strong></div>
              </div>
            </div>

            <div className="ventas-panel-footer">
              <button className="desc-btn-danger" onClick={() => setConfirmElim(true)}>
                <Trash2 size={14} /> Eliminar
              </button>
              <button className="desc-btn-edit" onClick={() => abrirEditar(descSel)}>
                <Edit2 size={14} /> Editar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════
export default function Ventas() {
  const [tab, setTab]       = useState('ventas')
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    ventasService.listar()
      .then(data => { setVentas(data); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  return (
    <div className="ventas-page">
      <div className="ventas-tabs-bar">
        <button
          className={`ventas-tab-btn${tab === 'ventas' ? ' ventas-tab-btn--active' : ''}`}
          onClick={() => setTab('ventas')}
        >Ventas</button>
        <button
          className={`ventas-tab-btn${tab === 'descuentos' ? ' ventas-tab-btn--active' : ''}`}
          onClick={() => setTab('descuentos')}
        >Descuentos</button>
      </div>

      {tab === 'ventas'     && <TabVentas ventas={ventas} cargando={cargando} />}
      {tab === 'descuentos' && <TabDescuentos />}
    </div>
  )
}
