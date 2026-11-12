import { useEffect, useRef, useState } from 'react'
import './SocialProof.css'

function Counter({ to, suffix = '' }) {
  const [n, setN] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return
      started.current = true
      const start = Date.now()
      const dur = 1600
      const run = () => {
        const p = Math.min((Date.now() - start) / dur, 1)
        const val = Math.floor((1 - (1 - p) ** 3) * to)
        setN(val)
        if (p < 1) requestAnimationFrame(run); else setN(to)
      }
      requestAnimationFrame(run)
    }, { threshold: 0.5 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [to])
  return (
    <span ref={ref}>
      {n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n}{suffix}
    </span>
  )
}

const stats = [
  { label: 'Restaurantes activos',  value: 150,  suffix: '+' },
  { label: 'Pedidos gestionados',   value: 8000, suffix: '+' },
  { label: 'Platos digitalizados',  value: 5000, suffix: '+' },
]

export default function SocialProof() {
  return (
    <div className="social-proof">
      <div className="container social-proof__inner">
        {stats.map((s, i) => (
          <div key={i} className="social-proof__stat">
            <div className="social-proof__num">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <div className="social-proof__label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
