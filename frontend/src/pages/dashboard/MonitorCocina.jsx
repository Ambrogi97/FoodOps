import { useState, useEffect, useCallback, useRef } from 'react'
import { mesasService, zonasService } from '../../services/api'
import { ChefHat, ChevronsRight, Maximize2, Minimize2, SlidersHorizontal } from 'lucide-react'
import './MonitorCocina.css'

const INTERVALO = 10_000

const parseHora = (horaStr) => {
  if (!horaStr) return null
  try { return new Date(horaStr.replace(' ', 'T')) } catch { return null }
}

const calcTimer = (horaDate) => {
  if (!horaDate) return '--:--'
  const elapsed = Math.max(0, Math.floor((Date.now() - horaDate.getTime()) / 1000))
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const secs = (elapsed % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

const ClockIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

export default function MonitorCocina() {
  const [mesas, setMesas]               = useState([])
  const [zonas, setZonas]               = useState([])
  const [estadoLocal, setEL]            = useState({})
  const [cargando, setCargando]         = useState(true)
  const [filtro, setFiltro]             = useState('todos')
  const [panelFiltros, setPanelFiltros] = useState(false)
  const [fullscreen, setFullscreen]     = useState(false)
  const [, setTick]                     = useState(0)
  const containerRef                    = useRef(null)
  const elRef                           = useRef({})

  // Keep a ref in sync so async callbacks always see current estadoLocal
  useEffect(() => { elRef.current = estadoLocal }, [estadoLocal])

  // Tick every second to update timers
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const cargar = useCallback(async (mostrarCarga = false) => {
    if (mostrarCarga) setCargando(true)
    try {
      const [mesasData, zonasData] = await Promise.all([
        mesasService.listarFresh(),
        zonasService.listar(),
      ])
      setMesas(mesasData)
      setZonas(zonasData)
      // Only initialize items that aren't already tracked locally
      setEL(prev => {
        const next = { ...prev }
        for (const m of mesasData) {
          if (!next[m.id]) next[m.id] = {}
          for (const item of m.items) {
            if (next[m.id][item.nombre] === undefined) {
              next[m.id][item.nombre] = item.listo ? 'terminado' : 'pendiente'
            }
          }
        }
        return next
      })
    } catch (e) {
      console.error(e)
    } finally {
      if (mostrarCarga) setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(true)
    const iv = setInterval(() => cargar(false), INTERVALO)
    return () => clearInterval(iv)
  }, [cargar])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const getEst = (mesaId, nombre) => estadoLocal[mesaId]?.[nombre] ?? 'pendiente'

  const avanzarItem = async (mesa, item) => {
    const est = getEst(mesa.id, item.nombre)
    if (est === 'terminado') return
    const siguiente = est === 'pendiente' ? 'preparando' : 'terminado'

    const nuevoLocalMesa = { ...elRef.current[mesa.id], [item.nombre]: siguiente }
    setEL(prev => ({ ...prev, [mesa.id]: nuevoLocalMesa }))

    if (siguiente === 'terminado') {
      const items = mesa.items.map(i => ({
        ...i,
        listo: nuevoLocalMesa[i.nombre] === 'terminado' || i.listo,
      }))
      try { await mesasService.actualizar(mesa.id, { items }) } catch (e) { console.error(e) }
    }
  }

  const prepararTodo = (mesa) => {
    setEL(prev => {
      const cur  = prev[mesa.id] || {}
      const next = { ...cur }
      for (const item of mesa.items) {
        if ((next[item.nombre] ?? 'pendiente') === 'pendiente') {
          next[item.nombre] = 'preparando'
        }
      }
      return { ...prev, [mesa.id]: next }
    })
  }

  const terminarTodo = async (mesa) => {
    const cur   = elRef.current[mesa.id] || {}
    const nuevo = { ...cur }
    for (const item of mesa.items) {
      if ((nuevo[item.nombre] ?? 'pendiente') === 'preparando') {
        nuevo[item.nombre] = 'terminado'
      }
    }
    setEL(prev => ({ ...prev, [mesa.id]: nuevo }))
    const items = mesa.items.map(i => ({
      ...i,
      listo: nuevo[i.nombre] === 'terminado' || i.listo,
    }))
    try { await mesasService.actualizar(mesa.id, { items }) } catch (e) { console.error(e) }
  }

  const zonaNombre = (zonaId) => zonas.find(z => z.id === zonaId)?.label ?? 'Salón'

  const getCardState = (mesa) => {
    const estados = mesa.items.map(i => getEst(mesa.id, i.nombre))
    if (estados.every(e => e === 'terminado'))  return 'terminado'
    if (estados.every(e => e !== 'pendiente'))  return 'preparando'
    return 'pendiente'
  }

  const mesasActivas = mesas
    .filter(m => m.estado === 'ocupada' && m.items?.length > 0)
    .sort((a, b) => {
      if (!a.hora) return 1
      if (!b.hora) return -1
      return a.hora.localeCompare(b.hora)
    })

  const mesasMostradas =
    filtro === 'en-curso' ? mesasActivas.filter(m => getCardState(m) !== 'terminado')
    : filtro === 'listos'  ? mesasActivas.filter(m => getCardState(m) === 'terminado')
    : mesasActivas

  if (cargando) return (
    <div className="mc-wrap mc-wrap--center">Cargando...</div>
  )

  return (
    <div className="mc-wrap" ref={containerRef}>

      {/* Toolbar */}
      <div className="mc-toolbar">
        <div className="mc-toolbar-left">
          <button
            className={`mc-filtros-btn${panelFiltros ? ' mc-filtros-btn--open' : ''}`}
            onClick={() => setPanelFiltros(v => !v)}
          >
            <SlidersHorizontal size={14} />
            Filtros
            {mesasActivas.length > 0 && (
              <span className="mc-filtros-badge">{mesasActivas.length}</span>
            )}
          </button>

          {panelFiltros && (
            <>
              <div className="mc-panel-overlay" onClick={() => setPanelFiltros(false)} />
              <div className="mc-filtros-panel">
                {[
                  { key: 'todos',    label: 'Todos' },
                  { key: 'en-curso', label: 'En curso' },
                  { key: 'listos',   label: 'Listos' },
                ].map(f => (
                  <button
                    key={f.key}
                    className={`mc-filt-opt${filtro === f.key ? ' mc-filt-opt--active' : ''}`}
                    onClick={() => { setFiltro(f.key); setPanelFiltros(false) }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="mc-fullscreen-btn" onClick={toggleFullscreen}>
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {fullscreen ? 'Reducir pantalla' : 'Pantalla completa'}
        </button>
      </div>

      {/* Dark canvas */}
      <div className="mc-canvas">
        {mesasMostradas.length === 0 ? (
          <div className="mc-empty">
            <ChefHat size={44} />
            <p>Sin pedidos en cocina</p>
            <span>Los pedidos activos aparecen acá en tiempo real</span>
          </div>
        ) : (
          <div className="mc-grid">
            {mesasMostradas.map(mesa => {
              const cs       = getCardState(mesa)
              const horaDate = parseHora(mesa.hora)
              const horaHHMM = mesa.hora ? mesa.hora.split(' ')[1]?.slice(0, 5) : ''
              const hayPend  = mesa.items.some(i => getEst(mesa.id, i.nombre) === 'pendiente')
              const hayPrep  = mesa.items.some(i => getEst(mesa.id, i.nombre) === 'preparando')

              return (
                <div key={mesa.id} className={`mc-card mc-card--${cs}`}>

                  {/* Header */}
                  <div className="mc-card-header">
                    <div className="mc-header-row1">
                      <span className="mc-order-num">#{mesa.numero}</span>
                      <span className="mc-timer-pill">{calcTimer(horaDate)}</span>
                    </div>
                    <div className="mc-header-row2">
                      <span className="mc-origin-tag">{zonaNombre(mesa.zona)}</span>
                      {horaHHMM && (
                        <span className="mc-order-time">
                          <ClockIcon size={13} />
                          {horaHHMM}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mc-card-body">
                    {mesa.items.map((item, idx) => {
                      const est = getEst(mesa.id, item.nombre)
                      return (
                        <div key={idx}>
                          {idx > 0 && <div className="mc-item-sep" />}
                          <div className="mc-item">
                            <div className="mc-item-name-row">
                              <span className="mc-item-qty">{item.cantidad}</span>
                              <span className="mc-item-nombre">{item.nombre}</span>
                            </div>
                            <div className="mc-item-status-row">
                              <span className={`mc-est-icon mc-est-icon--${est}`}>
                                <ClockIcon size={15} />
                              </span>
                              <span className={`mc-est-label mc-est-label--${est}`}>
                                {est === 'pendiente' ? 'Pendiente'
                                  : est === 'preparando' ? 'En preparación'
                                  : 'Terminado'}
                              </span>
                              {est !== 'terminado' && (
                                <button
                                  className="mc-avanzar"
                                  onClick={() => avanzarItem(mesa, item)}
                                  title="Avanzar estado"
                                >
                                  <ChevronsRight size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Action button */}
                  {hayPend && (
                    <button
                      className="mc-btn-accion mc-btn-accion--preparar"
                      onClick={() => prepararTodo(mesa)}
                    >
                      Preparar todo
                    </button>
                  )}
                  {!hayPend && hayPrep && (
                    <button
                      className="mc-btn-accion mc-btn-accion--terminar"
                      onClick={() => terminarTodo(mesa)}
                    >
                      Terminar todo
                    </button>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
