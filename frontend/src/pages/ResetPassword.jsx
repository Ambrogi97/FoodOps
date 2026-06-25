import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import Logo from '../components/Logo'
import './Login.css'

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
    if (password !== confirmar) return setError('Las contraseñas no coinciden')
    if (password.length < 6)   return setError('Debe tener al menos 6 caracteres')

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
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', gap: '1rem' }}>
          <Logo size={40} />
          <p style={{ color: 'var(--text-muted)' }}>Enlace inválido o expirado.</p>
          <Link to="/login" className="btn btn--primary" style={{ textAlign: 'center' }}>Volver al login</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', gap: '1.25rem' }}>
          <Logo size={40} />
          <p style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>¡Contraseña actualizada!</p>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Ya podés iniciar sesión con tu nueva contraseña.
          </p>
          <button className="btn btn--primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Link to="/" className="login-logo">
          <Logo size={34} />
          <span>Food<strong>Ops</strong></span>
        </Link>

        <h1 className="login-title">Nueva contraseña</h1>
        <p className="login-subtitle">Ingresá tu nueva contraseña</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="password">Nueva contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
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
              placeholder="••••••••"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--lg login-submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>

        <p className="login-register">
          <Link to="/login">Volver al login</Link>
        </p>
      </div>
    </div>
  )
}
