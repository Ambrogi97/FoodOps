import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { ventasService, gastosService, ingredientesService } from '../../services/api'
import './Reportes.css'

const fmt    = n => `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtNum = n => Number(n).toLocaleString('es-AR')

const PERIODOS = [
  { label: 'Hoy',             value: 'hoy'    },
  { label: 'Últimos 7 días',  value: '7dias'  },
  { label: 'Este mes',        value: 'mes'    },
  { label: 'Últimos 30 días', value: '30dias' },
]

const SECCIONES = ['Ventas', 'Productos', 'Stock', 'Compras', 'Gastos', 'Balance', 'Mesas']
const DOW       = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const CAT_LABEL = { ingredientes:'Ingredientes', bebidas:'Bebidas', servicios:'Servicios', sueldos:'Sueldos', alquiler:'Alquiler', mantenimiento:'Mantenimiento', otro:'Otro' }
const CAT_COLOR = { ingredientes:'#22c55e', bebidas:'#3b82f6', servicios:'#f97316', sueldos:'#8b5cf6', alquiler:'#ef4444', mantenimiento:'#eab308', otro:'#94a3b8' }
const BAR_COLORS = ['#f97316','#22c55e','#3b82f6','#8b5cf6','#eab308','#ef4444','#06b6d4','#ec4899','#14b8a6','#f59e0b']

const parseFecha = str => {
  if (!str) return new Date(0)
  const [d, m, y] = str.split(' ')[0].split('/')
  return new Date(+y, +m - 1, +d)
}

const dateKey = str => (str ? str.split(' ')[0] : '')
const subDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() - n); return d }

const filtrar = (items, periodo, campo) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return items.filter(item => {
    const f = parseFecha(item[campo])
    if (periodo === 'hoy')    return f >= hoy
    if (periodo === '7dias')  return f >= subDays(hoy, 7)
    if (periodo === 'mes')    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
    if (periodo === '30dias') return f >= subDays(hoy, 30)
    return true
  })
}

const sumaV = v => v.items.reduce((a, i) => a + i.precio * i.cantidad, 0)

/* ── SVG Bar chart (vertical) ─────────────────────────────────────────── */
function BarChartSVG({ data, color = 'var(--primary)', h = 150 }) {
  if (!data.length) return <p className="rep-empty">Sin datos</p>
  const max = Math.max(...data.map(d => d.v), 1)
  const W   = data.length * 44
  const PAD = { t: 8, b: 26, l: 4, r: 4 }
  const ih  = h - PAD.t - PAD.b
  return (
    <svg viewBox={`0 0 ${W + PAD.l + PAD.r} ${h}`} className="rep-svg" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const bh = (d.v / max) * ih
        const x  = PAD.l + i * 44 + 4
        return (
          <g key={i}>
            <rect x={x} y={PAD.t + (ih - bh)} width={36} height={bh} fill={color} rx={3} opacity={0.85} />
            <text x={x + 18} y={h - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.l}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── SVG Combo chart (bars $ + line qty) ─────────────────────────────── */
function EvolucionSVG({ data, h = 180 }) {
  if (!data.length) return <p className="rep-empty">Sin datos</p>
  const maxM = Math.max(...data.map(d => d.monto), 1)
  const maxC = Math.max(...data.map(d => d.count), 1)
  const n    = data.length
  const W    = Math.max(n * 52, 200)
  const PAD  = { t: 10, b: 30, l: 4, r: 4 }
  const ih   = h - PAD.t - PAD.b
  const cx   = i => PAD.l + i * (W / n) + (W / n) / 2
  const fmtK = k => k.split('/').slice(0, 2).join('/')
  const pts  = data.map((d, i) => `${cx(i)},${PAD.t + ih - (d.count / maxC) * ih}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="rep-svg" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const bh = (d.monto / maxM) * ih
        const bw = (W / n) * 0.6
        return (
          <g key={i}>
            <rect x={cx(i) - bw / 2} y={PAD.t + ih - bh} width={bw} height={bh} fill="#1e3a5f" rx={3} opacity={0.85} />
            <text x={cx(i)} y={h - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{fmtK(d.key)}</text>
          </g>
        )
      })}
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth={2} />
      {data.map((d, i) => (
        <circle key={i} cx={cx(i)} cy={PAD.t + ih - (d.count / maxC) * ih} r={3.5} fill="var(--primary)" />
      ))}
    </svg>
  )
}

/* ── SVG Line chart (multi-series) ───────────────────────────────────── */
function LineChartSVG({ series, labels, h = 200 }) {
  if (!labels.length) return <p className="rep-empty">Sin datos</p>
  const allV = series.flatMap(s => s.data)
  const minV = Math.min(...allV, 0)
  const maxV = Math.max(...allV, 1)
  const n    = labels.length
  const W    = 600
  const H    = h
  const PAD  = { t: 12, b: 28, l: 64, r: 16 }
  const iw   = W - PAD.l - PAD.r
  const ih   = H - PAD.t - PAD.b
  const toX  = i => PAD.l + (n > 1 ? i * (iw / (n - 1)) : iw / 2)
  const toY  = v => PAD.t + ih - ((v - minV) / (maxV - minV || 1)) * ih
  const fmtL = l => l.split('/').slice(0, 2).join('/')
  const fmtY = v => `$${Math.abs(Math.round(v)).toLocaleString('es-AR')}`
  const GRIDS = 4
  const gridVals = Array.from({ length: GRIDS + 1 }, (_, i) => minV + ((maxV - minV) / GRIDS) * i)
  const anchor = i => i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rep-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines + Y labels */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={toY(v)} x2={W - PAD.r} y2={toY(v)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={PAD.l - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{fmtY(v)}</text>
        </g>
      ))}
      {/* Zero line if negative values exist */}
      {minV < 0 && (
        <line x1={PAD.l} y1={toY(0)} x2={W - PAD.r} y2={toY(0)} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 2" />
      )}
      {/* Series */}
      {series.map(s => {
        const pts     = s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
        const areaPts = [`${toX(0)},${toY(minV)}`, ...s.data.map((v, i) => `${toX(i)},${toY(v)}`), `${toX(s.data.length - 1)},${toY(minV)}`].join(' ')
        return (
          <g key={s.name}>
            {s.area && <polygon points={areaPts} fill={s.color} opacity={0.12} />}
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} />
            {s.data.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5} fill={s.color} />)}
          </g>
        )
      })}
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={H - 8} textAnchor={anchor(i)} fontSize={9} fill="#94a3b8">{fmtL(l)}</text>
      ))}
    </svg>
  )
}

/* ── Horizontal bar list ─────────────────────────────────────────────── */
function HBarList({ data, showPct = true }) {
  const total = data.reduce((a, d) => a + d.v, 0)
  const max   = Math.max(...data.map(d => d.v), 1)
  return (
    <div className="re-hbar-list">
      {data.map((d, i) => (
        <div key={i} className="re-hbar-row">
          <span className="re-hbar-label">{d.l}</span>
          <div className="re-hbar-track">
            <div className="re-hbar-fill" style={{ width: `${(d.v / max) * 100}%`, background: d.color || '#1e3a5f' }} />
          </div>
          <div className="re-hbar-meta">
            {d.legend && (
              <span className="re-hbar-legend">
                <span className="re-leg-dot" style={{ background: d.color || '#1e3a5f' }} />{d.legend}
              </span>
            )}
            <span>{fmt(d.v)}</span>
            {showPct && <span className="re-hbar-pct">{total ? Math.round((d.v / total) * 100) : 0}%</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Card wrapper ────────────────────────────────────────────────────── */
function ReCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`re-card ${className}`}>
      {(title || subtitle) && (
        <div className="re-card-hdr">
          {title    && <p className="re-card-title">{title}</p>}
          {subtitle && <p className="re-card-sub">{subtitle}</p>}
        </div>
      )}
      <div className="re-card-body">{children}</div>
    </div>
  )
}

/* ── KPI card ────────────────────────────────────────────────────────── */
function KpiCard({ label, value, color, sub }) {
  return (
    <div className="re-kpi">
      <p className="re-kpi-label">{label}</p>
      <p className="re-kpi-value" style={color ? { color } : {}}>{value}</p>
      {sub && <p className="re-kpi-sub">{sub}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TAB: Ventas
══════════════════════════════════════════════════════════════════════ */
function TabVentas({ ventasFilt, lbl }) {
  const totalBruto = ventasFilt.reduce((a, v) => a + sumaV(v), 0)
  const cantidad   = ventasFilt.length
  const promedio   = cantidad ? totalBruto / cantidad : 0

  const byDayMap = {}
  ventasFilt.forEach(v => {
    const k = dateKey(v.cierre)
    if (!byDayMap[k]) byDayMap[k] = { key: k, monto: 0, count: 0 }
    byDayMap[k].monto += sumaV(v)
    byDayMap[k].count++
  })
  const byDay = Object.values(byDayMap).sort((a, b) => a.key.localeCompare(b.key))

  const byDow = Array(7).fill(0)
  ventasFilt.forEach(v => { byDow[parseFecha(v.cierre).getDay()] += sumaV(v) })

  const byHourMap = {}
  ventasFilt.forEach(v => {
    const h = v.cierre?.split(' ')[1]?.split(':')[0]
    if (h) byHourMap[h] = (byHourMap[h] || 0) + sumaV(v)
  })
  const byHour = Object.entries(byHourMap).sort().map(([h, v]) => ({ l: `${h}h`, v }))

  const byMedio = {}
  ventasFilt.forEach(v => { const m = v.metodoPago || 'Efectivo'; byMedio[m] = (byMedio[m] || 0) + sumaV(v) })
  const medioData = Object.entries(byMedio).sort((a, b) => b[1] - a[1]).map(([l, v], i) => ({ l, v, color: BAR_COLORS[i % BAR_COLORS.length], legend: l }))

  const byTipo = {}
  ventasFilt.forEach(v => { const t = v.tipo || 'salon'; byTipo[t] = (byTipo[t] || 0) + sumaV(v) })
  const TIPO_LBL  = { salon: 'Mesas', mostrador: 'Mostrador', delivery: 'Delivery' }
  const TIPO_CLR  = ['#1e3a5f', 'var(--primary)', '#22c55e', '#8b5cf6']
  const tipoData  = Object.entries(byTipo).sort((a, b) => b[1] - a[1]).map(([t, v], i) => ({ l: TIPO_LBL[t] || t, v, color: TIPO_CLR[i] || '#94a3b8', legend: TIPO_LBL[t] || t }))

  return (
    <div className="re-section">
      <div className="re-kpis-5">
        <KpiCard label="Total de ventas brutas" value={fmt(totalBruto)} />
        <KpiCard label="Total de ventas netas"  value={fmt(totalBruto)} />
        <KpiCard label="Descuentos"              value={fmt(0)} />
        <KpiCard label="Cantidad de ventas"      value={fmtNum(cantidad)} />
        <KpiCard label="Promedio por ticket"     value={fmt(promedio)} />
      </div>

      <ReCard title="Evolución de ventas brutas" subtitle={lbl}>
        <div className="re-chart-legends">
          <span className="re-legend"><span className="re-leg-dot" style={{ background: '#1e3a5f' }} />Ventas $</span>
          <span className="re-legend"><span className="re-leg-dot" style={{ background: 'var(--primary)' }} />Cantidad de ventas</span>
        </div>
        <div className="re-chart-wrap re-chart-wrap--lg"><EvolucionSVG data={byDay} /></div>
      </ReCard>

      <div className="re-row2">
        <ReCard title="Ventas por día de la semana" subtitle={lbl}>
          <div className="re-chart-wrap">
            <BarChartSVG data={DOW.map((d, i) => ({ l: d, v: byDow[i] }))} color="#1e3a5f" />
          </div>
        </ReCard>
        <ReCard title="Ventas por hora" subtitle={lbl}>
          <div className="re-chart-wrap">
            <BarChartSVG data={byHour} color="var(--primary)" />
          </div>
        </ReCard>
      </div>

      <div className="re-row2">
        <ReCard title="Medios de pago" subtitle={lbl}>
          {medioData.length === 0 ? <p className="rep-empty">Sin datos</p> : <HBarList data={medioData} />}
        </ReCard>
        <ReCard title="Origen de las ventas" subtitle={lbl}>
          {tipoData.length === 0 ? <p className="rep-empty">Sin datos</p> : <HBarList data={tipoData} />}
        </ReCard>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TAB: Productos
══════════════════════════════════════════════════════════════════════ */
function TabProductos({ ventasFilt, lbl }) {
  const rankMap = {}
  ventasFilt.forEach(v => v.items.forEach(item => {
    if (!rankMap[item.nombre]) rankMap[item.nombre] = { nombre: item.nombre, cantidad: 0, total: 0, precio: item.precio }
    rankMap[item.nombre].cantidad += item.cantidad
    rankMap[item.nombre].total    += item.precio * item.cantidad
  }))
  const ranking  = Object.values(rankMap).sort((a, b) => b.total - a.total).slice(0, 10)
  const maxTotal = ranking[0]?.total || 1

  return (
    <div className="re-section">
      <div className="re-card">
        <div className="re-card-hdr">
          <p className="re-card-title">PRODUCTOS</p>
          <p className="re-card-sub">{ranking.length} productos más vendidos · {lbl}</p>
        </div>
        <div className="re-prod-body re-card-body">
          <div className="re-prod-chart">
            {ranking.length === 0 ? <p className="rep-empty">Sin datos</p> : (
              <div className="re-hbar-list re-hbar-list--compact">
                {ranking.map((p, i) => (
                  <div key={p.nombre} className="re-hbar-row">
                    <span className="re-hbar-label re-hbar-label--prod">{p.nombre}</span>
                    <div className="re-hbar-track">
                      <div className="re-hbar-fill" style={{ width: `${(p.total / maxTotal) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="re-prod-table">
            <table className="re-table">
              <thead>
                <tr><th></th><th>#</th><th>Producto</th><th>Ventas</th><th>Precio</th></tr>
              </thead>
              <tbody>
                {ranking.length === 0
                  ? <tr><td colSpan={5} className="rep-empty">Sin datos</td></tr>
                  : ranking.map((p, i) => (
                    <tr key={p.nombre}>
                      <td><span className="re-dot" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} /></td>
                      <td className="re-td-muted">{i + 1}</td>
                      <td className="re-td-bold">{p.nombre}</td>
                      <td>{fmtNum(p.cantidad)}</td>
                      <td>{fmt(p.precio)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TAB: Stock
══════════════════════════════════════════════════════════════════════ */
function TabStock({ ingredientes, lbl }) {
  const [buscar, setBuscar] = useState('')
  const filtered = ingredientes.filter(i => i.nombre.toLowerCase().includes(buscar.toLowerCase()))
  return (
    <div className="re-section">
      <ReCard title="Análisis de movimientos de inventario" subtitle={lbl}>
        <div className="re-search-wrap">
          <Search size={14} className="re-search-icon" />
          <input className="re-search" placeholder="Buscar" value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
        <div className="re-table-wrap">
          <table className="re-table">
            <thead>
              <tr>
                <th>Producto / Ingrediente</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Stock mínimo</th>
                <th>Stock actual</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={6} className="rep-empty">Sin datos</td></tr>
                : filtered.map(i => (
                  <tr key={i.id}>
                    <td className="re-td-bold">{i.nombre}</td>
                    <td className="re-td-muted">{i.categoria}</td>
                    <td className="re-td-muted">{i.unidad}</td>
                    <td>{i.stockMinimo} {i.unidad}</td>
                    <td className={i.stockActual <= i.stockMinimo ? 're-td-red' : ''}>{i.stockActual} {i.unidad}</td>
                    <td>
                      {i.stockActual <= i.stockMinimo
                        ? <span className="re-badge re-badge--red">Stock bajo</span>
                        : <span className="re-badge re-badge--green">OK</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </ReCard>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TAB: Compras
══════════════════════════════════════════════════════════════════════ */
function TabCompras({ gastosFilt, lbl }) {
  const byDayMap = {}
  gastosFilt.forEach(g => {
    const k = dateKey(g.fecha)
    if (!byDayMap[k]) byDayMap[k] = { key: k, monto: 0 }
    byDayMap[k].monto += g.monto
  })
  const byDay = Object.values(byDayMap).sort((a, b) => a.key.localeCompare(b.key))

  const byCat = {}
  gastosFilt.forEach(g => { byCat[g.categoria] = (byCat[g.categoria] || 0) + g.monto })
  const catData = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, v]) => ({ l: CAT_LABEL[cat] || cat, v, color: CAT_COLOR[cat] || '#94a3b8' }))

  return (
    <div className="re-section">
      <div className="re-info-banner">
        <span className="re-info-icon">ℹ</span>
        <span>Para visualizar el reporte de compras correctamente, asegurate de tener todos los gastos registrados con su categoría correspondiente.</span>
      </div>
      <div className="re-row2">
        <ReCard title="Evolución de compras" subtitle={lbl}>
          <div className="re-chart-wrap">
            <BarChartSVG data={byDay.map(d => ({ l: d.key.split('/').slice(0, 2).join('/'), v: d.monto }))} color="#1e3a5f" />
          </div>
        </ReCard>
        <ReCard title="Compras por categoría" subtitle={lbl}>
          {catData.length === 0 ? <p className="rep-empty">Sin datos</p> : <HBarList data={catData} showPct={false} />}
        </ReCard>
      </div>
      <ReCard title="Compras por día" subtitle={lbl}>
        <div className="re-table-wrap">
          <table className="re-table">
            <thead>
              <tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr>
            </thead>
            <tbody>
              {gastosFilt.length === 0
                ? <tr><td colSpan={4} className="rep-empty">Sin datos</td></tr>
                : gastosFilt.map(g => (
                  <tr key={g.id}>
                    <td className="re-td-muted">{dateKey(g.fecha)}</td>
                    <td>
                      <span className="re-badge" style={{ background: `${CAT_COLOR[g.categoria] || '#94a3b8'}20`, color: CAT_COLOR[g.categoria] || '#94a3b8' }}>
                        {CAT_LABEL[g.categoria] || g.categoria || '—'}
                      </span>
                    </td>
                    <td className="re-td-bold">{g.descripcion || g.comentario || '—'}</td>
                    <td>{fmt(g.monto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </ReCard>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TAB: Gastos
══════════════════════════════════════════════════════════════════════ */
function TabGastos({ gastosFilt, lbl }) {
  const OP_CATS  = ['ingredientes', 'bebidas', 'mantenimiento']
  const ADM_CATS = ['sueldos', 'alquiler', 'servicios']

  const total = gastosFilt.reduce((a, g) => a + g.monto, 0)
  const catMap = {}
  gastosFilt.forEach(g => { catMap[g.categoria] = (catMap[g.categoria] || 0) + g.monto })
  const maxCat         = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
  const operacionales   = gastosFilt.filter(g => OP_CATS.includes(g.categoria)).reduce((a, g) => a + g.monto, 0)
  const administrativos = gastosFilt.filter(g => ADM_CATS.includes(g.categoria)).reduce((a, g) => a + g.monto, 0)
  const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, v]) => ({ l: CAT_LABEL[cat] || cat, v, color: CAT_COLOR[cat] || '#94a3b8' }))

  return (
    <div className="re-section">
      <div className="re-info-banner">
        <span className="re-info-icon">ℹ</span>
        <span>Para visualizar el reporte de gastos correctamente, asegurate de tener todos los gastos registrados con su categoría financiera correspondiente.</span>
      </div>
      <div className="re-kpis-4">
        <KpiCard label="Gastos totales"           value={fmt(total)} />
        <KpiCard label="Categoría con más gastos" value={maxCat ? fmt(maxCat[1]) : fmt(0)} sub={maxCat ? (CAT_LABEL[maxCat[0]] || maxCat[0]) : '—'} />
        <KpiCard label="Gastos operacionales"     value={fmt(operacionales)} />
        <KpiCard label="Gastos administrativos"   value={fmt(administrativos)} />
      </div>
      <ReCard title="Gastos por categoría" subtitle={lbl}>
        {catData.length === 0 ? <p className="rep-empty">Sin gastos en este período</p> : <HBarList data={catData} showPct={false} />}
      </ReCard>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TAB: Balance
══════════════════════════════════════════════════════════════════════ */
function TabBalance({ ventasFilt, gastosFilt, lbl }) {
  const allDays = [...new Set([
    ...ventasFilt.map(v => dateKey(v.cierre)),
    ...gastosFilt.map(g => dateKey(g.fecha)),
  ])].sort()

  const ingMap = {}; ventasFilt.forEach(v => { const k = dateKey(v.cierre); ingMap[k] = (ingMap[k] || 0) + sumaV(v) })
  const egrMap = {}; gastosFilt.forEach(g => { const k = dateKey(g.fecha);  egrMap[k] = (egrMap[k] || 0) + g.monto  })

  const ingSeries = allDays.map(d => ingMap[d] || 0)
  const egrSeries = allDays.map(d => egrMap[d] || 0)
  const resSeries = allDays.map((_, i) => ingSeries[i] - egrSeries[i])

  const totalIng = ingSeries.reduce((a, b) => a + b, 0)
  const totalEgr = egrSeries.reduce((a, b) => a + b, 0)
  const totalRes = totalIng - totalEgr

  return (
    <div className="re-section">
      <div className="re-kpis-3">
        <KpiCard label="Ingresos"  value={fmt(totalIng)} color="#22c55e" />
        <KpiCard label="Egresos"   value={fmt(totalEgr)} color="#ef4444" />
        <KpiCard label="Resultado" value={fmt(totalRes)} color={totalRes >= 0 ? '#22c55e' : '#ef4444'} />
      </div>
      <ReCard title="Evolución del resultado" subtitle={lbl}>
        <div className="re-chart-legends">
          <span className="re-legend"><span className="re-leg-dot" style={{ background: '#22c55e' }} />Ingresos</span>
          <span className="re-legend"><span className="re-leg-dot" style={{ background: '#ef4444' }} />Egresos</span>
          <span className="re-legend"><span className="re-leg-dot" style={{ background: '#3b82f6' }} />Resultado</span>
        </div>
        <div className="re-chart-wrap re-chart-wrap--lg">
          <LineChartSVG
            labels={allDays}
            series={[
              { name: 'Ingresos',  color: '#22c55e', data: ingSeries },
              { name: 'Egresos',   color: '#ef4444', data: egrSeries },
              { name: 'Resultado', color: '#3b82f6', data: resSeries, area: true },
            ]}
            h={200}
          />
        </div>
      </ReCard>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TAB: Mesas
══════════════════════════════════════════════════════════════════════ */
function TabMesas({ ventasFilt, lbl }) {
  const mesaMap = {}
  ventasFilt.forEach(v => {
    const m = v.mesa ? `Mesa ${v.mesa}` : 'Sin mesa'
    if (!mesaMap[m]) mesaMap[m] = { mesa: m, tickets: 0, total: 0, personas: 0 }
    mesaMap[m].tickets++
    mesaMap[m].total    += sumaV(v)
    mesaMap[m].personas += v.personas || 1
  })
  const mesas    = Object.values(mesaMap).sort((a, b) => b.total - a.total)
  const maxTotal = mesas[0]?.total || 1

  return (
    <div className="re-section">
      <ReCard title="Rendimiento por mesa" subtitle={lbl}>
        {mesas.length === 0 ? <p className="rep-empty">Sin datos en este período</p> : (
          <div className="re-table-wrap">
            <table className="re-table">
              <thead>
                <tr>
                  <th>Mesa</th><th>Tickets</th><th>Total vendido</th><th>Promedio / ticket</th><th>Personas</th><th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {mesas.map(m => (
                  <tr key={m.mesa}>
                    <td className="re-td-bold">{m.mesa}</td>
                    <td>{m.tickets}</td>
                    <td>{fmt(m.total)}</td>
                    <td>{fmt(m.total / m.tickets)}</td>
                    <td>{m.personas}</td>
                    <td>
                      <div className="re-hbar-track" style={{ margin: 0 }}>
                        <div className="re-hbar-fill" style={{ width: `${(m.total / maxTotal) * 100}%`, background: 'var(--primary)' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReCard>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════ */
export default function Reportes() {
  const [seccion,      setSeccion]      = useState('Ventas')
  const [fechaDesde,   setFechaDesde]   = useState('')
  const [fechaHasta,   setFechaHasta]   = useState('')
  const [ventas,       setVentas]       = useState([])
  const [gastos,       setGastos]       = useState([])
  const [ingredientes, setIngredientes] = useState([])
  const [cargando,     setCargando]     = useState(true)

  useEffect(() => {
    Promise.all([ventasService.listar(), gastosService.listar(), ingredientesService.listar()])
      .then(([v, g, i]) => { setVentas(v); setGastos(g); setIngredientes(i); setCargando(false) })
      .catch(e => { console.error(e); setCargando(false) })
  }, [])

  const filtrarPorFecha = (items, campo) => items.filter(item => {
    const f = parseFecha(item[campo])
    if (fechaDesde && f < new Date(fechaDesde + 'T00:00:00')) return false
    if (fechaHasta && f > new Date(fechaHasta + 'T23:59:59')) return false
    return true
  })

  const lbl        = fechaDesde || fechaHasta
    ? `${fechaDesde || '…'} — ${fechaHasta || '…'}`
    : 'Todos los registros'
  const ventasFilt = filtrarPorFecha(ventas, 'cierre')
  const gastosFilt = filtrarPorFecha(gastos, 'fecha')

  if (cargando) return <div className="rep-loading">Cargando...</div>

  return (
    <div className="rep-page">
      <div className="rep-tabs-bar">
        {SECCIONES.map(s => (
          <button
            key={s}
            className={`rep-tab-btn ${seccion === s ? 'rep-tab-btn--active' : ''}`}
            onClick={() => setSeccion(s)}
          >{s}</button>
        ))}
      </div>

      <div className="rep-content">
        <div className="rep-topbar">
          <div className="co-fecha-row" style={{ margin: 0 }}>
            <div className="co-fecha-group">
              <label className="co-fecha-label">Desde</label>
              <input type="date" className="co-fecha-input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            </div>
            <span className="co-fecha-sep">—</span>
            <div className="co-fecha-group">
              <label className="co-fecha-label">Hasta</label>
              <input type="date" className="co-fecha-input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </div>
            {(fechaDesde || fechaHasta) && (
              <button className="co-fecha-clear" onClick={() => { setFechaDesde(''); setFechaHasta('') }}>Limpiar</button>
            )}
          </div>
          <button className="rep-export-btn">↗ Exportar</button>
        </div>

        {seccion === 'Ventas'    && <TabVentas    ventasFilt={ventasFilt} lbl={lbl} />}
        {seccion === 'Productos' && <TabProductos ventasFilt={ventasFilt} lbl={lbl} />}
        {seccion === 'Stock'     && <TabStock     ingredientes={ingredientes} lbl={lbl} />}
        {seccion === 'Compras'   && <TabCompras   gastosFilt={gastosFilt}  lbl={lbl} />}
        {seccion === 'Gastos'    && <TabGastos    gastosFilt={gastosFilt}  lbl={lbl} />}
        {seccion === 'Balance'   && <TabBalance   ventasFilt={ventasFilt}  gastosFilt={gastosFilt} lbl={lbl} />}
        {seccion === 'Mesas'     && <TabMesas     ventasFilt={ventasFilt}  lbl={lbl} />}
      </div>
    </div>
  )
}
