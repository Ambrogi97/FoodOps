import { useState, useEffect, useRef } from 'react'
import { zonasService, mesasService, ventasService } from '../../services/api'
import { Armchair, Receipt, Users } from 'lucide-react'
import { imprimirComanda, imprimirTicket as imprimirTicketPapel } from '../../utils/impresion'
import './Mesas.css'

const COLS = 12
const ROWS = 8

const ESTADO_CONFIG = {
  libre:   { label: 'Libre',   color: '#22C55E' },
  ocupada: { label: 'Ocupada', color: '#EF4444' },
  cuenta:  { label: 'Cuenta',  color: '#f59e0b' },
}

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia']

const formatDateTime = (d = new Date()) => {
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Mesas({ productos = [], categorias = [], onIrAConfiguracion }) {
  const [zonas, setZonas]           = useState([])
  const [zonaActiva, setZonaActiva] = useState(null)
  const [selected, setSelected]     = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [nombreZona, setNombreZona] = useState('')
  const [showAgregarMesas, setShowAgregarMesas]   = useState(false)
  const [cantidadMesas, setCantidadMesas]         = useState(1)
  const [searchProducto, setSearchProducto]       = useState('')
  // Abrir mesa
  const [showAbrirModal, setShowAbrirModal]       = useState(null) // mesaId
  const [personasMesa, setPersonasMesa]           = useState(1)
  // Cerrar pedido / pago
  const [showPagoModal, setShowPagoModal]         = useState(null) // { mesaId, numero }
  const [metodoPago, setMetodoPago]               = useState('Efectivo')
  const [montoPago, setMontoPago]                 = useState('')
  const [cargando, setCargando]                   = useState(true)
  const [isMobile, setIsMobile]                   = useState(() => window.innerWidth <= 768)
  const [menuHamb, setMenuHamb]                   = useState(false)
  const menuHambRef                               = useRef(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!menuHamb) return
    const handler = (e) => { if (menuHambRef.current && !menuHambRef.current.contains(e.target)) setMenuHamb(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuHamb])

  /* ── Carga inicial ── */
  useEffect(() => {
    let cancelled = false
    const cargar = async () => {
      try {
        const [zonasData, mesasData] = await Promise.all([
          zonasService.listar(),
          mesasService.listar(),
        ])
        if (cancelled) return

        if (zonasData.length === 0) {
          const salon = await zonasService.crear({ label: 'Salón', removible: false })
          if (cancelled) return
          setZonas([{ ...salon, mesas: [] }])
          setZonaActiva(salon.id)
        } else {
          const zonasMapped = zonasData.map(z => ({
            ...z,
            mesas: mesasData.filter(m => m.zona === z.id),
          }))
          const zonaInicial = zonasMapped.find(z => z.mesas.length > 0) ?? zonasMapped[0]
          setZonas(zonasMapped)
          setZonaActiva(zonaInicial?.id || null)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setCargando(false)
      }
    }
    cargar()
    return () => { cancelled = true }
  }, [])

  const zona = zonas.find(z => z.id === zonaActiva)
  const mesa = zona?.mesas.find(m => m.id === selected)

  const getMesaEnCelda = (col, row) =>
    zona?.mesas.find(m => m.col === col && m.row === row)

  const nextNumero = () => {
    const all = zonas.flatMap(z => z.mesas)
    return all.length > 0 ? Math.max(...all.map(m => m.numero)) + 1 : 1
  }

  const actualizarMesaEnState = (mesaId, cambios) => {
    setZonas(prev => prev.map(z => ({
      ...z,
      mesas: z.mesas.map(m => m.id === mesaId ? { ...m, ...cambios } : m),
    })))
  }

  /* ── Acciones de mesa ── */
  const imprimirTicket = (mesa) => imprimirTicketPapel({
    tipo: `Mesa ${mesa.numero}${mesa.personas ? ` · ${mesa.personas} personas` : ""}`,
    fecha: new Date(), items: mesa.items || [],
  })

  // Comanda: solo lo que todavía no se mandó a cocina
  const pendientesCocina = (mesa) => (mesa?.items || [])
    .map(i => ({ ...i, cantidad: i.cantidad - (i.enviadoCant || 0) }))
    .filter(i => i.cantidad > 0)

  const enviarACocina = async (mesa) => {
    const pendientes = pendientesCocina(mesa)
    if (!pendientes.length) return
    await imprimirComanda({ origen: `MESA ${mesa.numero}`, personas: mesa.personas, items: pendientes, fecha: new Date() }, { productos, categorias })
    const items = mesa.items.map(i => ({ ...i, enviadoCant: i.cantidad }))
    actualizarMesaEnState(mesa.id, { items })
    try {
      await mesasService.actualizar(mesa.id, { items })
    } catch (e) {
      avisarError(e)
    }
  }

  const pedirCuenta = async (mesaId) => {
    actualizarMesaEnState(mesaId, { estado: 'cuenta' })
    const m = zona.mesas.find(x => x.id === mesaId)
    if (m) imprimirTicket({ ...m, estado: 'cuenta' })
    try {
      await mesasService.actualizar(mesaId, { estado: 'cuenta' })
    } catch (e) {
      avisarError(e)
    }
  }

  const cerrarMesa = async (mesaId) => {
    const m = zona.mesas.find(x => x.id === mesaId)
    if (m?.items?.length > 0 && m.hora) {
      const cierre = formatDateTime()
      try {
        await ventasService.crear({
          mesa:      `Mesa ${m.numero}`,
          inicio:    m.hora,
          cierre,
          items:     m.items,
          personas:  m.personas || 1,
          metodoPago,
        })
      } catch (e) {
        console.error('Error registrando venta:', e)
      }
    }
    actualizarMesaEnState(mesaId, { estado: 'libre', hora: null, items: [], personas: null })
    setSelected(null)
    setShowPagoModal(null)
    try {
      await mesasService.actualizar(mesaId, { estado: 'libre', hora: null, items: [], personas: null })
    } catch (e) {
      avisarError(e)
    }
  }

  const abrirMesaConDatos = async () => {
    const mesaId = showAbrirModal
    const hora = formatDateTime()
    const cambios = { estado: 'ocupada', hora, items: [], personas: personasMesa }
    actualizarMesaEnState(mesaId, cambios)
    setShowAbrirModal(null)
    setPersonasMesa(1)
    try {
      await mesasService.actualizar(mesaId, cambios)
    } catch (e) {
      avisarError(e)
    }
  }

  const quitarProductoDelPedido = async (nombre) => {
    const mesaId = selected
    const m = zona.mesas.find(x => x.id === mesaId)
    const items = (m.items || [])
      .map(i => i.nombre === nombre ? { ...i, cantidad: i.cantidad - 1, enviadoCant: Math.min(i.enviadoCant || 0, i.cantidad - 1) } : i)
      .filter(i => i.cantidad > 0)
    actualizarMesaEnState(mesaId, { items })
    try {
      await mesasService.actualizar(mesaId, { items })
    } catch (e) {
      avisarError(e)
    }
  }

  const agregarProductoAlPedido = async (producto) => {
    const mesaId = selected
    const m      = zona.mesas.find(x => x.id === mesaId)
    const items  = m.items || []
    const existe = items.find(i => i.nombre === producto.nombre)
    const nuevosItems = existe
      ? items.map(i => i.nombre === producto.nombre ? { ...i, cantidad: i.cantidad + 1 } : i)
      : [...items, { nombre: producto.nombre, cantidad: 1, precio: producto.precio }]
    actualizarMesaEnState(mesaId, { items: nuevosItems })
    try {
      await mesasService.actualizar(mesaId, { items: nuevosItems })
    } catch (e) {
      avisarError(e)
    }
  }

  const confirmarAgregarMesas = async () => {
    const cantidad       = Math.max(1, Math.min(cantidadMesas, 20))
    const celdasOcupadas = new Set(zona.mesas.map(m => `${m.col}-${m.row}`))
    let   numeroActual   = nextNumero()

    const nuevas = []
    for (let r = 0; r < ROWS && nuevas.length < cantidad; r++) {
      for (let c = 0; c < COLS && nuevas.length < cantidad; c++) {
        if (!celdasOcupadas.has(`${c}-${r}`)) {
          celdasOcupadas.add(`${c}-${r}`)
          nuevas.push({ numero: numeroActual++, zona: zonaActiva, col: c, row: r, estado: 'libre' })
        }
      }
    }
    if (nuevas.length === 0) return

    try {
      const creadas = await mesasService.crearVarias(nuevas)
      setZonas(prev => prev.map(z =>
        z.id === zonaActiva ? { ...z, mesas: [...z.mesas, ...creadas] } : z
      ))
    } catch (e) {
      avisarError(e)
    }
    setShowAgregarMesas(false)
    setCantidadMesas(1)
  }

  const agregarZona = async () => {
    const label = nombreZona.trim()
    if (!label) return
    try {
      const nueva = await zonasService.crear({ label, removible: true })
      setZonas([...zonas, { ...nueva, mesas: [] }])
      setZonaActiva(nueva.id)
      setSelected(null)
    } catch (e) {
      avisarError(e)
    }
    setNombreZona('')
    setShowModal(false)
  }

  /* ── Render celdas ── */
  const maxRow = zona?.mesas.length > 0 ? Math.max(...zona.mesas.map(m => m.row)) : 0
  const displayRows = Math.max(ROWS, maxRow + 4)
  const displayCols = COLS

  const celdas = []
  for (let row = 0; row < displayRows; row++) {
    for (let col = 0; col < displayCols; col++) {
      const m = getMesaEnCelda(col, row)
      celdas.push({ col, row, mesa: m })
    }
  }

  const productosFilter = productos.filter(p =>
    !searchProducto || p.nombre.toLowerCase().includes(searchProducto.toLowerCase())
  )

  // Para el modal de pago
  const mesaPago = showPagoModal ? zona?.mesas.find(x => x.id === showPagoModal.mesaId) : null
  const totalPago = mesaPago?.items?.reduce((acc, i) => acc + i.precio * i.cantidad, 0) || 0
  const montoNum = parseFloat(montoPago.replace(',', '.')) || 0
  const vuelto   = metodoPago === 'Efectivo' && montoPago ? Math.max(0, montoNum - totalPago) : 0
  // Si se carga un monto recibido en efectivo, tiene que cubrir el total
  const montoInsuficiente = metodoPago === 'Efectivo' && montoPago !== '' && montoNum < totalPago

  if (cargando) return (
    <div className="mesas-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Cargando...
    </div>
  )

  return (
    <div className="mesas-layout">

      {/* Izquierda */}
      <div className="mesas-left">

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div className="mesas-tabs-row" style={{ flex: 1, minWidth: 0 }}>
            <div className="mesas-tabs">
              {zonas.map(z => (
                <div key={z.id} className={`mesas-tab-wrap ${zonaActiva === z.id ? 'mesas-tab-wrap--active' : ''}`}>
                  <button className="mesas-tab" onClick={() => { setZonaActiva(z.id); setSelected(null) }}>
                    {z.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mesas-menu-hamb" ref={menuHambRef} style={{ flexShrink: 0 }}>
            <button className="mesas-hamb-btn" onClick={() => setMenuHamb(v => !v)} title="Menú">☰</button>
            {menuHamb && (
              <div className="mesas-hamb-dropdown">
                <button onClick={() => { setMenuHamb(false); onIrAConfiguracion?.('salas') }}>
                  Ir a salas y mesas en configuración
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resumen */}
        <div className="mesas-resumen">
          <div className="mesas-resumen-item mesas-resumen-item--ocupada">
            <span className="mesas-resumen-num">{zona?.mesas.filter(m => m.estado === 'ocupada').length ?? 0}</span>
            <span>Ocupadas</span>
          </div>
          <div className="mesas-resumen-sep" />
          <div className="mesas-resumen-item mesas-resumen-item--cuenta">
            <span className="mesas-resumen-num">{zona?.mesas.filter(m => m.estado === 'cuenta').length ?? 0}</span>
            <span>Cuenta</span>
          </div>
          <div className="mesas-resumen-sep" />
          <div className="mesas-resumen-item mesas-resumen-item--libre">
            <span className="mesas-resumen-num">{zona?.mesas.filter(m => m.estado === 'libre').length ?? 0}</span>
            <span>Libres</span>
          </div>
          <div className="mesas-resumen-sep" />
          <div className="mesas-resumen-item">
            <span className="mesas-resumen-num">{zona?.mesas.length ?? 0}</span>
            <span>Total</span>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mesas-leyenda">
          {Object.entries(ESTADO_CONFIG).map(([key, val]) => (
            <span key={key} className="mesas-leyenda-item">
              <span className="mesas-leyenda-dot" style={{ background: val.color }} />
              {val.label}
            </span>
          ))}
        </div>

        {/* Grilla */}
        <div className="mesas-grid-wrap">
          <div className="mesas-grid" style={{ gridTemplateColumns: isMobile ? `repeat(${displayCols}, 58px)` : `repeat(${displayCols}, 1fr)` }}>
            {celdas.map(({ col, row, mesa: m }) => (
              <div
                key={`${col}-${row}`}
                data-col={col}
                data-row={row}
                className={`celda ${m ? '' : 'celda--vacia'}`}
              >
                {m && (
                  <div
                    className={`mesa-card mesa-card--${m.estado} ${selected === m.id ? 'mesa-card--selected' : ''}`}
                    onClick={() => {
                      setSelected(selected === m.id ? null : m.id)
                      setSearchProducto('')
                    }}
                  >
                    <span className="mesa-numero">{m.numero}</span>
                    {m.estado !== 'libre' && m.personas > 0 && (
                      <span className="mesa-personas-badge">
                        <Users size={11} />
                        {m.personas}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Backdrop para bottom-sheet en mobile */}
      {mesa && <div className="mesas-backdrop" onClick={() => setSelected(null)} />}

      {/* Derecha */}
      <div className={`mesas-right${mesa ? ' mesas-right--open' : ''}`}>
        {!mesa ? (
          <div className="mesas-empty">
            <span className="mesas-empty-icon"><Armchair size={40} /></span>
            <p>Seleccioná una mesa</p>
            <span>para ver su estado</span>
          </div>
        ) : (
          <div className="mesa-detalle">

            {/* Header */}
            <div className="mesa-detalle-header">
              <div
                className="mesa-detalle-badge"
                style={{ background: ESTADO_CONFIG[mesa.estado].color + '20', color: ESTADO_CONFIG[mesa.estado].color }}
              >
                {ESTADO_CONFIG[mesa.estado].label}
              </div>
              <h2 className="mesa-detalle-title">Mesa {mesa.numero}</h2>
              <p className="mesa-detalle-salon">{zona.label}</p>
              {mesa.estado !== 'libre' && mesa.hora && (
                <div className="mesa-detalle-meta">
                  {mesa.personas > 0 && (
                    <span className="mesa-detalle-personas"><Users size={12} /> {mesa.personas} personas</span>
                  )}
                  <span className="mesa-detalle-hora">Desde {mesa.hora.split(' ')[1]}</span>
                </div>
              )}
            </div>

            {/* ADICIONAR — inline cuando la mesa está activa */}
            {(mesa.estado === 'ocupada' || mesa.estado === 'cuenta') && (
              <div className="mesa-adicionar">
                <div className="mesa-adicionar-label">ADICIONAR</div>
                <input
                  className="mesa-adicionar-search"
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchProducto}
                  onChange={e => setSearchProducto(e.target.value)}
                />
                <div className="mesa-adicionar-chips">
                  {productosFilter.length > 0
                    ? productosFilter.slice(0, 24).map(p => (
                        <button key={p.id} className="mesa-chip" onClick={() => agregarProductoAlPedido(p)}>
                          {p.nombre}
                        </button>
                      ))
                    : <span className="mesa-chip-empty">Sin resultados</span>
                  }
                  {productos.length === 0 && (
                    <span className="mesa-chip-empty">Agregá productos en el módulo Productos</span>
                  )}
                </div>
              </div>
            )}

            {/* Items del pedido */}
            {(mesa.estado === 'ocupada' || mesa.estado === 'cuenta') && (
              <>
                {mesa.items && mesa.items.length > 0 ? (
                  <>
                    <div className="mesa-pedido-items">
                      {mesa.items.map((item, i) => (
                        <div key={i} className="mesa-pedido-item">
                          <span className="mesa-pedido-cantidad">{item.cantidad}×</span>
                          <span className="mesa-pedido-nombre">{item.nombre}</span>
                          <span className="mesa-pedido-precio">${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                          <button className="mesa-pedido-quitar" onClick={() => quitarProductoDelPedido(item.nombre)} title="Quitar">×</button>
                        </div>
                      ))}
                    </div>
                    <div className="mesa-pedido-total">
                      <span>Total</span>
                      <strong>${mesa.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0).toLocaleString('es-AR')}</strong>
                    </div>
                  </>
                ) : (
                  <div className="mesa-pedido-empty">
                    <span><Receipt size={32} /></span>
                    <p>Sin productos</p>
                    <span>Usá ADICIONAR para agregar items</span>
                  </div>
                )}
              </>
            )}

            {/* Acciones */}
            <div className="mesa-detalle-actions">
              {mesa.estado === 'libre' && (
                <button
                  className="mesa-btn mesa-btn--primary"
                  onClick={() => { setShowAbrirModal(mesa.id); setPersonasMesa(1) }}
                >
                  Abrir mesa
                </button>
              )}
              {mesa.estado === 'ocupada' && (
                <>
                  <button
                    className="mesa-btn mesa-btn--primary"
                    onClick={() => { setShowPagoModal({ mesaId: mesa.id, numero: mesa.numero }); setMontoPago(''); setMetodoPago('Efectivo') }}
                  >
                    Cerrar pedido
                  </button>
                  <button className="mesa-btn mesa-btn--ticket" onClick={() => pedirCuenta(mesa.id)}>
                    Imprimir ticket
                  </button>
                  <button
                    className="mesa-btn mesa-btn--ticket"
                    onClick={() => enviarACocina(mesa)}
                    disabled={pendientesCocina(mesa).length === 0}
                    title={pendientesCocina(mesa).length === 0 ? "No hay productos nuevos para enviar" : "Imprimir comanda con lo nuevo"}
                  >
                    Enviar a cocina{pendientesCocina(mesa).length > 0 ? ` (${pendientesCocina(mesa).reduce((s, i) => s + i.cantidad, 0)})` : ""}
                  </button>
                </>
              )}
              {mesa.estado === 'cuenta' && (
                <>
                  <button
                    className="mesa-btn mesa-btn--primary"
                    onClick={() => { setShowPagoModal({ mesaId: mesa.id, numero: mesa.numero }); setMontoPago(''); setMetodoPago('Efectivo') }}
                  >
                    Cerrar pedido
                  </button>
                  <button className="mesa-btn mesa-btn--ticket" onClick={() => imprimirTicket(mesa)}>
                    Reimprimir ticket
                  </button>
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modal: Abrir mesa */}
      {showAbrirModal && (
        <div className="mesas-modal-overlay" onClick={() => setShowAbrirModal(null)}>
          <div className="mesas-modal" onClick={e => e.stopPropagation()}>
            <h3 className="mesas-modal-title">Abrir mesa {zona?.mesas.find(m => m.id === showAbrirModal)?.numero}</h3>
            <p className="mesas-modal-sub">Ingresá los datos para iniciar el pedido.</p>
            <label className="mesas-modal-field-label">Personas</label>
            <div className="mesas-cantidad-wrap">
              <button className="mesas-cantidad-btn" onClick={() => setPersonasMesa(v => Math.max(1, v - 1))}>−</button>
              <input
                className="mesas-cantidad-input"
                type="number"
                min="1"
                max="50"
                value={personasMesa}
                onChange={e => setPersonasMesa(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <button className="mesas-cantidad-btn" onClick={() => setPersonasMesa(v => Math.min(50, v + 1))}>+</button>
            </div>
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => setShowAbrirModal(null)}>Cancelar</button>
              <button className="mesa-btn mesa-btn--primary" onClick={abrirMesaConDatos}>Abrir mesa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cerrar pedido / Pago */}
      {showPagoModal && (
        <div className="mesas-modal-overlay" onClick={() => setShowPagoModal(null)}>
          <div className="mesas-modal mesas-modal--pago" onClick={e => e.stopPropagation()}>
            <h3 className="mesas-modal-title">Cerrar pedido — Mesa {showPagoModal.numero}</h3>

            {mesaPago?.items?.length > 0 && (
              <div className="pago-items">
                {mesaPago.items.map((item, i) => (
                  <div key={i} className="pago-item">
                    <span>{item.cantidad}× {item.nombre}</span>
                    <span>${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                  </div>
                ))}
                <div className="pago-total-row">
                  <span>TOTAL</span>
                  <strong>${totalPago.toLocaleString('es-AR')}</strong>
                </div>
              </div>
            )}

            <label className="mesas-modal-field-label" style={{ marginTop: 12, display: 'block' }}>Medio de pago</label>
            <div className="pago-metodos">
              {METODOS_PAGO.map(m => (
                <button
                  key={m}
                  className={`pago-metodo-btn${metodoPago === m ? ' pago-metodo-btn--active' : ''}`}
                  onClick={() => setMetodoPago(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            {metodoPago === 'Efectivo' && (
              <div style={{ marginTop: 12 }}>
                <label className="mesas-modal-field-label">Monto recibido</label>
                <input
                  className="mesas-modal-input"
                  type="number"
                  placeholder={`Mínimo $${totalPago.toLocaleString('es-AR')}`}
                  value={montoPago}
                  onChange={e => setMontoPago(e.target.value)}
                  style={{ marginBottom: 0 }}
                  autoFocus
                />
                {montoPago && !montoInsuficiente && (
                  <div className="pago-vuelto">
                    Vuelto: <strong>${vuelto.toLocaleString('es-AR')}</strong>
                  </div>
                )}
                {montoInsuficiente && (
                  <div className="pago-vuelto" style={{ color: '#dc2626' }}>
                    Faltan <strong>${(totalPago - montoNum).toLocaleString('es-AR')}</strong> para cubrir el total
                  </div>
                )}
              </div>
            )}

            <div className="mesas-modal-actions" style={{ marginTop: 16 }}>
              <button className="mesa-btn mesa-btn--secondary" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button
                className="mesa-btn mesa-btn--confirm-danger"
                onClick={() => cerrarMesa(showPagoModal.mesaId)}
                disabled={montoInsuficiente}
                style={montoInsuficiente ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                Cerrar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar mesas */}
      {showAgregarMesas && (
        <div className="mesas-modal-overlay">
          <div className="mesas-modal">
            <h3 className="mesas-modal-title">Agregar mesas</h3>
            <p className="mesas-modal-sub">¿Cuántas mesas querés agregar a <strong>{zona?.label}</strong>?</p>
            <div className="mesas-cantidad-wrap">
              <button className="mesas-cantidad-btn" onClick={() => setCantidadMesas(v => Math.max(1, v - 1))}>−</button>
              <input
                className="mesas-cantidad-input"
                type="number"
                min="1"
                max="20"
                value={cantidadMesas}
                onChange={e => setCantidadMesas(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <button className="mesas-cantidad-btn" onClick={() => setCantidadMesas(v => Math.min(20, v + 1))}>+</button>
            </div>
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => { setShowAgregarMesas(false); setCantidadMesas(1) }}>Cancelar</button>
              <button className="mesa-btn mesa-btn--primary" onClick={confirmarAgregarMesas}>Agregar</button>
            </div>
          </div>
        </div>
      )}


      {/* Modal agregar zona */}
      {showModal && (
        <div className="mesas-modal-overlay">
          <div className="mesas-modal">
            <h3 className="mesas-modal-title">Nueva zona</h3>
            <p className="mesas-modal-sub">Podés agregar sectores como Terraza, VIP, Jardín, etc.</p>
            <input
              className="mesas-modal-input"
              type="text"
              placeholder="Ej: Terraza"
              value={nombreZona}
              onChange={e => setNombreZona(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarZona()}
              autoFocus
            />
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => { setShowModal(false); setNombreZona('') }}>Cancelar</button>
              <button className="mesa-btn mesa-btn--primary" onClick={agregarZona} disabled={!nombreZona.trim()}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { avisarError } from '../../utils/avisos'