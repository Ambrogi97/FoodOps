import { useState, useEffect, useRef } from 'react'
import { zonasService, mesasService } from '../../services/api'
import { Pencil, Trash2, Check } from 'lucide-react'
import './ConfigSalasYMesas.css'

const COLS = 12
const ROWS = 8

export default function ConfigSalasYMesas() {
  const [zonas, setZonas]           = useState([])
  const [zonaActiva, setZonaActiva] = useState(null)
  const [mesasSel, setMesasSel]     = useState(null)
  const [cargando, setCargando]     = useState(true)
  const [draggingId, setDraggingId] = useState(null)
  const pointerDragRef = useRef(null)
  const dragCellRef    = useRef(null)
  const ghostRef       = useRef(null)
  const wasDraggedRef  = useRef(false)

  // Modal nueva zona
  const [showModalZona, setShowModalZona] = useState(false)
  const [nombreZona, setNombreZona]       = useState('')

  // Edición zona
  const [editandoZona, setEditandoZona]   = useState(false)
  const [nombreZonaEdit, setNombreZonaEdit] = useState('')

  // Edición mesa
  const [editMesaNumero, setEditMesaNumero] = useState('')
  const [guardandoMesa, setGuardandoMesa]   = useState(false)

  // Modal agregar mesas
  const [showModalMesas, setShowModalMesas] = useState(false)
  const [cantidadMesas, setCantidadMesas]   = useState(1)

  const combinar = (zonasData, mesasData) =>
    zonasData.map(z => ({ ...z, mesas: mesasData.filter(m => m.zona === z.id) }))

  useEffect(() => {
    const cargar = async () => {
      try {
        const [zonasData, mesasData] = await Promise.all([
          zonasService.listar(),
          mesasService.listarFresh(),
        ])
        const zs = combinar(zonasData, mesasData)
        setZonas(zs)
        if (zs.length > 0) setZonaActiva(zs[0].id)
      } catch (e) {
        console.error(e)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const recargar = async () => {
    const [zonasData, mesasData] = await Promise.all([
      zonasService.listar(),
      mesasService.listarFresh(),
    ])
    const zs = combinar(zonasData, mesasData)
    setZonas(zs)
    if (zonaActiva && !zs.find(z => z.id === zonaActiva)) setZonaActiva(zs[0]?.id ?? null)
  }

  const zona = zonas.find(z => z.id === zonaActiva)

  // Grid fijo, índices 0-based igual que la vista de restaurante
  const displayCols = COLS
  const displayRows = ROWS
  const celdas = []
  for (let row = 0; row < displayRows; row++) {
    for (let col = 0; col < displayCols; col++) {
      celdas.push({ col, row })
    }
  }

  const mesaEnPos = (col, row) => zona?.mesas?.find(m => m.col === col && m.row === row)

  /* ── Drag mesas en config ── */
  const handlePointerDown = (e, m) => {
    if (e.button !== undefined && e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerDragRef.current = {
      mesaId: m.id, startX: e.clientX, startY: e.clientY, active: false,
      cardEl: e.currentTarget, offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top, cardW: rect.width, cardH: rect.height,
    }
    dragCellRef.current = null
  }

  const handlePointerMove = (e) => {
    const pd = pointerDragRef.current
    if (!pd) return
    const dx = e.clientX - pd.startX, dy = e.clientY - pd.startY
    if (!pd.active && Math.sqrt(dx * dx + dy * dy) < 6) return
    if (!pd.active) {
      pointerDragRef.current = { ...pd, active: true }
      pd.cardEl.style.opacity = '0.3'
      setDraggingId(pd.mesaId)
      setMesasSel(null)
      const ghost = pd.cardEl.cloneNode(true)
      Object.assign(ghost.style, {
        position: 'fixed', width: `${pd.cardW}px`, height: `${pd.cardH}px`,
        left: `${e.clientX - pd.offsetX}px`, top: `${e.clientY - pd.offsetY}px`,
        pointerEvents: 'none', opacity: '0.85', zIndex: '9999',
        transform: 'scale(1.08)', transition: 'none',
        boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
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
    if (cellEl) dragCellRef.current = { col: +cellEl.dataset.col, row: +cellEl.dataset.row }
  }

  const handlePointerUp = async () => {
    const pd = pointerDragRef.current
    if (!pd) return
    if (pd.cardEl) pd.cardEl.style.opacity = ''
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
    if (zona?.mesas?.some(m => m.col === col && m.row === row && m.id !== mesaId)) return
    setZonas(prev => prev.map(z => ({
      ...z, mesas: (z.mesas || []).map(m => m.id === mesaId ? { ...m, col, row } : m),
    })))
    try { await mesasService.actualizar(mesaId, { col, row }) }
    catch (e) { console.error(e); await recargar() }
  }

  const handlePointerCancel = () => {
    const pd = pointerDragRef.current
    if (pd?.cardEl) pd.cardEl.style.opacity = ''
    pointerDragRef.current = null
    dragCellRef.current = null
    ghostRef.current?.remove()
    ghostRef.current = null
    setDraggingId(null)
  }

  // Crear zona
  const crearZona = async () => {
    if (!nombreZona.trim()) return
    try {
      const nueva = await zonasService.crear({ label: nombreZona.trim() })
      setZonas(prev => [...prev, { ...nueva, mesas: [] }])
      setZonaActiva(nueva.id)
      setNombreZona('')
      setShowModalZona(false)
    } catch (e) { console.error(e) }
  }

  // Eliminar TODAS las mesas (limpieza de emergencia)
  const eliminarTodasMesas = async () => {
    if (!window.confirm('¿Eliminar TODAS las mesas? Esta acción no se puede deshacer.')) return
    try {
      await mesasService.eliminarTodas()
      setMesasSel(null)
      await recargar()
    } catch (e) {
      alert('Error: ' + (e.message || e))
    }
  }

  // Eliminar zona
  const eliminarZona = async (id) => {
    if (!window.confirm('¿Eliminar esta sala y todas sus mesas?')) return
    try {
      await zonasService.eliminar(id)
      await recargar()
    } catch (e) { console.error(e) }
  }

  // Guardar nombre zona
  const guardarNombreZona = async () => {
    if (!nombreZonaEdit.trim() || !zonaActiva) return
    try {
      // Usamos actualizar de la zona si existe, si no solo actualizamos localmente
      setZonas(prev => prev.map(z => z.id === zonaActiva ? { ...z, label: nombreZonaEdit.trim() } : z))
      setEditandoZona(false)
    } catch (e) { console.error(e) }
  }

  // Abrir edición mesa
  const abrirMesa = (m) => {
    setMesasSel(m)
    setEditMesaNumero(String(m.numero))
  }

  // Guardar edición mesa
  const guardarMesa = async () => {
    if (!mesasSel) return
    setGuardandoMesa(true)
    try {
      await mesasService.actualizar(mesasSel.id, { numero: Number(editMesaNumero) })
      await recargar()
      setMesasSel(null)
    } catch (e) { console.error(e) }
    finally { setGuardandoMesa(false) }
  }

  // Eliminar mesa (el backend renumera automáticamente)
  const eliminarMesa = async () => {
    if (!mesasSel) return
    if (!window.confirm(`¿Eliminar la mesa ${mesasSel.numero}?`)) return
    try {
      await mesasService.eliminar(mesasSel.id)
      setMesasSel(null)
      await recargar()
    } catch (e) {
      console.error('Error eliminarMesa:', e)
      alert('Error al eliminar: ' + (e.message || e))
    }
  }

  // Agregar mesas nuevas
  const agregarMesas = async () => {
    if (!zonaActiva || cantidadMesas < 1) return
    const todasMesas = zonas.flatMap(z => z.mesas || [])
    const maxNum = todasMesas.length > 0 ? Math.max(...todasMesas.map(m => m.numero)) : 0
    const nuevas = []
    let col = zona?.mesas?.length > 0 ? Math.max(...zona.mesas.map(m => m.col)) + 1 : 0
    let row = 0
    for (let i = 0; i < cantidadMesas; i++) {
      if (col >= COLS) { col = 0; row++ }
      while (zona?.mesas?.some(m => m.col === col && m.row === row)) {
        col++
        if (col >= COLS) { col = 0; row++ }
      }
      nuevas.push({ numero: maxNum + i + 1, zona: zonaActiva, col, row })
      col++
    }
    try {
      await mesasService.crearVarias(nuevas)
      await recargar()
      setShowModalMesas(false)
      setCantidadMesas(1)
    } catch (e) { console.error(e) }
  }

  if (cargando) return <div className="csm-loading">Cargando...</div>

  return (
    <div className="csm-layout">

      {/* Izquierda: grid */}
      <div className="csm-left">
        {/* Tabs de salas */}
        <div className="csm-tabs-row">
          <div className="csm-tabs">
            {zonas.map(z => (
              <button
                key={z.id}
                className={`csm-tab${zonaActiva === z.id ? ' csm-tab--active' : ''}`}
                onClick={() => { setZonaActiva(z.id); setMesasSel(null) }}
              >
                {z.label}
              </button>
            ))}
          </div>
          <button className="csm-btn-nueva-sala" onClick={() => setShowModalZona(true)}>+ Nueva Sala</button>
          <button className="csm-btn-add-mesa" onClick={() => setShowModalMesas(true)}>+ Mesa</button>
          <button className="csm-btn-limpiar" onClick={eliminarTodasMesas} title="Eliminar todas las mesas">🗑 Limpiar todo</button>
        </div>

        {/* Grid */}
        <div className="csm-grid-wrap">
          {!zona ? (
            <p className="csm-empty">No hay salas. Creá una nueva sala.</p>
          ) : (
            <div
              className="csm-grid"
            >
              {celdas.map(({ col, row }) => {
                const m = mesaEnPos(col, row)
                return (
                  <div
                    key={`${col}-${row}`}
                    data-col={col}
                    data-row={row}
                    className={`csm-celda${m ? '' : ' csm-celda--vacia'}${draggingId && !m ? ' csm-celda--drop-target' : ''}`}
                  >
                    {m && (
                      <div
                        className={`csm-mesa${mesasSel?.id === m.id ? ' csm-mesa--selected' : ''}${draggingId === m.id ? ' csm-mesa--dragging' : ''}`}
                        style={{ touchAction: 'none', userSelect: 'none', pointerEvents: draggingId === m.id ? 'none' : 'auto' }}
                        onPointerDown={e => handlePointerDown(e, m)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onClick={() => {
                          if (wasDraggedRef.current) { wasDraggedRef.current = false; return }
                          abrirMesa(m)
                        }}
                      >
                        {m.numero}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Derecha: panel info */}
      <div className="csm-right">
        {zona && (
          <>
            {/* Header zona */}
            <div className="csm-zona-header">
              {editandoZona ? (
                <div className="csm-zona-edit">
                  <input
                    className="csm-zona-input"
                    value={nombreZonaEdit}
                    onChange={e => setNombreZonaEdit(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && guardarNombreZona()}
                    autoFocus
                  />
                  <button className="csm-zona-save" onClick={guardarNombreZona}><Check size={14} /></button>
                </div>
              ) : (
                <div className="csm-zona-title-row">
                  <span className="csm-zona-nombre">{zona.label.toUpperCase()}</span>
                  <button className="csm-zona-icon-btn" onClick={() => { setEditandoZona(true); setNombreZonaEdit(zona.label) }} title="Editar">
                    <Pencil size={14} />
                  </button>
                  {zona.removible && (
                    <button className="csm-zona-icon-btn csm-zona-icon-btn--danger" onClick={() => eliminarZona(zona.id)} title="Eliminar sala">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Detalle mesa seleccionada */}
            {mesasSel ? (
              <div className="csm-mesa-panel">
                <div className="csm-mesa-panel-title">MESA {mesasSel.numero}</div>
                <div className="csm-field">
                  <label>Número</label>
                  <input
                    className="csm-input"
                    type="number"
                    min={1}
                    value={editMesaNumero}
                    onChange={e => setEditMesaNumero(e.target.value)}
                  />
                </div>
                <div className="csm-field">
                  <label>Sala</label>
                  <div className="csm-input csm-input--readonly">{zona.label}</div>
                </div>
                <div className="csm-mesa-actions">
                  <button className="csm-btn-cancel" onClick={() => setMesasSel(null)}>Cancelar</button>
                  <button className="csm-btn-guardar" onClick={guardarMesa} disabled={guardandoMesa}>Guardar</button>
                </div>
                <button className="csm-btn-eliminar-mesa" onClick={eliminarMesa}>
                  <Trash2 size={13} /> Eliminar mesa
                </button>
              </div>
            ) : (
              <div className="csm-right-hint">
                Hacé clic en una mesa para editarla
              </div>
            )}
          </>
        )}
        {!zona && (
          <div className="csm-right-hint">Seleccioná o creá una sala</div>
        )}
      </div>

      {/* Modal nueva zona */}
      {showModalZona && (
        <div className="csm-modal-overlay" onClick={() => setShowModalZona(false)}>
          <div className="csm-modal" onClick={e => e.stopPropagation()}>
            <div className="csm-modal-title">Nueva sala</div>
            <input
              className="csm-input"
              placeholder="Nombre de la sala"
              value={nombreZona}
              onChange={e => setNombreZona(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && crearZona()}
              autoFocus
            />
            <div className="csm-modal-actions">
              <button className="csm-btn-cancel" onClick={() => setShowModalZona(false)}>Cancelar</button>
              <button className="csm-btn-guardar" onClick={crearZona} disabled={!nombreZona.trim()}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar mesas */}
      {showModalMesas && (
        <div className="csm-modal-overlay" onClick={() => setShowModalMesas(false)}>
          <div className="csm-modal" onClick={e => e.stopPropagation()}>
            <div className="csm-modal-title">Agregar mesas</div>
            <div className="csm-field">
              <label>Cantidad de mesas</label>
              <div className="csm-cantidad-row">
                <button className="csm-cantidad-btn" onClick={() => setCantidadMesas(v => Math.max(1, v - 1))}>−</button>
                <input
                  className="csm-cantidad-input"
                  type="number"
                  min={1}
                  value={cantidadMesas}
                  onChange={e => setCantidadMesas(Math.max(1, Number(e.target.value)))}
                />
                <button className="csm-cantidad-btn" onClick={() => setCantidadMesas(v => v + 1)}>+</button>
              </div>
            </div>
            <div className="csm-modal-actions">
              <button className="csm-btn-cancel" onClick={() => setShowModalMesas(false)}>Cancelar</button>
              <button className="csm-btn-guardar" onClick={agregarMesas}>Agregar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
