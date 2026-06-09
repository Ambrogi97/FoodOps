import { UtensilsCrossed } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__container">
        <div className="footer__brand">
          <a href="#" className="footer__logo">
            <span><UtensilsCrossed size={18} /></span>
            <span>Food<strong>Ops</strong></span>
          </a>
          <p className="footer__tagline">
            La plataforma digital para restaurantes modernos.
            Carta, pedidos y pagos en un solo lugar.
          </p>
        </div>

        <div className="footer__links">
          <div className="footer__col">
            <h4>Producto</h4>
            <ul>
              <li><a href="#caracteristicas">Características</a></li>
              <li><a href="#como-funciona">Cómo funciona</a></li>
              <li><a href="#planes">Planes</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Empresa</h4>
            <ul>
              <li><a href="#">Nosotros</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contacto</a></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Términos de uso</a></li>
              <li><a href="#">Privacidad</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} FoodOps. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
