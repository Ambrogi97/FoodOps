import { useState, useEffect, useCallback } from 'react'
import { Star, TrendingUp, HelpCircle, ThumbsDown, Info, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { asistenteService } from '../../services/api'

const fmt = n => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')
const fechaLocal = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const CLASES = {
  estrella: { nombre: 'Estrellas', uno: 'Estrella', Icon: Star, desc: 'Se venden mucho y dejan buen margen' },
  caballo:  { nombre: 'Caballos de batalla', uno: 'Caballo de batalla', Icon: TrendingUp, desc: 'Se venden mucho, pero dejan poco' },
  enigma:   { nombre: 'Enigmas', uno: 'Enigma', Icon: HelpCircle, desc: 'Dejan buen margen, pero se venden poco' },
  perro:    { nombre: 'Perros', uno: 'Perro', Icon: ThumbsDown, desc: 'Se venden poco y dejan poco' },
}

function Matriz({ cat, seleccionado, onElegir }) {
  const ps = cat.productos.filter(p => p.costoConocido)
  if (!ps.length) return <p className="asi-nota">Ningún plato de esta categoría tiene costo cargado.</p>
  const maxX = Math.max(...ps.map(p => p.cantidad), cat.umbralPopularidad) * 1.12 || 1
  const margenes = ps.map(p => p.margen)
  const minY = Math.min(...margenes, cat.margenPromedio) * 0.94
  const maxY = Math.max(...margenes, cat.margenPromedio) * 1.04
  const x = v => (v / maxX) * 100
  const y = v => ((v - minY) / (maxY - minY || 1)) * 100
  const ux = x(cat.umbralPopularidad), uy = y(cat.margenPromedio)
  // Etiquetas sin superponerse: se ubican primero las de los platos más vendidos;
  // si una choca con otra ya ubicada, se oculta (se ve al pasar el mouse o al elegirlo).
  const visibles = new Set()
  const cajas = []
  for (const p of [...ps].sort((a, b) => b.cantidad - a.cantidad)) {
    const ancho = p.nombre.length * 1.15 + 4, alto = 6           // en % del gráfico (aprox.)
    const cx = x(p.cantidad), cy = y(p.margen)
    const caja = cx > 70 ? [cx - ancho, cx] : [cx, cx + ancho]
    const choca = cajas.some(([a, b, c]) => caja[0] < b && caja[1] > a && Math.abs(cy - c) < alto)
    if (!choca) { visibles.add(p.id); cajas.push([caja[0], caja[1], cy]) }
  }
  return (
    <div className="asi-matriz-wrap">
      <span className="asi-eje asi-eje-y">Margen por plato →</span>
      <div className="asi-matriz-col">
        <div className="asi-matriz" role="group" aria-label={`Matriz de menú de ${cat.nombre}`}>
          <div className="asi-cuad asi-cuad--enigma"   style={{ left: 0, width: `${ux}%`, top: 0, height: `${100 - uy}%` }}><span>Enigmas</span></div>
          <div className="asi-cuad asi-cuad--estrella" style={{ left: `${ux}%`, right: 0, top: 0, height: `${100 - uy}%` }}><span>Estrellas</span></div>
          <div className="asi-cuad asi-cuad--perro"    style={{ left: 0, width: `${ux}%`, top: `${100 - uy}%`, bottom: 0 }}><span>Perros</span></div>
          <div className="asi-cuad asi-cuad--caballo"  style={{ left: `${ux}%`, right: 0, top: `${100 - uy}%`, bottom: 0 }}><span>Caballos</span></div>
          {ps.map(p => {
            const sel = p.id === seleccionado
            const izquierda = x(p.cantidad) > 70
            return (
              <button key={p.id} className={`asi-punto asi-punto--${p.clase}${sel ? ' asi-punto--sel' : ''}${izquierda ? ' asi-punto--izq' : ''}${visibles.has(p.id) ? '' : ' asi-punto--sin-etiqueta'}`}
                style={{ left: `${x(p.cantidad)}%`, bottom: `${y(p.margen)}%` }}
                onClick={() => onElegir(p.id)} aria-pressed={sel} title={p.nombre}
                aria-label={`${p.nombre}: ${p.cantidad} vendidos, margen ${fmt(p.margen)}, ${p.claseNombre}`}>
                <i aria-hidden="true" /><span>{p.nombre}</span>
              </button>
            )
          })}
        </div>
        <div className="asi-matriz-pie">
          <span>0</span>
          <span className="asi-eje">Cantidad vendida →</span>
          <span>{Math.round(maxX)}</span>
        </div>
      </div>
    </div>
  )
}

export default function AsistenteMenu() {
  const [dias, setDias]       = useState(30)
  const [datos, setDatos]     = useState(null)
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(true)
  const [catId, setCatId]     = useState(null)
  const [sel, setSel]         = useState(null)
  const [verMetodo, setVerMetodo] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try { setDatos(await asistenteService.menu(fechaLocal(), dias)) }
    catch (e) { setError(e.message || 'No se pudo analizar el menú') }
    finally { setCargando(false) }
  }, [dias])
  useEffect(() => { const t = setTimeout(cargar, 0); return () => clearTimeout(t) }, [cargar])

  if (error && !datos) return <div className="asi-card asi-error" role="alert"><p>{error}</p><button className="asi-btn" onClick={cargar}>Reintentar</button></div>
  if (!datos) return <div className="asi-card asi-cargando" aria-busy="true">Analizando tu carta…</div>
  if (!datos.categorias.length) {
    return (
      <div className="asi-card asi-vacio">
        <HelpCircle size={28} aria-hidden="true" />
        <h3>Todavía no hay datos para analizar</h3>
        <p>Hacen falta ventas en los últimos {dias} días y al menos dos platos por categoría.</p>
      </div>
    )
  }

  const cat = datos.categorias.find(c => c.id === catId) || datos.categorias[0]
  const prod = cat.productos.find(p => p.id === sel) || cat.productos[0]
  const C = CLASES[prod.clase]

  return (
    <>
      <section className={`asi-card asi-compras-ctrl${cargando ? ' asi-cargando-suave' : ''}`}>
        <div className="asi-ctrl">
          <span className="asi-ctrl-label" id="lbl-cat">Categoría</span>
          <div className="asi-seg" role="group" aria-labelledby="lbl-cat">
            {datos.categorias.map(c => (
              <button key={c.id} className={`asi-seg-btn${c.id === cat.id ? ' asi-seg-btn--on' : ''}`} aria-pressed={c.id === cat.id}
                onClick={() => { setCatId(c.id); setSel(null) }}>{c.nombre}</button>
            ))}
          </div>
        </div>
        <div className="asi-ctrl">
          <span className="asi-ctrl-label" id="lbl-per">Período</span>
          <div className="asi-seg" role="group" aria-labelledby="lbl-per">
            {[30, 60, 90].map(n => (
              <button key={n} className={`asi-seg-btn${dias === n ? ' asi-seg-btn--on' : ''}`} aria-pressed={dias === n} onClick={() => setDias(n)}>{n} días</button>
            ))}
          </div>
        </div>
      </section>

      <section className="asi-clases">
        {Object.entries(CLASES).map(([k, c]) => (
          <div key={k} className={`asi-clase asi-clase--${k}`}>
            <c.Icon size={18} aria-hidden="true" />
            <div>
              <strong>{cat.resumen[k]} {cat.resumen[k] === 1 ? c.uno.toLowerCase() : c.nombre.toLowerCase()}</strong>
              <span>{c.desc}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="asi-menu-grid">
        <section className="asi-card">
          <div className="asi-card-head">
            <div>
              <h3 className="asi-h3">Matriz de {cat.nombre.toLowerCase()}</h3>
              <p className="asi-sub">Línea vertical: lo mínimo para ser popular ({Math.ceil(cat.umbralPopularidad)} u.). Línea horizontal: margen promedio ({fmt(cat.margenPromedio)}). Tocá un plato.</p>
            </div>
          </div>
          <Matriz cat={cat} seleccionado={prod.id} onElegir={setSel} />
        </section>

        <section className={`asi-card asi-detalle asi-detalle--${prod.clase}`} aria-live="polite">
          <div className="asi-detalle-head">
            <h3 className="asi-h3">{prod.nombre}</h3>
            <span className={`asi-chip asi-chip--${prod.clase}`}><C.Icon size={13} aria-hidden="true" /> {prod.claseNombre}</span>
          </div>
          <dl className="asi-detalle-datos">
            <div><dt>Vendidos</dt><dd>{prod.cantidad}</dd></div>
            <div><dt>Precio</dt><dd>{fmt(prod.precio)}</dd></div>
            <div><dt>Costo</dt><dd>{prod.costoConocido ? fmt(prod.costo) : '—'}</dd></div>
            <div><dt>Margen</dt><dd>{prod.costoConocido ? `${fmt(prod.margen)} (${prod.margenPct}%)` : '—'}</dd></div>
          </dl>
          <p className="asi-detalle-consejo">{prod.consejo}</p>
          <p className="asi-nota">
            {prod.participacionVentas}% de lo facturado en {cat.nombre.toLowerCase()}
            {prod.ingredientePrincipal && <> · el ingrediente que más pesa en el costo es {prod.ingredientePrincipal.nombre.toLowerCase()} ({prod.ingredientePrincipal.pct}%)</>}
          </p>
          {prod.recetaIncompleta && <p className="asi-alerta"><AlertTriangle size={14} aria-hidden="true" /> Algún ingrediente de la receta no tiene costo: el margen real es menor.</p>}
        </section>
      </div>

      <section className="asi-card">
        <div className="asi-tabla-scroll">
          <table className="asi-tabla">
            <thead>
              <tr>
                <th className="asi-th-plato">Plato</th>
                <th>Grupo</th>
                <th>Vendidos</th>
                <th>Precio</th>
                <th>Costo</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {cat.productos.map(p => {
                const K = CLASES[p.clase]
                return (
                  <tr key={p.id} className={p.id === prod.id ? 'asi-fila-sel' : ''}>
                    <td className="asi-td-plato"><button className="asi-link-fila" onClick={() => setSel(p.id)}>{p.nombre}</button></td>
                    <td><span className={`asi-chip asi-chip--${p.clase}`}><K.Icon size={12} aria-hidden="true" /> {p.claseNombre}</span></td>
                    <td>{p.cantidad}</td>
                    <td>{fmt(p.precio)}</td>
                    <td>{p.costoConocido ? fmt(p.costo) : '—'}</td>
                    <td>{p.costoConocido ? `${fmt(p.margen)} · ${p.margenPct}%` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="asi-nota">Período analizado: últimos {datos.dias} días ({datos.ventasAnalizadas} ventas). Precios y costos actuales.</p>
      </section>

      <section className="asi-card asi-como">
        <button className="asi-como-btn" onClick={() => setVerMetodo(v => !v)} aria-expanded={verMetodo}>
          <Info size={17} /> ¿Cómo se clasifican los platos?
          {verMetodo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {verMetodo && (
          <div className="asi-como-cuerpo">
            <p>Se usa la <strong>ingeniería de menú de Kasavana y Smith</strong>, el método más usado en gastronomía. Cada plato se compara solo con los de su misma categoría:</p>
            <ul>
              <li><strong>Margen</strong> = precio actual − costo. El costo sale de la receta (cantidad de cada ingrediente, más su merma, por su precio actual).</li>
              <li><strong>Popular</strong>: vende al menos el 70% de lo que vendería si todos los platos de la categoría se vendieran por igual.</li>
              <li><strong>Rentable</strong>: deja un margen igual o mayor al margen promedio de la categoría (ponderado por lo que se vende).</li>
            </ul>
            <p>Los consejos son reglas fijas con los números de cada plato; conviene aplicarlos de a uno y mirar cómo cambian las ventas.</p>
          </div>
        )}
      </section>
    </>
  )
}
