// Pide JSON y reintenta si el servidor está despertando (errores de red o 5xx).
// El backend corre en un plan gratuito que se "duerme" sin uso y tarda en despertar.
// Hasta ~90 s en total; un 4xx (p. ej. 404) no se reintenta: se lanza con e.status.
export async function cargarConReintentos(url, cancelado = () => false) {
  const esperas = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000, 15000, 15000]
  for (let intento = 0; ; intento++) {
    try {
      const r = await fetch(url, { cache: 'no-store' })
      if (r.ok) return await r.json()
      if (r.status < 500) throw Object.assign(new Error('http'), { status: r.status, definitivo: true })
    } catch (e) {
      if (e.definitivo) throw e
    }
    if (intento >= esperas.length || cancelado()) throw new Error('sin respuesta')
    await new Promise(res => setTimeout(res, esperas[intento]))
  }
}
