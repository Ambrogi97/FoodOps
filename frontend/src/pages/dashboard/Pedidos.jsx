import { useState, useEffect, useCallback } from 'react'
import { mesasService, zonasService } from '../../services/api'
import { ChefHat, Check, Circle } from 'lucide-react'
import './Pedidos.css'

const INTERVALO = 10_000

export default function Pedidos() {
  const [mesas, setMesas]       = useState([])
  const [zonas, setZonas]       = useState([])
  const [filtro, setFiltro]     = useState('todos')
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async (mostrarCarga = false) => {
    if (mostrarCarga) setCargando(true)
    try {
      const [mesasData, zonasData] = await Promise.all([
        mesasService.listarFresh(),
        zonasService.listar(),
      ])
      setMesas(mesasData)
      setZonas(zonasData)
    } catch (e) {
      console.error(e)
    } finally {
      if (mostrarCarga) setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(true)
    const interval = setInterval(() => cargar(false), INTERVALO)
    return () => clearInterval(interval)
  }, [cargar])

  const toggleItem = async (mesaId, itemNombre) => {
    const mesa  = mesas.find(m => m.id === mesaId)
    const items = mesa.items.map(i => i.nombre === itemNombre ? { ...i, listo: !i.listo } : i)
    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, items } : m))
    try {
      await mesasService.actualizar(mesaId, { items })
    } catch (e) {
      console.error(e)
      cargar(false)
    }
  }

  const marcarTodaLista = async (mesaId) => {
    const mesa  = mesas.find(m => m.id === mesaId)
    const items = mesa.items.map(i => ({ ...i, listo: true }))
    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, items } : m))
    try {
      await mesasService.actualizar(mesaId, { items })
    } catch (e) {
      console.error(e)
      cargar(false)
    }
  }

  const zonaNombre = (zonaId) => zonas.find(z => z.id === zonaId)?.label ?? ''

  const mesasOcupadas = mesas
    .filter(m => m.estado === 'ocupada' && m.items?.length > 0)
    .sort((a, b) => {
      if (!a.hora) return 1
      if (!b.hora) return -1
      return a.hora.localeCompare(b.hora)
    })

  const mesasFiltradas =
    filtro === 'pendiente' ? mesasOcupadas.filter(m => m.items.some(i => !i.listo))
    : filtro === 'listo'   ? mesasOcupadas.filter(m => m.items.every(i => i.listo))
    : mesasOcupadas

  const cantPend  = (items) => items.filter(i => !i.listo).reduce((a, i) => a + i.cantidad, 0)
  const cantListo = (items) => items.filter(i =>  i.listo).reduce((a, i) => a + i.cantidad, 0)

  const totalPendiente = mesasOcupadas.reduce((acc, m) => acc + cantPend(m.items),  0)
  const totalListo     = mesasOcupadas.reduce((acc, m) => acc + cantListo(m.items), 0)

  if (cargando) return (
    <div className="ped-layout ped-layout--center">Cargando...</div>
  )

  return (
    <div className="ped-layout">

      <div className="ped-header">
        <div className="ped-stats">
          <div className="ped-stat">
            <span className="ped-stat-num">{mesasOcupadas.length}</span>
            <span className="ped-stat-label">Mesas activas</span>
          </div>
          <div className="ped-stat-sep" />
          <div className="ped-stat">
            <span className="ped-stat-num ped-stat-num--pendiente">{totalPendiente}</span>
            <span className="ped-stat-label">Pendientes</span>
          </div>
          <div className="ped-stat-sep" />
          <div className="ped-stat">
            <span className="ped-stat-num ped-stat-num--listo">{totalListo}</span>
            <span className="ped-stat-label">Listos</span>
          </div>
        </div>

        <div className="ped-filtros">
          {[
            { key: 'todos',     label: 'Todos' },
            { key: 'pendiente', label: 'Con pendientes' },
            { key: 'listo',     label: 'Completos' },
          ].map(f => (
            <button
              key={f.key}
              className={`ped-filtro-btn ${filtro === f.key ? 'ped-filtro-btn--active' : ''}`}
              onClick={() => setFiltro(f.key)}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {mesasFiltradas.length === 0 ? (
        <div className="ped-empty">
          <span className="ped-empty-icon"><ChefHat size={40} /></span>
          <p>Sin pedidos activos</p>
          <span>Las mesas con pedido aparecen acá en tiempo real</span>
        </div>
      ) : (
        <div className="ped-grid">
          {mesasFiltradas.map(mesa => {
            const todosListos      = mesa.items.every(i => i.listo)
            const hayPendientes    = mesa.items.some(i => !i.listo)
            const cantPendientes   = cantPend(mesa.items)
            return (
              <div key={mesa.id} className={`ped-comanda ${todosListos ? 'ped-comanda--lista' : ''}`}>

                <div className="ped-comanda-header">
                  <div>
                    <span className="ped-mesa-num">Mesa {mesa.numero}</span>
                    {zonaNombre(mesa.zona) && (
                      <span className="ped-zona">{zonaNombre(mesa.zona)}</span>
                    )}
                  </div>
                  <div className="ped-comanda-meta">
                    {mesa.hora && <span className="ped-hora">{mesa.hora.split(' ')[1]}</span>}
                    <span className={`ped-badge ${todosListos ? 'ped-badge--lista' : 'ped-badge--pendiente'}`}>
                      {todosListos ? 'Completo' : `${cantPendientes} pend.`}
                    </span>
                  </div>
                </div>

                <div className="ped-items">
                  {mesa.items.map((item, idx) => (
                    <button
                      key={idx}
                      className={`ped-item ${item.listo ? 'ped-item--listo' : 'ped-item--pendiente'}`}
                      onClick={() => toggleItem(mesa.id, item.nombre)}
                    >
                      <span className="ped-item-check">{item.listo ? <Check size={14} strokeWidth={3} /> : <Circle size={14} />}</span>
                      <span className="ped-item-cant">{item.cantidad}×</span>
                      <span className="ped-item-nombre">{item.nombre}</span>
                    </button>
                  ))}
                </div>

                {hayPendientes && (
                  <button className="ped-marcar-todo" onClick={() => marcarTodaLista(mesa.id)}>
                    Marcar todo listo
                  </button>
                )}

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
