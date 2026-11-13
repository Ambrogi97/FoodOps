import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import Logo from '../components/Logo'
import './Register.css'

const PLANES = {
  basico:  { nombre: 'Básico',   precio: '$20.000/mes' },
  premium: { nombre: 'Premium',  precio: '$35.000/mes' },
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const { email } = await authService.register({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        restaurante: form.restaurante,
        plan: planId,
      })
      // La cuenta se activa al confirmar el código que llega por email
      navigate(`/verificar-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
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
