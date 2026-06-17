import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <a href="#" className="navbar__logo">
          <Logo size={30} />
          <span className="navbar__logo-text">Food<strong>Ops</strong></span>
        </a>

        <ul className="navbar__links">
          <li><a href="#caracteristicas">Características</a></li>
          <li><a href="#como-funciona">Cómo funciona</a></li>
          <li><a href="#planes">Planes</a></li>
        </ul>

        <div className="navbar__actions">
          <Link to="/login" className="btn btn--ghost">Iniciar sesión</Link>
          <Link to="/register" className="btn btn--primary">Registrarse</Link>
        </div>
      </div>
    </nav>
  )
}
