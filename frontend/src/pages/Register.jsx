import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authService, saveSession } from '../services/api'
import Logo from '../components/Logo'
import './Register.css'

const PLANES = {
  basico:  { nombre: 'Básico',   precio: '$4.999/mes' },
  premium: { nombre: 'Premium',  precio: '$12.999/mes' },
}

export default function Register() {
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan') || 'basico'
  const plan = PLANES[planId] || PLANES.basico
  const navigate = useNavigate()

  const [form, setForm] = useState({
    restaurante: '',
    nombre: '',
    email: '',
    password: '',
    confirmar: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exitoso, setExitoso] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const { token, user } = await authService.register({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        restaurante: form.restaurante,
        plan: planId,
      })
      saveSession(token, user)
      setExitoso(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      {exitoso && (
        <div className="register-overlay">
          <div className="register-success-modal">
            <div className="register-success-icon">✅</div>
            <h2>¡Cuenta creada exitosamente!</h2>
            <p>Tu cuenta fue registrada. Podés iniciar sesión cuando quieras.</p>
            <button className="btn btn--primary btn--lg" onClick={() => navigate('/login')}>
              Ir al login
            </button>
          </div>
        </div>
      )}
    <div className="register-page-inner">
      <div className="register-card">
        <Link to="/" className="register-logo">
          <Logo size={34} />
          <span>Food<strong>Ops</strong></span>
        </Link>

        <div className="register-plan-badge register-plan-badge--trial">
          <span className="register-plan-label">🎉 7 días gratis</span>
          <span className="register-plan-desc">Sin tarjeta de crédito · Acceso completo al plan {plan.nombre}</span>
        </div>

        <h1 className="register-title">Creá tu cuenta</h1>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-field">
            <label htmlFor="restaurante">Nombre del restaurante</label>
            <input
              id="restaurante"
              name="restaurante"
              type="text"
              placeholder="Ej: La Trattoria"
              value={form.restaurante}
              onChange={handleChange}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="nombre">Tu nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              placeholder="Nombre y apellido"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="register-field">
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

          <div className="register-row">
            <div className="register-field">
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
            <div className="register-field">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input
                id="confirmar"
                name="confirmar"
                type="password"
                placeholder="••••••••"
                value={form.confirmar}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && <p className="register-error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--lg register-submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="register-login">
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </div>
    </div>
    </div>
  )
}
