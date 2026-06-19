import { useState, useEffect, useRef } from 'react'
import { zonasService, mesasService, ventasService } from '../../services/api'
import { Armchair, Receipt, Users } from 'lucide-react'
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
  const [draggingId, setDraggingId]               = useState(null)
  const pointerDragRef = useRef(null)
  const dragCellRef    = useRef(null)
  const ghostRef       = useRef(null)
  const wasDraggedRef  = useRef(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
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

  /* ── Drag unificado (Pointer Events — mouse + touch) ── */
  const handlePointerDown = (e, mesaId) => {
    if (e.button !== undefined && e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerDragRef.current = {
      mesaId,
      startX: e.clientX, startY: e.clientY,
      active: false,
      cardEl: e.currentTarget,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      cardW: rect.width, cardH: rect.height,
    }
    dragCellRef.current = null
  }

  const handlePointerMove = (e) => {
    const pd = pointerDragRef.current
    if (!pd) return
    const dx = e.clientX - pd.startX
    const dy = e.clientY - pd.startY
    if (!pd.active && Math.sqrt(dx * dx + dy * dy) < 8) return
    if (!pd.active) {
      pointerDragRef.current = { ...pd, active: true }
      pd.cardEl.style.pointerEvents = 'none'
      setDraggingId(pd.mesaId)
      setSelected(null)
      const ghost = pd.cardEl.cloneNode(true)
      Object.assign(ghost.style, {
        position: 'fixed',
        width: `${pd.cardW}px`,
        height: `${pd.cardH}px`,
        left: `${e.clientX - pd.offsetX}px`,
        top: `${e.clientY - pd.offsetY}px`,
        pointerEvents: 'none',
        opacity: '0.85',
        zIndex: '9999',
        transform: 'scale(1.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        transition: 'none',
      })
      document.body.appendChild(ghost)
      ghostRef.current = ghost
    }
    if (ghostRef.current) {
      ghostRef.current.style.left = `${e.clientX - pd.offsetX}px`
      ghostRef.current.style.top  = `${e.clientY - pd.offsetY}px`
    }
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const cellEl = el?.closest('[data-col][data-row]')
    if (cellEl) {
      dragCellRef.current = { col: parseInt(cellEl.dataset.col), row: parseInt(cellEl.dataset.row) }
    }
  }

  const handlePointerUp = () => {
    const pd = pointerDragRef.current
    if (!pd) return
    if (pd.cardEl) pd.cardEl.style.pointerEvents = ''
    pointerDragRef.current = null
    ghostRef.current?.remove()
    ghostRef.current = null
    if (!pd.active) { setDraggingId(null); return }
    wasDraggedRef.current = true
    setDraggingId(null)
    const cell = dragCellRef.current
    dragCellRef.current = null
    if (!cell) return
    const { col, row } = cell
    const { mesaId } = pd
    if (zona.mesas.some(m => m.col === col && m.row === row && m.id !== mesaId)) return
    actualizarMesaEnState(mesaId, { col, row })
    mesasService.actualizar(mesaId, { col, row }).catch(console.error)
  }

  const handlePointerCancel = () => {
    const pd = pointerDragRef.current
    if (pd?.cardEl) pd.cardEl.style.pointerEvents = ''
    pointerDragRef.current = null
    dragCellRef.current = null
    ghostRef.current?.remove()
    ghostRef.current = null
    setDraggingId(null)
  }

  /* ── Acciones de mesa ── */
  const imprimirTicket = (mesa) => {
    const fmtP = (n) => `$${Number(n).toLocaleString('es-AR')}`
    const total = mesa.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
    const filas = mesa.items.map(i =>
      `<tr><td>${i.cantidad}× ${i.nombre}</td><td style="text-align:right">${fmtP(i.precio * i.cantidad)}</td></tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mesa ${mesa.numero}</title>
    <style>
      body{font-family:monospace;width:300px;margin:0 auto;padding:12px;font-size:13px}
      h2{text-align:center;margin:4px 0}p.sub{text-align:center;color:#666;font-size:11px;margin:2px 0 10px}
      table{width:100%;border-collapse:collapse}td{padding:3px 0}
      .sep{border-top:1px dashed #000;margin:8px 0}
      .total td{font-size:15px;font-weight:bold;padding-top:6px}
      .hora{text-align:center;font-size:11px;color:#666;margin-top:10px}
    </style></head><body>
    <h2>Mesa ${mesa.numero}</h2>
    ${mesa.hora ? `<p class="sub">${mesa.hora}</p>` : ''}
    ${mesa.personas ? `<p class="sub">${mesa.personas} personas</p>` : ''}
    <div class="sep"></div>
    <table>${filas}</table>
    <div class="sep"></div>
    <table><tr class="total"><td>TOTAL</td><td style="text-align:right">${fmtP(total)}</td></tr></table>
    <p class="hora">¡Gracias!</p>
    </body></html>`
    const win = window.open('', '_blank', 'width=380,height=520')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  const pedirCuenta = async (mesaId) => {
    actualizarMesaEnState(mesaId, { estado: 'cuenta' })
    const m = zona.mesas.find(x => x.id === mesaId)
    if (m) imprimirTicket({ ...m, estado: 'cuenta' })
    try {
      await mesasService.actualizar(mesaId, { estado: 'cuenta' })
    } catch (e) {
      console.error(e)
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
      console.error(e)
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
      console.error(e)
    }
  }

  const quitarProductoDelPedido = async (nombre) => {
    const mesaId = selected
    const m = zona.mesas.find(x => x.id === mesaId)
    const items = (m.items || [])
      .map(i => i.nombre === nombre ? { ...i, cantidad: i.cantidad - 1 } : i)
      .filter(i => i.cantidad > 0)
    actualizarMesaEnState(mesaId, { items })
    try {
      await mesasService.actualizar(mesaId, { items })
    } catch (e) {
      console.error(e)
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
      console.error(e)
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
      console.error(e)
    }
    setShowAgregarMesas(false)
    setCantidadMesas(1)
  }

  const eliminarMesa = async (mesaId) => {
    try {
      await mesasService.eliminar(mesaId)
      setZonas(prev => prev.map(z =>
        z.id === zonaActiva ? { ...z, mesas: z.mesas.filter(m => m.id !== mesaId) } : z
      ))
    } catch (e) {
      console.error(e)
    }
    setConfirmarEliminar(null)
    setSelected(null)
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
      console.error(e)
    }
    setNombreZona('')
    setShowModal(false)
  }

  const eliminarZona = async (id) => {
    try {
      await zonasService.eliminar(id)
      const restantes = zonas.filter(z => z.id !== id)
      setZonas(restantes)
      if (zonaActiva === id) {
        setZonaActiva(restantes[0]?.id || null)
        setSelected(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  /* ── Render celdas ── */
  const maxRow = zona?.mesas.length > 0 ? Math.max(...zona.mesas.map(m => m.row)) : 0
  const maxCol = zona?.mesas.length > 0 ? Math.max(...zona.mesas.map(m => m.col)) : 0
  const displayRows = Math.max(3, maxRow + 4)
  const displayCols = Math.max(4, Math.min(COLS, maxCol + 3))

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
        <div className="mesas-tabs-row">
          <div className="mesas-tabs">
            {zonas.map(z => (
              <div key={z.id} className={`mesas-tab-wrap ${zonaActiva === z.id ? 'mesas-tab-wrap--active' : ''}`}>
                <button className="mesas-tab" onClick={() => { setZonaActiva(z.id); setSelected(null) }}>
                  {z.label}
                </button>
                {z.removible && (
                  <button className="mesas-tab-remove" onClick={() => eliminarZona(z.id)}>×</button>
                )}
              </div>
            ))}
          </div>
          <button className="mesas-add-zona" onClick={() => setShowModal(true)} title="Agregar zona">+</button>
          <div className="mesas-menu-hamb" ref={menuHambRef}>
            <button className="mesas-hamb-btn" onClick={() => setMenuHamb(v => !v)} title="Menú">☰</button>
            {menuHamb && (
              <div className="mesas-hamb-dropdown">
                <button onClick={() => { setMenuHamb(false); onIrAConfiguracion?.('salas') }}>
                  Configurar salas y mesas
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
          <span className="mesas-leyenda-hint">Arrastrá las mesas para acomodarlas</span>
        </div>

        {/* Grilla */}
        <div className="mesas-grid-wrap" style={{ cursor: draggingId ? 'grabbing' : undefined }}>
          <div className={`mesas-grid${draggingId ? ' mesas-grid--dragging' : ''}`} style={{ gridTemplateColumns: `repeat(${displayCols}, 1fr)` }}>
            {celdas.map(({ col, row, mesa: m }) => (
              <div
                key={`${col}-${row}`}
                data-col={col}
                data-row={row}
                className={`celda ${m ? '' : 'celda--vacia'} ${draggingId && !m ? 'celda--drop-target' : ''}`}
              >
                {m && (
                  <div
                    className={`mesa-card mesa-card--${m.estado} ${selected === m.id ? 'mesa-card--selected' : ''} ${draggingId === m.id ? 'mesa-card--dragging' : ''}`}
                    style={{ touchAction: 'none', userSelect: 'none', pointerEvents: draggingId === m.id ? 'none' : 'auto' }}
                    onPointerDown={e => handlePointerDown(e, m.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onClick={() => {
                      if (wasDraggedRef.current) { wasDraggedRef.current = false; return }
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
              <button className="mesa-btn mesa-btn--danger" onClick={() => setConfirmarEliminar({ id: mesa.id, numero: mesa.numero })}>
                Eliminar mesa
              </button>
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
                {montoPago && (
                  <div className="pago-vuelto">
                    Vuelto: <strong>${vuelto.toLocaleString('es-AR')}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="mesas-modal-actions" style={{ marginTop: 16 }}>
              <button className="mesa-btn mesa-btn--secondary" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button className="mesa-btn mesa-btn--confirm-danger" onClick={() => cerrarMesa(showPagoModal.mesaId)}>
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

      {/* Modal confirmar eliminar mesa */}
      {confirmarEliminar !== null && (
        <div className="mesas-modal-overlay" onClick={() => setConfirmarEliminar(null)}>
          <div className="mesas-modal" onClick={e => e.stopPropagation()}>
            <h3 className="mesas-modal-title">¿Eliminar mesa {confirmarEliminar.numero}?</h3>
            <p className="mesas-modal-sub">Esta acción no se puede deshacer.</p>
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
              <button className="mesa-btn mesa-btn--confirm-danger" onClick={() => eliminarMesa(confirmarEliminar.id)}>Sí, eliminar</button>
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
