import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useInView } from '../hooks/useInView'
import './CTAFinal.css'

export default function CTAFinal() {
  const [ref, visible] = useInView()
  return (
    <section className="cta-final">
      <div className="cta-final__glow" />
      <div ref={ref} className={`container cta-final__inner reveal${visible ? ' visible' : ''}`}>
        <h2 className="cta-final__title">
          ¿Listo para llevar tu restaurante<br />al siguiente nivel?
        </h2>
        <p className="cta-final__sub">
          7 días de prueba gratuita · Sin tarjeta de crédito · Sin permanencia
        </p>
        <Link to="/register" className="btn btn--lg cta-final__btn">
          Empezar gratis <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  )
}
