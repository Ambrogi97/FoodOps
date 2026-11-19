import { useState, useEffect, useRef, Fragment } from 'react'
import { MessageCircle, X, Send, Sparkles, Trash2 } from 'lucide-react'
import { asistenteService } from '../services/api'
import './ChatAsistente.css'

const CLAVE = 'foodops:chat'
const SUGERENCIAS = [
  '¿Cuánto vendí esta semana?',
  '¿Cuánto voy a vender el sábado?',
  '¿Qué tengo que comprar para el finde?',
  '¿Qué plato me conviene subir de precio?',
  '¿Cuál fue mi mejor día del mes?',
]
const PROGRESO = {
  resumen_ventas: 'tus ventas', ventas_por_producto: 'las ventas por producto', prediccion_demanda: 'la predicción',
  lista_compras: 'la lista de compras', analisis_menu: 'el análisis de tu carta', stock_ingredientes: 'el stock',
  resumen_gastos: 'tus gastos', estado_salon: 'el salón',
}
const FUENTES = {
  resumen_ventas: 'ventas', ventas_por_producto: 'ventas por producto', prediccion_demanda: 'predicción',
  lista_compras: 'lista de compras', analisis_menu: 'análisis de menú', stock_ingredientes: 'stock',
  resumen_gastos: 'gastos', estado_salon: 'salón',
}

const fechaLocal = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
// Al volver a abrir, una pregunta que quedó sin respuesta (se recargó la página mientras pensaba) no se muestra
const leer = () => {
  try {
    const m = JSON.parse(sessionStorage.getItem(CLAVE)) || []
    while (m.length && m[m.length - 1].rol === 'usuario') m.pop()
    return m
  } catch { return [] }
}
const guardar = m => { try { sessionStorage.setItem(CLAVE, JSON.stringify(m.slice(-30))) } catch { /* sin almacenamiento */ } }

// Formato mínimo y seguro (sin HTML): **negrita**, listas con "- " o "1. ", párrafos
function negritas(texto) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
    t.startsWith('**') && t.endsWith('**') && t.length > 4 ? <strong key={i}>{t.slice(2, -2)}</strong> : <Fragment key={i}>{t}</Fragment>)
}
function Formato({ texto }) {
  const bloques = []
  for (const linea of texto.split('\n')) {
    const l = linea.trim()
    if (!l) { bloques.push({ tipo: 'sep' }); continue }
    const item = l.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/)
    const ultimo = bloques[bloques.length - 1]
    if (item) {
      if (ultimo?.tipo === 'lista') ultimo.items.push(item[1])
      else bloques.push({ tipo: 'lista', items: [item[1]] })
    } else bloques.push({ tipo: 'p', texto: l.replace(/^#+\s*/, '') })
  }
  return bloques.filter(b => b.tipo !== 'sep').map((b, i) => b.tipo === 'lista'
    ? <ul key={i}>{b.items.map((t, j) => <li key={j}>{negritas(t)}</li>)}</ul>
    : <p key={i}>{negritas(b.texto)}</p>)
}

export default function ChatAsistente() {
  const [abierto, setAbierto]   = useState(false)
  const [mensajes, setMensajes] = useState(leer)
  const [texto, setTexto]       = useState('')
  const [pensando, setPensando] = useState(false)
  const [estado, setEstado]     = useState('')
  const [error, setError]       = useState('')
  const lista = useRef(null)
  const campo = useRef(null)

  useEffect(() => { guardar(mensajes) }, [mensajes])
  // Baja al último mensaje; sin conversación queda arriba para que se vea el saludo
  useEffect(() => {
    if (!lista.current) return
    lista.current.scrollTo({ top: mensajes.length || pensando ? lista.current.scrollHeight : 0, behavior: 'smooth' })
  }, [mensajes, pensando, abierto])
  useEffect(() => { if (abierto) setTimeout(() => campo.current?.focus(), 50) }, [abierto])
  useEffect(() => {
    if (!abierto) return
    const esc = e => { if (e.key === 'Escape') setAbierto(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [abierto])

  const preguntar = async (pregunta) => {
    const q = (pregunta ?? texto).trim()
    if (!q || pensando) return
    setTexto(''); setError('')
    const nuevos = [...mensajes, { rol: 'usuario', texto: q }]
    setMensajes(nuevos)
    setPensando(true)
    setEstado('Pensando…')
    try {
      const r = await asistenteService.chatEnVivo(fechaLocal(), nuevos.map(({ rol, texto }) => ({ rol, texto })), ev => {
        if (ev.tipo === 'herramienta') setEstado(`Consultando ${PROGRESO[ev.nombre] || 'tus datos'}…`)
        else if (ev.tipo === 'redactando') setEstado('Armando la respuesta…')
      })
      if (r?.tiempos) console.info(`[chat] ${r.modelo}: ${r.totalMs} ms (llamadas a Gemini: ${r.tiempos.join(' + ')} ms)`)
      setMensajes(m => [...m, { rol: 'asistente', texto: r.texto, fuentes: r.fuentes || [] }])
    } catch (e) {
      // La pregunta vuelve al campo de texto para reintentarla, sin quedar colgada en la conversación
      setMensajes(m => (m[m.length - 1]?.rol === 'usuario' && m[m.length - 1].texto === q ? m.slice(0, -1) : m))
      setTexto(t => t || q)
      setError({ texto: e.message || 'No se pudo responder. Probá de nuevo.', detalle: e.detalle })
    } finally {
      setPensando(false)
    }
  }

  const enviar = e => { e.preventDefault(); preguntar() }
  const alTeclear = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); preguntar() } }
  const limpiar = () => { setMensajes([]); setError('') }

  return (
    <>
      {abierto && (
        <section className="chat-panel" role="dialog" aria-label="Chat con el asistente de FoodOps">
          <header className="chat-head">
            <span className="chat-avatar"><Sparkles size={17} aria-hidden="true" /></span>
            <div className="chat-titulo">
              <strong>Asistente FoodOps</strong>
              <span>Responde con los datos de tu local</span>
            </div>
            {mensajes.length > 0 && (
              <button className="chat-icono" onClick={limpiar} aria-label="Borrar conversación" title="Borrar conversación"><Trash2 size={16} /></button>
            )}
            <button className="chat-icono" onClick={() => setAbierto(false)} aria-label="Cerrar chat"><X size={18} /></button>
          </header>

          <div className="chat-mensajes" ref={lista} aria-live="polite">
            {mensajes.length === 0 && (
              <>
                <div className="chat-msg chat-msg--asistente">
                  <p>¡Hola! Preguntame lo que quieras sobre tus ventas, el stock, las compras o tu carta. Uso los datos reales de tu restaurante.</p>
                </div>
                {!pensando && (
                  <div className="chat-sugerencias">
                    <span>Probá preguntar:</span>
                    <div>
                      {SUGERENCIAS.map(s => <button key={s} className="chat-chip" onClick={() => preguntar(s)}>{s}</button>)}
                    </div>
                  </div>
                )}
              </>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg--${m.rol}`}>
                {m.rol === 'asistente' ? <Formato texto={m.texto} /> : <p>{m.texto}</p>}
                {m.fuentes?.length > 0 && (
                  <span className="chat-fuentes">Consultó: {m.fuentes.map(f => FUENTES[f] || f).join(', ')}</span>
                )}
              </div>
            ))}
            {pensando && (
              <div className="chat-msg chat-msg--asistente chat-pensando" role="status">
                <span className="chat-puntos" aria-hidden="true"><i /><i /><i /></span>
                <span className="chat-estado">{estado}</span>
              </div>
            )}
            {error && (
              <div className="chat-error" role="alert">
                <p>{error.texto}</p>
                {error.detalle && <code className="chat-error-detalle">Detalle técnico: {error.detalle}</code>}
              </div>
            )}
          </div>

          <form className="chat-form" onSubmit={enviar}>
            <label htmlFor="chat-texto" className="chat-oculto">Escribí tu pregunta</label>
            <textarea id="chat-texto" ref={campo} rows={1} maxLength={1500} placeholder="Escribí tu pregunta…"
              value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={alTeclear} />
            <button type="submit" className="chat-enviar" disabled={!texto.trim() || pensando} aria-label="Enviar"><Send size={18} /></button>
          </form>
          <p className="chat-aviso">Usa IA (Gemini): puede equivocarse. Verificá los números importantes.</p>
        </section>
      )}

      <button className={`chat-burbuja${abierto ? ' chat-burbuja--abierta' : ''}`} onClick={() => setAbierto(a => !a)}
        aria-label={abierto ? 'Cerrar chat del asistente' : 'Abrir chat del asistente'} aria-expanded={abierto}>
        {abierto ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </>
  )
}
