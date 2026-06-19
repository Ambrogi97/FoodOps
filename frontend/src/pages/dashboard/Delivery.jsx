import { useState, useEffect, useCallback } from 'react'
import { deliveryService } from '../../services/api'
import { Plus, ChevronLeft, X, Minus } from 'lucide-react'
import './Delivery.css'

const fmt = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  const pad  = n => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(2)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fmtPrecio = (n) => `$${Number(n || 0).toFixed(2).replace('.', ',')}`

const TIEMPOS = ['15 min', '30 min', '45 min', '1 hora', '1:30 hs', '2 horas']

const ESTADOS = {
  en_preparacion:     { label: 'En preparación',   color: 'orange', next: 'listo_para_entregar', nextLabel: 'Listo para entregar' },
  listo_para_entregar:{ label: 'Listo p/entregar', color: 'blue',   next: 'enviado',             nextLabel: 'Enviado' },
  enviado:            { label: 'Enviado',           color: 'gris',   next: 'entregado',           nextLabel: 'Entregado' },
  entregado:          { label: 'Entregado',         color: 'green',  next: null },
}

const EMPTY_FORM = {
  nombre: '', telefono: '',
  calle: '', numeroDireccion: '', piso: '', barrio: '',
  repartidor: '', tiempoEstimado: '', costoEnvio: '', comentario: '',
}

function FilaDelivery({ p, activoId, onAbrir, conTiempo }) {
  const dir = [p.direccion?.calle, p.direccion?.numero].filter(Boolean).join(' ') || '—'
  return (
    <tr
      className={`del-row${activoId === p._id ? ' del-row--active' : ''}`}
      onClick={() => onAbrir(p)}
    >
      <td className="del-td-id">{p.numero}</td>
      <td>{fmt(p.createdAt)}</td>
      <td className="del-td-dir">{dir}</td>
      <td>{p.telefono || '—'}</td>
      <td>{p.nombre || '—'}</td>
      <td>{p.repartidor || '—'}</td>
      {conTiempo && <td>{p.tiempoEstimado || '—'}</td>}
      <td className="del-td-total">{fmtPrecio(p.total)}</td>
    </tr>
  )
}

function SeccionDelivery({ titulo, icono, lista, color, conTiempo, activoId, onAbrir, mostrarMas }) {
  const cols = conTiempo ? 8 : 7
  return (
    <div className={`del-section del-section--${color}`}>
      <div className="del-section-title">
        <span className="del-section-icon">{icono}</span>
        {titulo} ({lista.length})
      </div>
      <div className="del-table-wrap">
        <table className="del-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Hora Inicio</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Cliente</th>
              <th>Repartidor</th>
              {conTiempo && <th>Tiempo</th>}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={cols} className="del-empty-row">No hay pedidos</td></tr>
            ) : lista.map(p => (
              <FilaDelivery key={p._id} p={p} activoId={activoId} onAbrir={onAbrir} conTiempo={conTiempo} />
            ))}
          </tbody>
        </table>
      </div>
      {mostrarMas && <button className="del-btn-mas">Mostrar más resultados</button>}
    </div>
  )
}

export default function Delivery({ productos = [] }) {
  const [datos, setDatos]     = useState({ enPreparacion: [], listoParaEntregar: [], enviados: [], entregados: [] })
  const [cargando, setCargando] = useState(true)

  const [panelPedido, setPanelPedido] = useState(null)
  const [creando, setCreando]         = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [itemsTemp, setItemsTemp]     = useState([])
  const [searchProd, setSearchProd]   = useState('')
  const [guardando, setGuardando]     = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(false)

  const cargar = useCallback(async (mostrarCarga = false) => {
    if (mostrarCarga) setCargando(true)
    try {
      const d = await deliveryService.listar()
      setDatos(d)
    } catch (e) {
      console.error(e)
    } finally {
      if (mostrarCarga) setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(true)
    const iv = setInterval(() => cargar(false), 15_000)
    return () => clearInterval(iv)
  }, [cargar])

  const abrirNuevo = () => {
    setCreando(true)
    setPanelPedido(null)
    setForm(EMPTY_FORM)
    setItemsTemp([])
    setSearchProd('')
    setConfirmEliminar(false)
  }

  const abrirPedido = (p) => {
    if (panelPedido?._id === p._id) return
    setPanelPedido(p)
    setCreando(false)
    setForm({
      nombre:          p.nombre || '',
      telefono:        p.telefono || '',
      calle:           p.direccion?.calle  || '',
      numeroDireccion: p.direccion?.numero || '',
      piso:            p.direccion?.piso   || '',
      barrio:          p.direccion?.barrio || '',
      repartidor:      p.repartidor      || '',
      tiempoEstimado:  p.tiempoEstimado  || '',
      costoEnvio:      p.costoEnvio != null ? String(p.costoEnvio) : '',
      comentario:      p.comentario     || '',
    })
    setItemsTemp([...p.items])
    setSearchProd('')
    setConfirmEliminar(false)
  }

  const cerrarPanel = () => {
    setPanelPedido(null)
    setCreando(false)
    setConfirmEliminar(false)
  }

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const agregarItem = (prod) => {
    setItemsTemp(prev => {
      const idx = prev.findIndex(i => i.nombre === prod.nombre)
      if (idx >= 0) return prev.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it)
      return [...prev, { nombre: prod.nombre, precio: prod.precio, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (nombre, delta) => {
    setItemsTemp(prev =>
      prev.map(i => i.nombre === nombre ? { ...i, cantidad: i.cantidad + delta } : i)
          .filter(i => i.cantidad > 0)
    )
  }

  const totalProductos = itemsTemp.reduce((s, i) => s + (i.precio || 0) * i.cantidad, 0)
  const totalConEnvio  = totalProductos + Number(form.costoEnvio || 0)

  const buildBody = (extraEstado) => ({
    nombre:         form.nombre,
    telefono:       form.telefono,
    direccion: {
      calle:  form.calle,
      numero: form.numeroDireccion,
      piso:   form.piso,
      barrio: form.barrio,
    },
    repartidor:     form.repartidor,
    tiempoEstimado: form.tiempoEstimado,
    costoEnvio:     Number(form.costoEnvio || 0),
    comentario:     form.comentario,
    items:          itemsTemp,
    total:          totalConEnvio,
    ...(extraEstado || {}),
  })

  const actualizarEnLista = (upd) => {
    setDatos(prev => {
      const sin = arr => arr.filter(p => p._id !== upd._id)
      const base = {
        enPreparacion:    sin(prev.enPreparacion),
        listoParaEntregar:sin(prev.listoParaEntregar),
        enviados:         sin(prev.enviados),
        entregados:       sin(prev.entregados),
      }
      if (upd.estado === 'en_preparacion')     return { ...base, enPreparacion:     [...base.enPreparacion,     upd] }
      if (upd.estado === 'listo_para_entregar')return { ...base, listoParaEntregar: [...base.listoParaEntregar, upd] }
      if (upd.estado === 'enviado')            return { ...base, enviados:  [upd, ...base.enviados].slice(0, 5) }
      if (upd.estado === 'entregado')          return { ...base, entregados:[upd, ...base.entregados].slice(0, 5) }
      return prev
    })
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      if (creando) {
        const nuevo = await deliveryService.crear(buildBody({ estado: 'en_preparacion' }))
        setDatos(prev => ({ ...prev, enPreparacion: [...prev.enPreparacion, nuevo] }))
        setPanelPedido(nuevo)
        setCreando(false)
      } else if (panelPedido) {
        const upd = await deliveryService.actualizar(panelPedido._id, buildBody())
        actualizarEnLista(upd)
        setPanelPedido(upd)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (nuevoEstado) => {
    if (!panelPedido) return
    setGuardando(true)
    try {
      const upd = await deliveryService.actualizar(panelPedido._id, buildBody({ estado: nuevoEstado }))
      actualizarEnLista(upd)
      setPanelPedido(upd)
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id) => {
    try {
      await deliveryService.eliminar(id)
      setDatos(prev => ({
        enPreparacion:    prev.enPreparacion.filter(p => p._id !== id),
        listoParaEntregar:prev.listoParaEntregar.filter(p => p._id !== id),
        enviados:         prev.enviados.filter(p => p._id !== id),
        entregados:       prev.entregados.filter(p => p._id !== id),
      }))
      if (panelPedido?._id === id) cerrarPanel()
    } catch (e) {
      console.error(e)
    }
  }

  const prodsFiltrados = productos.filter(p =>
    !searchProd || p.nombre.toLowerCase().includes(searchProd.toLowerCase())
  )

  const puedeEditar    = creando || (panelPedido && panelPedido.estado !== 'entregado')
  const estadoInfo     = panelPedido ? ESTADOS[panelPedido.estado] : null
  const activoId       = panelPedido?._id ?? null

  if (cargando) return <div className="del-loading">Cargando...</div>

  return (
    <div className="del-layout">

      {/* ── Panel izquierdo ── */}
      <div className="del-left">
        <div className="del-header">
          <h2 className="del-title">DELIVERY</h2>
          <button className="del-btn-nuevo" onClick={abrirNuevo}>
            <Plus size={15} /> Nuevo Pedido
          </button>
        </div>

        <div className="del-body">
          <SeccionDelivery
            titulo="EN PREPARACION" icono="···"
            lista={datos.enPreparacion} color="orange"
            conTiempo activoId={activoId} onAbrir={abrirPedido} mostrarMas
          />
          <SeccionDelivery
            titulo="LISTO PARA ENTREGAR" icono="→"
            lista={datos.listoParaEntregar} color="blue"
            activoId={activoId} onAbrir={abrirPedido}
          />
          <SeccionDelivery
            titulo="ENVIADOS" icono="↗"
            lista={datos.enviados} color="gris"
            activoId={activoId} onAbrir={abrirPedido} mostrarMas
          />
          <SeccionDelivery
            titulo="ENTREGADOS" icono="✓"
            lista={datos.entregados} color="green"
            activoId={activoId} onAbrir={abrirPedido} mostrarMas
          />
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="del-right">
        {!creando && !panelPedido ? (
          <div className="del-right-empty">
            <ChevronLeft size={18} />
            <span>Crear un nuevo pedido</span>
          </div>
        ) : (
          <div className="del-panel">

            {/* Header */}
            {confirmEliminar ? (
              <div className="del-panel-header del-panel-header--confirm">
                <span className="del-confirm-text">¿Eliminar pedido #{panelPedido?.numero}?</span>
                <button className="del-confirm-btn del-confirm-btn--cancel" onClick={() => setConfirmEliminar(false)}>Cancelar</button>
                <button className="del-confirm-btn del-confirm-btn--danger" onClick={() => eliminar(panelPedido._id)}>Eliminar</button>
              </div>
            ) : (
              <div className="del-panel-header">
                <button className="del-back" onClick={cerrarPanel}><ChevronLeft size={16} /></button>
                <span className="del-panel-title">
                  {creando ? 'NUEVO PEDIDO' : `PEDIDO #${panelPedido?.numero}`}
                </span>
                {estadoInfo && (
                  <span className="del-estado-badge">{estadoInfo.label}</span>
                )}
                {panelPedido && puedeEditar && (
                  <button className="del-panel-delete" onClick={() => setConfirmEliminar(true)} title="Eliminar">
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Body: form + productos */}
            <div className="del-panel-body">

              {/* Cliente */}
              <div className="del-form-grid">
                <div className="del-field">
                  <label>Nombre</label>
                  <input className="del-input" value={form.nombre} onChange={e => setF('nombre', e.target.value)} disabled={!puedeEditar} />
                </div>
                <div className="del-field">
                  <label>Teléfono</label>
                  <input className="del-input" value={form.telefono} onChange={e => setF('telefono', e.target.value)} disabled={!puedeEditar} />
                </div>
              </div>

              {/* Dirección */}
              <div className="del-field">
                <label>Dirección</label>
                <input className="del-input" placeholder="Calle" value={form.calle} onChange={e => setF('calle', e.target.value)} disabled={!puedeEditar} />
                <div className="del-input-row" style={{ marginTop: 6 }}>
                  <input className="del-input" placeholder="Número" value={form.numeroDireccion} onChange={e => setF('numeroDireccion', e.target.value)} disabled={!puedeEditar} />
                  <input className="del-input" placeholder="Piso / Depto" value={form.piso} onChange={e => setF('piso', e.target.value)} disabled={!puedeEditar} />
                </div>
                <input className="del-input" placeholder="Barrio" value={form.barrio} onChange={e => setF('barrio', e.target.value)} disabled={!puedeEditar} style={{ marginTop: 6 }} />
              </div>

              {/* Repartidor / Tiempo */}
              <div className="del-form-grid">
                <div className="del-field">
                  <label>Repartidor</label>
                  <input className="del-input" value={form.repartidor} onChange={e => setF('repartidor', e.target.value)} disabled={!puedeEditar} />
                </div>
                <div className="del-field">
                  <label>Tiempo estimado</label>
                  <select className="del-input del-select" value={form.tiempoEstimado} onChange={e => setF('tiempoEstimado', e.target.value)} disabled={!puedeEditar}>
                    <option value="">Sin especificar</option>
                    {TIEMPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="del-form-grid">
                <div className="del-field">
                  <label>Costo de envío</label>
                  <input className="del-input" type="number" min="0" value={form.costoEnvio} onChange={e => setF('costoEnvio', e.target.value)} disabled={!puedeEditar} />
                </div>
                <div className="del-field">
                  <label>Comentario</label>
                  <input className="del-input" value={form.comentario} onChange={e => setF('comentario', e.target.value)} disabled={!puedeEditar} />
                </div>
              </div>

              {/* Productos */}
              {puedeEditar && (
                <div className="del-selector">
                  <label className="del-field-label">Agregar productos</label>
                  <input
                    className="del-input"
                    placeholder="Buscar producto..."
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                  />
                  <div className="del-prods-grid">
                    {prodsFiltrados.map(p => (
                      <button key={p.id || p._id} className="del-prod" onClick={() => agregarItem(p)}>
                        <span className="del-prod-nombre">{p.nombre}</span>
                        <span className="del-prod-precio">{fmtPrecio(p.precio)}</span>
                      </button>
                    ))}
                    {prodsFiltrados.length === 0 && <span className="del-prod-empty">Sin productos</span>}
                  </div>
                </div>
              )}

            </div>

            {/* Items — siempre visible */}
            {itemsTemp.length > 0 && (
              <div className="del-items">
                {itemsTemp.map((it, i) => (
                  <div key={i} className="del-item">
                    <span className="del-item-nombre">{it.nombre}</span>
                    <div className="del-item-qty">
                      {puedeEditar && <button className="del-qty-btn" onClick={() => cambiarCantidad(it.nombre, -1)}><Minus size={11} /></button>}
                      <span>{it.cantidad}</span>
                      {puedeEditar && <button className="del-qty-btn" onClick={() => cambiarCantidad(it.nombre, 1)}><Plus size={11} /></button>}
                    </div>
                    <span className="del-item-precio">{fmtPrecio((it.precio || 0) * it.cantidad)}</span>
                  </div>
                ))}
                {Number(form.costoEnvio) > 0 && (
                  <div className="del-item del-item--envio">
                    <span className="del-item-nombre">Envío</span>
                    <span className="del-item-precio">{fmtPrecio(Number(form.costoEnvio))}</span>
                  </div>
                )}
                <div className="del-items-total">
                  <span>Total</span>
                  <strong>{fmtPrecio(totalConEnvio)}</strong>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="del-panel-footer">
              {puedeEditar && (
                <button className="del-btn-guardar" onClick={guardar} disabled={guardando}>
                  {creando ? 'Crear pedido' : 'Guardar cambios'}
                </button>
              )}
              {panelPedido && estadoInfo?.next && (
                <button
                  className={`del-btn-estado del-btn-estado--${estadoInfo.color}`}
                  onClick={() => cambiarEstado(estadoInfo.next)}
                  disabled={guardando}
                >
                  {estadoInfo.nextLabel} →
                </button>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  )
}
