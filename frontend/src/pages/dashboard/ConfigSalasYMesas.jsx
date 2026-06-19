import { useState, useEffect } from 'react'
import { zonasService, mesasService } from '../../services/api'
import { Pencil, Trash2, Check } from 'lucide-react'
import './ConfigSalasYMesas.css'

const COLS = 12
const ROWS = 8

export default function ConfigSalasYMesas() {
  const [zonas, setZonas]           = useState([])
  const [zonaActiva, setZonaActiva] = useState(null)
  const [mesasSel, setMesasSel]     = useState(null) // mesa seleccionada para editar
  const [cargando, setCargando]     = useState(true)

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

  useEffect(() => {
    const cargar = async () => {
      try {
        const zs = await zonasService.listar()
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
    const zs = await zonasService.listar()
    setZonas(zs)
    if (zonaActiva && !zs.find(z => z.id === zonaActiva)) setZonaActiva(zs[0]?.id ?? null)
  }

  const zona = zonas.find(z => z.id === zonaActiva)

  // Grid de posiciones
  const maxCol = zona ? Math.max(0, ...zona.mesas.map(m => m.col)) : 0
  const maxRow = zona ? Math.max(0, ...zona.mesas.map(m => m.row)) : 0
  const displayCols = Math.max(6, Math.min(COLS, maxCol + 3))
  const displayRows = Math.max(5, Math.min(ROWS, maxRow + 3))
  const celdas = []
  for (let row = 1; row <= displayRows; row++) {
    for (let col = 1; col <= displayCols; col++) {
      celdas.push({ col, row })
    }
  }

  const mesaEnPos = (col, row) => zona?.mesas.find(m => m.col === col && m.row === row)

  // Crear zona
  const crearZona = async () => {
    if (!nombreZona.trim()) return
    try {
      const nueva = await zonasService.crear({ label: nombreZona.trim() })
      setZonas(prev => [...prev, nueva])
      setZonaActiva(nueva.id)
      setNombreZona('')
      setShowModalZona(false)
    } catch (e) { console.error(e) }
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

  // Eliminar mesa
  const eliminarMesa = async (id) => {
    try {
      await mesasService.eliminar(id)
      await recargar()
      setMesasSel(null)
    } catch (e) { console.error(e) }
  }

  // Agregar mesas nuevas
  const agregarMesas = async () => {
    if (!zonaActiva || cantidadMesas < 1) return
    const maxNum = zonas.flatMap(z => z.mesas).reduce((m, t) => Math.max(m, t.numero), 0)
    const nuevas = []
    let col = (zona?.mesas.length > 0 ? Math.max(...zona.mesas.map(m => m.col)) : 0) + 1
    let row = 1
    for (let i = 0; i < cantidadMesas; i++) {
      if (col > COLS) { col = 1; row++ }
      while (zona?.mesas.some(m => m.col === col && m.row === row)) {
        col++
        if (col > COLS) { col = 1; row++ }
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
        </div>

        {/* Grid */}
        <div className="csm-grid-wrap">
          {!zona ? (
            <p className="csm-empty">No hay salas. Creá una nueva sala.</p>
          ) : (
            <div
              className="csm-grid"
              style={{ gridTemplateColumns: `repeat(${displayCols}, 1fr)` }}
            >
              {celdas.map(({ col, row }) => {
                const m = mesaEnPos(col, row)
                return (
                  <div key={`${col}-${row}`} className={`csm-celda${m ? '' : ' csm-celda--vacia'}`}>
                    {m && (
                      <div
                        className={`csm-mesa${mesasSel?.id === m.id ? ' csm-mesa--selected' : ''}`}
                        onClick={() => abrirMesa(m)}
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
                <button className="csm-btn-eliminar-mesa" onClick={() => eliminarMesa(mesasSel.id)}>
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
