import { useEffect, useState } from 'react'
import './Avisos.css'

// Muestra los avisos de error que manda avisarError (utils/avisos.js), uno a la vez.
export default function Avisos() {
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let timer
    const mostrar = ev => {
      clearTimeout(timer)
      setAviso({ message: ev.detail.message, id: Date.now() })
      timer = setTimeout(() => setAviso(null), 6000)
    }
    window.addEventListener('foodops:aviso', mostrar)
    return () => { window.removeEventListener('foodops:aviso', mostrar); clearTimeout(timer) }
  }, [])

  if (!aviso) return null
  return (
    <div className="aviso-error" role="alert" key={aviso.id}>
      <span>{aviso.message}</span>
      <button type="button" className="aviso-error-cerrar" onClick={() => setAviso(null)} aria-label="Cerrar aviso">×</button>
    </div>
  )
}
