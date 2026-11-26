// Aviso de error visible para el usuario. Antes muchas pantallas solo hacían console.error:
// si fallaba guardar (sin conexión, sin permiso, datos inválidos) la pantalla quedaba como
// si se hubiera guardado. El componente <Avisos /> (montado en App) muestra el mensaje.
export function avisarError(e) {
  console.error(e)
  const message = e?.message || 'No se pudo completar la acción. Intentá de nuevo.'
  window.dispatchEvent(new CustomEvent('foodops:aviso', { detail: { message } }))
}
