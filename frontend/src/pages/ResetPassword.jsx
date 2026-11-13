import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import Logo from '../components/Logo'
import './Login.css'

// Mismo layout de dos columnas que el login
function LayoutAuth({ children }) {
  return (
    <div className="login-page">
      <div className="login-left">
        <Link to="/" className="login-logo">
          <Logo size={34} />
          <span>Food<strong>Ops</strong></span>
        </Link>
        <div className="login-content">{children}</div>
      </div>
      <div className="login-right" aria-hidden="true">
        <div className="login-photo">
          <div className="login-photo-caption">
            <p className="login-photo-title">Tu restaurante, en orden.</p>
            <p className="login-photo-text">Carta digital, pedidos y reportes en un solo panel.</p>
          </div>
        </div>
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
      <LayoutAuth>
        <h1 className="login-title">Enlace inválido</h1>
        <p className="login-subtitle">
          El enlace para restablecer la contraseña es inválido o ya expiró.
          Podés pedir uno nuevo desde el login.
        </p>
        <Link to="/login" className="login-submit login-submit--link">Volver al login</Link>
      </LayoutAuth>
    )
  }

  if (success) {
    return (
      <LayoutAuth>
        <h1 className="login-title">¡Contraseña actualizada!</h1>
        <p className="login-subtitle">Ya podés iniciar sesión con tu nueva contraseña.</p>
        <button className="login-submit" onClick={() => navigate('/login')}>
          Ir al login
        </button>
      </LayoutAuth>
    )
  }

  return (
    <LayoutAuth>
      <h1 className="login-title">Nueva contraseña</h1>
      <p className="login-subtitle">Elegí una contraseña nueva para tu cuenta. Tiene que tener al menos 8 caracteres.</p>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="password">Nueva contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Ingresá tu nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="login-field">
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

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>

      <div className="login-divider"><span>o</span></div>

      <Link to="/login" className="login-register-btn">Volver al login</Link>
    </LayoutAuth>
  )
}
