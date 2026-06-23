import { useState, useEffect } from 'react'
import { proveedoresService, cuentasCorrientesProveedoresService } from '../../services/api'
import { Plus, Search, X, Trash2, Edit2, ChevronLeft, Truck } from 'lucide-react'
import './Proveedores.css'

const fmtPrecio = n => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtFecha  = s => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? s : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}` }
const hoy       = () => new Date().toISOString().slice(0, 10)

const MEDIOS_PAGO = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'Cheque']

const dirStr = p => [p.calle, p.numero].filter(Boolean).join(' ') || '—'

// ── Tab: Proveedores ──────────────────────────────────────────────────────────
function TabProveedores({ proveedores, setProveedores, saldoPorProveedor }) {
  const [busqueda, setBusqueda]       = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [panel, setPanel]             = useState(null) // null | 'crear' | proveedor

  const filtrados = proveedores
    .filter(p => soloActivos ? p.activo : true)
    .filter(p => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return p.nombre.toLowerCase().includes(q) ||
             p.rubro.toLowerCase().includes(q)   ||
             p.telefono.includes(q)              ||
             p.email.toLowerCase().includes(q)
    })

  const handleGuardar = p => {
    setProveedores(prev => panel === 'crear' ? [...prev, p] : prev.map(x => x.id === p.id ? p : x))
    setPanel(p)
  }

  const handleEliminar = async (id) => {
    try {
      await proveedoresService.eliminar(id)
      setProveedores(prev => prev.filter(p => p.id !== id))
      setPanel(null)
    } catch (e) { console.error(e) }
  }

  return (
    <div className="pv-body">
      <div className="pv-left">
        {/* Toolbar */}
        <div className="pv-toolbar">
          <div className="pv-search-wrap">
            <Search size={14} className="pv-search-icon" />
            <input className="pv-search" placeholder="Buscar proveedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <label className="pv-toggle-label">
            <span>Proveedores inactivos</span>
            <input type="checkbox" checked={!soloActivos} onChange={e => setSoloActivos(!e.target.checked)} />
          </label>
          <button className="pv-btn-nuevo" onClick={() => setPanel('crear')}>
            <Plus size={14} /> Nuevo proveedor
          </button>
        </div>

        {/* Tabla */}
        <div className="pv-table-wrap">
          <table className="pv-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={5} className="pv-table-empty">No hay proveedores</td></tr>
              ) : filtrados.map(p => (
                <tr key={p.id}
                  className={`pv-row${panel?.id === p.id ? ' pv-row--active' : ''}${!p.activo ? ' pv-row--inactivo' : ''}`}
                  onClick={() => setPanel(panel?.id === p.id ? null : p)}>
                  <td className="pv-td-bold">{p.nombre}</td>
                  <td className="pv-td-muted">{p.email || '—'}</td>
                  <td className="pv-td-muted">{p.telefono || '—'}</td>
                  <td className="pv-td-muted">{dirStr(p)}</td>
                  <td style={{ textAlign: 'right' }} className={
                    (saldoPorProveedor[p.id] || 0) > 0 ? 'pv-td-debe'
                    : (saldoPorProveedor[p.id] || 0) < 0 ? 'pv-td-favor'
                    : 'pv-td-muted'
                  }>
                    {saldoPorProveedor[p.id] !== undefined ? fmtPrecio(saldoPorProveedor[p.id]) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="pv-right">
        {panel === null && (
          <div className="pv-right-empty">
            <Truck size={32} color="#94a3b8" />
            <span>Seleccioná un proveedor</span>
          </div>
        )}
        {(panel === 'crear' || (panel && panel !== 'crear' && panel._editando)) && (
          <FormProveedor
            proveedor={panel === 'crear' ? null : panel}
            onGuardar={handleGuardar}
            onCancelar={() => setPanel(panel === 'crear' ? null : { ...panel, _editando: false })}
          />
        )}
        {panel && panel !== 'crear' && !panel._editando && (
          <DetalleProveedor
            proveedor={panel}
            saldo={saldoPorProveedor[panel.id] || 0}
            onEditar={() => setPanel({ ...panel, _editando: true })}
            onEliminar={() => handleEliminar(panel.id)}
            onCerrar={() => setPanel(null)}
          />
        )}
      </div>
    </div>
  )
}

// ── Detalle Proveedor ─────────────────────────────────────────────────────────
function DetalleProveedor({ proveedor: p, saldo, onEditar, onEliminar, onCerrar }) {
  const [confirmElim, setConfirmElim] = useState(false)

  return (
    <div className="pv-panel">
      {confirmElim ? (
        <div className="pv-panel-hdr pv-panel-hdr--danger">
          <span className="pv-confirm-txt">¿Eliminar a {p.nombre}?</span>
          <button className="pv-confirm-no"  onClick={() => setConfirmElim(false)}>Cancelar</button>
          <button className="pv-confirm-yes" onClick={onEliminar}>Eliminar</button>
        </div>
      ) : (
        <div className="pv-panel-hdr">
          <button className="pv-panel-back" onClick={onCerrar}><ChevronLeft size={16} /></button>
          <span className="pv-panel-title">{p.nombre}</span>
          {p.rubro && <span className="pv-rubro-tag">{p.rubro}</span>}
          <button className="pv-btn-edit" onClick={onEditar}><Edit2 size={14} /> Editar</button>
        </div>
      )}
      <div className="pv-panel-body">
        <div className="pv-meta">
          {[
            ['Nombre',     p.nombre],
            ['Email',      p.email      || '—'],
            ['Teléfono',   p.telefono   || '—'],
            ['Rubro',      p.rubro      || '—'],
            ['Calle',      p.calle      || '—'],
            ['Número',     p.numero     || '—'],
            ['Piso/Depto', p.piso       || '—'],
            ['Ciudad',     p.ciudad     || '—'],
            ['Saldo',      fmtPrecio(saldo)],
            ['Activo',     p.activo ? 'Sí' : 'No'],
            ['Comentario', p.notas      || '—'],
          ].map(([k, v]) => (
            <div key={k} className="pv-meta-row">
              <span className="pv-meta-key">{k}</span>
              <span className="pv-meta-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pv-panel-ftr">
        <button className="pv-btn-danger" onClick={() => setConfirmElim(true)}><Trash2 size={14} /> Eliminar</button>
        <button className="pv-btn-primary" onClick={onEditar}><Edit2 size={14} /> Editar</button>
      </div>
    </div>
  )
}

// ── Formulario Proveedor ──────────────────────────────────────────────────────
function FormProveedor({ proveedor, onGuardar, onCancelar }) {
  const esNuevo = !proveedor
  const [form, setForm] = useState({
    nombre:   proveedor?.nombre   || '',
    email:    proveedor?.email    || '',
    telefono: proveedor?.telefono || '',
    rubro:    proveedor?.rubro    || '',
    calle:    proveedor?.calle    || '',
    numero:   proveedor?.numero   || '',
    piso:     proveedor?.piso     || '',
    ciudad:   proveedor?.ciudad   || '',
    activo:   proveedor?.activo   !== false,
    notas:    proveedor?.notas    || '',
  })
  const [guardando, setGuardando] = useState(false)
  const [errNombre, setErrNombre] = useState(false)
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) { setErrNombre(true); return }
    setGuardando(true)
    try {
      const p = esNuevo
        ? await proveedoresService.crear(form)
        : await proveedoresService.actualizar(proveedor.id, form)
      onGuardar(p)
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  return (
    <div className="pv-panel">
      <div className="pv-panel-hdr">
        <button className="pv-panel-back" onClick={onCancelar}><X size={16} /></button>
        <span className="pv-panel-title">{esNuevo ? 'Nuevo proveedor' : `Editar: ${proveedor.nombre}`}</span>
      </div>
      <div className="pv-panel-body">
        <div className="pv-form">
          <div className="pv-field">
            <label>Nombre *</label>
            <input autoFocus className={`pv-input${errNombre ? ' pv-input--err' : ''}`}
              value={form.nombre} onChange={e => { setF('nombre', e.target.value); setErrNombre(false) }} />
            {errNombre && <span className="pv-err">× Campo requerido</span>}
          </div>
          <div className="pv-row2">
            <div className="pv-field">
              <label>Email</label>
              <input type="email" className="pv-input" value={form.email} onChange={e => setF('email', e.target.value)} />
            </div>
            <div className="pv-field">
              <label>Teléfono</label>
              <input className="pv-input" value={form.telefono} onChange={e => setF('telefono', e.target.value)} />
            </div>
          </div>
          <div className="pv-field">
            <label>Rubro</label>
            <input className="pv-input" placeholder="Ej: Carnes, Verduras..." value={form.rubro} onChange={e => setF('rubro', e.target.value)} />
          </div>
          <div className="pv-section-label">Dirección</div>
          <div className="pv-row2">
            <div className="pv-field">
              <label>Calle</label>
              <input className="pv-input" placeholder="Calle" value={form.calle} onChange={e => setF('calle', e.target.value)} />
            </div>
            <div className="pv-field">
              <label>Número</label>
              <input className="pv-input" placeholder="Número" value={form.numero} onChange={e => setF('numero', e.target.value)} />
            </div>
          </div>
          <div className="pv-row2">
            <div className="pv-field">
              <label>Piso o Depto.</label>
              <input className="pv-input" placeholder="Piso o Depto." value={form.piso} onChange={e => setF('piso', e.target.value)} />
            </div>
            <div className="pv-field">
              <label>Ciudad</label>
              <input className="pv-input" placeholder="Ciudad" value={form.ciudad} onChange={e => setF('ciudad', e.target.value)} />
            </div>
          </div>
          <div className="pv-check-row">
            <label>Activo</label>
            <input type="checkbox" checked={form.activo} onChange={e => setF('activo', e.target.checked)} />
          </div>
          <div className="pv-field">
            <label>Comentario</label>
            <textarea className="pv-input pv-textarea" rows={2} value={form.notas} onChange={e => setF('notas', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="pv-panel-ftr">
        <button className="pv-btn-cancel" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="pv-btn-primary" onClick={guardar} disabled={guardando || !form.nombre.trim()}>
          {guardando ? 'Guardando...' : esNuevo ? 'Crear' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Tab: Cuentas Corrientes ───────────────────────────────────────────────────
function TabCuentas({ proveedores }) {
  const [txs, setTxs]                   = useState([])
  const [cargando, setCargando]         = useState(true)
  const [filtProveedor, setFiltProveedor] = useState('')
  const [panel, setPanel]               = useState(null) // null | 'nueva'

  useEffect(() => {
    cuentasCorrientesProveedoresService.listar()
      .then(setTxs)
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  // Saldo por proveedor
  const saldoPorProveedor = {}
  const ultimaFechaPorProveedor = {}
  for (const tx of txs) {
    const s = saldoPorProveedor[tx.proveedorId] || 0
    saldoPorProveedor[tx.proveedorId] = tx.tipo === 'cargo' ? s + tx.monto : s - tx.monto
    if (!ultimaFechaPorProveedor[tx.proveedorId] || tx.createdAt > ultimaFechaPorProveedor[tx.proveedorId]) {
      ultimaFechaPorProveedor[tx.proveedorId] = tx.createdAt
    }
  }

  const provConTxs = proveedores.filter(p => txs.some(t => t.proveedorId === p.id))
  const provFiltrados = filtProveedor ? provConTxs.filter(p => p.id === filtProveedor) : provConTxs

  const txsFiltradas = filtProveedor ? txs.filter(t => t.proveedorId === filtProveedor) : txs
  const saldoTotal = txsFiltradas.reduce((a, t) => t.tipo === 'cargo' ? a + t.monto : a - t.monto, 0)

  const handleCrearTx = async (data) => {
    try {
      const tx = await cuentasCorrientesProveedoresService.crear(data)
      setTxs(prev => [tx, ...prev])
      setPanel(null)
    } catch (e) { console.error(e) }
  }

  const handleEliminarTx = async (id) => {
    try {
      await cuentasCorrientesProveedoresService.eliminar(id)
      setTxs(prev => prev.filter(t => t.id !== id))
    } catch (e) { console.error(e) }
  }

  return (
    <div className="pv-body">
      <div className="pv-left">
        <div className="pv-toolbar">
          <div className="pv-field-inline">
            <select className="pv-select" value={filtProveedor} onChange={e => setFiltProveedor(e.target.value)}>
              <option value="">Seleccionar</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <button className="pv-btn-nuevo" onClick={() => setPanel('nueva')}>
            <Plus size={14} /> Nueva transacción
          </button>
        </div>

        {/* Stats */}
        <div className="pv-cc-stats">
          <div className="pv-cc-stat">
            <span className="pv-cc-stat-label">Registros totales</span>
            <span className="pv-cc-stat-value">{cargando ? '...' : txsFiltradas.length}</span>
          </div>
          <div className="pv-cc-stat">
            <span className="pv-cc-stat-label">Saldo</span>
            <span className={`pv-cc-stat-value${saldoTotal > 0 ? ' pv-cc-stat--debe' : saldoTotal < 0 ? ' pv-cc-stat--favor' : ''}`}>
              {fmtPrecio(saldoTotal)}
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="pv-table-wrap">
          <table className="pv-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha de registro</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={3} className="pv-table-empty">Cargando...</td></tr>
              ) : provFiltrados.length === 0 ? (
                <tr><td colSpan={3} className="pv-table-empty">No hay transacciones</td></tr>
              ) : provFiltrados.map(p => {
                const saldo = saldoPorProveedor[p.id] || 0
                return (
                  <tr key={p.id} className="pv-row">
                    <td className="pv-td-bold">{p.nombre}</td>
                    <td className="pv-td-muted">{fmtFecha(ultimaFechaPorProveedor[p.id])}</td>
                    <td style={{ textAlign: 'right' }} className={saldo > 0 ? 'pv-td-debe' : saldo < 0 ? 'pv-td-favor' : 'pv-td-muted'}>
                      {fmtPrecio(saldo)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Transacciones individuales si hay filtro */}
        {filtProveedor && txsFiltradas.length > 0 && (
          <div className="pv-table-wrap" style={{ marginTop: 12 }}>
            <table className="pv-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Medio de pago</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {txsFiltradas.map(tx => (
                  <tr key={tx.id} className="pv-row">
                    <td>
                      <span className={`pv-badge ${tx.tipo === 'cargo' ? 'pv-badge--cargo' : 'pv-badge--pago'}`}>
                        {tx.tipo === 'cargo' ? 'Cargo' : 'Pago'}
                      </span>
                    </td>
                    <td className="pv-td-muted">{fmtFecha(tx.fechaPago || tx.createdAt)}</td>
                    <td className="pv-td-muted">{tx.medioPago || '—'}</td>
                    <td style={{ textAlign: 'right' }} className={tx.tipo === 'cargo' ? 'pv-td-debe' : 'pv-td-favor'}>
                      {tx.tipo === 'cargo' ? '+' : '-'}{fmtPrecio(tx.monto)}
                    </td>
                    <td>
                      <button className="pv-row-del" onClick={() => handleEliminarTx(tx.id)} title="Eliminar">
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel derecho */}
      <div className="pv-right">
        {panel === null ? (
          <div className="pv-right-empty">
            <Truck size={28} color="#94a3b8" />
            <span>Seleccioná un proveedor para más detalles</span>
          </div>
        ) : (
          <FormTransaccion
            proveedores={proveedores}
            proveedorPresel={filtProveedor}
            onGuardar={handleCrearTx}
            onCancelar={() => setPanel(null)}
          />
        )}
      </div>
    </div>
  )
}

// ── Formulario Transacción ────────────────────────────────────────────────────
function FormTransaccion({ proveedores, proveedorPresel, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    proveedorId: proveedorPresel || '',
    tipo:        'cargo',
    monto:       '',
    medioPago:   '',
    fechaPago:   hoy(),
    comentario:  '',
  })
  const [guardando, setGuardando] = useState(false)
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!form.proveedorId || !form.monto) return
    setGuardando(true)
    try { await onGuardar({ ...form, monto: Number(form.monto) }) }
    catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  return (
    <div className="pv-panel">
      <div className="pv-panel-hdr">
        <button className="pv-panel-back" onClick={onCancelar}><X size={16} /></button>
        <span className="pv-panel-title">Nueva transacción</span>
      </div>
      <div className="pv-panel-body">
        <div className="pv-form">
          <div className="pv-field">
            <label>Tipo</label>
            <select className="pv-input" value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
              <option value="cargo">Cargo (deuda)</option>
              <option value="pago">Pago</option>
            </select>
          </div>
          <div className="pv-field">
            <label>Proveedor *</label>
            <select className="pv-input" value={form.proveedorId} onChange={e => setF('proveedorId', e.target.value)}>
              <option value="">Seleccionar</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="pv-field">
            <label>Fecha de pago</label>
            <input type="date" className="pv-input" value={form.fechaPago} onChange={e => setF('fechaPago', e.target.value)} />
          </div>
          <div className="pv-field">
            <label>Monto *</label>
            <div className="pv-prefix-wrap">
              <span className="pv-prefix">$</span>
              <input type="number" min="0" className="pv-input pv-input--prefixed" value={form.monto} onChange={e => setF('monto', e.target.value)} />
            </div>
          </div>
          <div className="pv-field">
            <label>Medio de pago</label>
            <select className="pv-input" value={form.medioPago} onChange={e => setF('medioPago', e.target.value)}>
              <option value="">Seleccionar</option>
              {MEDIOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="pv-field">
            <label>Comentario</label>
            <textarea className="pv-input pv-textarea" rows={2} value={form.comentario} onChange={e => setF('comentario', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="pv-panel-ftr">
        <button className="pv-btn-cancel" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="pv-btn-primary" onClick={guardar} disabled={guardando || !form.proveedorId || !form.monto}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Proveedores() {
  const [tab, setTab]                     = useState('proveedores')
  const [proveedores, setProveedores]     = useState([])
  const [txs, setTxs]                     = useState([])
  const [cargando, setCargando]           = useState(true)

  useEffect(() => {
    Promise.all([
      proveedoresService.listar(),
      cuentasCorrientesProveedoresService.listar(),
    ])
      .then(([provs, txsData]) => { setProveedores(provs); setTxs(txsData) })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const saldoPorProveedor = {}
  for (const tx of txs) {
    const s = saldoPorProveedor[tx.proveedorId] || 0
    saldoPorProveedor[tx.proveedorId] = tx.tipo === 'cargo' ? s + tx.monto : s - tx.monto
  }

  if (cargando) return <div className="pv-loading">Cargando...</div>

  return (
    <div className="pv-page">
      <div className="pv-tabs-bar">
        {[['proveedores','Proveedores'],['cuentas','Cuentas corrientes']].map(([v, l]) => (
          <button key={v} className={`pv-tab-btn${tab === v ? ' pv-tab-btn--active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      {tab === 'proveedores' && (
        <TabProveedores
          proveedores={proveedores}
          setProveedores={setProveedores}
          saldoPorProveedor={saldoPorProveedor}
        />
      )}
      {tab === 'cuentas' && <TabCuentas proveedores={proveedores} />}
    </div>
  )
}
