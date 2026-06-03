import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './Register.css'

const PLANES = {
  basico: { nombre: 'Básico', precio: '$4.999/mes' },
  profesional: { nombre: 'Profesional', precio: '$9.999/mes' },
  premium: { nombre: 'Premium', precio: '$17.999/mes' },
}

export default function Register() {
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan') || 'basico'
  const plan = PLANES[planId] || PLANES.basico

  const [form, setForm] = useState({
    restaurante: '',
    nombre: '',
    email: '',
    password: '',
    confirmar: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: conectar con backend
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <Link to="/" className="register-logo">
          <span>🍽️</span>
          <span>Food<strong>Ops</strong></span>
        </Link>

        <div className="register-plan-badge">
          <span className="register-plan-label">Plan seleccionado</span>
          <span className="register-plan-nombre">{plan.nombre}</span>
          <span className="register-plan-precio">{plan.precio}</span>
          <Link to="/#planes" className="register-plan-cambiar">Cambiar plan</Link>
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

          <button type="submit" className="btn btn--primary btn--lg register-submit">
            Crear cuenta
          </button>
        </form>

        <p className="register-login">
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  )
}
