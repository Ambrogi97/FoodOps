import { Check, X } from 'lucide-react'
import { REQUISITOS_PASSWORD } from '../utils/password'
import './RequisitosPassword.css'

// Lista de requisitos que se va tildando mientras se escribe
export default function RequisitosPassword({ password = '', mostrarSiempre = false }) {
  if (!password && !mostrarSiempre) return null
  return (
    <ul className="req-pass" aria-live="polite">
      {REQUISITOS_PASSWORD.map(r => {
        const ok = r.cumple(password)
        return (
          <li key={r.id} className={ok ? 'req-pass--ok' : 'req-pass--falta'}>
            {ok ? <Check size={14} /> : <X size={14} />}
            <span>{r.texto}</span>
          </li>
        )
      })}
    </ul>
  )
}
