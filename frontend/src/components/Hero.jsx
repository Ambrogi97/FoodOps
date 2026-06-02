import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero__container">
        <div className="hero__content">
          <span className="section-tag">🚀 La revolución gastronómica digital</span>
          <h1 className="hero__title">
            Tu carta digital,<br />
            tus pedidos,<br />
            <span className="hero__title--accent">tu negocio.</span>
          </h1>
          <p className="hero__subtitle">
            FoodOps digitaliza la experiencia de tu restaurante: carta QR,
            pedidos en línea y pagos integrados, todo sin instalar ninguna aplicación.
          </p>
          <div className="hero__ctas">
            <a href="#planes" className="btn btn--primary btn--lg">Comenzar gratis</a>
            <a href="#como-funciona" className="btn btn--outline btn--lg">Ver cómo funciona</a>
          </div>
          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-num">+500</span>
              <span className="hero__stat-label">Restaurantes activos</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-num">98%</span>
              <span className="hero__stat-label">Satisfacción</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-num">0 apps</span>
              <span className="hero__stat-label">Sin instalación</span>
            </div>
          </div>
        </div>

        <div className="hero__visual">
          <div className="phone-mockup">
            <div className="phone-mockup__frame">
              <div className="phone-mockup__notch" />
              <div className="phone-mockup__screen">
                <div className="mock-header">
                  <div className="mock-logo">🍽️ La Trattoria</div>
                  <div className="mock-badge">Abierto</div>
                </div>
                <div className="mock-categories">
                  <span className="mock-cat mock-cat--active">Entradas</span>
                  <span className="mock-cat">Principales</span>
                  <span className="mock-cat">Postres</span>
                </div>
                <div className="mock-items">
                  <div className="mock-item">
                    <div className="mock-item__emoji">🥗</div>
                    <div className="mock-item__info">
                      <div className="mock-item__name">Ensalada César</div>
                      <div className="mock-item__price">$1.800</div>
                    </div>
                    <button className="mock-item__add">+</button>
                  </div>
                  <div className="mock-item">
                    <div className="mock-item__emoji">🍝</div>
                    <div className="mock-item__info">
                      <div className="mock-item__name">Tagliatelle al ragú</div>
                      <div className="mock-item__price">$2.400</div>
                    </div>
                    <button className="mock-item__add">+</button>
                  </div>
                  <div className="mock-item">
                    <div className="mock-item__emoji">🍕</div>
                    <div className="mock-item__info">
                      <div className="mock-item__name">Pizza Margherita</div>
                      <div className="mock-item__price">$2.100</div>
                    </div>
                    <button className="mock-item__add mock-item__add--active">1</button>
                  </div>
                </div>
                <div className="mock-cart">
                  <span>Ver pedido (1)</span>
                  <span>$2.100</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hero__visual-badge hero__visual-badge--qr">
            <span className="badge-icon">📲</span>
            <div>
              <div className="badge-title">Escanear QR</div>
              <div className="badge-sub">Sin app necesaria</div>
            </div>
          </div>
          <div className="hero__visual-badge hero__visual-badge--order">
            <span className="badge-icon">✅</span>
            <div>
              <div className="badge-title">Pedido recibido</div>
              <div className="badge-sub">Mesa 4 · $4.300</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
