import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { useInView } from '../hooks/useInView'
import './FAQ.css'

const faqs = [
  {
    q: '¿Cómo funciona la prueba gratuita?',
    a: 'Al registrarte tenés 7 días de acceso completo a todas las funciones del plan Premium, sin ingresar ningún dato de pago. Al finalizar, podés elegir el plan que mejor se adapte a tu negocio o continuar sin costo.',
  },
  {
    q: '¿Necesito instalar alguna aplicación?',
    a: 'No. FoodOps funciona 100% en el navegador de tu celular, tablet o computadora. Tus clientes tampoco necesitan instalar nada para hacer pedidos desde la carta QR.',
  },
  {
    q: '¿Cómo funciona la carta QR?',
    a: 'FoodOps genera un código QR único para tu restaurante. Tus clientes lo escanean con la cámara del celular, ven tu carta digital y pueden hacer pedidos directamente desde la mesa, sin descargar ninguna app.',
  },
  {
    q: '¿Puedo cambiar de plan en cualquier momento?',
    a: 'Sí. Podés subir o bajar de plan cuando quieras, sin contratos ni permanencia. No hay costos ocultos ni penalidades por cancelar.',
  },
  {
    q: '¿Cuántos dispositivos puedo usar simultáneamente?',
    a: 'No hay límite de dispositivos. El plan Básico incluye hasta 3 sub-usuarios y el Premium tiene sub-usuarios ilimitados, cada uno con su propio rol y permisos.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo?',
    a: 'Tus datos son siempre tuyos. Si cancelás, podés exportar toda tu información antes de cerrar la cuenta. No retenemos datos con fines comerciales.',
  },
  {
    q: '¿Tienen soporte técnico?',
    a: 'Sí. El plan Básico incluye soporte por email y el plan Premium tiene soporte prioritario con respuesta más rápida. También podés escribirnos por WhatsApp para consultas puntuales.',
  },
]

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className={`faq-item${isOpen ? ' faq-item--open' : ''}`}>
      <button className="faq-item__q" onClick={onToggle}>
        <span>{faq.q}</span>
        <ChevronDown size={18} className="faq-item__icon" />
      </button>
      <div className="faq-item__body">
        <p className="faq-item__a">{faq.a}</p>
      </div>
    </div>
  )
}

export default function FAQ() {
  const [ref, visible] = useInView()
  const [openIdx, setOpenIdx] = useState(null)

  const toggle = (i) => setOpenIdx(o => (o === i ? null : i))

  return (
    <section className="faq">
      <div className="container">
        <div ref={ref} className={`faq__inner reveal${visible ? ' visible' : ''}`}>
          <div className="faq__header">
            <span className="section-tag"><HelpCircle size={14} /> FAQ</span>
            <h2 className="section-title">Preguntas frecuentes</h2>
            <p className="section-subtitle">Las dudas más comunes, respondidas.</p>
          </div>
          <div className="faq__list">
            {faqs.map((faq, i) => (
              <FaqItem
                key={i}
                faq={faq}
                isOpen={openIdx === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
