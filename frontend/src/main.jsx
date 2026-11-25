import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.jsx'

// Campos de fecha/hora: el calendario se abre tocando cualquier parte del campo,
// no solo el iconito (en toda la app, sin tocar cada pantalla).
const TIPOS_CON_SELECTOR = new Set(['date', 'month', 'week', 'time', 'datetime-local'])
document.addEventListener('click', (e) => {
  const input = e.target
  if (!(input instanceof HTMLInputElement) || !TIPOS_CON_SELECTOR.has(input.type)) return
  if (input.disabled || input.readOnly || typeof input.showPicker !== 'function') return
  try { input.showPicker() } catch { /* el navegador no lo permite en este momento */ }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
