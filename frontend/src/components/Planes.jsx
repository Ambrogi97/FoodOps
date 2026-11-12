import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Check } from 'lucide-react'
import { useInView } from '../hooks/useInView'
import './Planes.css'

const fmt = (n) => '$' + n.toLocaleString('es-AR')

const planes = [
  {
    id: 'basico',
    nombre: 'Básico',
    mensual: 20000,
    anualMes: 16000,
    totalAnual: 192000,
    ahorroAnual: 48000,
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
    mensual: 35000,
    anualMes: 28000,
    totalAnual: 336000,
    ahorroAnual: 84000,
    desc: 'Operación completa: ventas, finanzas, proveedores y más.',
    destacado: true,
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
  const [anual, setAnual] = useState(false)
  const [headerRef, headerVisible] = useInView()
  const [gridRef, gridVisible] = useInView()

  return (
    <section className="planes" id="planes">
      <div className="container">
        <div ref={headerRef} className={`planes__header reveal${headerVisible ? ' visible' : ''}`}>
          <span className="section-tag"><Briefcase size={14} /> Planes</span>
          <h2 className="section-title">Elegí el plan para tu negocio</h2>
          <p className="section-subtitle">
            Sin contratos ni permanencia. Cambiá de plan cuando quieras.
          </p>

          <div className="planes__toggle">
            <button
              className={`planes__toggle-opt${!anual ? ' planes__toggle-opt--active' : ''}`}
              onClick={() => setAnual(false)}
            >
              Mensual
            </button>
            <button
              className={`planes__toggle-opt${anual ? ' planes__toggle-opt--active' : ''}`}
              onClick={() => setAnual(true)}
            >
              Anual
              <span className="planes__toggle-badge">2 meses gratis</span>
            </button>
          </div>
        </div>

        <div ref={gridRef} className={`planes__grid reveal${gridVisible ? ' visible' : ''}`}>
          {planes.map((p) => {
            const badge = p.destacado
              ? 'Más popular'
              : (anual ? `Ahorrás ${fmt(p.ahorroAnual)}` : '7 días gratis')
            const badgeClass = p.destacado ? ' plan-card__badge--popular' : (anual ? ' plan-card__badge--ahorro' : '')
            const precio = anual ? p.anualMes : p.mensual

            return (
              <div className={`plan-card${p.destacado ? ' plan-card--destacado' : ''}`} key={p.id}>
                <div className={`plan-card__badge${badgeClass}`}>{badge}</div>

                <div className="plan-card__header">
                  <h3 className="plan-card__nombre">{p.nombre}</h3>
                  <div className="plan-card__precio">
                    <span className="plan-card__monto">{fmt(precio)}</span>
                    <span className="plan-card__periodo">/mes</span>
                  </div>
                  {anual && (
                    <p className="plan-card__anual-note">
                      Facturado anualmente · {fmt(p.totalAnual)}/año
                    </p>
                  )}
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
                  to={`/register?plan=${p.id}${anual ? '&periodo=anual' : ''}`}
                  className={`btn btn--lg${p.destacado ? ' btn--primary' : ' btn--outline'}`}
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  {p.cta}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
