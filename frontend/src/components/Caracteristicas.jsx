import './Caracteristicas.css'

const features = [
  {
    icon: '✏️',
    titulo: 'Carta digital en tiempo real',
    desc: 'Modificá precios, descripiciones e imágenes de tus platos al instante, sin imprimir nada.',
  },
  {
    icon: '📲',
    titulo: 'QR y enlace web únicos',
    desc: 'Compartí tu menú con un simple código QR o un link. Tus clientes acceden desde cualquier celular.',
  },
  {
    icon: '🛵',
    titulo: 'Local, takeaway y delivery',
    desc: 'Gestioná pedidos para consumir en el lugar, para llevar o con envío a domicilio desde un solo panel.',
  },
  {
    icon: '💳',
    titulo: 'Pagos digitales integrados',
    desc: 'Aceptá pagos online directamente desde la plataforma. Menos espera, más rotación de mesas.',
  },
  {
    icon: '📊',
    titulo: 'Panel de control intuitivo',
    desc: 'Administrá tu carta, pedidos y configuraciones desde un dashboard limpio y fácil de usar.',
  },
  {
    icon: '🌐',
    titulo: 'Funciona en cualquier dispositivo',
    desc: 'Sin instalaciones. Tus clientes acceden desde el navegador de su celular, tablet o computadora.',
  },
]

export default function Caracteristicas() {
  return (
    <section className="caracteristicas" id="caracteristicas">
      <div className="container">
        <div className="caracteristicas__header">
          <span className="section-tag">✨ Características</span>
          <h2 className="section-title">Todo lo que tu restaurante necesita</h2>
          <p className="section-subtitle">
            FoodOps centraliza la operación de tu local en una plataforma accesible,
            ágil y pensada para el mundo gastronómico.
          </p>
        </div>
        <div className="features__grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.titulo}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
