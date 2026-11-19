import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DollarSign, ShoppingBag, ClipboardList, Wallet, Plus, Pencil, Check, X, RefreshCw, Sparkles, ArrowRight,
} from 'lucide-react'
import { inicioService, configService, asistenteService } from '../../services/api'
import './Inicio.css'

const ACTUALIZAR_CADA = 30_000

const fmt  = n => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
const fmtN = n => Math.round(Number(n || 0)).toLocaleString('es-AR')
const DIAS  = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const fechaLocal = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const saludo = () => {
  const h = new Date().getHours()
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}
const COMPARACION = {
  hoy:    () => `vs ${DIAS[new Date().getDay()]} pasado`,
  semana: () => 'vs 7 días anteriores',
  mes:    () => 'vs mismo período del mes pasado',
}
const ESTADO_PEDIDO = {
  pendiente:  { label: 'Nuevo',      cls: 'nuevo' },
  preparando: { label: 'En cocina',  cls: 'cocina' },
  listo:      { label: 'Listo',      cls: 'listo' },
}
const TIPO_PEDIDO = { delivery: 'Delivery', takeaway: 'Retiro', mesa: 'Mesa' }

function Variacion({ actual, anterior, menosEsMejor, periodo }) {
  if (!anterior) return <span className="ini-delta ini-delta--neutro">Sin datos para comparar</span>
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  const sube = pct >= 0
  const bueno = menosEsMejor ? !sube : sube
  return (
    <span className={`ini-delta ${pct === 0 ? 'ini-delta--neutro' : bueno ? 'ini-delta--bien' : 'ini-delta--mal'}`}>
      {pct === 0 ? '=' : sube ? '▲' : '▼'} {sube && pct > 0 ? '+' : ''}{pct}% {COMPARACION[periodo]()}
    </span>
  )
}

function MiniBarras({ serie = [], destacar }) {
  const max = Math.max(...serie, 1)
  return (
    <div className="ini-spark" aria-hidden="true">
      {serie.map((v, i) => (
        <span key={i} className={i === serie.length - 1 ? `ini-spark-bar ini-spark-bar--${destacar}` : 'ini-spark-bar'}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
    </div>
  )
}

function Kpi({ titulo, Icon, valor, sub, dato, periodo, menosEsMejor, principal }) {
  return (
    <article className="ini-card ini-kpi">
      <div className="ini-kpi-top">
        <span className="ini-kpi-titulo">{titulo}</span>
        <span className={`ini-kpi-icon${principal ? ' ini-kpi-icon--principal' : ''}`}><Icon size={17} aria-hidden="true" /></span>
      </div>
      <div className="ini-kpi-bottom">
        <div className="ini-kpi-datos">
          <span className="ini-kpi-valor">{valor}</span>
          {sub
            ? <span className="ini-delta ini-delta--neutro">{sub}</span>
            : <Variacion actual={dato.actual} anterior={dato.anterior} menosEsMejor={menosEsMejor} periodo={periodo} />}
        </div>
        <MiniBarras serie={dato.serie} destacar={principal ? 'principal' : 'oscuro'} />
      </div>
    </article>
  )
}

function PorHora({ datos, periodo }) {
  const max = Math.max(...datos.flatMap(d => [d.actual, d.anterior]), 1)
  const pico = datos.reduce((a, d) => (d.actual > (a?.actual ?? -1) ? d : a), null)
  const etiquetas = { hoy: ['Hoy', `${DIAS[new Date().getDay()][0].toUpperCase()}${DIAS[new Date().getDay()].slice(1)} pasado`], semana: ['Últimos 7 días', '7 días anteriores'], mes: ['Este mes', 'Mes pasado'] }[periodo]
  return (
    <>
      <div className="ini-card-head">
        <div>
          <h2 className="ini-h2">Ventas por hora</h2>
          <p className="ini-sub">{periodo === 'hoy' ? 'Hoy contra el mismo día de la semana pasada' : periodo === 'semana' ? 'Últimos 7 días contra los 7 anteriores' : 'Este mes contra el mismo período del mes pasado'}</p>
        </div>
        <div className="ini-leyenda">
          <span><i className="ini-dot ini-dot--principal" />{etiquetas[0]}</span>
          <span><i className="ini-dot ini-dot--gris" />{etiquetas[1]}</span>
        </div>
      </div>
      {datos.length === 0
        ? <p className="ini-vacio">Todavía no hay ventas en este período.</p>
        : (
          <div className="ini-horas-scroll">
            <div className="ini-horas" role="img" aria-label={pico ? `Gráfico de ventas por hora. El pico es a las ${pico.hora} h con ${fmt(pico.actual)}` : 'Gráfico de ventas por hora'}
              style={{ gridTemplateColumns: `repeat(${datos.length}, minmax(26px, 1fr))` }}>
              {datos.map(d => (
                <div key={d.hora} className="ini-hora" title={`${d.hora} h · ${etiquetas[0]}: ${fmt(d.actual)} · ${etiquetas[1]}: ${fmt(d.anterior)}`}>
                  <div className="ini-hora-barras">
                    <span className="ini-hora-bar ini-hora-bar--ant" style={{ height: `${(d.anterior / max) * 100}%` }} />
                    <span className="ini-hora-bar ini-hora-bar--act" style={{ height: `${(d.actual / max) * 100}%` }} />
                  </div>
                  <span className="ini-hora-label">{d.hora}h</span>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  )
}

function Objetivo({ obj, puedeEditar, onGuardado }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor]       = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError]       = useState('')

  const abrir = () => { setValor(obj.meta ? String(obj.meta) : ''); setError(''); setEditando(true) }
  const guardar = async (e) => {
    e.preventDefault()
    const n = Number(String(valor).replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) { setError('Ingresá un monto válido'); return }
    setGuardando(true)
    try { await configService.saveMetaVentas(Math.round(n)); setEditando(false); onGuardado() }
    catch (err) { setError(err.message || 'No se pudo guardar') }
    finally { setGuardando(false) }
  }

  const pct = obj.meta ? Math.min(100, Math.round((obj.vendido / obj.meta) * 100)) : 0
  const cumplido = obj.meta && obj.vendido >= obj.meta

  return (
    <article className="ini-card ini-objetivo">
      <div className="ini-card-head">
        <h2 className="ini-h2">Objetivo del mes</h2>
        <span className="ini-objetivo-dias">
          {obj.diasRestantes === 0 ? 'Último día del mes' : `${obj.diasRestantes} día${obj.diasRestantes === 1 ? '' : 's'} restante${obj.diasRestantes === 1 ? '' : 's'}`}
        </span>
      </div>

      {editando ? (
        <form className="ini-meta-form" onSubmit={guardar}>
          <label htmlFor="ini-meta" className="ini-meta-label">Meta de ventas para este mes</label>
          <div className="ini-meta-row">
            <span className="ini-meta-prefijo">$</span>
            <input id="ini-meta" className="ini-meta-input" inputMode="numeric" autoFocus placeholder="Ej: 20000000"
              value={valor} onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ''))} />
            <button type="submit" className="ini-meta-btn" disabled={guardando} aria-label="Guardar meta"><Check size={18} /></button>
            <button type="button" className="ini-meta-btn ini-meta-btn--sec" onClick={() => setEditando(false)} aria-label="Cancelar"><X size={18} /></button>
          </div>
          {error && <p className="ini-meta-error" role="alert">{error}</p>}
          <p className="ini-meta-ayuda">Se usa solo para mostrar cuánto falta. Podés cambiarla cuando quieras.</p>
        </form>
      ) : !obj.meta ? (
        <div className="ini-objetivo-vacio">
          <p>Vendiste <strong>{fmt(obj.vendido)}</strong> en lo que va del mes.</p>
          <p className="ini-objetivo-texto">Definí una meta mensual y FoodOps te dice cuánto tenés que vender por día para llegar.</p>
          {puedeEditar && <button className="ini-btn-claro" onClick={abrir}><Plus size={16} /> Definir meta</button>}
        </div>
      ) : (
        <>
          <div className="ini-objetivo-cuerpo">
            <div className="ini-anillo" style={{ background: `conic-gradient(var(--primary) 0 ${pct}%, #44403C ${pct}% 100%)` }}
              role="img" aria-label={`${pct}% de la meta cumplida`}>
              <div className="ini-anillo-centro">
                <span className="ini-anillo-pct">{pct}%</span>
                <span className="ini-anillo-txt">cumplido</span>
              </div>
            </div>
            <dl className="ini-objetivo-datos">
              <div><dt>Vendido</dt><dd>{fmt(obj.vendido)}</dd></div>
              <div><dt>Meta</dt><dd>{fmt(obj.meta)}</dd></div>
            </dl>
          </div>
          <p className="ini-objetivo-nota">
            {cumplido
              ? <>¡Meta cumplida! Llevás <strong>{fmt(obj.vendido - obj.meta)}</strong> por encima.</>
              : <>Necesitás <strong>{fmt(obj.necesarioPorDia)} por día</strong> para llegar. Venís vendiendo {fmt(obj.promedioDiario)} por día.</>}
          </p>
          {puedeEditar && <button className="ini-objetivo-editar" onClick={abrir}><Pencil size={13} /> Cambiar meta</button>}
        </>
      )}
    </article>
  )
}

function Salon({ mesas, onIr }) {
  const ocupadas = mesas.filter(m => m.estado !== 'libre').length
  const ESTADO = { ocupada: 'ocupada', cuenta: 'cuenta', libre: 'libre' }
  return (
    <article className="ini-card">
      <div className="ini-card-head">
        <h2 className="ini-h2">Salón ahora</h2>
        <span className="ini-chip ini-chip--suave">{ocupadas} de {mesas.length} ocupadas</span>
      </div>
      {mesas.length === 0
        ? <p className="ini-vacio">Todavía no cargaste mesas. Se configuran en Configuración.</p>
        : (
          <div className="ini-mesas">
            {mesas.map(m => (
              <button key={m.id} className={`ini-mesa ini-mesa--${m.estado}`} onClick={onIr}
                title={m.estado === 'libre' ? `Mesa ${m.numero} libre` : `Mesa ${m.numero} · ${m.personas || '?'} personas${m.hora ? ' · desde ' + m.hora.split(' ').pop() : ''} · ${fmt(m.total)}`}
                aria-label={`Mesa ${m.numero}, ${m.estado === 'cuenta' ? 'pidió la cuenta' : ESTADO[m.estado]}`}>
                <span className="ini-mesa-n">{m.numero}</span>
                <span className="ini-mesa-e">{m.estado === 'cuenta' ? 'cuenta' : ESTADO[m.estado]}</span>
              </button>
            ))}
          </div>
        )}
      <div className="ini-leyenda">
        <span><i className="ini-dot ini-dot--principal" />Ocupada</span>
        <span><i className="ini-dot ini-dot--oscuro" />Pidió la cuenta</span>
        <span><i className="ini-dot ini-dot--libre" />Libre</span>
      </div>
    </article>
  )
}

function Top({ top, onIr }) {
  const max = Math.max(...top.map(t => t.cantidad), 1)
  return (
    <article className="ini-card">
      <div className="ini-card-head">
        <h2 className="ini-h2">Lo más vendido</h2>
        {onIr && <button className="ini-link" onClick={onIr}>Ver reporte</button>}
      </div>
      {top.length === 0
        ? <p className="ini-vacio">Todavía no hay ventas en este período.</p>
        : top.map((t, i) => (
          <div key={t.nombre} className="ini-top">
            <div className="ini-top-fila"><span className="ini-top-nombre">{t.nombre}</span><span className="ini-top-cant">{fmtN(t.cantidad)} u.</span></div>
            <div className="ini-top-track"><div className={`ini-top-fill${i === 0 ? ' ini-top-fill--primero' : ''}`} style={{ width: `${(t.cantidad / max) * 100}%` }} /></div>
          </div>
        ))}
    </article>
  )
}

function Online({ online, onIr }) {
  return (
    <article className="ini-card">
      <div className="ini-card-head">
        <h2 className="ini-h2">Pedidos online</h2>
        {online.pendientes > 0
          ? <span className="ini-chip ini-chip--fuerte">{online.pendientes} nuevo{online.pendientes === 1 ? '' : 's'}</span>
          : <span className="ini-chip ini-chip--suave">Al día</span>}
      </div>
      {online.lista.length === 0
        ? <p className="ini-vacio">No hay pedidos online en curso.</p>
        : online.lista.map(p => {
          const e = ESTADO_PEDIDO[p.estado] || { label: p.estado, cls: 'listo' }
          return (
            <button key={p.id} className="ini-pedido" onClick={onIr}>
              <span className="ini-pedido-num">#{p.numero || '—'}</span>
              <span className="ini-pedido-info">
                <span className="ini-pedido-cliente">{p.cliente}</span>
                <span className="ini-pedido-det">{TIPO_PEDIDO[p.tipo] || p.tipo} · {p.items} producto{p.items === 1 ? '' : 's'} · {fmt(p.total)}</span>
              </span>
              <span className={`ini-estado ini-estado--${e.cls}`}>{e.label}</span>
            </button>
          )
        })}
    </article>
  )
}

// Tarjeta del asistente: qué se espera vender el próximo día abierto
function PrediccionProxima({ onIr }) {
  const [pred, setPred] = useState(null)
  useEffect(() => {
    let vivo = true
    asistenteService.prediccion(fechaLocal()).then(d => { if (vivo) setPred(d) }).catch(() => {})
    return () => { vivo = false }
  }, [])
  if (!pred?.suficiente) return null
  const dia = pred.dias.find(d => !d.cerrado)
  if (!dia) return null
  const mananaCierra = pred.dias[0]?.cerrado
  const top = pred.platos
    .map(p => ({ nombre: p.nombre, cantidad: p.porDia[pred.dias.indexOf(dia)].cantidad }))
    .filter(p => p.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad).slice(0, 3)
  const nombreDia = dia.label === 'Mañana' ? 'mañana' : `el ${dia.label.toLowerCase()}`
  return (
    <article className="ini-card ini-pred">
      <div className="ini-pred-info">
        <span className="ini-pred-titulo"><Sparkles size={16} aria-hidden="true" /> Predicción para {nombreDia}{dia.feriado ? ' (feriado)' : ''}</span>
        <span className="ini-pred-valor">~ {fmt(dia.ventas.esperado)}</span>
        <span className="ini-pred-rango">Entre {fmt(dia.ventas.min)} y {fmt(dia.ventas.max)} · unas {dia.tickets} ventas</span>
        {mananaCierra && <span className="ini-pred-rango">Mañana el local cierra.</span>}
      </div>
      <div className="ini-pred-lado">
        {top.length > 0 && (
          <p className="ini-pred-top">Más pedidos: {top.map((p, i) => <span key={p.nombre}>{i > 0 && ' · '}<strong>{p.nombre} {p.cantidad}</strong></span>)}</p>
        )}
        {onIr && <button className="ini-btn-claro" onClick={onIr}>Ver predicción de la semana <ArrowRight size={16} /></button>}
      </div>
    </article>
  )
}

export default function Inicio({ usuario, onNavegar, puedeIr, puedeEditarMeta }) {
  const [periodo, setPeriodo] = useState('hoy')
  const [datos, setDatos]     = useState(null)
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(true)
  const pedido = useRef(0)

  const cargar = useCallback(async (silencioso = false) => {
    const id = ++pedido.current
    if (!silencioso) setCargando(true)
    try {
      const d = await inicioService.obtener(fechaLocal(), periodo)
      if (id === pedido.current) { setDatos(d); setError('') }
    } catch (e) {
      if (id === pedido.current && !silencioso) setError(e.message || 'No se pudo cargar el resumen')
    } finally {
      if (id === pedido.current) setCargando(false)
    }
  }, [periodo])

  useEffect(() => {
    const primera = setTimeout(() => cargar(false), 0)
    const iv = setInterval(() => { if (document.visibilityState === 'visible') cargar(true) }, ACTUALIZAR_CADA)
    return () => { clearTimeout(primera); clearInterval(iv) }
  }, [cargar])

  const hoy = new Date()
  const nombre = (usuario?.nombre || '').split(' ')[0]
  const nombreCap = nombre ? nombre[0].toUpperCase() + nombre.slice(1) : ''
  const ir = id => (puedeIr(id) ? () => onNavegar(id) : undefined)

  const ocupadas  = datos?.salon?.filter(m => m.estado !== 'libre').length ?? null
  const pendientes = datos?.online?.pendientes ?? 0
  const resumen = [
    datos?.salon && datos.salon.length > 0 && (ocupadas ? `${ocupadas} mesa${ocupadas === 1 ? '' : 's'} ocupada${ocupadas === 1 ? '' : 's'}` : 'el salón está libre'),
    datos?.online && (pendientes ? `${pendientes} pedido${pendientes === 1 ? '' : 's'} online esperando` : null),
  ].filter(Boolean).join(' y ')

  const k = datos?.kpis
  const ver = datos?.permisos || {}

  return (
    <div className="ini-page">
      <header className="ini-header">
        <div>
          <h2 className="ini-saludo">{saludo()}{nombreCap ? `, ${nombreCap}` : ''}</h2>
          <p className="ini-fecha">
            {DIAS[hoy.getDay()][0].toUpperCase() + DIAS[hoy.getDay()].slice(1)} {hoy.getDate()} de {MESES[hoy.getMonth()]}
            {resumen && <> · {resumen}</>}
          </p>
        </div>
        <div className="ini-acciones">
          {(ver.ventas || ver.gastos) && (
            <div className="ini-periodos" role="group" aria-label="Período">
              {[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']].map(([id, label]) => (
                <button key={id} className={`ini-periodo${periodo === id ? ' ini-periodo--on' : ''}`} aria-pressed={periodo === id} onClick={() => setPeriodo(id)}>{label}</button>
              ))}
            </div>
          )}
          <button className="ini-icon-btn" onClick={() => cargar(false)} aria-label="Actualizar" title="Actualizar"><RefreshCw size={17} className={cargando ? 'ini-girando' : ''} /></button>
          {puedeIr('restaurante') && (
            <button className="ini-btn-principal" onClick={() => onNavegar('restaurante')}><Plus size={17} /> Nueva venta</button>
          )}
        </div>
      </header>

      {error && !datos && (
        <div className="ini-card ini-error" role="alert">
          <p>{error}</p>
          <button className="ini-btn-principal" onClick={() => cargar(false)}>Reintentar</button>
        </div>
      )}

      {!datos && !error && (
        <div className="ini-esqueleto" aria-busy="true" aria-label="Cargando resumen">
          {[0, 1, 2, 3].map(i => <div key={i} className="ini-card ini-skel ini-skel--kpi" />)}
          <div className="ini-card ini-skel ini-skel--grande" />
          <div className="ini-card ini-skel ini-skel--grande" />
        </div>
      )}

      {datos && (
        <>
          {puedeIr('asistente') && <PrediccionProxima onIr={() => onNavegar('asistente')} />}

          {k && (
            <section className="ini-kpis" aria-label="Indicadores">
              {k.ventas && <Kpi principal titulo="Ventas" Icon={DollarSign} valor={fmt(k.ventas.actual)} dato={k.ventas} periodo={periodo} />}
              {k.ticket && <Kpi titulo="Ticket promedio" Icon={ShoppingBag} valor={fmt(k.ticket.actual)} dato={k.ticket} periodo={periodo} />}
              {k.pedidos && <Kpi titulo="Ventas cerradas" Icon={ClipboardList} valor={fmtN(k.pedidos.actual)} dato={k.pedidos} periodo={periodo} sub={`${fmtN(k.pedidos.personas)} personas`} />}
              {k.gastos && <Kpi titulo="Gastos" Icon={Wallet} valor={fmt(k.gastos.actual)} dato={k.gastos} periodo={periodo} menosEsMejor />}
            </section>
          )}

          {ver.ventas && (
            <section className="ini-fila ini-fila--2-1">
              <article className="ini-card"><PorHora datos={datos.porHora || []} periodo={periodo} /></article>
              <Objetivo obj={datos.objetivo} puedeEditar={puedeEditarMeta} onGuardado={() => cargar(true)} />
            </section>
          )}

          <section className="ini-fila ini-fila--3">
            {ver.salon  && <Salon mesas={datos.salon || []} onIr={ir('restaurante')} />}
            {ver.ventas && <Top top={datos.top || []} onIr={ir('reportes')} />}
            {ver.online && <Online online={datos.online} onIr={ir('carta')} />}
          </section>

          {!ver.ventas && !ver.gastos && !ver.salon && !ver.online && (
            <div className="ini-card"><p className="ini-vacio">Tu rol no tiene acceso a los datos del resumen. Usá el menú para ir a tus secciones.</p></div>
          )}
        </>
      )}
    </div>
  )
}
