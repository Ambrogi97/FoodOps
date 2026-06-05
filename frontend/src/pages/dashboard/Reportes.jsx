import { useState, useEffect } from 'react'
import { ventasService, gastosService } from '../../services/api'
import './Reportes.css'

const fmt    = (n) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtNum = (n) => n.toLocaleString('es-AR')

const PERIODOS = ['Hoy', 'Esta semana', 'Este mes']

const CATEGORIAS_CONFIG = {
  ingredientes:  { label: 'Ingredientes',  color: '#22c55e' },
  bebidas:       { label: 'Bebidas',       color: '#3b82f6' },
  servicios:     { label: 'Servicios',     color: '#f97316' },
  sueldos:       { label: 'Sueldos',       color: '#8b5cf6' },
  alquiler:      { label: 'Alquiler',      color: '#ef4444' },
  mantenimiento: { label: 'Mantenimiento', color: '#eab308' },
  otro:          { label: 'Otro',          color: '#94a3b8' },
}

const parseFecha = (str) => {
  const [d, m, y] = str.split(' ')[0].split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

const inicioSemana = () => {
  const hoy = new Date()
  const diff = hoy.getDay() === 0 ? -6 : 1 - hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + diff)
  lunes.setHours(0, 0, 0, 0)
  return lunes
}

const filtrar = (items, periodo, campo) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return items.filter(item => {
    const f = parseFecha(item[campo])
    if (periodo === 'Hoy')         return f >= hoy
    if (periodo === 'Esta semana') return f >= inicioSemana()
    if (periodo === 'Este mes')    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
    return true
  })
}

const sumaVenta = (v) => v.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

export default function Reportes() {
  const [ventas, setVentas]     = useState([])
  const [gastos, setGastos]     = useState([])
  const [periodo, setPeriodo]   = useState('Este mes')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([ventasService.listar(), gastosService.listar()])
      .then(([v, g]) => { setVentas(v); setGastos(g); setCargando(false) })
      .catch(e => { console.error(e); setCargando(false) })
  }, [])

  const ventasFiltradas = filtrar(ventas, periodo, 'cierre')
  const gastosFiltrados = filtrar(gastos, periodo, 'fecha')

  const totalVentas = ventasFiltradas.reduce((acc, v) => acc + sumaVenta(v), 0)
  const totalGastos = gastosFiltrados.reduce((acc, g) => acc + g.monto, 0)
  const ganancia    = totalVentas - totalGastos
  const nTickets    = ventasFiltradas.length

  // Ranking productos
  const rankingMap = {}
  ventasFiltradas.forEach(v => v.items.forEach(item => {
    if (!rankingMap[item.nombre]) rankingMap[item.nombre] = { nombre: item.nombre, cantidad: 0, total: 0 }
    rankingMap[item.nombre].cantidad += item.cantidad
    rankingMap[item.nombre].total    += item.precio * item.cantidad
  }))
  const ranking  = Object.values(rankingMap).sort((a, b) => b.total - a.total).slice(0, 8)
  const maxTotal = ranking[0]?.total || 1

  // Gastos por categoría
  const gastosCatMap = {}
  gastosFiltrados.forEach(g => { gastosCatMap[g.categoria] = (gastosCatMap[g.categoria] || 0) + g.monto })
  const gastosCat = Object.entries(gastosCatMap)
    .map(([cat, monto]) => ({ cat, monto, ...CATEGORIAS_CONFIG[cat] }))
    .sort((a, b) => b.monto - a.monto)
  const maxGasto = gastosCat[0]?.monto || 1

  if (cargando) return (
    <div className="rep-layout" style={{ alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Cargando...
    </div>
  )

  return (
    <div className="rep-layout">

      {/* Selector período */}
      <div className="rep-periodos">
        {PERIODOS.map(p => (
          <button
            key={p}
            className={`rep-periodo-btn ${periodo === p ? 'rep-periodo-btn--active' : ''}`}
            onClick={() => setPeriodo(p)}
          >{p}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="rep-kpis">
        <div className="rep-kpi">
          <span className="rep-kpi-icon">💰</span>
          <div>
            <p className="rep-kpi-label">Total ventas</p>
            <p className="rep-kpi-value rep-kpi--green">{fmt(totalVentas)}</p>
          </div>
        </div>
        <div className="rep-kpi">
          <span className="rep-kpi-icon">🧮</span>
          <div>
            <p className="rep-kpi-label">Total gastos</p>
            <p className="rep-kpi-value rep-kpi--red">{fmt(totalGastos)}</p>
          </div>
        </div>
        <div className="rep-kpi">
          <span className="rep-kpi-icon">{ganancia >= 0 ? '📈' : '📉'}</span>
          <div>
            <p className="rep-kpi-label">Ganancia neta</p>
            <p className={`rep-kpi-value ${ganancia >= 0 ? 'rep-kpi--green' : 'rep-kpi--red'}`}>{fmt(ganancia)}</p>
          </div>
        </div>
        <div className="rep-kpi">
          <span className="rep-kpi-icon">🧾</span>
          <div>
            <p className="rep-kpi-label">Tickets cerrados</p>
            <p className="rep-kpi-value">{fmtNum(nTickets)}</p>
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="rep-body">

        {/* Ranking productos */}
        <div className="rep-card">
          <h3 className="rep-card-title">Productos más vendidos</h3>
          {ranking.length === 0 ? (
            <div className="rep-empty">Sin ventas en este período</div>
          ) : (
            <div className="rep-ranking">
              {ranking.map((item, idx) => (
                <div key={item.nombre} className="rep-rank-row">
                  <span className="rep-rank-pos">{idx + 1}</span>
                  <div className="rep-rank-info">
                    <span className="rep-rank-nombre">{item.nombre}</span>
                    <div className="rep-rank-bar-wrap">
                      <div className="rep-rank-bar" style={{ width: `${(item.total / maxTotal) * 100}%` }} />
                    </div>
                  </div>
                  <div className="rep-rank-meta">
                    <span className="rep-rank-total">{fmt(item.total)}</span>
                    <span className="rep-rank-cant">{fmtNum(item.cantidad)} uds.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gastos por categoría */}
        <div className="rep-card">
          <h3 className="rep-card-title">Gastos por categoría</h3>
          {gastosCat.length === 0 ? (
            <div className="rep-empty">Sin gastos en este período</div>
          ) : (
            <div className="rep-gastos-cat">
              {gastosCat.map(({ cat, monto, label, color }) => (
                <div key={cat} className="rep-gcat-row">
                  <div className="rep-gcat-header">
                    <span className="rep-gcat-label">{label}</span>
                    <span className="rep-gcat-monto">{fmt(monto)}</span>
                  </div>
                  <div className="rep-gcat-bar-wrap">
                    <div className="rep-gcat-bar" style={{ width: `${(monto / maxGasto) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div className="rep-gcat-total">
                <span>Total</span>
                <strong>{fmt(totalGastos)}</strong>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
