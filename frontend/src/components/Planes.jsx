import { Link } from 'react-router-dom'
import './Planes.css'

const planes = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: '$4.999',
    periodo: '/mes',
    desc: 'Ideal para comenzar a digitalizar tu carta.',
    destacado: false,
    items: [
      'Carta digital con hasta 30 productos',
      'Código QR y enlace web único',
      'Categorías de menú ilimitadas',
      'Actualización en tiempo real',
      'Soporte por email',
    ],
    cta: 'Elegir Básico',
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: '$9.999',
    periodo: '/mes',
    desc: 'Para restaurantes que quieren agilizar sus pedidos.',
    destacado: true,
    badge: 'Más popular',
    items: [
      'Todo lo del plan Básico',
      'Productos ilimitados',
      'Pedidos en línea (local y takeaway)',
      'Panel de administración avanzado',
      'Estadísticas básicas',
      'Soporte prioritario',
    ],
    cta: 'Elegir Profesional',
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: '$17.999',
    periodo: '/mes',
    desc: 'Operación completa: pedidos, pagos y delivery.',
    destacado: false,
    items: [
      'Todo lo del plan Profesional',
      'Pagos digitales integrados',
      'Gestión de delivery',
      'Múltiples sucursales',
      'Reportes y analytics avanzados',
      'Soporte 24/7 dedicado',
    ],
    cta: 'Elegir Premium',
  },
]

export default function Planes() {
  return (
    <section className="planes" id="planes">
      <div className="container">
        <div className="planes__header">
          <span className="section-tag">💼 Planes</span>
          <h2 className="section-title">Elegí el plan para tu negocio</h2>
          <p className="section-subtitle">
            Comenzá gratis y escalá cuando lo necesites. Sin contratos,
            cancelás cuando quieras.
          </p>
        </div>
        <div className="planes__grid">
          {planes.map((p, i) => (
            <div className={`plan-card${p.destacado ? ' plan-card--destacado' : ''}`} key={i}>
              {p.badge && <div className="plan-card__badge">{p.badge}</div>}
              <div className="plan-card__header">
                <h3 className="plan-card__nombre">{p.nombre}</h3>
                <div className="plan-card__precio">
                  <span className="plan-card__monto">{p.precio}</span>
                  <span className="plan-card__periodo">{p.periodo}</span>
                </div>
                <p className="plan-card__desc">{p.desc}</p>
              </div>
              <ul className="plan-card__items">
                {p.items.map((item, j) => (
                  <li key={j}>
                    <span className="plan-card__check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to={p.id === 'premium' ? '#contacto' : `/register?plan=${p.id}`}
                className={`btn btn--lg${p.destacado ? ' btn--primary' : ' btn--outline'}`}
                style={{ width: '100%', marginTop: 'auto' }}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
