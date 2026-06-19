import { useState, useEffect, useCallback } from 'react'
import { mostradorService } from '../../services/api'
import { Plus, Search, ChevronLeft, X, Minus, ShoppingBag } from 'lucide-react'
import './Mostrador.css'

const fmt = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(2)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const fmtPrecio = (n) => `$${Number(n || 0).toFixed(2).replace('.', ',')}`

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia']

export default function Mostrador({ productos = [] }) {
  const [enCurso, setEnCurso]   = useState([])
  const [cerradas, setCerradas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  const [panelPedido, setPanelPedido] = useState(null)
  const [creando, setCreando]         = useState(false)
  const [cliente, setCliente]         = useState('')
  const [itemsTemp, setItemsTemp]     = useState([])
  const [searchProd, setSearchProd]   = useState('')
  const [cerrando, setCerrando]       = useState(false)
  const [metodoPago, setMetodoPago]   = useState('Efectivo')
  const [guardando, setGuardando]     = useState(false)

  const cargar = useCallback(async (mostrarCarga = false) => {
    if (mostrarCarga) setCargando(true)
    try {
      const { enCurso: ec, cerradas: ce } = await mostradorService.listar()
      setEnCurso(ec)
      setCerradas(ce)
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
    setPanelPedido(null)
    setCreando(true)
    setCliente('')
    setItemsTemp([])
    setSearchProd('')
    setCerrando(false)
    setMetodoPago('Efectivo')
  }

  const abrirPedido = (p) => {
    if (panelPedido?._id === p._id) return
    if (creando && itemsTemp.length > 0) return
    setPanelPedido(p)
    setCreando(false)
    setCliente(p.cliente || '')
    setItemsTemp([...p.items])
    setSearchProd('')
    setCerrando(false)
    setMetodoPago('Efectivo')
  }

  const cerrarPanel = () => {
    setPanelPedido(null)
    setCreando(false)
    setCerrando(false)
  }

  const agregarItem = (prod) => {
    setItemsTemp(prev => {
      const idx = prev.findIndex(i => i.nombre === prod.nombre)
      if (idx >= 0) {
        return prev.map((item, i) => i === idx ? { ...item, cantidad: item.cantidad + 1 } : item)
      }
      return [...prev, { nombre: prod.nombre, precio: prod.precio, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (nombre, delta) => {
    setItemsTemp(prev =>
      prev.map(i => i.nombre === nombre ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter(i => i.cantidad > 0)
    )
  }

  const totalTemp = itemsTemp.reduce((s, i) => s + (i.precio || 0) * i.cantidad, 0)

  const guardar = async () => {
    if (itemsTemp.length === 0) return
    setGuardando(true)
    try {
      const body = { items: itemsTemp, total: totalTemp, cliente, estado: 'en_curso' }
      if (creando) {
        const nuevo = await mostradorService.crear(body)
        setEnCurso(prev => [...prev, nuevo])
        setPanelPedido(nuevo)
        setCreando(false)
      } else if (panelPedido) {
        const upd = await mostradorService.actualizar(panelPedido._id, body)
        setEnCurso(prev => prev.map(p => p._id === upd._id ? upd : p))
        setPanelPedido(upd)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const cobrar = async () => {
    if (!panelPedido) return
    setGuardando(true)
    try {
      const upd = await mostradorService.actualizar(panelPedido._id, {
        items: itemsTemp, total: totalTemp, cliente, estado: 'cerrada', metodoPago,
      })
      setEnCurso(prev => prev.filter(p => p._id !== upd._id))
      setCerradas(prev => [upd, ...prev].slice(0, 5))
      cerrarPanel()
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id) => {
    try {
      await mostradorService.eliminar(id)
      setEnCurso(prev => prev.filter(p => p._id !== id))
      if (panelPedido?._id === id) cerrarPanel()
    } catch (e) {
      console.error(e)
    }
  }

  const esCerrado = panelPedido?.estado === 'cerrada'

  const prodsFiltrados = productos.filter(p =>
    !searchProd || p.nombre.toLowerCase().includes(searchProd.toLowerCase())
  )

  const filtrar = (lista) => !busqueda ? lista : lista.filter(p =>
    String(p.numero).includes(busqueda) ||
    (p.cliente || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  if (cargando) return <div className="most-loading">Cargando...</div>

  return (
    <div className="most-layout">

      {/* ── Panel izquierdo ── */}
      <div className="most-left">

        <div className="most-header">
          <h2 className="most-title">MOSTRADOR</h2>
          <button className="most-btn-nuevo" onClick={abrirNuevo}>
            <Plus size={15} /> Nuevo Pedido
          </button>
        </div>

        <div className="most-search-row">
          <Search size={15} className="most-search-icon" />
          <input
            className="most-search"
            placeholder="Buscar por número o cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* EN CURSO */}
        <div className="most-section">
          <div className="most-section-label">EN CURSO</div>
          <table className="most-table">
            <thead>
              <tr>
                <th>ID / Etiqueta</th>
                <th>Hora Inicio</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtrar(enCurso).length === 0 ? (
                <tr><td colSpan={5} className="most-empty-row">Sin pedidos activos</td></tr>
              ) : filtrar(enCurso).map(p => (
                <tr
                  key={p._id}
                  className={`most-row${panelPedido?._id === p._id ? ' most-row--active' : ''}`}
                  onClick={() => abrirPedido(p)}
                >
                  <td className="most-td-id">
                    <span className="most-bar most-bar--curso" />
                    {p.numero}
                  </td>
                  <td>{fmt(p.createdAt)}</td>
                  <td><span className="most-badge most-badge--curso">En curso</span></td>
                  <td className="most-td-muted">{p.cliente || '—'}</td>
                  <td className="most-td-total">{fmtPrecio(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CERRADAS */}
        <div className="most-section">
          <div className="most-section-label">CERRADAS (ÚLTIMAS 5)</div>
          <table className="most-table">
            <thead>
              <tr>
                <th>ID / Etiqueta</th>
                <th>Hora Inicio</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtrar(cerradas).length === 0 ? (
                <tr><td colSpan={5} className="most-empty-row">Sin pedidos cerrados</td></tr>
              ) : filtrar(cerradas).map(p => (
                <tr
                  key={p._id}
                  className={`most-row${panelPedido?._id === p._id ? ' most-row--active' : ''}`}
                  onClick={() => abrirPedido(p)}
                >
                  <td className="most-td-id">
                    <span className="most-bar most-bar--cerrada" />
                    {p.numero}
                  </td>
                  <td>{fmt(p.createdAt)}</td>
                  <td><span className="most-badge most-badge--cerrada">Cerrada</span></td>
                  <td className="most-td-muted">{p.cliente || '—'}</td>
                  <td className="most-td-total">{fmtPrecio(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── Panel derecho ── */}
      <div className="most-right">
        {!creando && !panelPedido ? (
          <div className="most-right-empty">
            <ChevronLeft size={18} />
            <span>Crear un nuevo pedido</span>
          </div>
        ) : (
          <div className="most-panel">

            {/* Header */}
            <div className="most-panel-header">
              <button className="most-back" onClick={cerrarPanel}>
                <ChevronLeft size={16} />
              </button>
              <span className="most-panel-title">
                {creando ? 'Nuevo pedido' : `Pedido #${panelPedido?.numero}`}
              </span>
              {panelPedido && !esCerrado && (
                <button className="most-panel-delete" onClick={() => eliminar(panelPedido._id)} title="Eliminar pedido">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Panel body */}
            <div className="most-panel-body">

              <div className="most-field">
                <label>Cliente (opcional)</label>
                <input
                  className="most-input"
                  placeholder="Nombre del cliente"
                  value={cliente}
                  onChange={e => setCliente(e.target.value)}
                  disabled={esCerrado}
                />
              </div>

              {/* Selector productos primero */}
              {!esCerrado && (
                <div className="most-selector">
                  <input
                    className="most-input"
                    placeholder="Buscar producto..."
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                  />
                  <div className="most-prods-grid">
                    {prodsFiltrados.map(p => (
                      <button key={p.id || p._id} className="most-prod" onClick={() => agregarItem(p)}>
                        <span className="most-prod-nombre">{p.nombre}</span>
                        <span className="most-prod-precio">{fmtPrecio(p.precio)}</span>
                      </button>
                    ))}
                    {prodsFiltrados.length === 0 && (
                      <span className="most-prod-empty">Sin productos</span>
                    )}
                  </div>
                </div>
              )}

              {/* Items debajo de la grid */}
              {itemsTemp.length > 0 && (
                <div className="most-items">
                  {itemsTemp.map((it, i) => (
                    <div key={i} className="most-item">
                      <span className="most-item-nombre">{it.nombre}</span>
                      <div className="most-item-qty">
                        {!esCerrado && (
                          <button className="most-qty-btn" onClick={() => cambiarCantidad(it.nombre, -1)}>
                            <Minus size={11} />
                          </button>
                        )}
                        <span>{it.cantidad}</span>
                        {!esCerrado && (
                          <button className="most-qty-btn" onClick={() => cambiarCantidad(it.nombre, 1)}>
                            <Plus size={11} />
                          </button>
                        )}
                      </div>
                      <span className="most-item-precio">{fmtPrecio((it.precio || 0) * it.cantidad)}</span>
                    </div>
                  ))}
                  <div className="most-items-total">
                    <span>Total</span>
                    <strong>{fmtPrecio(totalTemp)}</strong>
                  </div>
                </div>
              )}

            </div>

            {/* Acciones */}
            {!esCerrado && !cerrando && (
              <div className="most-panel-footer">
                <button
                  className="most-btn-guardar"
                  onClick={guardar}
                  disabled={itemsTemp.length === 0 || guardando}
                >
                  <ShoppingBag size={15} />
                  {creando ? 'Crear pedido' : 'Guardar cambios'}
                </button>
                {panelPedido && (
                  <button className="most-btn-cobrar" onClick={() => setCerrando(true)}>
                    Cerrar y cobrar
                  </button>
                )}
              </div>
            )}

            {/* Cobro */}
            {cerrando && (
              <div className="most-cobro">
                <div className="most-cobro-title">Método de pago</div>
                <div className="most-cobro-metodos">
                  {METODOS.map(m => (
                    <button
                      key={m}
                      className={`most-cobro-btn${metodoPago === m ? ' most-cobro-btn--active' : ''}`}
                      onClick={() => setMetodoPago(m)}
                    >{m}</button>
                  ))}
                </div>
                <div className="most-cobro-total">
                  <span>Total a cobrar</span>
                  <strong>{fmtPrecio(totalTemp)}</strong>
                </div>
                <div className="most-cobro-actions">
                  <button className="most-btn-cancel" onClick={() => setCerrando(false)}>Cancelar</button>
                  <button className="most-btn-confirmar" onClick={cobrar} disabled={guardando}>
                    Confirmar cobro
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  )
}
