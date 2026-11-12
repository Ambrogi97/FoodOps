import { FolderOpen, QrCode, Smartphone, BarChart2, Zap } from 'lucide-react'
import { useInView } from '../hooks/useInView'
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

function PasoRow({ paso, index }) {
  const [ref, visible] = useInView()
  const isReverse = index % 2 !== 0
  return (
    <div
      ref={ref}
      className={`paso-row reveal${isReverse ? ' paso-row--reverse' : ''}${visible ? ' visible' : ''}`}
    >
      <div className="paso-visual">
        <div className="paso-visual__card">
          <span className="paso-visual__bg-num">{paso.num}</span>
          <div className="paso-visual__icon-wrap">
            <paso.Icon size={40} />
          </div>
        </div>
      </div>
      <div className="paso-text">
        <span className="paso-text__step">PASO {paso.num}</span>
        <h3 className="paso-text__title">{paso.titulo}</h3>
        <p className="paso-text__desc">{paso.desc}</p>
      </div>
    </div>
  )
}

export default function ComoFunciona() {
  const [headerRef, headerVisible] = useInView()
  return (
    <section className="como-funciona" id="como-funciona">
      <div className="container">
        <div
          ref={headerRef}
          className={`como-funciona__header reveal${headerVisible ? ' visible' : ''}`}
        >
          <span className="section-tag"><Zap size={14} /> Proceso simple</span>
          <h2 className="section-title">Empezá en minutos</h2>
          <p className="section-subtitle">
            Sin instalaciones, sin configuraciones complejas. Cuatro pasos y tu
            restaurante ya opera en modo digital.
          </p>
        </div>
        <div className="pasos-lista">
          {pasos.map((p, i) => (
            <PasoRow key={p.num} paso={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
