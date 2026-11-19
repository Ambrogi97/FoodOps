import { useState, useEffect, useCallback, useMemo } from 'react'
import { AlertTriangle, Printer, Copy, Check, ChevronDown, ChevronUp, PackageCheck } from 'lucide-react'
import { asistenteService, getSession } from '../../services/api'

const fmt = n => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
const num = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })
const fechaLocal = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const leer = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : Number(v) } catch { return def } }
const guardar = (k, v) => { try { localStorage.setItem(k, String(v)) } catch { /* sin almacenamiento */ } }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function textoPedido(grupos, rango, restaurante) {
  const lineas = [`Pedido – ${restaurante} (para ${rango})`, '']
  for (const [cat, items] of grupos) {
    lineas.push(`*${cat}*`)
    for (const i of items) lineas.push(`- ${i.nombre}: ${num(i.comprar)} ${i.unidad}`)
    lineas.push('')
  }
  return lineas.join('\n').trim()
}

function imprimir(grupos, rango, restaurante, total) {
  document.querySelectorAll('iframe[data-foodops-lista]').forEach(f => f.remove())
  const iframe = document.createElement('iframe')
  iframe.setAttribute('data-foodops-lista', '')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(iframe)
  const filas = grupos.map(([cat, items]) => `
    <h2>${esc(cat)}</h2>
    <table>${items.map(i => `<tr><td class="ck">☐</td><td>${esc(i.nombre)}</td><td class="r"><b>${esc(num(i.comprar))} ${esc(i.unidad)}</b></td><td class="r g">${esc(fmt(i.costoEstimado))}</td></tr>`).join('')}</table>`).join('')
  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lista de compras</title><style>
    body{font-family:Arial,sans-serif;margin:24px;color:#111} h1{font-size:20px;margin:0} p{margin:4px 0 16px;color:#555;font-size:13px}
    h2{font-size:14px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #ccc;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:14px} td{padding:6px 4px;border-bottom:1px dotted #ddd} .r{text-align:right} .g{color:#555} .ck{width:22px}
    .tot{margin-top:18px;text-align:right;font-size:15px}
  </style></head><body><h1>Lista de compras – ${esc(restaurante)}</h1><p>Para ${esc(rango)} · generada por FoodOps el ${esc(new Date().toLocaleDateString('es-AR'))}</p>${filas}
  <div class="tot">Costo estimado: <b>${esc(fmt(total))}</b></div></body></html>`)
  doc.close()
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print() }, 150)
  setTimeout(() => iframe.isConnected && iframe.remove(), 120_000)
}

export default function AsistenteCompras() {
  const [dias, setDias]       = useState(() => leer('foodops:compras-dias', 4))
  const [margen, setMargen]   = useState(() => leer('foodops:compras-margen', 10))
  const [datos, setDatos]     = useState(null)
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(true)
  const [quitados, setQuitados] = useState(() => new Set())
  const [verTodo, setVerTodo] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const restaurante = getSession()?.user?.restaurante || 'mi restaurante'

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try { setDatos(await asistenteService.listaCompras(fechaLocal(), dias, margen)) }
    catch (e) { setError(e.message || 'No se pudo calcular la lista') }
    finally { setCargando(false) }
  }, [dias, margen])

  useEffect(() => { const t = setTimeout(cargar, 0); return () => clearTimeout(t) }, [cargar])

  const elegirDias   = n => { setDias(n); guardar('foodops:compras-dias', n) }
  const elegirMargen = n => { setMargen(n); guardar('foodops:compras-margen', n) }
  const alternar = id => setQuitados(s => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x })

  const items     = useMemo(() => datos?.items || [], [datos])
  const aComprar  = items.filter(i => i.comprar > 0)
  const justos    = items.filter(i => i.justo)
  const alcanza   = items.filter(i => i.comprar === 0 && !i.justo)
  const elegidos  = aComprar.filter(i => !quitados.has(i.id))
  const total     = elegidos.reduce((a, i) => a + i.costoEstimado, 0)
  const abiertos  = datos?.dias?.filter(d => !d.cerrado) || []
  const rango     = abiertos.length ? (abiertos.length === 1 ? abiertos[0].label : `${abiertos[0].label} a ${abiertos[abiertos.length - 1].label}`) : ''
  const urgente   = aComprar.filter(i => i.agota).sort((a, b) => a.agota.enDias - b.agota.enDias)[0]

  const agrupar = lista => {
    const m = new Map()
    for (const i of lista) { if (!m.has(i.categoria)) m.set(i.categoria, []); m.get(i.categoria).push(i) }
    return [...m]
  }
  const gruposElegidos = agrupar(elegidos)

  const enviarWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(textoPedido(gruposElegidos, rango, restaurante))}`, '_blank', 'noopener')
  const copiar = async () => {
    try { await navigator.clipboard.writeText(textoPedido(gruposElegidos, rango, restaurante)); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }
    catch { /* el navegador no permitió copiar */ }
  }

  if (error && !datos) return <div className="asi-card asi-error" role="alert"><p>{error}</p><button className="asi-btn" onClick={cargar}>Reintentar</button></div>
  if (!datos) return <div className="asi-card asi-cargando" aria-busy="true">Calculando qué hace falta comprar…</div>
  if (!datos.suficiente) return null   // el aviso de "faltan datos" lo muestra la pestaña Predicción

  const fila = (i, conCheck) => (
    <tr key={i.id} className={conCheck && quitados.has(i.id) ? 'asi-fila-off' : ''}>
      <td className="asi-td-check">
        {conCheck && <input type="checkbox" checked={!quitados.has(i.id)} onChange={() => alternar(i.id)} aria-label={`Incluir ${i.nombre} en el pedido`} />}
      </td>
      <td className="asi-td-plato">
        {i.nombre}
        <span className="asi-td-detalle">Para {i.platos.join(', ')}</span>
      </td>
      <td>{num(i.stock)} {i.unidad}</td>
      <td>{num(i.necesidad)} {i.unidad}</td>
      <td className="asi-td-comprar">
        {i.comprar > 0
          ? <strong>{num(i.comprar)} {i.unidad}</strong>
          : i.justo ? <span className="asi-chip asi-chip--justo">Justo</span> : <span className="asi-chip asi-chip--ok">Alcanza</span>}
      </td>
      <td>{i.comprar > 0 ? fmt(i.costoEstimado) : '—'}</td>
      <td>{i.agota ? <span className="asi-agota">{i.agota.enDias === 1 ? 'mañana' : i.agota.label}</span> : '—'}</td>
    </tr>
  )

  return (
    <>
      <section className="asi-card asi-compras-ctrl">
        <div className="asi-ctrl">
          <span className="asi-ctrl-label" id="lbl-dias">Comprar para</span>
          <div className="asi-seg" role="group" aria-labelledby="lbl-dias">
            {[2, 3, 4, 5, 7].map(n => (
              <button key={n} className={`asi-seg-btn${dias === n ? ' asi-seg-btn--on' : ''}`} aria-pressed={dias === n} onClick={() => elegirDias(n)}>{n} días</button>
            ))}
          </div>
        </div>
        <div className="asi-ctrl">
          <span className="asi-ctrl-label" id="lbl-margen">Margen de seguridad</span>
          <div className="asi-seg" role="group" aria-labelledby="lbl-margen">
            {[0, 10, 20].map(n => (
              <button key={n} className={`asi-seg-btn${margen === n ? ' asi-seg-btn--on' : ''}`} aria-pressed={margen === n} onClick={() => elegirMargen(n)}>{n}%</button>
            ))}
          </div>
        </div>
        <p className="asi-nota">Calculado para <strong>{rango || 'los próximos días'}</strong>: lo que vas a vender según la predicción × lo que lleva cada receta + la merma de cada ingrediente − lo que ya tenés en stock{margen ? `, con ${margen}% de margen` : ''}.</p>
      </section>

      {aComprar.length > 0 ? (
        <section className={`asi-card asi-resumen${cargando ? ' asi-cargando-suave' : ''}`}>
          <div className="asi-resumen-txt">
            <h3 className="asi-h3">Tenés que comprar {aComprar.length} producto{aComprar.length === 1 ? '' : 's'}</h3>
            {urgente && (
              <p className="asi-alerta"><AlertTriangle size={16} aria-hidden="true" /> <strong>{urgente.nombre}</strong> se termina {urgente.agota.enDias === 1 ? 'mañana' : `el ${urgente.agota.label.toLowerCase()}`} si no reponés.</p>
            )}
          </div>
          <div className="asi-resumen-acc">
            <span className="asi-resumen-total">Seleccionado: <strong>{fmt(total)}</strong></span>
            <div className="asi-botones">
              <button className="asi-btn-sec" onClick={() => imprimir(gruposElegidos, rango, restaurante, total)} disabled={!elegidos.length}><Printer size={16} /> Imprimir</button>
              <button className="asi-btn-sec" onClick={copiar} disabled={!elegidos.length}>{copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar</>}</button>
              <button className="asi-btn-wa" onClick={enviarWhatsApp} disabled={!elegidos.length}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" /></svg>
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="asi-card asi-vacio">
          <PackageCheck size={28} aria-hidden="true" />
          <h3>No hace falta comprar nada</h3>
          <p>Con el stock que tenés alcanza para {rango}{justos.length ? `, aunque ${justos.length} ingrediente${justos.length === 1 ? ' queda' : 's quedan'} justo${justos.length === 1 ? '' : 's'}` : ''}.</p>
        </section>
      )}

      <section className="asi-card">
        <div className="asi-tabla-scroll">
          <table className="asi-tabla asi-tabla-compras">
            <thead>
              <tr>
                <th aria-label="Incluir"></th>
                <th className="asi-th-plato">Ingrediente</th>
                <th>Tenés</th>
                <th>Vas a usar</th>
                <th>Comprar</th>
                <th>Costo est.</th>
                <th>Se termina</th>
              </tr>
            </thead>
            {agrupar([...aComprar, ...justos, ...(verTodo ? alcanza : [])]).map(([cat, lista]) => (
              <tbody key={cat}>
                <tr className="asi-fila-grupo"><td colSpan={7}>{cat}</td></tr>
                {lista.map(i => fila(i, i.comprar > 0))}
              </tbody>
            ))}
          </table>
        </div>
        {alcanza.length > 0 && (
          <button className="asi-link" onClick={() => setVerTodo(v => !v)}>
            {verTodo ? <><ChevronUp size={15} /> Ocultar lo que alcanza</> : <><ChevronDown size={15} /> Ver también lo que alcanza ({alcanza.length})</>}
          </button>
        )}
      </section>

      {(datos.sinReceta.length > 0 || datos.unidadesIncompatibles.length > 0) && (
        <section className="asi-card asi-aviso">
          <h3 className="asi-h3"><AlertTriangle size={16} aria-hidden="true" /> La lista puede estar incompleta</h3>
          {datos.sinReceta.length > 0 && (
            <p>Estos platos se van a vender pero <strong>no tienen receta cargada</strong>, así que sus ingredientes no se cuentan: {datos.sinReceta.map(s => `${s.nombre} (~${s.unidades})`).join(', ')}. Cargala en Productos → editar → Receta.</p>
          )}
          {datos.unidadesIncompatibles.length > 0 && (
            <p>Hay recetas con una unidad que no se puede convertir a la del ingrediente: {datos.unidadesIncompatibles.map(u => `${u.plato} → ${u.ingrediente} (${u.receta} vs ${u.ingredienteUnidad})`).join('; ')}.</p>
          )}
        </section>
      )}
    </>
  )
}
