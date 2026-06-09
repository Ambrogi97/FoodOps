import { FolderOpen, QrCode, Smartphone, BarChart2, Zap } from 'lucide-react'
import './ComoFunciona.css'

const pasos = [
  {
    num: '01',
    Icon: FolderOpen,
    titulo: 'Creá tu carta digital',
    desc: 'Cargá tus platos, precios, descripciones e imágenes desde el panel de control. Modificaciones en tiempo real.',
  },
  {
    num: '02',
    Icon: QrCode,
    titulo: 'Generamos tu QR',
    desc: 'Obtenés automáticamente un enlace web único y un código QR listo para imprimir y colocar en tus mesas.',
  },
  {
    num: '03',
    Icon: Smartphone,
    titulo: 'El cliente escanea y pide',
    desc: 'Tus clientes acceden al menú, realizan su pedido y pagan directamente desde su celular, sin descargar nada.',
  },
  {
    num: '04',
    Icon: BarChart2,
    titulo: 'Vos gestionás todo',
    desc: 'Recibís y administrás los pedidos en tiempo real desde tu panel. Control total de tu negocio en un solo lugar.',
  },
]

export default function ComoFunciona() {
  return (
    <section className="como-funciona" id="como-funciona">
      <div className="container">
        <div className="como-funciona__header">
          <span className="section-tag"><Zap size={14} /> Proceso simple</span>
          <h2 className="section-title">Empezá en minutos</h2>
          <p className="section-subtitle">
            Sin instalaciones, sin configuraciones complejas. Cuatro pasos y tu
            restaurante ya opera en modo digital.
          </p>
        </div>
        <div className="pasos__grid">
          {pasos.map((p, i) => (
            <div className="paso-card" key={i}>
              <div className="paso-card__num">{p.num}</div>
              <div className="paso-card__icon"><p.Icon size={28} /></div>
              <h3 className="paso-card__title">{p.titulo}</h3>
              <p className="paso-card__desc">{p.desc}</p>
              {i < pasos.length - 1 && <div className="paso-card__arrow">→</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
