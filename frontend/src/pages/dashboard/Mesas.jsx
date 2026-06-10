import { useState, useEffect, useRef } from 'react'
import { zonasService, mesasService, ventasService } from '../../services/api'
import { Armchair, Receipt } from 'lucide-react'
import './Mesas.css'

const COLS = 12
const ROWS = 8

const ESTADO_CONFIG = {
  libre:   { label: 'Libre',   color: '#22C55E' },
  ocupada: { label: 'Ocupada', color: '#EF4444' },
  cuenta:  { label: 'Cuenta',  color: '#f59e0b' },
}

const MESAS_DEFAULT = [
  { numero: 1, col: 0, row: 0 },
  { numero: 2, col: 1, row: 0 },
  { numero: 3, col: 2, row: 0 },
  { numero: 4, col: 4, row: 0 },
  { numero: 5, col: 0, row: 2 },
  { numero: 6, col: 1, row: 2 },
  { numero: 7, col: 2, row: 2 },
]

const formatDateTime = (d = new Date()) => {
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Mesas({ productos = [], categorias = [] }) {
  const [zonas, setZonas]           = useState([])
  const [zonaActiva, setZonaActiva] = useState(null)
  const [selected, setSelected]     = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [nombreZona, setNombreZona] = useState('')
  const [draggingId, setDraggingId]               = useState(null)
  const pointerDragRef = useRef(null) // { mesaId, startX, startY, active, cardEl, offsetX, offsetY, cardW, cardH }
  const dragCellRef    = useRef(null) // celda target actualizada en pointermove
  const ghostRef       = useRef(null) // elemento DOM clonado que sigue el dedo
  const wasDraggedRef  = useRef(false) // evita que el click que sigue al pointerup abra el detalle
  const [confirmarEliminar, setConfirmarEliminar] = useState(null) // { id, numero }
  const [showAgregarMesas, setShowAgregarMesas]   = useState(false)
  const [cantidadMesas, setCantidadMesas]         = useState(1)
  const [showSelector, setShowSelector]           = useState(false)
  const [catSelector, setCatSelector]             = useState(null)
  const [confirmarCerrar, setConfirmarCerrar]     = useState(null) // { id, numero }
  const [cargando, setCargando]                   = useState(true)
  const [isMobile, setIsMobile]                   = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
          const nuevas  = MESAS_DEFAULT.map(m => ({ ...m, zona: salon.id, estado: 'libre' }))
          const creadas = await mesasService.crearVarias(nuevas)
          if (cancelled) return
          setZonas([{ ...salon, mesas: creadas }])
          setZonaActiva(salon.id)
        } else {
          const zonasMapped = zonasData.map(z => ({
            ...z,
            mesas: mesasData.filter(m => m.zona === z.id),
          }))
          // Preferir la primera zona que tenga mesas; si todas están vacías, usar la primera
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
    // Ignorar clicks secundarios (botón derecho, etc.)
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
      // Aplicar pointer-events:none de forma inmediata (sin esperar re-render de React)
      // para que elementFromPoint encuentre la celda debajo en este mismo evento
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
    const mesa = zona.mesas.find(x => x.id === mesaId)
    if (mesa) imprimirTicket({ ...mesa, estado: 'cuenta' })
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
          mesa:   `Mesa ${m.numero}`,
          inicio: m.hora,
          cierre,
          items:  m.items,
        })
      } catch (e) {
        console.error('Error registrando venta:', e)
      }
    }
    actualizarMesaEnState(mesaId, { estado: 'libre', hora: null, items: [] })
    setSelected(null)
    setConfirmarCerrar(null)
    try {
      await mesasService.actualizar(mesaId, { estado: 'libre', hora: null, items: [] })
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
    setShowSelector(false)
    try {
      await mesasService.actualizar(mesaId, { items: nuevosItems })
    } catch (e) {
      console.error(e)
    }
  }

  const nuevoPedido = async (mesaId) => {
    const hora = formatDateTime()
    actualizarMesaEnState(mesaId, { estado: 'ocupada', hora, items: [] })
    try {
      await mesasService.actualizar(mesaId, { estado: 'ocupada', hora, items: [] })
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

  /* ── Render celdas (columnas/filas dinámicas según mesas existentes) ── */
  const maxRow = zona?.mesas.length > 0 ? Math.max(...zona.mesas.map(m => m.row)) : 0
  const maxCol = zona?.mesas.length > 0 ? Math.max(...zona.mesas.map(m => m.col)) : 0
  const displayRows = Math.max(3, maxRow + 4)
  // En mobile muestra solo las columnas necesarias; en desktop siempre COLS
  const displayCols = isMobile ? Math.max(6, Math.min(COLS, maxCol + 2)) : COLS

  const celdas = []
  for (let row = 0; row < displayRows; row++) {
    for (let col = 0; col < displayCols; col++) {
      const m = getMesaEnCelda(col, row)
      celdas.push({ col, row, mesa: m })
    }
  }

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
          <button className="mesas-add-mesa" onClick={() => setShowAgregarMesas(true)}>+ Mesa</button>
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
                    }}
                  >
                    <span className="mesa-numero">{m.numero}</span>
                    <span className="mesa-estado-dot" style={{ background: ESTADO_CONFIG[m.estado].color }} />
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
              {mesa.estado === 'ocupada' && mesa.hora && (
                <p className="mesa-detalle-hora">Desde las {mesa.hora.split(' ')[1]}</p>
              )}
            </div>

            {/* Items del pedido */}
            {mesa.estado === 'ocupada' && (
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
                    <span>Agregá items al pedido</span>
                  </div>
                )}
              </>
            )}

            {/* Acciones */}
            <div className="mesa-detalle-actions">
              {mesa.estado === 'libre' && (
                <button className="mesa-btn mesa-btn--primary" onClick={() => nuevoPedido(mesa.id)}>Abrir mesa</button>
              )}
              {mesa.estado === 'ocupada' && (
                <>
                  <button className="mesa-btn mesa-btn--primary" onClick={() => setShowSelector(true)}>+ Agregar producto</button>
                  <button className="mesa-btn mesa-btn--ticket" onClick={() => pedirCuenta(mesa.id)}>Imprimir ticket</button>
                </>
              )}
              {mesa.estado === 'cuenta' && (
                <>
                  <button className="mesa-btn mesa-btn--primary" onClick={() => setShowSelector(true)}>+ Agregar producto</button>
                  <button className="mesa-btn mesa-btn--ticket" onClick={() => imprimirTicket(mesa)}>Reimprimir ticket</button>
                  <button className="mesa-btn mesa-btn--secondary" onClick={() => setConfirmarCerrar({ id: mesa.id, numero: mesa.numero })}>Cobrado — Cerrar mesa</button>
                </>
              )}
              <button className="mesa-btn mesa-btn--danger" onClick={() => setConfirmarEliminar({ id: mesa.id, numero: mesa.numero })}>Eliminar mesa</button>
            </div>

          </div>
        )}
      </div>

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

      {/* Modal confirmar cerrar mesa */}
      {confirmarCerrar !== null && (
        <div className="mesas-modal-overlay" onClick={() => setConfirmarCerrar(null)}>
          <div className="mesas-modal" onClick={e => e.stopPropagation()}>
            <h3 className="mesas-modal-title">¿Cerrar mesa {confirmarCerrar.numero}?</h3>
            <p className="mesas-modal-sub">Se registrará la venta y se liberará la mesa.</p>
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => setConfirmarCerrar(null)}>Cancelar</button>
              <button className="mesa-btn mesa-btn--confirm-danger" onClick={() => cerrarMesa(confirmarCerrar.id)}>Sí, cerrar</button>
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

      {/* Modal selector de productos */}
      {showSelector && (
        <div className="mesas-modal-overlay">
          <div className="mesas-modal mesas-modal--selector">
            <h3 className="mesas-modal-title">Agregar producto — Mesa {mesa?.numero}</h3>

            <div className="selector-cats">
              <button
                className={`selector-cat ${catSelector === null ? 'selector-cat--active' : ''}`}
                onClick={() => setCatSelector(null)}
              >Todos</button>
              {categorias.map(c => (
                <button
                  key={c.id}
                  className={`selector-cat ${catSelector === c.id ? 'selector-cat--active' : ''}`}
                  onClick={() => setCatSelector(c.id)}
                >{c.nombre}</button>
              ))}
            </div>

            <div className="selector-productos">
              {productos
                .filter(p => catSelector === null || p.categoriaId === catSelector)
                .map(p => (
                  <button key={p.id} className="selector-prod" onClick={() => agregarProductoAlPedido(p)}>
                    <span className="selector-prod-nombre">{p.nombre}</span>
                    <span className="selector-prod-precio">${p.precio.toLocaleString('es-AR')}</span>
                  </button>
                ))
              }
            </div>

            <button className="mesa-btn mesa-btn--secondary" style={{ marginTop: 12 }} onClick={() => setShowSelector(false)}>Cerrar</button>
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
