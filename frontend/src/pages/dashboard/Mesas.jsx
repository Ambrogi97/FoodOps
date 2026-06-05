import { useState } from 'react'
import './Mesas.css'

const COLS = 12
const ROWS = 8

const ESTADO_CONFIG = {
  libre:   { label: 'Libre',   color: '#22C55E' },
  ocupada: { label: 'Ocupada', color: '#EF4444' },
}

const ZONAS_INICIALES = [
  {
    id: 'salon',
    label: 'Salón',
    removible: false,
    mesas: [
      { id: 1, estado: 'libre',   col: 0, row: 0 },
      { id: 2, estado: 'ocupada', col: 1, row: 0, cliente: 'Mesa 2',        hora: '20:15', items: [{ nombre: 'Pizza Margarita', cantidad: 1, precio: 13000 }, { nombre: 'Coca Cola', cantidad: 2, precio: 3500 }] },
      { id: 3, estado: 'libre',   col: 2, row: 0 },
      { id: 4, estado: 'ocupada', col: 4, row: 0, cliente: 'Belgrano 1373', hora: '19:50', items: [] },
      { id: 5, estado: 'libre',   col: 0, row: 2 },
      { id: 6, estado: 'ocupada', col: 1, row: 2, cliente: 'Mesa 6',        hora: '20:30', items: [{ nombre: 'Panuzzo Crudo', cantidad: 2, precio: 13500 }] },
      { id: 7, estado: 'libre',   col: 2, row: 2 },
    ],
  },
]

export default function Mesas({ productos = [], categorias = [] }) {
  const [zonas, setZonas]           = useState(ZONAS_INICIALES)
  const [zonaActiva, setZonaActiva] = useState('salon')
  const [selected, setSelected]     = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [nombreZona, setNombreZona] = useState('')
  const [draggingId, setDraggingId]               = useState(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [showAgregarMesas, setShowAgregarMesas]   = useState(false)
  const [cantidadMesas, setCantidadMesas]         = useState(1)
  const [showSelector, setShowSelector]           = useState(false)
  const [catSelector, setCatSelector]             = useState(null)
  const [confirmarCerrar, setConfirmarCerrar]     = useState(null)

  const zona = zonas.find(z => z.id === zonaActiva)
  const mesa = zona?.mesas.find(m => m.id === selected)

  const getMesaEnCelda = (col, row) =>
    zona?.mesas.find(m => m.col === col && m.row === row)

  /* ── Drag & Drop ── */
  const handleDragStart = (e, mesaId) => {
    e.dataTransfer.setData('mesaId', String(mesaId))
    setDraggingId(mesaId)
    setSelected(null)
  }

  const handleDragEnd = () => setDraggingId(null)

  const handleDrop = (e, col, row) => {
    e.preventDefault()
    const mesaId = parseInt(e.dataTransfer.getData('mesaId'))
    const ocupada = zona.mesas.some(m => m.col === col && m.row === row && m.id !== mesaId)
    if (ocupada) return
    setZonas(prev => prev.map(z =>
      z.id === zonaActiva
        ? { ...z, mesas: z.mesas.map(m => m.id === mesaId ? { ...m, col, row } : m) }
        : z
    ))
    setDraggingId(null)
  }

  const handleDragOver = (e) => e.preventDefault()

  /* ── Acciones ── */
  const cerrarMesa = (mesaId) => {
    setZonas(zonas.map(z =>
      z.id === zonaActiva
        ? { ...z, mesas: z.mesas.map(m => m.id === mesaId
            ? { id: m.id, estado: 'libre', col: m.col, row: m.row }
            : m) }
        : z
    ))
    setSelected(null)
  }

  const quitarProductoDelPedido = (nombre) => {
    const mesaId = selected
    const zonaId = zonaActiva
    setZonas(prev => prev.map(z =>
      z.id === zonaId ? {
        ...z, mesas: z.mesas.map(m => {
          if (m.id !== mesaId) return m
          const items = (m.items || [])
            .map(i => i.nombre === nombre ? { ...i, cantidad: i.cantidad - 1 } : i)
            .filter(i => i.cantidad > 0)
          return { ...m, items }
        })
      } : z
    ))
  }

  const agregarProductoAlPedido = (producto) => {
    const zonaId   = zonaActiva
    const mesaId   = selected
    setZonas(prev => prev.map(z =>
      z.id === zonaId ? {
        ...z, mesas: z.mesas.map(m => {
          if (m.id !== mesaId) return m
          const items = m.items || []
          const existe = items.find(i => i.nombre === producto.nombre)
          return {
            ...m,
            items: existe
              ? items.map(i => i.nombre === producto.nombre ? { ...i, cantidad: i.cantidad + 1 } : i)
              : [...items, { nombre: producto.nombre, cantidad: 1, precio: producto.precio }]
          }
        })
      } : z
    ))
    setShowSelector(false)
  }

  const nuevoPedido = (mesaId) => {
    const hora    = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    const zonaId  = zonaActiva
    setZonas(prev => prev.map(z =>
      z.id === zonaId
        ? { ...z, mesas: z.mesas.map(m => m.id === mesaId ? { ...m, estado: 'ocupada', hora, items: [] } : m) }
        : z
    ))
  }

  const confirmarAgregarMesas = () => {
    const cantidad = Math.max(1, Math.min(cantidadMesas, 20))
    const celdasOcupadas = new Set(zona.mesas.map(m => `${m.col}-${m.row}`))
    const idsUsados = new Set(zonas.flatMap(z => z.mesas.map(m => m.id)))

    const siguienteId = (desde = 1) => {
      let id = desde
      while (idsUsados.has(id)) id++
      return id
    }

    const nuevas = []
    let idActual = 1

    for (let r = 0; r < ROWS && nuevas.length < cantidad; r++) {
      for (let c = 0; c < COLS && nuevas.length < cantidad; c++) {
        if (!celdasOcupadas.has(`${c}-${r}`)) {
          celdasOcupadas.add(`${c}-${r}`)
          idActual = siguienteId(idActual)
          idsUsados.add(idActual)
          nuevas.push({ id: idActual, estado: 'libre', col: c, row: r })
          idActual++
        }
      }
    }

    if (nuevas.length === 0) return
    setZonas(zonas.map(z =>
      z.id === zonaActiva
        ? { ...z, mesas: [...z.mesas, ...nuevas] }
        : z
    ))
    setShowAgregarMesas(false)
    setCantidadMesas(1)
  }

  const eliminarMesa = (mesaId) => {
    // Eliminar la mesa y renumerar todas las mesas de todas las zonas
    const zonasActualizadas = zonas.map(z =>
      z.id === zonaActiva
        ? { ...z, mesas: z.mesas.filter(m => m.id !== mesaId) }
        : z
    )

    // Recolectar todas las mesas en orden (por zona, luego por row y col)
    // y asignar IDs consecutivos desde 1
    let contador = 1
    const zonasRenumeradas = zonasActualizadas.map(z => ({
      ...z,
      mesas: [...z.mesas]
        .sort((a, b) => a.row - b.row || a.col - b.col)
        .map(m => ({ ...m, id: contador++ })),
    }))

    setConfirmarEliminar(null)
    setSelected(null)
    setZonas(zonasRenumeradas)
  }

  const agregarZona = () => {
    const nombre = nombreZona.trim()
    if (!nombre) return
    const id = nombre.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    setZonas([...zonas, { id, label: nombre, removible: true, mesas: [] }])
    setZonaActiva(id)
    setSelected(null)
    setNombreZona('')
    setShowModal(false)
  }

  const eliminarZona = (id) => {
    setZonas(zonas.filter(z => z.id !== id))
    if (zonaActiva === id) { setZonaActiva('salon'); setSelected(null) }
  }

  /* ── Render celdas ── */
  const celdas = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const m = getMesaEnCelda(col, row)
      celdas.push({ col, row, mesa: m })
    }
  }

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
        <div className="mesas-grid-wrap">
          <div className="mesas-grid">
            {celdas.map(({ col, row, mesa: m }) => (
              <div
                key={`${col}-${row}`}
                className={`celda ${m ? '' : 'celda--vacia'} ${draggingId && !m ? 'celda--drop-target' : ''}`}
                onDrop={e => handleDrop(e, col, row)}
                onDragOver={handleDragOver}
              >
                {m && (
                  <div
                    className={`mesa-card mesa-card--${m.estado} ${selected === m.id ? 'mesa-card--selected' : ''} ${draggingId === m.id ? 'mesa-card--dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, m.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelected(selected === m.id ? null : m.id)}
                  >
                    <span className="mesa-numero">{m.id}</span>
                    <span className="mesa-estado-dot" style={{ background: ESTADO_CONFIG[m.estado].color }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Derecha */}
      <div className="mesas-right">
        {!mesa ? (
          <div className="mesas-empty">
            <span className="mesas-empty-icon">🪑</span>
            <p>Seleccioná una mesa</p>
            <span>para ver su estado</span>
          </div>
        ) : (
          <div className="mesa-detalle">

            {/* Header siempre visible */}
            <div className="mesa-detalle-header">
              <div
                className="mesa-detalle-badge"
                style={{ background: ESTADO_CONFIG[mesa.estado].color + '20', color: ESTADO_CONFIG[mesa.estado].color }}
              >
                {ESTADO_CONFIG[mesa.estado].label}
              </div>
              <h2 className="mesa-detalle-title">Mesa {mesa.id}</h2>
              <p className="mesa-detalle-salon">{zona.label}</p>
              {mesa.estado === 'ocupada' && mesa.hora && (
                <p className="mesa-detalle-hora">Desde las {mesa.hora}</p>
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
                  <button className="mesa-btn mesa-btn--secondary" onClick={() => setConfirmarCerrar(mesa.id)}>Cerrar mesa</button>
                </>
              )}
              <button className="mesa-btn mesa-btn--danger" onClick={() => setConfirmarEliminar(mesa.id)}>Eliminar mesa</button>
            </div>

          </div>
        )}
      </div>

      {/* Modal agregar mesas */}
      {showAgregarMesas && (
        <div className="mesas-modal-overlay" onClick={() => setShowAgregarMesas(false)}>
          <div className="mesas-modal" onClick={e => e.stopPropagation()}>
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
            <h3 className="mesas-modal-title">¿Cerrar mesa {confirmarCerrar}?</h3>
            <p className="mesas-modal-sub">Se perderá el pedido actual. Esta acción no se puede deshacer.</p>
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => setConfirmarCerrar(null)}>Cancelar</button>
              <button className="mesa-btn mesa-btn--confirm-danger" onClick={() => cerrarMesa(confirmarCerrar)}>Sí, cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar mesa */}
      {confirmarEliminar !== null && (
        <div className="mesas-modal-overlay" onClick={() => setConfirmarEliminar(null)}>
          <div className="mesas-modal" onClick={e => e.stopPropagation()}>
            <h3 className="mesas-modal-title">¿Eliminar mesa {confirmarEliminar}?</h3>
            <p className="mesas-modal-sub">Esta acción no se puede deshacer.</p>
            <div className="mesas-modal-actions">
              <button className="mesa-btn mesa-btn--secondary" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
              <button className="mesa-btn mesa-btn--confirm-danger" onClick={() => eliminarMesa(confirmarEliminar)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selector de productos */}
      {showSelector && (
        <div className="mesas-modal-overlay" onClick={() => setShowSelector(false)}>
          <div className="mesas-modal mesas-modal--selector" onClick={e => e.stopPropagation()}>
            <h3 className="mesas-modal-title">Agregar producto — Mesa {selected}</h3>

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
        <div className="mesas-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mesas-modal" onClick={e => e.stopPropagation()}>
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
