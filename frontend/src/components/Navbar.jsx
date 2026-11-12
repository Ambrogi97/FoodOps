import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import Logo from './Logo'
import './Navbar.css'

export default function Navbar() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <a href="#" className="navbar__logo">
          <Logo size={28} />
          <span className="navbar__logo-text">Food<strong>Ops</strong></span>
        </a>

        <ul className="navbar__links">
          <li><a href="#caracteristicas">Características</a></li>
          <li><a href="#como-funciona">Cómo funciona</a></li>
          <li><a href="#planes">Planes</a></li>
          <li><a href="#faq">Preguntas frecuentes</a></li>
        </ul>

        <div className="navbar__actions">
          <button
            className={`theme-toggle${dark ? ' theme-toggle--dark' : ''}`}
            onClick={() => setDark(d => !d)}
            aria-label="Cambiar tema"
          >
            <span className="theme-toggle__icons">
              <Sun size={13} className="theme-toggle__sun" />
              <Moon size={13} className="theme-toggle__moon" />
            </span>
            <span className="theme-toggle__thumb" />
          </button>
          <Link to="/login" className="btn btn--ghost navbar__login">Iniciar sesión</Link>
          <Link to="/register" className="btn btn--primary">Registrarse</Link>
        </div>
      </div>
    </nav>
  )
}
