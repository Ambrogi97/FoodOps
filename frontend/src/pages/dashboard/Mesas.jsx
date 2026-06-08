import { useState, useEffect, useRef } from 'react'
import { zonasService, mesasService, ventasService } from '../../services/api'
import './Mesas.css'

const COLS = 12
const ROWS = 8

const ESTADO_CONFIG = {
  libre:   { label: 'Libre',   color: '#22C55E' },
  ocupada: { label: 'Ocupada', color: '#EF4444' },
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
  const draggingRef                               = useRef(null)
  const dragOverCellRef                           = useRef(null)
  const zonaRef                                   = useRef(null)
  const gridWrapRef                               = useRef(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null) // { id, numero }
  const [showAgregarMesas, setShowAgregarMesas]   = useState(false)
  const [cantidadMesas, setCantidadMesas]         = useState(1)
  const [showSelector, setShowSelector]           = useState(false)
  const [catSelector, setCatSelector]             = useState(null)
  const [confirmarCerrar, setConfirmarCerrar]     = useState(null) // { id, numero }
  const [cargando, setCargando]                   = useState(true)

  /* ── Carga inicial ── */
  useEffect(() => {
    const cargar = async () => {
      try {
        const [zonasData, mesasData] = await Promise.all([
          zonasService.listar(),
          mesasService.listar(),
        ])

        if (zonasData.length === 0) {
          const salon    = await zonasService.crear({ label: 'Salón', removible: false })
          const nuevas   = MESAS_DEFAULT.map(m => ({ ...m, zona: salon.id, estado: 'libre' }))
          const creadas  = await mesasService.crearVarias(nuevas)
          setZonas([{ ...salon, mesas: creadas }])
          setZonaActiva(salon.id)
        } else {
          const zonasMapped = zonasData.map(z => ({
            ...z,
            mesas: mesasData.filter(m => m.zona === z.id),
          }))
          setZonas(zonasMapped)
          setZonaActiva(zonasMapped[0]?.id || null)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const zona = zonas.find(z => z.id === zonaActiva)
  zonaRef.current = zona  // Mantener ref sincronizada para los listeners nativos
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

  /* ── Drag & Drop ── */
  // Listeners nativos para dragover/drop — evitan que React los delegue al root,
  // lo que haría que preventDefault() llegue tarde y el browser ignore el drop.
  useEffect(() => {
    const el = gridWrapRef.current
    if (!el) return

    const onDragOver = (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const cellEl = e.target.closest('[data-col][data-row]')
      if (cellEl) {
        dragOverCellRef.current = {
          col: parseInt(cellEl.dataset.col),
          row: parseInt(cellEl.dataset.row),
        }
      }
    }

    const onDrop = (e) => {
      e.preventDefault()
      const mesaId = draggingRef.current || e.dataTransfer.getData('text/plain')
      draggingRef.current = null
      if (!mesaId) return
      const target = dragOverCellRef.current
      dragOverCellRef.current = null
      if (!target) return
      const { col, row } = target
      const z = zonaRef.current
      if (!z) return
      if (z.mesas.some(m => m.col === col && m.row === row && m.id !== mesaId)) return
      setZonas(prev => prev.map(zn => ({
        ...zn,
        mesas: zn.mesas.map(m => m.id === mesaId ? { ...m, col, row } : m),
      })))
      setDraggingId(null)
      mesasService.actualizar(mesaId, { col, row }).catch(console.error)
    }

    el.addEventListener('dragover', onDragOver)
    el.addEventListener('drop', onDrop)
    return () => {
      el.removeEventListener('dragover', onDragOver)
      el.removeEventListener('drop', onDrop)
    }
  }, [cargando])

  const handleDragStart = (e, mesaId) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', mesaId)
    draggingRef.current = mesaId
    dragOverCellRef.current = null
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    e.dataTransfer.setDragImage(card, rect.width / 2, rect.height / 2)
    setDraggingId(mesaId)
    setSelected(null)
  }

  const handleDragEnd = () => {
    // No resetear los refs aquí — el handler nativo onDrop los resetea.
    // Si dragend se dispara antes que drop (race condition en algunos browsers),
    // los refs deben seguir válidos cuando llegue el drop.
    setDraggingId(null)
  }

  /* ── Acciones de mesa ── */
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

  /* ── Render celdas (solo hasta la última fila usada + 2 buffer) ── */
  const maxRow = zona?.mesas.length > 0
    ? Math.max(...zona.mesas.map(m => m.row))
    : 0
  const displayRows = Math.max(3, maxRow + 2)

  const celdas = []
  for (let row = 0; row < displayRows; row++) {
    for (let col = 0; col < COLS; col++) {
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
        <div ref={gridWrapRef} className="mesas-grid-wrap">
          <div className={`mesas-grid${draggingId ? ' mesas-grid--dragging' : ''}`}>
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
                    draggable
                    onDragStart={e => handleDragStart(e, m.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelected(selected === m.id ? null : m.id)}
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
            <span className="mesas-empty-icon">🪑</span>
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
                    <span>🧾</span>
                    <p>Sin productos</p>
                    <span>Agregá items al pedido</span>
                  </div>
                )}
              </>
            )}

            {/* Acciones */}
            <div className="mesa-detalle-actions">
              {mesa.estado === 'libre' ? (
                <button className="mesa-btn mesa-btn--primary" onClick={() => nuevoPedido(mesa.id)}>Abrir mesa</button>
              ) : (
                <>
                  <button className="mesa-btn mesa-btn--primary" onClick={() => setShowSelector(true)}>+ Agregar producto</button>
                  <button className="mesa-btn mesa-btn--secondary" onClick={() => setConfirmarCerrar({ id: mesa.id, numero: mesa.numero })}>Cerrar mesa</button>
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
