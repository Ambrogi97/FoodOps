import { useEffect, useRef, useState } from 'react'

export function useInView(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } },
      { threshold: 0.12, ...options }
    )
    io.observe(el)
    return () => io.disconnect()
    // Se observa una sola vez al montar; options suele ser un objeto nuevo en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [ref, visible]
}
