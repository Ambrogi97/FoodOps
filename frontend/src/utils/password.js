// Requisitos de contraseña: los mismos que valida el servidor (backend/src/utils/security.js)
export const REQUISITOS_PASSWORD = [
  { id: 'largo',     texto: 'Al menos 8 caracteres',              cumple: p => p.length >= 8 },
  { id: 'minuscula', texto: 'Una letra minúscula',                cumple: p => /[a-z]/.test(p) },
  { id: 'mayuscula', texto: 'Una letra mayúscula',                cumple: p => /[A-Z]/.test(p) },
  { id: 'numero',    texto: 'Un número',                          cumple: p => /[0-9]/.test(p) },
  { id: 'especial',  texto: 'Un carácter especial (! @ # $ % …)', cumple: p => /[^A-Za-z0-9]/.test(p) },
]

export const passwordValida = (p = '') => REQUISITOS_PASSWORD.every(r => r.cumple(p))
