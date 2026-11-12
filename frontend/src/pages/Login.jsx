import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService, saveSession } from '../services/api'
import Logo from '../components/Logo'
import './Login.css'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [lento, setLento]       = useState(false)
  const lentoTimer              = useRef(null)
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
    setLento(false)
    setLoading(true)
    lentoTimer.current = setTimeout(() => setLento(true), 6000)
    try {
      const { token, user } = await authService.login(form)
      saveSession(token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLento(false)
      clearTimeout(lentoTimer.current)
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
      <div className="login-left">
        <Link to="/" className="login-logo">
          <Logo size={34} />
          <span>Food<strong>Ops</strong></span>
        </Link>

        <div className="login-content">
          <h1 className="login-title">Bienvenido de nuevo</h1>
          <p className="login-subtitle">
            Ingresá a tu cuenta para gestionar la carta, los pedidos y la operación
            de tu restaurante desde un solo lugar.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Ingresá tu email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-password">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <button type="button" className="login-forgot-link" onClick={() => setShowRecuperar(true)}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
            {lento && (
              <p className="login-lento">
                El servidor está iniciando, puede demorar hasta un minuto la primera vez. Por favor esperá…
              </p>
            )}
          </form>

          <div className="login-divider"><span>o</span></div>

          <Link to="/register" className="login-register-btn">
            Crear una cuenta nueva
          </Link>
        </div>
      </div>

      <div className="login-right" aria-hidden="true">
        <div className="login-photo">
          <div className="login-photo-caption">
            <p className="login-photo-title">Tu restaurante, en orden.</p>
            <p className="login-photo-text">Carta digital, pedidos y reportes en un solo panel.</p>
          </div>
        </div>
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
