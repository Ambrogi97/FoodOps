import { Link } from 'react-router-dom'

// Página para direcciones que no existen (antes se veía una pantalla en blanco)
export default function NoEncontrada() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 16px', textAlign: 'center', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit' }}>
      <p style={{ margin: 0, fontSize: '3rem', fontWeight: 800, color: '#e85d2b' }}>404</p>
      <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Esta página no existe</h1>
      <p style={{ margin: 0, color: '#666', maxWidth: 360 }}>Puede que el enlace esté mal escrito o que la página ya no esté disponible.</p>
      <Link to="/" style={{ marginTop: 8, padding: '10px 22px', borderRadius: 8, background: '#e85d2b', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>Ir al inicio</Link>
    </main>
  )
}
