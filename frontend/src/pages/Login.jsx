import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService, saveSession } from '../services/api'
import Logo from '../components/Logo'
import './Login.css'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [showRecuperar, setShowRecuperar]   = useState(false)
  const [recuperarEmail, setRecuperarEmail] = useState('')
  const [recuperarMsg, setRecuperarMsg]     = useState('')
  const [recuperarErr, setRecuperarErr]     = useState('')
  const [recuperarLoading, setRecuperarLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authService.login(form)
      saveSession(token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecuperar = async (e) => {
    e.preventDefault()
    setRecuperarErr('')
    setRecuperarMsg('')
    setRecuperarLoading(true)
    try {
      const { message } = await authService.recuperar(recuperarEmail)
      setRecuperarMsg(message)
    } catch (err) {
      setRecuperarErr(err.message)
    } finally {
      setRecuperarLoading(false)
    }
  }

  const cerrarModal = () => {
    setShowRecuperar(false)
    setRecuperarEmail('')
    setRecuperarMsg('')
    setRecuperarErr('')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Link to="/" className="login-logo">
          <Logo size={34} />
          <span>Food<strong>Ops</strong></span>
        </Link>

        <h1 className="login-title">Iniciá sesión</h1>
        <p className="login-subtitle">Accedé al panel de tu restaurante</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--lg login-submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-forgot">
          ¿No podés ingresar?{' '}
          <button type="button" className="login-forgot-link" onClick={() => setShowRecuperar(true)}>
            Recuperar contraseña
          </button>
        </p>

        <p className="login-register">
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>
        </p>
      </div>

      {/* Modal recuperar contraseña */}
      {showRecuperar && (
        <div className="recuperar-overlay" onClick={cerrarModal}>
          <div className="recuperar-modal" onClick={e => e.stopPropagation()}>
            <Logo size={40} />
            {recuperarMsg ? (
              <>
                <p className="recuperar-ok">{recuperarMsg}</p>
                <button className="btn btn--primary recuperar-btn" onClick={cerrarModal}>Cerrar</button>
              </>
            ) : (
              <>
                <p className="recuperar-desc">
                  Ingresá tu email y te enviaremos un correo para restablecer tu contraseña.
                </p>
                <form className="recuperar-form" onSubmit={handleRecuperar}>
                  <input
                    type="email"
                    className="recuperar-input"
                    placeholder="tu@email.com"
                    value={recuperarEmail}
                    onChange={e => setRecuperarEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  {recuperarErr && <p className="login-error">{recuperarErr}</p>}
                  <button type="submit" className="btn btn--primary recuperar-btn" disabled={recuperarLoading}>
                    {recuperarLoading ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button type="button" className="btn recuperar-btn-cancelar" onClick={cerrarModal}>
                    Cancelar
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
