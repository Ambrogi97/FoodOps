import { useState, useEffect } from 'react'
import { gastosService, categoriasGastoService } from '../../services/api'
import { ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Edit2, X, Search } from 'lucide-react'
import './Gastos.css'

// ── Utils ──────────────────────────────────────────────────────────────────
const fmt       = n  => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const hoyInput  = () => new Date().toISOString().split('T')[0]
const inputAFecha = v => { if (!v) return ''; const [y, m, d] = v.split('-'); return `${d}/${m}/${y}` }
const fechaAInput = v => { if (!v) return ''; const [d, m, y] = v.split('/'); return `${y}-${m}-${d}` }

const parseGDate = str => {
  if (!str) return null
  const [d, m, y] = str.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

const CATS_FIN  = ['Gastos administrativos', 'Gastos operacionales', 'Compra de mercadería']
const MEDIOS    = ['Efectivo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Transferencia', 'MercadoPago']
const MESES     = ['Ene.','Feb.','Mar.','Abr.','May.','Jun.','Jul.','Ago.','Sep.','Oct.','Nov.','Dic.']
const ANO_ACT   = new Date().getFullYear()
const ANOS      = Array.from({ length: 10 }, (_, i) => ANO_ACT - 4 + i)

const EMPTY_GASTO = { fecha: hoyInput(), importe: '', proveedor: '', categoriaId: '', comentario: '', estadoPago: 'pagado', medioPago: '', fechaVencimiento: '' }
const EMPTY_CAT   = { nombre: '', categoriaFinanciera: 'Gastos administrativos', activo: true, parent: '' }

const badgeCfg = e => ({
  pagado:   { label: 'Pagado',   cls: 'g-badge--pagado'   },
  pendiente:{ label: 'Pendiente',cls: 'g-badge--pendiente' },
  vencido:  { label: 'Vencido', cls: 'g-badge--vencido'   },
}[e] || { label: e, cls: '' })

// ══════════════════════════════════════════════════════════════════════════════
// Tab Gastos
// ══════════════════════════════════════════════════════════════════════════════
function TabGastos({ categorias }) {
  const [gastos, setGastos]             = useState([])
  const [cargando, setCargando]         = useState(true)
  const [periodo, setPeriodo]           = useState('mes')
  const [diaFiltro, setDiaFiltro]       = useState('')
  const [mesFiltro, setMesFiltro]       = useState('')
  const [anioFiltro, setAnioFiltro]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCat, setFiltroCat]       = useState('')
  const [selected, setSelected]         = useState(null)
  const [modo, setModo]                 = useState(null)
  const [form, setForm]                 = useState(EMPTY_GASTO)
  const [masData, setMasData]           = useState(false)
  const [guardando, setGuardando]       = useState(false)
  const [confirmElim, setConfirmElim]   = useState(false)

  useEffect(() => {
    gastosService.listar()
      .then(data => { setGastos(data); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const modoCustom = !!(diaFiltro || mesFiltro || anioFiltro)

  const getRango = () => {
    const man = new Date(hoy.getTime() + 86_400_000)
    if (periodo === 'hoy')    return { desde: hoy, hasta: man }
    if (periodo === 'semana') { const d = new Date(hoy); d.setDate(d.getDate() - 6); return { desde: d, hasta: man } }
    if (periodo === 'mes')    return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: man }
    return { desde: null, hasta: null }
  }
  const { desde, hasta } = getRango()

  const handlePill  = p   => { setPeriodo(p); setDiaFiltro(''); setMesFiltro(''); setAnioFiltro(''); setSelected(null) }
  const handleFecha = (tipo, val) => {
    if (tipo === 'dia') setDiaFiltro(val)
    if (tipo === 'mes') setMesFiltro(val)
    if (tipo === 'ano') setAnioFiltro(val)
    setPeriodo('')
  }

  const filtrados = gastos.filter(g => {
    const f = parseGDate(g.fecha)
    if (!f) return false
    if (modoCustom) {
      if (diaFiltro  && f.getDate()         !== Number(diaFiltro))  return false
      if (mesFiltro  && f.getMonth() + 1    !== Number(mesFiltro))  return false
      if (anioFiltro && f.getFullYear()     !== Number(anioFiltro)) return false
    } else {
      if (desde && f < desde) return false
      if (hasta && f >= hasta) return false
    }
    if (filtroEstado && g.estadoPago !== filtroEstado) return false
    if (filtroCat && g.categoriaId !== filtroCat) return false
    return true
  })

  const aVencer  = filtrados.filter(g => g.estadoPago === 'pendiente' && g.fechaVencimiento && parseGDate(g.fechaVencimiento) >= hoy)
  const vencidos = filtrados.filter(g => g.estadoPago === 'vencido' || (g.estadoPago === 'pendiente' && g.fechaVencimiento && parseGDate(g.fechaVencimiento) < hoy))
  const aPagar   = [...aVencer, ...vencidos].reduce((a, g) => a + g.importe, 0)
  const totPag   = filtrados.filter(g => g.estadoPago === 'pagado').reduce((a, g) => a + g.importe, 0)

  const gastoSel = selected ? gastos.find(g => g.id === selected) : null
  const catNombre = id => categorias.find(c => c.id === id)?.nombre || null

  const cerrar = () => { setSelected(null); setModo(null); setConfirmElim(false); setMasData(false) }

  const abrirCrear = () => { setSelected(null); setForm(EMPTY_GASTO); setModo('crear'); setConfirmElim(false); setMasData(false) }

  const abrirEditar = g => {
    setForm({
      fecha: fechaAInput(g.fecha), importe: g.importe, proveedor: g.proveedor || '',
      categoriaId: g.categoriaId || '', comentario: g.comentario || '',
      estadoPago: g.estadoPago || 'pagado', medioPago: g.medioPago || '',
      fechaVencimiento: fechaAInput(g.fechaVencimiento),
    })
    setModo('editar'); setConfirmElim(false)
  }

  const guardar = async () => {
    if (!form.fecha || !form.importe) return
    setGuardando(true)
    try {
      const p = {
        fecha: inputAFecha(form.fecha), importe: Number(form.importe), monto: Number(form.importe),
        proveedor: form.proveedor, categoriaId: form.categoriaId || null,
        comentario: form.comentario, descripcion: form.comentario,
        estadoPago: form.estadoPago, medioPago: form.medioPago,
        fechaVencimiento: form.fechaVencimiento ? inputAFecha(form.fechaVencimiento) : null,
      }
      if (modo === 'crear') {
        const nuevo = await gastosService.crear(p)
        setGastos(prev => [nuevo, ...prev]); setSelected(nuevo.id); setModo(null)
      } else {
        const upd = await gastosService.actualizar(selected, p)
        setGastos(prev => prev.map(g => g.id === upd.id ? upd : g)); setModo(null)
      }
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const eliminar = async () => {
    try { await gastosService.eliminar(selected); setGastos(prev => prev.filter(g => g.id !== selected)); cerrar() }
    catch (e) { console.error(e) }
  }

  const mostrarForm = modo === 'crear' || modo === 'editar'

  return (
    <div className="gastos-body">
      <div className="gastos-left">

        {/* Filtros */}
        <div className="gastos-filtros">
          <div className="gastos-filtros-row1">
            <div className="gastos-periodo-pills">
              {[['hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['','Todos']].map(([v, l]) => (
                <button key={v} className={`gastos-pill${!modoCustom && periodo === v ? ' gastos-pill--active' : ''}`}
                  onClick={() => handlePill(v)}>{l}</button>
              ))}
            </div>
            <div className="gastos-date-row">
              <select className={`gastos-select--date${diaFiltro ? ' gastos-select--active' : ''}`}
                value={diaFiltro} onChange={e => handleFecha('dia', e.target.value)}>
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className={`gastos-select--date${mesFiltro ? ' gastos-select--active' : ''}`}
                value={mesFiltro} onChange={e => handleFecha('mes', e.target.value)}>
                <option value="">Mes</option>
                {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select className={`gastos-select--date${anioFiltro ? ' gastos-select--active' : ''}`}
                value={anioFiltro} onChange={e => handleFecha('ano', e.target.value)}>
                <option value="">Año</option>
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="gastos-filtros-row2">
            <div className="gastos-selects">
              <select className="gastos-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Estado del pago</option>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
                <option value="vencido">Vencido</option>
              </select>
              <select className="gastos-select" value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
                <option value="">Categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <button className="gastos-btn-nuevo" onClick={abrirCrear}>
              <Plus size={14} /> Nuevo gasto
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="gastos-stats-bar">
          <div className="gastos-stat gastos-stat--orange">
            <span>A vencer</span><strong>{aVencer.length}</strong>
          </div>
          <div className="gastos-stat-sep" />
          <div className="gastos-stat gastos-stat--red">
            <span>Vencidos</span><strong>{vencidos.length}</strong>
          </div>
          <div className="gastos-stat-sep" />
          <div className="gastos-stat">
            <span>A pagar</span><strong>{fmt(aPagar)}</strong>
          </div>
          <div className="gastos-stat-sep" />
          <div className="gastos-stat gastos-stat--green">
            <span>Total pagado</span><strong>{fmt(totPag)}</strong>
          </div>
        </div>

        {/* Tabla */}
        <div className="gastos-table-wrap">
          {cargando ? <p className="gastos-loading">Cargando...</p> : (
            <table className="gastos-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Proveedor</th><th>Categoría</th>
                  <th>Comentario</th><th>Estado</th><th style={{ textAlign: 'right' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={6} className="gastos-table-empty">No hay gastos en este período</td></tr>
                ) : filtrados.map(g => {
                  const b = badgeCfg(g.estadoPago)
                  return (
                    <tr key={g.id}
                      className={`gastos-row gastos-row--${g.estadoPago}${selected === g.id ? ' gastos-row--active' : ''}`}
                      onClick={() => { setSelected(g.id === selected ? null : g.id); setModo(null); setConfirmElim(false) }}>
                      <td className="g-td-fecha">{g.fecha}</td>
                      <td className="g-td-muted">{g.proveedor || '—'}</td>
                      <td>{catNombre(g.categoriaId) || g.categoria || '—'}</td>
                      <td className="g-td-muted g-td-coment">{g.comentario || '—'}</td>
                      <td><span className={`g-badge ${b.cls}`}>{b.label}</span></td>
                      <td className="g-td-importe">{fmt(g.importe)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel derecho */}
      <div className="gastos-right">
        {mostrarForm ? (
          <div className="gastos-panel">
            <div className="gastos-panel-hdr">
              <button className="gastos-panel-back" onClick={cerrar}><X size={16} /></button>
              <span className="gastos-panel-title">{modo === 'crear' ? 'Nuevo gasto' : 'Editar gasto'}</span>
            </div>
            <div className="gastos-panel-body">
              <div className="gastos-form">
                <div className="gastos-form-row2">
                  <div className="gastos-field">
                    <label>Fecha *</label>
                    <input type="date" className="gastos-input" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                  </div>
                  <div className="gastos-field">
                    <label>Importe bruto *</label>
                    <div className="gastos-input-wrap">
                      <span className="gastos-input-prefix">$</span>
                      <input type="number" min="0" className="gastos-input gastos-input--prefixed" placeholder="0"
                        value={form.importe} onChange={e => setForm(p => ({ ...p, importe: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="gastos-field">
                  <label>Proveedor</label>
                  <input type="text" className="gastos-input" placeholder="Nombre del proveedor"
                    value={form.proveedor} onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))} />
                </div>
                <div className="gastos-field">
                  <label>Categoría</label>
                  <select className="gastos-input" value={form.categoriaId} onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="gastos-field">
                  <label>Comentario</label>
                  <textarea className="gastos-input gastos-textarea" rows={2} placeholder="Comentario opcional"
                    value={form.comentario} onChange={e => setForm(p => ({ ...p, comentario: e.target.value }))} />
                </div>

                <button className="gastos-masdatos-btn" type="button" onClick={() => setMasData(x => !x)}>
                  Más datos {masData ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                {masData && (
                  <>
                    <div className="gastos-field">
                      <label>Estado del pago</label>
                      <select className="gastos-input" value={form.estadoPago} onChange={e => setForm(p => ({ ...p, estadoPago: e.target.value }))}>
                        <option value="pagado">Pagado</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="vencido">Vencido</option>
                      </select>
                    </div>
                    <div className="gastos-field">
                      <label>Medio de pago</label>
                      <select className="gastos-input" value={form.medioPago} onChange={e => setForm(p => ({ ...p, medioPago: e.target.value }))}>
                        <option value="">Seleccionar</option>
                        {MEDIOS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="gastos-field">
                      <label>Fecha de vencimiento</label>
                      <input type="date" className="gastos-input" value={form.fechaVencimiento}
                        onChange={e => setForm(p => ({ ...p, fechaVencimiento: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="gastos-panel-ftr">
              <button className="gastos-btn-cancel" onClick={cerrar} disabled={guardando}>Cancelar</button>
              <button className="gastos-btn-save" onClick={guardar} disabled={guardando || !form.fecha || !form.importe}>
                {guardando ? 'Guardando...' : modo === 'crear' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : !gastoSel ? (
          <div className="gastos-right-empty">
            <ChevronLeft size={16} />
            <span>Seleccioná un gasto para más detalles</span>
          </div>
        ) : (
          <div className="gastos-panel">
            {confirmElim ? (
              <div className="gastos-panel-hdr gastos-panel-hdr--confirm">
                <span className="g-confirm-text">¿Eliminar este gasto?</span>
                <button className="g-confirm-btn g-confirm-btn--cancel" onClick={() => setConfirmElim(false)}>Cancelar</button>
                <button className="g-confirm-btn g-confirm-btn--danger" onClick={eliminar}>Eliminar</button>
              </div>
            ) : (
              <div className="gastos-panel-hdr">
                <button className="gastos-panel-back" onClick={cerrar}><ChevronLeft size={16} /></button>
                <span className="gastos-panel-title">{gastoSel.proveedor || gastoSel.comentario || 'Gasto'}</span>
                <span className={`g-badge ${badgeCfg(gastoSel.estadoPago).cls}`}>{badgeCfg(gastoSel.estadoPago).label}</span>
              </div>
            )}
            <div className="gastos-panel-body">
              <div className="gastos-meta">
                <div className="gastos-meta-row"><span>Fecha</span><strong>{gastoSel.fecha}</strong></div>
                <div className="gastos-meta-row"><span>Importe</span><strong className="gastos-meta-importe">{fmt(gastoSel.importe)}</strong></div>
                {gastoSel.proveedor    && <div className="gastos-meta-row"><span>Proveedor</span><strong>{gastoSel.proveedor}</strong></div>}
                <div className="gastos-meta-row"><span>Categoría</span><strong>{catNombre(gastoSel.categoriaId) || gastoSel.categoria || '—'}</strong></div>
                {gastoSel.comentario   && <div className="gastos-meta-row"><span>Comentario</span><strong>{gastoSel.comentario}</strong></div>}
                {gastoSel.medioPago    && <div className="gastos-meta-row"><span>Medio de pago</span><strong>{gastoSel.medioPago}</strong></div>}
                {gastoSel.fechaVencimiento && <div className="gastos-meta-row"><span>Vencimiento</span><strong>{gastoSel.fechaVencimiento}</strong></div>}
              </div>
            </div>
            <div className="gastos-panel-ftr">
              <button className="gastos-btn-danger" onClick={() => setConfirmElim(true)}><Trash2 size={14} /> Eliminar</button>
              <button className="gastos-btn-edit"   onClick={() => abrirEditar(gastoSel)}><Edit2 size={14} /> Editar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Categorías
// ══════════════════════════════════════════════════════════════════════════════
function TabCategorias({ categorias, setCategorias }) {
  const [busqueda, setBusqueda]         = useState('')
  const [filtroActivo, setFiltroActivo] = useState('activas')
  const [expanded, setExpanded]         = useState(new Set())
  const [selected, setSelected]         = useState(null)
  const [modo, setModo]                 = useState(null)
  const [form, setForm]                 = useState(EMPTY_CAT)
  const [guardando, setGuardando]       = useState(false)
  const [confirmElim, setConfirmElim]   = useState(false)

  const topLevel   = categorias.filter(c => !c.parent)
  const hijos      = pid => categorias.filter(c => c.parent === pid)
  const tieneHijos = id  => categorias.some(c => c.parent === id)

  const catSel = selected ? categorias.find(c => c.id === selected) : null

  const filtradas = topLevel.filter(c => {
    if (filtroActivo === 'activas'   && !c.activo)  return false
    if (filtroActivo === 'inactivas' &&  c.activo)  return false
    if (busqueda && !c.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const cerrar     = () => { setSelected(null); setModo(null); setConfirmElim(false) }
  const abrirCrear = (parentId = '') => {
    setSelected(null); setForm({ ...EMPTY_CAT, parent: parentId }); setModo(parentId ? 'sub' : 'crear'); setConfirmElim(false)
  }
  const abrirEditar = c => {
    setForm({ nombre: c.nombre, categoriaFinanciera: c.categoriaFinanciera, activo: c.activo, parent: c.parent || '' })
    setModo('editar'); setConfirmElim(false)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      const p = { nombre: form.nombre.trim(), categoriaFinanciera: form.categoriaFinanciera, activo: form.activo, parent: form.parent || null }
      if (modo !== 'editar') {
        const nueva = await categoriasGastoService.crear(p)
        setCategorias(prev => [...prev, nueva]); setSelected(nueva.id); setModo(null)
      } else {
        const upd = await categoriasGastoService.actualizar(selected, p)
        setCategorias(prev => prev.map(c => c.id === upd.id ? upd : c)); setModo(null)
      }
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const eliminar = async () => {
    try { await categoriasGastoService.eliminar(selected); setCategorias(prev => prev.filter(c => c.id !== selected)); cerrar() }
    catch (e) { console.error(e) }
  }

  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const renderRow = (cat, nivel = 0) => {
    const childs      = hijos(cat.id)
    const isExpanded  = expanded.has(cat.id)
    const tieneHijosB = tieneHijos(cat.id)
    return [
      <tr key={cat.id}
        className={`gastos-row${selected === cat.id ? ' gastos-row--active' : ''}`}
        onClick={() => { setSelected(cat.id === selected ? null : cat.id); setModo(null); setConfirmElim(false) }}>
        <td className="g-td-catname" style={{ paddingLeft: `${14 + nivel * 20}px` }}>
          {tieneHijosB
            ? <button className="g-expand-btn" onClick={e => toggleExpand(cat.id, e)}>
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            : <span className="g-expand-spacer" />}
          {cat.nombre}
        </td>
        <td className="g-td-muted">{cat.categoriaFinanciera}</td>
      </tr>,
      ...(isExpanded ? childs.flatMap(h => renderRow(h, nivel + 1)) : []),
    ]
  }

  const mostrarForm = modo === 'crear' || modo === 'sub' || modo === 'editar'

  return (
    <div className="gastos-body">
      <div className="gastos-left">
        <div className="gastos-filtros">
          <div className="gastos-search-wrap">
            <Search size={14} className="gastos-search-icon" />
            <input className="gastos-search" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className="gastos-select" value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}>
            <option value="activas">Activas</option>
            <option value="inactivas">Inactivas</option>
            <option value="">Todas</option>
          </select>
          <button className="gastos-btn-nuevo" onClick={() => abrirCrear()}>
            <Plus size={14} /> Nueva categoría
          </button>
        </div>

        <div className="gastos-table-wrap">
          <table className="gastos-table">
            <thead>
              <tr><th>Nombre</th><th>Categoría financiera</th></tr>
            </thead>
            <tbody>
              {filtradas.length === 0
                ? <tr><td colSpan={2} className="gastos-table-empty">No hay categorías</td></tr>
                : filtradas.flatMap(c => renderRow(c))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gastos-right">
        {mostrarForm ? (
          <div className="gastos-panel">
            <div className="gastos-panel-hdr">
              <button className="gastos-panel-back" onClick={cerrar}><X size={16} /></button>
              <span className="gastos-panel-title">
                {modo === 'editar' ? `Editar: ${catSel?.nombre}` : modo === 'sub' ? 'Nueva subcategoría' : 'Nueva categoría'}
              </span>
            </div>
            <div className="gastos-panel-body">
              <div className="gastos-form">
                <div className="gastos-field">
                  <label>Nombre *</label>
                  <input className="gastos-input" autoFocus placeholder="Nombre de la categoría"
                    value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                {modo !== 'sub' && (
                  <div className="gastos-field">
                    <label>Categoría principal</label>
                    <select className="gastos-input" value={form.parent} onChange={e => setForm(p => ({ ...p, parent: e.target.value }))}>
                      <option value="">Sin categoría principal</option>
                      {topLevel.filter(c => c.id !== selected).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
                <div className="gastos-field">
                  <label>Categoría financiera</label>
                  <select className="gastos-input" value={form.categoriaFinanciera} onChange={e => setForm(p => ({ ...p, categoriaFinanciera: e.target.value }))}>
                    {CATS_FIN.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="gastos-field gastos-field--check">
                  <label>Activo</label>
                  <input type="checkbox" checked={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} />
                </div>
              </div>
            </div>
            <div className="gastos-panel-ftr">
              <button className="gastos-btn-cancel" onClick={cerrar} disabled={guardando}>Cancelar</button>
              <button className="gastos-btn-save" onClick={guardar} disabled={guardando || !form.nombre.trim()}>
                {guardando ? 'Guardando...' : modo === 'editar' ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        ) : !catSel ? (
          <div className="gastos-right-empty">
            <ChevronLeft size={16} />
            <span>Seleccioná una categoría para más detalles</span>
          </div>
        ) : (
          <div className="gastos-panel">
            {confirmElim ? (
              <div className="gastos-panel-hdr gastos-panel-hdr--confirm">
                <span className="g-confirm-text">¿Eliminar {catSel.nombre}?</span>
                <button className="g-confirm-btn g-confirm-btn--cancel" onClick={() => setConfirmElim(false)}>Cancelar</button>
                <button className="g-confirm-btn g-confirm-btn--danger" onClick={eliminar}>Eliminar</button>
              </div>
            ) : (
              <div className="gastos-panel-hdr">
                <button className="gastos-panel-back" onClick={cerrar}><ChevronLeft size={16} /></button>
                <span className="gastos-panel-title">{catSel.nombre}</span>
              </div>
            )}
            <div className="gastos-panel-body">
              <div className="gastos-meta">
                <div className="gastos-meta-row"><span>Nombre</span><strong>{catSel.nombre}</strong></div>
                <div className="gastos-meta-row"><span>Categoría financiera</span><strong>{catSel.categoriaFinanciera}</strong></div>
                <div className="gastos-meta-row"><span>Activo</span><strong>{catSel.activo ? 'Sí' : 'No'}</strong></div>
              </div>
              <button className="gastos-btn-sub" onClick={() => abrirCrear(catSel.id)}>
                <Plus size={13} /> Nueva subcategoría
              </button>
            </div>
            <div className="gastos-panel-ftr">
              <button className="gastos-btn-danger" onClick={() => setConfirmElim(true)}><Trash2 size={14} /> Eliminar</button>
              <button className="gastos-btn-edit"   onClick={() => abrirEditar(catSel)}><Edit2 size={14} /> Editar</button>
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
export default function Gastos() {
  const [tab, setTab]               = useState('gastos')
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    categoriasGastoService.listar().then(setCategorias).catch(() => {})
  }, [])

  return (
    <div className="gastos-page">
      <div className="gastos-tabs-bar">
        <button className={`gastos-tab-btn${tab === 'gastos' ? ' gastos-tab-btn--active' : ''}`} onClick={() => setTab('gastos')}>Gastos</button>
        <button className={`gastos-tab-btn${tab === 'categorias' ? ' gastos-tab-btn--active' : ''}`} onClick={() => setTab('categorias')}>Cat. de Gastos</button>
      </div>
      {tab === 'gastos'      && <TabGastos     categorias={categorias} />}
      {tab === 'categorias'  && <TabCategorias categorias={categorias} setCategorias={setCategorias} />}
    </div>
  )
}
