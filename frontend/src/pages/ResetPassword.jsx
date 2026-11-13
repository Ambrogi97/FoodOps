import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import Logo from '../components/Logo'
import './Register.css'

// Misma tarjeta centrada que "Creá tu cuenta"
function TarjetaAuth({ children }) {
  return (
    <div className="register-page">
      <div className="register-card">
        <Link to="/" className="register-logo">
          <Logo size={34} />
          <span>Food<strong>Ops</strong></span>
        </Link>
        {children}
      </div>
    </div>
  )
}

export default function ResetPassword() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const token           = searchParams.get('token')

  const [password, setPassword]         = useState('')
  const [confirmar, setConfirmar]       = useState('')
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [loading, setLoading]           = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8)   return setError('La contraseña debe tener al menos 8 caracteres')
    if (password !== confirmar) return setError('Las contraseñas no coinciden')

    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <TarjetaAuth>
        <h1 className="register-title">Enlace inválido</h1>
        <p className="register-subtitle">
          El enlace para restablecer la contraseña es inválido o ya expiró.
          Podés pedir uno nuevo desde el login.
        </p>
        <button className="btn btn--primary btn--lg register-submit" onClick={() => navigate('/login')}>
          Volver al login
        </button>
      </TarjetaAuth>
    )
  }

  if (success) {
    return (
      <TarjetaAuth>
        <div className="register-plan-badge register-plan-badge--trial" style={{ alignItems: 'center' }}>
          <span className="register-plan-label">✅ ¡Contraseña actualizada!</span>
          <span className="register-plan-desc">Ya podés iniciar sesión con tu nueva contraseña.</span>
        </div>
        <button className="btn btn--primary btn--lg register-submit" onClick={() => navigate('/login')}>
          Ir al login
        </button>
      </TarjetaAuth>
    )
  }

  return (
    <TarjetaAuth>
      <h1 className="register-title">Nueva contraseña</h1>
      <p className="register-subtitle">Elegí una contraseña nueva para tu cuenta. Tiene que tener al menos 8 caracteres.</p>

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="register-field">
          <label htmlFor="password">Nueva contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="register-field">
          <label htmlFor="confirmar">Confirmar contraseña</label>
          <input
            id="confirmar"
            type="password"
            autoComplete="new-password"
            placeholder="Repetí la contraseña"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            required
          />
        </div>

        {error && <p className="register-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--lg register-submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>

      <p className="register-login">
        ¿Te acordaste? <Link to="/login">Volver al login</Link>
      </p>
    </TarjetaAuth>
  )
}
