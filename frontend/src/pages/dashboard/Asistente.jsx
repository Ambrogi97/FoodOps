import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, CalendarDays, Target, ChevronDown, ChevronUp, RefreshCw, ShoppingCart, LayoutGrid, Info } from 'lucide-react'
import { asistenteService } from '../../services/api'
import './Asistente.css'

const fmt  = n => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
const fmtK = n => n >= 1_000_000 ? `$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`
  : n >= 1000 ? `$${Math.round(n / 1000).toLocaleString('es-AR')}k` : `$${Math.round(n)}`

const fechaLocal = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const TABS = [
  { id: 'prediccion', label: 'Predicción', Icon: TrendingUp },
  { id: 'compras',    label: 'Lista de compras', Icon: ShoppingCart, pronto: true },
  { id: 'menu',       label: 'Menú', Icon: LayoutGrid, pronto: true },
]

function Grafico({ historico, dias }) {
  const cols = [
    ...historico.map(h => ({ ...h, tipo: 'real' })),
    ...dias.map(d => ({ fecha: d.fecha, label: d.label === 'Mañana' ? 'Mañ.' : d.label, tipo: 'pred', cerrado: d.cerrado, feriado: d.feriado, ventas: d.ventas.esperado, min: d.ventas.min, max: d.ventas.max })),
  ]
  const max = Math.max(...cols.map(c => c.max || c.ventas), 1) * 1.05
  return (
    <div className="asi-graf-scroll">
      <div className="asi-graf" role="img"
        aria-label={`Ventas de los últimos 7 días y predicción de los próximos 7. Día más fuerte previsto: ${[...dias].sort((a, b) => b.ventas.esperado - a.ventas.esperado)[0]?.label}`}>
        {cols.map(c => (
          <div key={c.fecha} className="asi-col"
            title={c.tipo === 'real'
              ? `${c.label}: ${fmt(c.ventas)} · ${c.tickets} ventas${c.hoy ? ' (hasta ahora)' : ''}`
              : c.cerrado ? `${c.label}: cerrado` : `${c.label}: ~${fmt(c.ventas)} (entre ${fmt(c.min)} y ${fmt(c.max)})${c.feriado ? ' · feriado' : ''}`}>
            <span className="asi-col-monto">{c.cerrado ? 'cerrado' : (c.tipo === 'pred' ? '~' : '') + fmtK(c.ventas)}</span>
            <div className="asi-col-area">
              {c.tipo === 'pred' && !c.cerrado && (
                <span className="asi-rango" style={{ bottom: `${(c.min / max) * 100}%`, height: `${((c.max - c.min) / max) * 100}%` }} />
              )}
              {!c.cerrado && (
                <span className={`asi-barra asi-barra--${c.tipo}${c.hoy ? ' asi-barra--hoy' : ''}`}
                  style={{ height: `${Math.max(1, (c.ventas / max) * 100)}%` }} />
              )}
            </div>
            <span className={`asi-col-label${c.hoy ? ' asi-col-label--hoy' : ''}`}>{c.label}</span>
            {c.feriado && <span className="asi-feriado">feriado</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function TablaPlatos({ platos, dias }) {
  const [todos, setTodos] = useState(false)
  const abiertos = dias.map((d, i) => ({ ...d, i })).filter(d => !d.cerrado)
  const pico = abiertos.reduce((a, d) => (d.ventas.esperado > (a?.ventas.esperado ?? -1) ? d : a), null)
  const lista = todos ? platos : platos.slice(0, 10)
  return (
    <>
      <div className="asi-tabla-scroll">
        <table className="asi-tabla">
          <thead>
            <tr>
              <th className="asi-th-plato">Plato</th>
              {abiertos.map(d => (
                <th key={d.fecha} className={d.i === pico?.i ? 'asi-th-pico' : ''}>
                  {d.label}{d.feriado && <span className="asi-th-feriado"> · feriado</span>}
                </th>
              ))}
              <th>Semana</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.nombre}>
                <td className="asi-td-plato">{p.nombre}</td>
                {abiertos.map(d => {
                  const x = p.porDia[d.i]
                  return (
                    <td key={d.fecha} className={d.i === pico?.i ? 'asi-td-pico' : ''} title={`Entre ${x.min} y ${x.max}`}>
                      {x.cantidad}
                    </td>
                  )
                })}
                <td className="asi-td-total">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {platos.length > 10 && (
        <button className="asi-link" onClick={() => setTodos(t => !t)}>
          {todos ? <><ChevronUp size={15} /> Ver menos</> : <><ChevronDown size={15} /> Ver los {platos.length} platos</>}
        </button>
      )}
    </>
  )
}

function ComoFunciona({ datos }) {
  const [abierto, setAbierto] = useState(false)
  const f = datos.factores, pr = datos.precision
  return (
    <section className="asi-card asi-como">
      <button className="asi-como-btn" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}>
        <Info size={17} /> ¿Cómo calcula la predicción?
        {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {abierto && (
        <div className="asi-como-cuerpo">
          <p>Para cada plato mira <strong>los mismos días de la semana de las últimas 8 semanas</strong> (por ejemplo, los últimos 8 sábados), dándole más peso a las semanas más recientes. Después ajusta por:</p>
          <ul>
            <li><strong>Crecimiento del negocio:</strong> {f.crecimientoSemanal > 0 ? '+' : ''}{f.crecimientoSemanal}% por semana (últimas 4 semanas contra las 4 anteriores).</li>
            <li><strong>Feriados:</strong> en tu local se vende {f.feriado >= 0 ? `un ${f.feriado}% más` : `un ${-f.feriado}% menos`} {f.feriadosObservados ? `(aprendido de ${f.feriadosObservados} feriado${f.feriadosObservados === 1 ? '' : 's'} pasados)` : '(valor inicial: todavía no hay feriados en tu historial)'}.</li>
            <li><strong>Días cerrados:</strong> {f.diasCerrados.length ? f.diasCerrados.join(', ') : 'ninguno'} (detectados porque no hubo ventas esas semanas).</li>
          </ul>
          <p>La facturación esperada es <strong>unidades previstas × precio actual</strong> de cada plato.</p>
          {pr && (
            <p>Para medir qué tan bien funciona, FoodOps predijo cada uno de los últimos {pr.diasEvaluados} días abiertos usando solo los datos anteriores a ese día y lo comparó con lo que realmente se vendió. El rango (mínimo–máximo) es el que contuvo el 80% de esos días.</p>
          )}
          <p className="asi-como-nota">Se basa en {f.historialDias} días de historial. Cuantas más ventas cargues, mejor predice.</p>
        </div>
      )}
    </section>
  )
}

export default function Asistente() {
  const [tab, setTab]         = useState('prediccion')
  const [datos, setDatos]     = useState(null)
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try { setDatos(await asistenteService.prediccion(fechaLocal())) }
    catch (e) { setError(e.message || 'No se pudo calcular la predicción') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { const t = setTimeout(cargar, 0); return () => clearTimeout(t) }, [cargar])

  const sumaPred  = datos?.dias?.reduce((a, d) => a + d.ventas.esperado, 0) ?? 0
  const sumaReal  = datos?.historico?.filter(h => !h.hoy).reduce((a, h) => a + h.ventas, 0) ?? 0
  const ventasPred = datos?.dias?.reduce((a, d) => a + d.tickets, 0) ?? 0
  const pico      = datos?.dias ? [...datos.dias].sort((a, b) => b.ventas.esperado - a.ventas.esperado)[0] : null
  const pr        = datos?.precision
  const mejora    = pr && pr.errorPorPlatoSemanaSimple ? Math.round((1 - pr.errorPorPlatoSemana / pr.errorPorPlatoSemanaSimple) * 100) : null

  return (
    <div className="asi-page">
      <div className="asi-tabs" role="tablist" aria-label="Secciones del asistente">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} disabled={t.pronto}
            className={`asi-tab${tab === t.id ? ' asi-tab--on' : ''}`} onClick={() => setTab(t.id)}>
            <t.Icon size={16} aria-hidden="true" /> {t.label}
            {t.pronto && <span className="asi-pronto">Pronto</span>}
          </button>
        ))}
        <button className="asi-refrescar" onClick={cargar} aria-label="Recalcular" title="Recalcular"><RefreshCw size={16} className={cargando ? 'asi-girando' : ''} /></button>
      </div>

      {error && !datos && (
        <div className="asi-card asi-error" role="alert"><p>{error}</p><button className="asi-btn" onClick={cargar}>Reintentar</button></div>
      )}
      {!datos && !error && <div className="asi-card asi-cargando" aria-busy="true">Calculando la predicción con tu historial de ventas…</div>}

      {datos && !datos.suficiente && (
        <div className="asi-card asi-vacio">
          <CalendarDays size={28} aria-hidden="true" />
          <h3>Todavía no hay suficientes ventas</h3>
          <p>La predicción necesita al menos {datos.minimoDias} días de ventas cargadas. Llevás {datos.historialDias}. Seguí usando FoodOps y en unos días va a estar lista.</p>
        </div>
      )}

      {datos?.suficiente && tab === 'prediccion' && (
        <>
          <section className="asi-kpis">
            <article className="asi-card asi-kpi">
              <span className="asi-kpi-titulo">Próximos 7 días</span>
              <span className="asi-kpi-valor">~ {fmt(sumaPred)}</span>
              <span className="asi-kpi-sub">unas {ventasPred} ventas{sumaReal > 0 ? ` · la semana que pasó: ${fmt(sumaReal)} en 6 días` : ''}</span>
            </article>
            {pico && (
              <article className="asi-card asi-kpi">
                <span className="asi-kpi-titulo">Día más fuerte</span>
                <span className="asi-kpi-valor">{pico.label}{pico.feriado ? ' (feriado)' : ''}</span>
                <span className="asi-kpi-sub">~ {fmt(pico.ventas.esperado)} · {pico.tickets} ventas</span>
              </article>
            )}
            {pr && (
              <article className="asi-card asi-kpi">
                <span className="asi-kpi-titulo"><Target size={14} aria-hidden="true" /> Precisión medida (últimas 8 semanas)</span>
                <span className="asi-kpi-valor">± {Math.round(pr.errorPorPlatoSemana)}%</span>
                <span className="asi-kpi-sub">error por plato en la semana{mejora > 0 ? ` · ${mejora}% mejor que repetir la semana pasada` : ''}</span>
              </article>
            )}
          </section>

          <section className="asi-card">
            <div className="asi-card-head">
              <div>
                <h3 className="asi-h3">Ventas: lo que pasó y lo que viene</h3>
                <p className="asi-sub">La barra punteada es la predicción; la línea finita, el rango probable (80%).</p>
              </div>
              <div className="asi-leyenda">
                <span><i className="asi-dot asi-dot--real" />Real</span>
                <span><i className="asi-dot asi-dot--pred" />Predicción</span>
              </div>
            </div>
            <Grafico historico={datos.historico} dias={datos.dias} />
          </section>

          <section className="asi-card">
            <div className="asi-card-head">
              <div>
                <h3 className="asi-h3">Por plato · próximos días</h3>
                <p className="asi-sub">Unidades que se espera vender. Pasá el mouse por un número para ver el rango.</p>
              </div>
            </div>
            <TablaPlatos platos={datos.platos} dias={datos.dias} />
            {datos.dias.some(d => d.cerrado) && (
              <p className="asi-nota">
                {datos.dias.filter(d => d.cerrado).length === 1 ? 'No aparece el ' : 'No aparecen '}
                {datos.dias.filter(d => d.cerrado).map(d => d.label).join(', ')} porque el local cierra.
              </p>
            )}
          </section>

          <ComoFunciona datos={datos} />
        </>
      )}
    </div>
  )
}
