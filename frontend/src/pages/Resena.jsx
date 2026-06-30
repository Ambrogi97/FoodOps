import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import './Resena.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Resena() {
  const { pedidoId }      = useParams()
  const [params]          = useSearchParams()
  const token             = params.get('token') || ''

  const [datos, setDatos]       = useState(null)
  const [error, setError]       = useState('')
  const [estrellas, setEstrellas] = useState(0)
  const [hover, setHover]       = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado]   = useState(false)

  useEffect(() => {
    if (!pedidoId || !token) { setError('Enlace inválido'); return }
    fetch(`${API}/api/resenas/${pedidoId}?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) { setError(d.message); return }
        setDatos(d)
        if (d.yaReseno) {
          setEstrellas(d.estrellas || 0)
          setComentario(d.comentario || '')
          setEnviado(true)
        }
      })
      .catch(() => setError('No se pudo cargar la reseña'))
  }, [pedidoId, token])

  const enviar = async () => {
    if (!estrellas) return
    setEnviando(true)
    try {
      const r = await fetch(`${API}/api/resenas/${pedidoId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, estrellas, comentario }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.message)
      setEnviado(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  if (error) return (
    <div className="resena-page">
      <div className="resena-card">
        <p className="resena-error">{error}</p>
      </div>
    </div>
  )

  if (!datos) return (
    <div className="resena-page">
      <div className="resena-loading"><div className="resena-spinner" /></div>
    </div>
  )

  return (
    <div className="resena-page">
      <div className="resena-card">
        <div className="resena-header">
          <span className="resena-logo-icon">⭐</span>
          <h1 className="resena-titulo">¿Cómo estuvo tu experiencia?</h1>
          <p className="resena-pedido">Pedido #{datos.numero}</p>
        </div>

        {enviado ? (
          <div className="resena-gracias">
            <div className="resena-estrellas-row">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={36} fill={i <= estrellas ? '#e85d2b' : 'none'} color={i <= estrellas ? '#e85d2b' : '#d1d5db'} />
              ))}
            </div>
            <p className="resena-gracias-txt">¡Gracias por tu calificación!</p>
            {comentario && <p className="resena-comentario-txt">"{comentario}"</p>}
          </div>
        ) : (
          <>
            <div className="resena-estrellas-row">
              {[1,2,3,4,5].map(i => (
                <button
                  key={i}
                  className="resena-star-btn"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setEstrellas(i)}
                >
                  <Star
                    size={40}
                    fill={i <= (hover || estrellas) ? '#e85d2b' : 'none'}
                    color={i <= (hover || estrellas) ? '#e85d2b' : '#d1d5db'}
                  />
                </button>
              ))}
            </div>
            {estrellas > 0 && (
              <p className="resena-label">
                {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][estrellas]}
              </p>
            )}

            <textarea
              className="resena-textarea"
              placeholder="Contanos qué te pareció (opcional)..."
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={3}
            />

            <button
              className="resena-btn"
              onClick={enviar}
              disabled={!estrellas || enviando}
            >
              {enviando ? 'Enviando...' : 'Enviar calificación'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
