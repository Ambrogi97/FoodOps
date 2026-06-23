import { useState, useEffect } from 'react'
import { clientesService, cuentasCorrientesService } from '../../services/api'
import { Plus, Search, X, Trash2, Edit2, ChevronLeft } from 'lucide-react'
import './Clientes.css'

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmtPrecio  = n => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtFecha   = s => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? s : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}` }
const hoy        = () => new Date().toISOString().slice(0, 10)

const ORIGENES   = ['Local', 'Online', 'App', 'Delivery']
const MEDIOS_PAGO = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'Cuenta corriente']

// ── Tab: Clientes ─────────────────────────────────────────────────────────────
function TabClientes({ clientes, setClientes }) {
  const [busqueda, setBusqueda]       = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [filtOrigen, setFiltOrigen]   = useState('')
  const [panel, setPanel]             = useState(null) // null | 'crear' | cliente

  const filtrados = clientes.filter(c => {
    if (soloActivos && !c.activo) return false
    if (filtOrigen && c.origen !== filtOrigen) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!c.nombre.toLowerCase().includes(q) && !c.telefono.includes(q) && !c.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handleGuardar = c => {
    setClientes(prev => panel === 'crear' ? [...prev, c] : prev.map(x => x.id === c.id ? c : x))
    setPanel(c)
  }

  const handleEliminar = async (id) => {
    try {
      await clientesService.eliminar(id)
      setClientes(prev => prev.filter(c => c.id !== id))
      setPanel(null)
    } catch (e) { console.error(e) }
  }

  const abrirDetalle = c => setPanel(c)
  const cerrar       = () => setPanel(null)

  return (
    <div className="cli-body">
      {/* ── Izquierda ── */}
      <div className="cli-left">
        {/* Toolbar */}
        <div className="cli-toolbar">
          <div className="cli-search-wrap">
            <Search size={14} className="cli-search-icon" />
            <input className="cli-search" placeholder="Buscar cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <label className="cli-toggle-label">
            <span>Clientes inactivos</span>
            <input type="checkbox" checked={!soloActivos} onChange={e => setSoloActivos(!e.target.checked)} />
          </label>
          <button className="cli-btn-nuevo" onClick={() => setPanel('crear')}>
            <Plus size={14} /> Nuevo cliente
          </button>
        </div>

        {/* Filtros */}
        <div className="cli-filtros">
          <select className="cli-select" value={filtOrigen} onChange={e => setFiltOrigen(e.target.value)}>
            <option value="">Origen</option>
            {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {filtOrigen && (
            <button className="cli-clear-btn" onClick={() => setFiltOrigen('')} title="Limpiar filtros">
              <X size={13} />
            </button>
          )}
          <span className="cli-count">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Tabla */}
        <div className="cli-table-wrap">
          <table className="cli-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Origen</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={4} className="cli-table-empty">No hay clientes</td></tr>
              ) : filtrados.map(c => (
                <tr key={c.id}
                  className={`cli-row${panel?.id === c.id ? ' cli-row--active' : ''}`}
                  onClick={() => abrirDetalle(c)}>
                  <td className="cli-td-bold">{c.nombre}</td>
                  <td className="cli-td-muted">{c.telefono || '—'}</td>
                  <td><span className={`cli-badge cli-badge--${c.origen.toLowerCase()}`}>{c.origen}</span></td>
                  <td>{c.activo ? <span className="cli-dot cli-dot--on" /> : <span className="cli-dot cli-dot--off" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="cli-right">
        {panel === null && (
          <div className="cli-right-empty">
            <ChevronLeft size={16} /><span>Seleccioná un cliente</span>
          </div>
        )}
        {(panel === 'crear' || (panel && panel !== 'crear' && panel._editando)) && (
          <FormCliente
            cliente={panel === 'crear' ? null : panel}
            onGuardar={handleGuardar}
            onCancelar={() => setPanel(panel === 'crear' ? null : { ...panel, _editando: false })}
          />
        )}
        {panel && panel !== 'crear' && !panel._editando && (
          <DetalleCliente
            cliente={panel}
            onEditar={() => setPanel({ ...panel, _editando: true })}
            onEliminar={() => handleEliminar(panel.id)}
            onCerrar={cerrar}
          />
        )}
      </div>
    </div>
  )
}

// ── Detalle Cliente ───────────────────────────────────────────────────────────
function DetalleCliente({ cliente, onEditar, onEliminar, onCerrar }) {
  const [confirmElim, setConfirmElim] = useState(false)

  return (
    <div className="cli-panel">
      {confirmElim ? (
        <div className="cli-panel-hdr cli-panel-hdr--danger">
          <span className="cli-confirm-txt">¿Eliminar a {cliente.nombre}?</span>
          <button className="cli-confirm-no"  onClick={() => setConfirmElim(false)}>Cancelar</button>
          <button className="cli-confirm-yes" onClick={onEliminar}>Eliminar</button>
        </div>
      ) : (
        <div className="cli-panel-hdr">
          <button className="cli-panel-back" onClick={onCerrar}><ChevronLeft size={16} /></button>
          <span className="cli-panel-title">{cliente.nombre}</span>
          <span className={`cli-badge cli-badge--${cliente.origen.toLowerCase()}`}>{cliente.origen}</span>
          <button className="cli-btn-edit" onClick={onEditar}><Edit2 size={14} /> Editar</button>
        </div>
      )}
      <div className="cli-panel-body">
        <div className="cli-meta">
          {[
            ['Nombre',             cliente.nombre],
            ['Email',              cliente.email || '—'],
            ['Teléfono',           cliente.telefono || '—'],
            ['Número tributario',  cliente.numeroTributario || '—'],
            ['Fecha de nacimiento',cliente.fechaNacimiento ? fmtFecha(cliente.fechaNacimiento) : '—'],
            ['Dirección',          cliente.direccion || '—'],
            ['Comentario',         cliente.comentario || '—'],
          ].map(([k, v]) => (
            <div key={k} className="cli-meta-row">
              <span className="cli-meta-key">{k}</span>
              <span className="cli-meta-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="cli-panel-ftr">
        <button className="cli-btn-danger" onClick={() => setConfirmElim(true)}><Trash2 size={14} /> Eliminar</button>
        <button className="cli-btn-primary" onClick={onEditar}><Edit2 size={14} /> Editar</button>
      </div>
    </div>
  )
}

// ── Formulario Cliente ────────────────────────────────────────────────────────
function FormCliente({ cliente, onGuardar, onCancelar }) {
  const esNuevo = !cliente
  const [form, setForm] = useState({
    nombre:           cliente?.nombre           || '',
    email:            cliente?.email            || '',
    telefono:         cliente?.telefono         || '',
    numeroTributario: cliente?.numeroTributario || '',
    fechaNacimiento:  cliente?.fechaNacimiento  || '',
    direccion:        cliente?.direccion        || '',
    comentario:       cliente?.comentario       || '',
    origen:           cliente?.origen           || 'Local',
    activo:           cliente?.activo           !== false,
  })
  const [guardando, setGuardando] = useState(false)
  const [errNombre, setErrNombre] = useState(false)

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) { setErrNombre(true); return }
    setGuardando(true)
    try {
      const c = esNuevo
        ? await clientesService.crear(form)
        : await clientesService.actualizar(cliente.id, form)
      onGuardar(c)
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  return (
    <div className="cli-panel">
      <div className="cli-panel-hdr">
        <button className="cli-panel-back" onClick={onCancelar}><X size={16} /></button>
        <span className="cli-panel-title">{esNuevo ? 'Nuevo cliente' : `Editar: ${cliente.nombre}`}</span>
      </div>
      <div className="cli-panel-body">
        <div className="cli-form">
          <div className="cli-field">
            <label>Nombre *</label>
            <input autoFocus className={`cli-input${errNombre ? ' cli-input--err' : ''}`}
              value={form.nombre} onChange={e => { setF('nombre', e.target.value); setErrNombre(false) }} />
            {errNombre && <span className="cli-err">× Campo requerido</span>}
          </div>
          <div className="cli-field">
            <label>Email</label>
            <input type="email" className="cli-input" value={form.email} onChange={e => setF('email', e.target.value)} />
          </div>
          <div className="cli-field">
            <label>Teléfono</label>
            <input className="cli-input" value={form.telefono} onChange={e => setF('telefono', e.target.value)} />
          </div>
          <div className="cli-field">
            <label>Número tributario</label>
            <input className="cli-input" placeholder="00-12345678-9" value={form.numeroTributario} onChange={e => setF('numeroTributario', e.target.value)} />
          </div>
          <div className="cli-field">
            <label>Fecha de nacimiento</label>
            <input type="date" className="cli-input" value={form.fechaNacimiento} onChange={e => setF('fechaNacimiento', e.target.value)} />
          </div>
          <div className="cli-field">
            <label>Dirección</label>
            <input className="cli-input" value={form.direccion} onChange={e => setF('direccion', e.target.value)} />
          </div>
          <div className="cli-field">
            <label>Origen</label>
            <select className="cli-input" value={form.origen} onChange={e => setF('origen', e.target.value)}>
              {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="cli-field">
            <label>Comentario</label>
            <textarea className="cli-input cli-textarea" rows={2} value={form.comentario} onChange={e => setF('comentario', e.target.value)} />
          </div>
          {!esNuevo && (
            <div className="cli-check-row">
              <label>Activo</label>
              <input type="checkbox" checked={form.activo} onChange={e => setF('activo', e.target.checked)} />
            </div>
          )}
        </div>
      </div>
      <div className="cli-panel-ftr">
        <button className="cli-btn-cancel" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="cli-btn-primary" onClick={guardar} disabled={guardando || !form.nombre.trim()}>
          {guardando ? 'Guardando...' : esNuevo ? 'Crear' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Tab: Cuentas Corrientes ───────────────────────────────────────────────────
function TabCuentas({ clientes }) {
  const [txs, setTxs]               = useState([])
  const [cargando, setCargando]     = useState(true)
  const [filtCliente, setFiltCliente] = useState('')
  const [panel, setPanel]           = useState(null) // null | 'nueva'

  useEffect(() => {
    cuentasCorrientesService.listar()
      .then(setTxs)
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  // Saldo por cliente
  const saldoPorCliente = {}
  for (const tx of txs) {
    const s = saldoPorCliente[tx.clienteId] || 0
    saldoPorCliente[tx.clienteId] = tx.tipo === 'cargo' ? s + tx.monto : s - tx.monto
  }

  // Clientes con cuenta corriente (saldo != 0 o tiene transacciones)
  const clientesConCuenta = clientes.filter(c => txs.some(t => t.clienteId === c.id))
  const clientesFiltrados = filtCliente
    ? clientesConCuenta.filter(c => c.id === filtCliente)
    : clientesConCuenta

  const txsFiltradas = filtCliente
    ? txs.filter(t => t.clienteId === filtCliente)
    : txs

  const saldoTotal = txsFiltradas.reduce((a, t) => t.tipo === 'cargo' ? a + t.monto : a - t.monto, 0)

  const handleCrearTx = async (data) => {
    try {
      const tx = await cuentasCorrientesService.crear(data)
      setTxs(prev => [tx, ...prev])
      setPanel(null)
    } catch (e) { console.error(e) }
  }

  const handleEliminarTx = async (id) => {
    try {
      await cuentasCorrientesService.eliminar(id)
      setTxs(prev => prev.filter(t => t.id !== id))
    } catch (e) { console.error(e) }
  }

  return (
    <div className="cli-body">
      <div className="cli-left">
        <div className="cli-toolbar">
          <div className="cli-field" style={{ flex: 1, maxWidth: 260 }}>
            <label className="cli-label-sm">Cliente</label>
            <select className="cli-select" value={filtCliente} onChange={e => setFiltCliente(e.target.value)}>
              <option value="">Todos los clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <button className="cli-btn-nuevo" onClick={() => setPanel('nueva')}>
            <Plus size={14} /> Nueva transacción
          </button>
        </div>

        {/* Stats */}
        <div className="cli-cc-stats">
          <div className="cli-cc-stat">
            <span className="cli-cc-stat-label">Registros totales</span>
            <span className="cli-cc-stat-value">{cargando ? '...' : txsFiltradas.length}</span>
          </div>
          <div className="cli-cc-stat">
            <span className="cli-cc-stat-label">Saldo</span>
            <span className={`cli-cc-stat-value${saldoTotal > 0 ? ' cli-cc-stat--debe' : saldoTotal < 0 ? ' cli-cc-stat--favor' : ''}`}>
              {fmtPrecio(saldoTotal)}
            </span>
          </div>
        </div>

        {/* Tabla transacciones */}
        <div className="cli-table-wrap">
          <table className="cli-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th>Medio de pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="cli-table-empty">Cargando...</td></tr>
              ) : txsFiltradas.length === 0 ? (
                <tr><td colSpan={6} className="cli-table-empty">No hay transacciones</td></tr>
              ) : txsFiltradas.map(tx => {
                const cliente = clientes.find(c => c.id === tx.clienteId)
                return (
                  <tr key={tx.id} className="cli-row">
                    <td className="cli-td-bold">{cliente?.nombre || tx.clienteNombre || '—'}</td>
                    <td>
                      <span className={`cli-badge ${tx.tipo === 'cargo' ? 'cli-badge--cargo' : 'cli-badge--pago'}`}>
                        {tx.tipo === 'cargo' ? 'Cargo' : 'Pago'}
                      </span>
                    </td>
                    <td className="cli-td-muted">{fmtFecha(tx.fechaPago || tx.createdAt)}</td>
                    <td style={{ textAlign: 'right' }} className={tx.tipo === 'cargo' ? 'cli-td-debe' : 'cli-td-favor'}>
                      {tx.tipo === 'cargo' ? '+' : '-'}{fmtPrecio(tx.monto)}
                    </td>
                    <td className="cli-td-muted">{tx.medioPago || '—'}</td>
                    <td>
                      <button className="cli-row-del" onClick={() => handleEliminarTx(tx.id)} title="Eliminar">
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="cli-right">
        {panel === null ? (
          <div className="cli-right-empty">
            <ChevronLeft size={16} /><span>Seleccioná un cliente para más detalles</span>
          </div>
        ) : (
          <FormTransaccion
            clientes={clientes}
            clientePresel={filtCliente}
            onGuardar={handleCrearTx}
            onCancelar={() => setPanel(null)}
          />
        )}
      </div>
    </div>
  )
}

// ── Formulario Transacción ────────────────────────────────────────────────────
function FormTransaccion({ clientes, clientePresel, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    clienteId:  clientePresel || '',
    tipo:       'cargo',
    monto:      '',
    medioPago:  '',
    caja:       'Principal',
    fechaPago:  hoy(),
    comentario: '',
  })
  const [guardando, setGuardando] = useState(false)
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!form.clienteId || !form.monto) return
    setGuardando(true)
    try { await onGuardar({ ...form, monto: Number(form.monto) }) }
    catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  return (
    <div className="cli-panel">
      <div className="cli-panel-hdr">
        <button className="cli-panel-back" onClick={onCancelar}><X size={16} /></button>
        <span className="cli-panel-title">Nueva transacción</span>
      </div>
      <div className="cli-panel-body">
        <div className="cli-form">
          <div className="cli-field">
            <label>Cliente *</label>
            <select className="cli-input" value={form.clienteId} onChange={e => setF('clienteId', e.target.value)}>
              <option value="">Seleccionar</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="cli-field">
            <label>Tipo</label>
            <select className="cli-input" value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
              <option value="cargo">Cargo (fiado)</option>
              <option value="pago">Pago (abono)</option>
            </select>
          </div>
          <div className="cli-field">
            <label>Monto *</label>
            <div className="cli-prefix-wrap">
              <span className="cli-prefix">$</span>
              <input type="number" min="0" className="cli-input cli-input--prefixed" value={form.monto} onChange={e => setF('monto', e.target.value)} />
            </div>
          </div>
          <div className="cli-field">
            <label>Medio de pago</label>
            <select className="cli-input" value={form.medioPago} onChange={e => setF('medioPago', e.target.value)}>
              <option value="">Seleccionar</option>
              {MEDIOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="cli-row2">
            <div className="cli-field">
              <label>Caja</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input className="cli-input" value={form.caja} onChange={e => setF('caja', e.target.value)} />
                <button className="cli-clear-btn" onClick={() => setF('caja', '')} title="Limpiar"><X size={13} /></button>
              </div>
            </div>
            <div className="cli-field">
              <label>Fecha de pago</label>
              <input type="date" className="cli-input" value={form.fechaPago} onChange={e => setF('fechaPago', e.target.value)} />
            </div>
          </div>
          <div className="cli-field">
            <label>Comentario</label>
            <textarea className="cli-input cli-textarea" rows={2} value={form.comentario} onChange={e => setF('comentario', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="cli-panel-ftr">
        <button className="cli-btn-cancel" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="cli-btn-primary" onClick={guardar} disabled={guardando || !form.clienteId || !form.monto}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Clientes() {
  const [tab, setTab]               = useState('clientes')
  const [clientes, setClientes]     = useState([])
  const [cargando, setCargando]     = useState(true)

  useEffect(() => {
    clientesService.listar()
      .then(setClientes)
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <div className="cli-loading">Cargando...</div>

  return (
    <div className="cli-page">
      <div className="cli-tabs-bar">
        {[['clientes','Clientes'],['cuentas','Cuentas Corrientes']].map(([v, l]) => (
          <button key={v} className={`cli-tab-btn${tab === v ? ' cli-tab-btn--active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      {tab === 'clientes' && <TabClientes clientes={clientes} setClientes={setClientes} />}
      {tab === 'cuentas'  && <TabCuentas  clientes={clientes} />}
    </div>
  )
}
