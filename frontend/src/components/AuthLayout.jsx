import { Link } from 'react-router-dom'
import Logo from './Logo'
import '../pages/Login.css'

// Layout de dos columnas (formulario + foto) para las pantallas de acceso
export default function AuthLayout({ children }) {
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
