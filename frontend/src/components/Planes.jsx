import { Link } from 'react-router-dom'
import { Briefcase, Check } from 'lucide-react'
import './Planes.css'

const planes = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: '$4.999',
    periodo: '/mes',
    desc: 'Para empezar a digitalizar tu restaurante sin complicaciones.',
    destacado: false,
    items: [
      'Punto de venta (Restaurante)',
      'Monitor de cocina',
      'Gestión de productos y categorías',
      'Carta online con código QR',
      'Pedidos online (local y takeaway)',
      'Hasta 3 sub-usuarios',
      'Soporte por email',
    ],
    cta: 'Empezar gratis',
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: '$12.999',
    periodo: '/mes',
    desc: 'Operación completa: ventas, finanzas, proveedores y más.',
    destacado: true,
    badge: 'Más popular',
    items: [
      'Todo lo del plan Básico',
      'Gestión de ventas e historial',
      'Finanzas y flujo de caja',
      'Gastos y categorías de gasto',
      'Reportes y analytics',
      'Clientes y cuentas corrientes',
      'Proveedores y stock',
      'Configuración avanzada',
      'Sub-usuarios ilimitados',
      'Soporte prioritario',
    ],
    cta: 'Elegir Premium',
  },
]

export default function Planes() {
  return (
    <section className="planes" id="planes">
      <div className="container">
        <div className="planes__header">
          <span className="section-tag"><Briefcase size={14} /> Planes</span>
          <h2 className="section-title">Elegí el plan para tu negocio</h2>
          <p className="section-subtitle">
            Sin contratos ni permanencia. Cambiá de plan cuando quieras.
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
                    <span className="plan-card__check"><Check size={13} strokeWidth={3} /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to={`/register?plan=${p.id}`}
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
