import { useState, useEffect, useMemo } from 'react'
import { ventasService, gastosService, categoriasGastoService } from '../../services/api'
import { ChevronDown, ChevronRight } from 'lucide-react'
import './Finanzas.css'

const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const PERIODOS    = ['Último mes', 'Últimos 3 meses', 'Últimos 6 meses', 'Últimos 12 meses', 'Personalizado']

const fmtNum  = n => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const mesKey  = m => `${m.year}-${String(m.month).padStart(2, '0')}`
const mesLabel = m => `${MESES_ABREV[m.month - 1]} (${String(m.year).slice(2)})`

function getMeses(periodo, desdeC, hastaC) {
  const hoy = new Date()
  let desde, hasta
  if (periodo === 'Personalizado' && desdeC && hastaC) {
    const [dy, dm] = desdeC.split('-').map(Number)
    const [hy, hm] = hastaC.split('-').map(Number)
    desde = { year: dy, month: dm }
    hasta = { year: hy, month: hm }
  } else {
    const n = { 'Último mes': 1, 'Últimos 3 meses': 3, 'Últimos 6 meses': 6, 'Últimos 12 meses': 12 }[periodo] ?? 3
    hasta = { year: hoy.getFullYear(), month: hoy.getMonth() + 1 }
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - n + 1, 1)
    desde = { year: d.getFullYear(), month: d.getMonth() + 1 }
  }
  const meses = []
  let cur = { ...desde }
  while (cur.year < hasta.year || (cur.year === hasta.year && cur.month <= hasta.month)) {
    meses.push({ ...cur })
    const nx = new Date(cur.year, cur.month, 1)
    cur = { year: nx.getFullYear(), month: nx.getMonth() + 1 }
  }
  return meses
}

const ventaTotal  = v => (v.items || []).reduce((s, i) => s + (i.cantidad || 0) * (i.precio || 0), 0)
const fechaMes    = f => { if (!f) return null; const d = new Date(f); return isNaN(d) ? null : { year: d.getFullYear(), month: d.getMonth() + 1 } }
const pct         = (v, base) => base !== 0 ? Math.round((v / base) * 100) : 0
const fmtDelta    = n => n > 0 ? `+${n}%` : `${n}%`

export default function Finanzas() {
  const [periodo, setPeriodo]       = useState('Últimos 3 meses')
  const [desdeC, setDesdeC]         = useState('')
  const [hastaC, setHastaC]         = useState('')
  const [ventas, setVentas]         = useState([])
  const [gastos, setGastos]         = useState([])
  const [catGastos, setCatGastos]   = useState([])
  const [cargando, setCargando]     = useState(true)
  const [expandidos, setExpandidos] = useState(new Set())
  const [dropOpen, setDropOpen]     = useState(false)

  useEffect(() => {
    Promise.all([
      ventasService.listar().catch(() => []),
      gastosService.listar().catch(() => []),
      categoriasGastoService.listar().catch(() => []),
    ]).then(([v, g, cg]) => { setVentas(v); setGastos(g); setCatGastos(cg) })
      .finally(() => setCargando(false))
  }, [])

  const meses    = useMemo(() => getMeses(periodo, desdeC, hastaC), [periodo, desdeC, hastaC])
  const mesKeys  = useMemo(() => new Set(meses.map(mesKey)), [meses])

  // ── Período anterior (mismo largo, inmediatamente antes) ─────────────────
  const mesesAnt = useMemo(() => {
    if (!meses.length) return []
    const n  = meses.length
    const d  = new Date(meses[0].year, meses[0].month - 2, 1)       // mes antes del primero
    const arr = []
    for (let i = 0; i < n; i++) {
      arr.unshift({ year: d.getFullYear(), month: d.getMonth() + 1 })
      d.setMonth(d.getMonth() - 1)
    }
    return arr
  }, [meses])
  const mesKeysAnt = useMemo(() => new Set(mesesAnt.map(mesKey)), [mesesAnt])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const catFin  = id => id ? catGastos.find(c => c.id === id)?.categoriaFinanciera  || null : null
  const catNom  = id => id ? catGastos.find(c => c.id === id)?.nombre || 'Sin categoría' : 'Sin categoría'

  // ── Agregatores genéricos ─────────────────────────────────────────────────
  const mkEmpty = () => Object.fromEntries(meses.map(m => [mesKey(m), 0]))

  const ventasPeriodo = ventas.filter(v => { const m = fechaMes(v.inicio); return m && mesKeys.has(mesKey(m)) && v.estado === 'cerrada' })
  const ventasAnt     = ventas.filter(v => { const m = fechaMes(v.inicio); return m && mesKeysAnt.has(mesKey(m)) && v.estado === 'cerrada' })
  const gastosPeriodo = gastos.filter(g => { const m = fechaMes(g.fecha);  return m && mesKeys.has(mesKey(m)) })
  const gastosAnt     = gastos.filter(g => { const m = fechaMes(g.fecha);  return m && mesKeysAnt.has(mesKey(m)) })

  // Ventas por mes
  const ventasByMes = mkEmpty()
  for (const v of ventasPeriodo) { const mk = mesKey(fechaMes(v.inicio)); ventasByMes[mk] = (ventasByMes[mk] || 0) + ventaTotal(v) }
  const totalVentas    = Object.values(ventasByMes).reduce((a, b) => a + b, 0)
  const totalVentasAnt = ventasAnt.reduce((a, v) => a + ventaTotal(v), 0)

  // Función para agregar gastos por categoría financiera
  const agrupGastos = (list, keys) => {
    const cmv = {}, op = {}, adm = {}
    const cmvCat = {}, opCat = {}, admCat = {}
    for (const m of meses) { cmv[mesKey(m)] = 0; op[mesKey(m)] = 0; adm[mesKey(m)] = 0 }
    for (const g of list) {
      const m = fechaMes(g.fecha); if (!m) continue
      const mk = mesKey(m); if (!keys.has(mk)) continue
      const fin = catFin(g.categoriaId)
      const [byMes, byCat] = fin === 'Compra de mercadería' ? [cmv, cmvCat] : fin === 'Gastos operacionales' ? [op, opCat] : [adm, admCat]
      byMes[mk] = (byMes[mk] || 0) + (g.importe || 0)
      const cn = catNom(g.categoriaId)
      if (!byCat[cn]) byCat[cn] = Object.fromEntries(meses.map(m2 => [mesKey(m2), 0]))
      byCat[cn][mk] = (byCat[cn][mk] || 0) + (g.importe || 0)
    }
    return { cmv, op, adm, cmvCat, opCat, admCat }
  }

  const { cmv, op, adm, cmvCat, opCat, admCat } = useMemo(() => agrupGastos(gastosPeriodo, mesKeys), [gastosPeriodo, mesKeys])
  const { cmv: cmvA, op: opA, adm: admA } = useMemo(() => agrupGastos(gastosAnt, mesKeysAnt), [gastosAnt, mesKeysAnt])

  const totalCmv = Object.values(cmv).reduce((a, b) => a + b, 0)
  const totalOp  = Object.values(op).reduce((a, b) => a + b, 0)
  const totalAdm = Object.values(adm).reduce((a, b) => a + b, 0)

  const totalCmvAnt = Object.values(cmvA).reduce((a, b) => a + b, 0)
  const totalOpAnt  = Object.values(opA).reduce((a, b) => a + b, 0)
  const totalAdmAnt = Object.values(admA).reduce((a, b) => a + b, 0)

  const ganBrutaByMes  = Object.fromEntries(meses.map(m => { const mk = mesKey(m); return [mk, ventasByMes[mk] - cmv[mk]] }))
  const ganNetaByMes   = Object.fromEntries(meses.map(m => { const mk = mesKey(m); return [mk, ganBrutaByMes[mk] - op[mk] - adm[mk]] }))
  const totalGanBruta  = totalVentas - totalCmv
  const totalGanNeta   = totalGanBruta - totalOp - totalAdm
  const totalGanBrutaAnt = totalVentasAnt - totalCmvAnt
  const totalGanNetaAnt  = totalGanBrutaAnt - totalOpAnt - totalAdmAnt

  const deltaPct = (cur, prev) => prev !== 0 ? pct(cur - prev, prev) : (cur > 0 ? 100 : 0)

  const toggleExpand = id => setExpandidos(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const selPeriodo = p => { setPeriodo(p); setDropOpen(false); if (p !== 'Personalizado') { setDesdeC(''); setHastaC('') } }

  if (cargando) return <div className="fin-loading">Cargando...</div>

  // ── Filas P&L ─────────────────────────────────────────────────────────────
  const FILAS = [
    { id: 'ventas', label: 'Ventas brutas',               sign: '+', byMes: ventasByMes, total: totalVentas,   sub: null },
    { id: 'cmv',   label: 'Costos de mercadería vendida', sign: '-', byMes: cmv,          total: totalCmv,     sub: cmvCat },
    { id: 'gb',    label: 'Ganancia bruta',               sign: '=', byMes: ganBrutaByMes, total: totalGanBruta, sub: null, computed: true },
    { id: 'op',    label: 'Gastos operacionales',         sign: '-', byMes: op,           total: totalOp,      sub: opCat },
    { id: 'adm',   label: 'Gastos administrativos',       sign: '-', byMes: adm,          total: totalAdm,     sub: admCat },
    { id: 'gn',    label: 'Ganancia neta',                sign: '=', byMes: ganNetaByMes,  total: totalGanNeta, sub: null, computed: true },
  ]

  return (
    <div className="fin-page" onClick={() => dropOpen && setDropOpen(false)}>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="fin-filtros">
        <div className="fin-field">
          <label className="fin-label">Período</label>
          <div className="fin-drop-wrap" onClick={e => e.stopPropagation()}>
            <button className="fin-drop-btn" onClick={() => setDropOpen(v => !v)}>
              {periodo} <ChevronDown size={14} />
            </button>
            {dropOpen && (
              <div className="fin-drop-menu">
                {PERIODOS.map(p => (
                  <div key={p} className={`fin-drop-opt${periodo === p ? ' fin-drop-opt--active' : ''}`}
                    onClick={() => selPeriodo(p)}>{p}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        {periodo === 'Personalizado' && (
          <>
            <div className="fin-field">
              <label className="fin-label">Desde</label>
              <input type="month" className="fin-input-month" value={desdeC} onChange={e => setDesdeC(e.target.value)} />
            </div>
            <div className="fin-field">
              <label className="fin-label">Hasta</label>
              <input type="month" className="fin-input-month" value={hastaC} onChange={e => setHastaC(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────────── */}
      <div className="fin-kpis">
        {[
          { label: 'Ventas brutas',                cur: totalVentas,   prev: totalVentasAnt,   pctBase: null },
          { label: 'Costos de mercadería vendida', cur: totalCmv,      prev: totalCmvAnt,       pctBase: totalVentas },
          { label: 'Ganancia bruta',               cur: totalGanBruta, prev: totalGanBrutaAnt,  pctBase: totalVentas },
          { label: 'Ganancia neta',                cur: totalGanNeta,  prev: totalGanNetaAnt,   pctBase: totalVentas, highlight: true },
        ].map(k => {
          const delta = deltaPct(k.cur, k.prev)
          return (
            <div key={k.label} className={`fin-kpi${k.highlight ? ' fin-kpi--hl' : ''}`}>
              <div className="fin-kpi-label">{k.label}</div>
              <div className="fin-kpi-row">
                <span className="fin-kpi-value">{fmtNum(k.cur)}</span>
                {k.pctBase !== null && <span className="fin-kpi-pct">{pct(k.cur, k.pctBase)}%</span>}
              </div>
              {k.prev !== 0 && (
                <div className={`fin-kpi-delta ${delta >= 0 ? 'fin-delta--pos' : 'fin-delta--neg'}`}>
                  {delta >= 0 ? '↑' : '↓'} {fmtDelta(delta)} vs. período anterior
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Tabla P&L ────────────────────────────────────────────────────────── */}
      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr>
              <th className="fin-th-label">Estado de resultados</th>
              {meses.map(m => <th key={mesKey(m)} className="fin-th-mes">{mesLabel(m)}</th>)}
              <th className="fin-th-total">Total $</th>
            </tr>
          </thead>
          <tbody>
            {FILAS.map(fila => {
              const subEntries = fila.sub ? Object.entries(fila.sub).filter(([, v]) => Object.values(v).some(x => x !== 0)) : []
              const expandible = subEntries.length > 0
              const exp        = expandidos.has(fila.id)
              return (
                <FinRow key={fila.id} fila={fila} meses={meses} totalVentas={totalVentas}
                  expandible={expandible} expanded={exp} onToggle={() => toggleExpand(fila.id)}
                  subEntries={subEntries} />
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

// ── Fila de tabla ─────────────────────────────────────────────────────────
function FinRow({ fila, meses, totalVentas, expandible, expanded, onToggle, subEntries }) {
  const signCls = { '+': 'fin-sign--plus', '-': 'fin-sign--minus', '=': 'fin-sign--eq' }[fila.sign]
  const pctBase = totalVentas

  return (
    <>
      <tr className={`fin-row${fila.computed ? ' fin-row--computed' : ''}${expandible ? ' fin-row--link' : ''}`}
        onClick={expandible ? onToggle : undefined}>
        <td className="fin-td-label">
          <span className="fin-expand-slot">
            {expandible
              ? expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              : null}
          </span>
          <span className={`fin-sign ${signCls}`}>({fila.sign})</span>
          {fila.label}
        </td>
        {meses.map(m => {
          const mk  = mesKey(m)
          const val = fila.byMes[mk] || 0
          return (
            <td key={mk} className={`fin-td-mes${fila.computed ? ' fin-td--computed' : ''}`}>
              <span className="fin-td-val">{val !== 0 ? fmtNum(val) : '0'}</span>
              <span className="fin-td-pct">{pct(val, pctBase)}%</span>
            </td>
          )
        })}
        <td className={`fin-td-total${fila.computed ? ' fin-td--computed' : ''}`}>
          <span className="fin-td-val">{fila.total !== 0 ? fmtNum(fila.total) : '0'}</span>
          <span className="fin-td-pct">{pct(fila.total, pctBase)}%</span>
        </td>
      </tr>

      {expanded && subEntries.map(([catName, byMes]) => {
        const subTotal = Object.values(byMes).reduce((a, b) => a + b, 0)
        return (
          <tr key={`${fila.id}-${catName}`} className="fin-row--sub">
            <td className="fin-td-label fin-td-sub">{catName}</td>
            {meses.map(m => {
              const mk  = mesKey(m)
              const val = byMes[mk] || 0
              return (
                <td key={mk} className="fin-td-mes fin-td-mes--sub">
                  <span className="fin-td-val">{val !== 0 ? fmtNum(val) : '—'}</span>
                </td>
              )
            })}
            <td className="fin-td-total fin-td-mes--sub">
              <span className="fin-td-val">{fmtNum(subTotal)}</span>
            </td>
          </tr>
        )
      })}
    </>
  )
}
