import { useEffect, useMemo, useState } from 'react'
import { vistaPreviaComanda, vistaPreviaTicket } from '../../utils/impresion'
import './VistaPreviaImpresion.css'

// Ancho del papel en pantalla (1 mm ≈ 3,78 px)
const MM = 3.78

// Vista previa de la comanda o del ticket con la configuración que está en pantalla.
// Usa el mismo HTML que se manda a la impresora, así que lo que se ve es lo que sale.
export default function VistaPreviaImpresion({ cfg, tipo, onTipo }) {
  const html = useMemo(
    () => (tipo === 'comanda' ? vistaPreviaComanda(cfg) : vistaPreviaTicket(cfg)) || '',
    [cfg, tipo]
  )

  // Se espera un momento antes de "reimprimir", para no repetir la animación con cada tecla
  const [mostrado, setMostrado] = useState(html)
  const [vuelta, setVuelta]     = useState(0)
  useEffect(() => {
    if (html === mostrado) return
    const t = setTimeout(() => { setMostrado(html); setVuelta(v => v + 1) }, 250)
    return () => clearTimeout(t)
  }, [html, mostrado])

  const [alto, setAlto] = useState(320)
  const medir = (e) => {
    try {
      const doc = e.currentTarget.contentDocument
      if (doc) setAlto(doc.documentElement.scrollHeight)
    } catch { /* sin acceso al documento: queda el alto anterior */ }
  }

  const anchoPx = Math.round((cfg.anchoPapel === 58 ? 58 : 80) * MM)

  return (
    <aside className="vp" aria-label="Vista previa de impresión">
      <div className="vp-tabs" role="tablist" aria-label="Qué ver">
        {[['comanda', 'Comanda'], ['ticket', 'Ticket']].map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={tipo === v}
            className={`vp-tab ${tipo === v ? 'vp-tab--on' : ''}`} onClick={() => onTipo(v)}>
            {label}
          </button>
        ))}
      </div>

      <div className="vp-mesa">
        <div className="vp-impresora" style={{ width: anchoPx + 64 }}>
          <div className="vp-ranura" style={{ width: anchoPx + 24 }} />
        </div>
        <div className="vp-salida">
          <div key={vuelta} className="vp-papel" style={{ width: anchoPx }}>
            <iframe
              title={`Vista previa de la ${tipo}`}
              srcDoc={mostrado}
              sandbox="allow-same-origin"
              onLoad={medir}
              style={{ width: anchoPx, height: alto }}
            />
            <div className="vp-corte" />
          </div>
        </div>
      </div>
      <p className="vp-nota">Así sale en la comandera. Los cambios se ven al instante; para que queden, tocá <strong>Guardar configuración</strong>.</p>
    </aside>
  )
}
