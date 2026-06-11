import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <a href="#" className="navbar__logo">
          <span className="navbar__logo-icon"><UtensilsCrossed size={20} /></span>
          <span className="navbar__logo-text">Food<strong>Ops</strong></span>
        </a>

        <ul className={`navbar__links${menuOpen ? ' navbar__links--open' : ''}`}>
          <li><a href="#caracteristicas" onClick={() => setMenuOpen(false)}>Características</a></li>
          <li><a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a></li>
          <li><a href="#planes" onClick={() => setMenuOpen(false)}>Planes</a></li>
          {menuOpen && (
            <li style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 24px 4px', borderTop: '1px solid #e5e7eb', marginTop: '8px', listStyle: 'none' }}>
              <Link to="/login" className="btn btn--ghost" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
              <Link to="/register" className="btn btn--primary" onClick={() => setMenuOpen(false)}>Registrarse</Link>
            </li>
          )}
        </ul>

        <div className="navbar__actions">
          <Link to="/login" className="btn btn--ghost">Iniciar sesión</Link>
          <Link to="/register" className="btn btn--primary">Registrarse</Link>
        </div>

        <button
          className={`navbar__burger${menuOpen ? ' navbar__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          <span /><span /><span />
        </button>
      </div>
    </nav>
  )
}
