import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { ventasService, gastosService, ingredientesService, categoriasGastoService } from '../../services/api'
import { descargarExcel } from '../../utils/excel'
import './Reportes.css'

const fmt    = n => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtNum = n => Number(n || 0).toLocaleString('es-AR')


const SECCIONES = ['Ventas', 'Productos', 'Stock', 'Compras', 'Gastos', 'Balance', 'Mesas']
const DOW       = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES     = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const BAR_COLORS = ['#f97316','#22c55e','#3b82f6','#8b5cf6','#eab308','#ef4444','#06b6d4','#ec4899','#14b8a6','#f59e0b']

// Las fechas se guardan como "dd/mm/aaaa hh:mm" (la hora es opcional)
const parseFecha = str => {
  const m = String(str || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(0)
}

const dateKey = str => (str ? str.split(' ')[0] : '')

const sumaV   = v => (v.items || []).reduce((a, i) => a + (i.precio || 0) * (i.cantidad || 0), 0)
const montoG  = g => Number(g.importe ?? g.monto ?? 0)

// Agrupa registros { fecha: Date, monto, egreso, count } por día, semana o mes
// según el largo del período, ordenados por fecha real (no como texto).
const DIA_MS = 86_400_000
function agruparTiempo(registros) {
  const validos = registros.filter(r => r.fecha.getTime() > 0)
  if (!validos.length) return { modo: 'dia', datos: [] }
  const ts   = validos.map(r => r.fecha.getTime())
  const dias = (Math.max(...ts) - Math.min(...ts)) / DIA_MS
  const modo = dias > 120 ? 'mes' : dias > 45 ? 'semana' : 'dia'
  const p2   = n => String(n).padStart(2, '0')
  const map  = {}
  for (const r of validos) {
    const f = r.fecha
    let ini
    if (modo === 'mes')         ini = new Date(f.getFullYear(), f.getMonth(), 1)
    else if (modo === 'semana') ini = new Date(f.getFullYear(), f.getMonth(), f.getDate() - ((f.getDay() + 6) % 7)) // lunes
    else                        ini = new Date(f.getFullYear(), f.getMonth(), f.getDate())
    const t = ini.getTime()
    const b = map[t] ||= {
      t, monto: 0, egreso: 0, count: 0,
      l: modo === 'mes' ? `${MESES[ini.getMonth()]} ${String(ini.getFullYear()).slice(2)}` : `${p2(ini.getDate())}/${p2(ini.getMonth() + 1)}`,
    }
    b.monto += r.monto || 0; b.egreso += r.egreso || 0; b.count += r.count || 0
  }
  return { modo, datos: Object.values(map).sort((a, b) => a.t - b.t) }
}
const MODO_LBL = { dia: 'por día', semana: 'por semana', mes: 'por mes' }

// Con muchas barras se muestra solo una etiqueta cada tanto para que no se pisen
const pasoEtiquetas = n => Math.max(1, Math.ceil(n / 14))

// Categorías de gasto: nombre y categoría financiera vienen de categoriaId
const infoCategoria = (g, catGastos) => {
  const c = g.categoriaId ? catGastos.find(x => x.id === g.categoriaId) : null
  return { nombre: c?.nombre || g.categoria || 'Sin categoría', fin: c?.categoriaFinanciera || 'Gastos administrativos' }
}


/* ── SVG Bar chart (vertical) ─────────────────────────────────────────── */
function BarChartSVG({ data, color = 'var(--primary)', h = 150 }) {
  if (!data.length) return <p className="rep-empty">Sin datos</p>
  const max  = Math.max(...data.map(d => d.v), 1)
  const W    = data.length * 44
  const PAD  = { t: 8, b: 26, l: 4, r: 4 }
  const ih   = h - PAD.t - PAD.b
  const paso = pasoEtiquetas(data.length)
  return (
    <svg viewBox={`0 0 ${W + PAD.l + PAD.r} ${h}`} className="rep-svg" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const bh = (d.v / max) * ih
        const x  = PAD.l + i * 44 + 4
        return (
          <g key={i}>
            <rect x={x} y={PAD.t + (ih - bh)} width={36} height={bh} fill={color} rx={3} opacity={0.85}>
              <title>{`${d.l}: ${fmt(d.v)}`}</title>
            </rect>
            {i % paso === 0 && <text x={x + 18} y={h - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.l}</text>}
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
  // Ancho fijo: el gráfico ocupa la tarjeta tenga 3 barras o 60
  const W    = 900
  const PAD  = { t: 10, b: 30, l: 4, r: 4 }
  const ih   = h - PAD.t - PAD.b
  const slot = (W - PAD.l - PAD.r) / n
  const cx   = i => PAD.l + i * slot + slot / 2
  const bw   = Math.min(slot * 0.6, 48)
  const paso = pasoEtiquetas(n)
  const pts  = data.map((d, i) => `${cx(i)},${PAD.t + ih - (d.count / maxC) * ih}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="rep-svg" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const bh = (d.monto / maxM) * ih
        return (
          <g key={i}>
            <rect x={cx(i) - bw / 2} y={PAD.t + ih - bh} width={bw} height={bh} fill="#1e3a5f" rx={3} opacity={0.85}>
              <title>{`${d.l}: ${fmt(d.monto)} · ${fmtNum(d.count)} ventas`}</title>
            </rect>
            {i % paso === 0 && <text x={cx(i)} y={h - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.l}</text>}
          </g>
        )
      })}
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth={2} />
      {data.map((d, i) => (
        <circle key={i} cx={cx(i)} cy={PAD.t + ih - (d.count / maxC) * ih} r={n > 40 ? 2 : 3.5} fill="var(--primary)" />
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
  const W    = 900
  const H    = h
  const PAD  = { t: 12, b: 28, l: 64, r: 16 }
  const iw   = W - PAD.l - PAD.r
  const ih   = H - PAD.t - PAD.b
  const toX  = i => PAD.l + (n > 1 ? i * (iw / (n - 1)) : iw / 2)
  const toY  = v => PAD.t + ih - ((v - minV) / (maxV - minV || 1)) * ih
  const paso = pasoEtiquetas(n)
  const fmtY = v => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('es-AR')}`
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
            {s.data.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={n > 40 ? 2 : 3.5} fill={s.color}><title>{`${labels[i]} · ${s.name}: ${fmtY(v)}`}</title></circle>)}
          </g>
        )
      })}
      {/* X labels */}
      {labels.map((l, i) => (i % paso === 0 || i === n - 1) && (
        <text key={i} x={toX(i)} y={H - 8} textAnchor={anchor(i)} fontSize={9} fill="#94a3b8">{l}</text>
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
  const personas   = ventasFilt.reduce((a, v) => a + (v.personas || 1), 0)

  const evol = agruparTiempo(ventasFilt.map(v => ({ fecha: parseFecha(v.cierre || v.inicio), monto: sumaV(v), count: 1 })))

  const byDow = Array(7).fill(0)
  ventasFilt.forEach(v => { byDow[parseFecha(v.cierre || v.inicio).getDay()] += sumaV(v) })

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
        <KpiCard label="Total vendido"          value={fmt(totalBruto)} />
        <KpiCard label="Cantidad de ventas"     value={fmtNum(cantidad)} />
        <KpiCard label="Promedio por ticket"    value={fmt(promedio)} />
        <KpiCard label="Personas atendidas"     value={fmtNum(personas)} />
        <KpiCard label="Promedio por persona"   value={fmt(personas ? totalBruto / personas : 0)} />
      </div>

      <ReCard title="Evolución de ventas" subtitle={`${lbl} · ${MODO_LBL[evol.modo]}`}>
        <div className="re-chart-legends">
          <span className="re-legend"><span className="re-leg-dot" style={{ background: '#1e3a5f' }} />Ventas $</span>
          <span className="re-legend"><span className="re-leg-dot" style={{ background: 'var(--primary)' }} />Cantidad de ventas</span>
        </div>
        <div className="re-chart-wrap re-chart-wrap--lg"><EvolucionSVG data={evol.datos} /></div>
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
function TabCompras({ gastosFilt, catGastos, lbl }) {
  // Compras = gastos cuya categoría financiera es "Compra de mercadería"
  const compras = gastosFilt.filter(g => infoCategoria(g, catGastos).fin === 'Compra de mercadería')
  const evol = agruparTiempo(compras.map(g => ({ fecha: parseFecha(g.fecha), monto: montoG(g) })))

  const byCat = {}
  compras.forEach(g => { const n = infoCategoria(g, catGastos).nombre; byCat[n] = (byCat[n] || 0) + montoG(g) })
  const catData = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([l, v], i) => ({ l, v, color: BAR_COLORS[i % BAR_COLORS.length] }))
  const ordenadas = [...compras].sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha))

  return (
    <div className="re-section">
      <div className="re-info-banner">
        <span className="re-info-icon">ℹ</span>
        <span>Acá se ven los gastos cuya categoría tiene como categoría financiera "Compra de mercadería".</span>
      </div>
      <div className="re-row2">
        <ReCard title="Evolución de compras" subtitle={`${lbl} · ${MODO_LBL[evol.modo]}`}>
          <div className="re-chart-wrap">
            <BarChartSVG data={evol.datos.map(d => ({ l: d.l, v: d.monto }))} color="#1e3a5f" />
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
              {ordenadas.length === 0
                ? <tr><td colSpan={4} className="rep-empty">Sin datos</td></tr>
                : ordenadas.map(g => (
                  <tr key={g.id}>
                    <td className="re-td-muted">{dateKey(g.fecha)}</td>
                    <td><span className="re-badge re-badge--cat">{infoCategoria(g, catGastos).nombre}</span></td>
                    <td className="re-td-bold">{g.comentario || g.descripcion || g.proveedor || '—'}</td>
                    <td>{fmt(montoG(g))}</td>
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
function TabGastos({ gastosFilt, catGastos, lbl }) {
  const total  = gastosFilt.reduce((a, g) => a + montoG(g), 0)
  const catMap = {}, finMap = {}
  gastosFilt.forEach(g => {
    const { nombre, fin } = infoCategoria(g, catGastos)
    catMap[nombre] = (catMap[nombre] || 0) + montoG(g)
    finMap[fin]    = (finMap[fin]    || 0) + montoG(g)
  })
  const maxCat          = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
  const operacionales   = finMap['Gastos operacionales']   || 0
  const administrativos = finMap['Gastos administrativos'] || 0
  const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([l, v], i) => ({ l, v, color: BAR_COLORS[i % BAR_COLORS.length] }))

  return (
    <div className="re-section">
      <div className="re-info-banner">
        <span className="re-info-icon">ℹ</span>
        <span>Para visualizar el reporte de gastos correctamente, asegurate de tener todos los gastos registrados con su categoría financiera correspondiente.</span>
      </div>
      <div className="re-kpis-4">
        <KpiCard label="Gastos totales"           value={fmt(total)} />
        <KpiCard label="Categoría con más gastos" value={maxCat ? fmt(maxCat[1]) : fmt(0)} sub={maxCat ? maxCat[0] : '—'} />
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
  const evol = agruparTiempo([
    ...ventasFilt.map(v => ({ fecha: parseFecha(v.cierre || v.inicio), monto: sumaV(v) })),
    ...gastosFilt.map(g => ({ fecha: parseFecha(g.fecha), egreso: montoG(g) })),
  ])
  const allDays   = evol.datos.map(d => d.l)
  const ingSeries = evol.datos.map(d => d.monto)
  const egrSeries = evol.datos.map(d => d.egreso)
  const resSeries = evol.datos.map(d => d.monto - d.egreso)

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
      <ReCard title="Evolución del resultado" subtitle={`${lbl} · ${MODO_LBL[evol.modo]}`}>
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
  const [catGastos,    setCatGastos]    = useState([])
  const [cargando,     setCargando]     = useState(true)

  useEffect(() => {
    // Si una lista falla, el resto del reporte se muestra igual
    Promise.all([
      ventasService.listar().catch(() => []),
      gastosService.listar().catch(() => []),
      ingredientesService.listar().catch(() => []),
      categoriasGastoService.listar().catch(() => []),
    ]).then(([v, g, i, cg]) => {
      // Las ventas abiertas todavía no son ventas: no entran en los reportes
      setVentas(v.filter(x => x.estado !== 'en_curso')); setGastos(g); setIngredientes(i); setCatGastos(cg)
    }).finally(() => setCargando(false))
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

  // Exporta la pestaña actual a un Excel real (.xlsx): columnas con ancho, fechas y montos con formato
  const exportar = () => {
    const sufijo = (fechaDesde || fechaHasta) ? `_${fechaDesde || 'inicio'}_${fechaHasta || 'hoy'}` : ''
    const archivo = `reporte_${seccion.toLowerCase()}${sufijo}.xlsx`
    const T = (titulo, tipo = 'texto', ancho) => ({ titulo, tipo, ancho })
    const ORIGEN = { salon: 'Salón', mostrador: 'Mostrador', delivery: 'Delivery' }
    if (seccion === 'Stock') {
      return descargarExcel(archivo, 'Stock',
        [T('Ingrediente'), T('Categoría'), T('Unidad', 'texto', 9), T('Stock mínimo', 'numero', 13), T('Stock actual', 'numero', 13), T('Estado', 'texto', 12)],
        ingredientes.map(i => [i.nombre, i.categoria, i.unidad, i.stockMinimo, i.stockActual, i.stockActual <= i.stockMinimo ? 'Stock bajo' : 'OK']))
    }
    if (seccion === 'Compras' || seccion === 'Gastos') {
      const lista = seccion === 'Compras' ? gastosFilt.filter(g => infoCategoria(g, catGastos).fin === 'Compra de mercadería') : gastosFilt
      return descargarExcel(archivo, seccion,
        [T('Fecha', 'fecha'), T('Categoría'), T('Categoría financiera', 'texto', 24), T('Proveedor'), T('Comentario', 'texto', 30), T('Importe', 'moneda'), T('Estado de pago', 'texto', 15)],
        lista.map(g => { const c = infoCategoria(g, catGastos); return [dateKey(g.fecha), c.nombre, c.fin, g.proveedor, g.comentario, montoG(g), g.estadoPago] }))
    }
    if (seccion === 'Productos') {
      const rank = {}
      ventasFilt.forEach(v => (v.items || []).forEach(it => {
        const r = rank[it.nombre] ||= { cant: 0, total: 0 }
        r.cant += it.cantidad || 0; r.total += (it.precio || 0) * (it.cantidad || 0)
      }))
      return descargarExcel(archivo, 'Productos',
        [T('Producto', 'texto', 30), T('Unidades vendidas', 'numero', 18), T('Total vendido', 'moneda', 16)],
        Object.entries(rank).sort((a, b) => b[1].total - a[1].total).map(([n, r]) => [n, r.cant, Math.round(r.total)]))
    }
    if (seccion === 'Balance') {
      return descargarExcel(archivo, 'Balance',
        [T('Tipo', 'texto', 10), T('Fecha', 'fecha'), T('Detalle', 'texto', 28), T('Importe', 'moneda')],
        [
          ...ventasFilt.map(v => ['Ingreso', dateKey(v.cierre || v.inicio), `Venta #${v.numero ?? ''} ${v.mesa ? '· ' + v.mesa : ''}`.trim(), Math.round(sumaV(v))]),
          ...gastosFilt.map(g => ['Egreso', dateKey(g.fecha), infoCategoria(g, catGastos).nombre, -montoG(g)]),
        ])
    }
    // Ventas y Mesas
    descargarExcel(archivo, seccion,
      [T('Número', 'id', 10), T('Inicio', 'fechaHora'), T('Cierre', 'fechaHora'), T('Origen', 'texto', 12), T('Mesa', 'texto', 12), T('Personas', 'numero', 10), T('Medio de pago', 'texto', 15), T('Total', 'moneda')],
      ventasFilt.map(v => [v.numero ?? '', v.inicio, v.cierre, ORIGEN[v.tipo] || v.tipo, v.mesa, v.personas, v.metodoPago, Math.round(sumaV(v))]))
  }

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
          <button className="rep-export-btn" onClick={exportar} title="Descarga los datos de esta pestaña para abrir en Excel">↗ Exportar</button>
        </div>

        {seccion === 'Ventas'    && <TabVentas    ventasFilt={ventasFilt} lbl={lbl} />}
        {seccion === 'Productos' && <TabProductos ventasFilt={ventasFilt} lbl={lbl} />}
        {seccion === 'Stock'     && <TabStock     ingredientes={ingredientes} lbl={lbl} />}
        {seccion === 'Compras'   && <TabCompras   gastosFilt={gastosFilt}  catGastos={catGastos} lbl={lbl} />}
        {seccion === 'Gastos'    && <TabGastos    gastosFilt={gastosFilt}  catGastos={catGastos} lbl={lbl} />}
        {seccion === 'Balance'   && <TabBalance   ventasFilt={ventasFilt}  gastosFilt={gastosFilt} lbl={lbl} />}
        {seccion === 'Mesas'     && <TabMesas     ventasFilt={ventasFilt}  lbl={lbl} />}
      </div>
    </div>
  )
}
