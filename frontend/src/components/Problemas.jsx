import { ClipboardList, Frown, Timer, AlertTriangle } from 'lucide-react'
import './Problemas.css'

const problemas = [
  {
    Icon: ClipboardList,
    titulo: 'Cartas físicas desactualizadas',
    desc: 'Cada cambio de precio o plato implica reimprimir y repartir nuevas cartas, generando costos y demoras innecesarias.',
  },
  {
    Icon: Frown,
    titulo: 'Pedidos confusos y con errores',
    desc: 'La toma manual genera malentendidos entre el mozo y la cocina que afectan directamente la experiencia del cliente.',
  },
  {
    Icon: Timer,
    titulo: 'Cobros lentos y manuales',
    desc: 'Esperar la cuenta es uno de los mayores motivos de insatisfacción. Los procesos manuales generan cuellos de botella.',
  },
]

export default function Problemas() {
  return (
    <section className="problemas">
      <div className="container problemas__container">
        <div className="problemas__header">
          <span className="section-tag"><AlertTriangle size={14} /> El problema</span>
          <h2 className="section-title">¿Qué frena a tu restaurante?</h2>
          <p className="section-subtitle">
            Los sistemas tradicionales de gestión gastronómica generan ineficiencias
            que impactan en tus ganancias y en la experiencia de tus clientes.
          </p>
        </div>
        <div className="problemas__grid">
          {problemas.map((p, i) => (
            <div className="problema-card" key={i}>
              <div className="problema-card__icon"><p.Icon size={28} /></div>
              <h3 className="problema-card__title">{p.titulo}</h3>
              <p className="problema-card__desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
