// Que un registro no pueda apuntar a datos de otro restaurante.
// Ej.: un movimiento de cuenta corriente con el clienteId de un cliente ajeno, que después
// al listarse traía el nombre de ese cliente (el populate no filtra por restaurante).
const mongoose = require('mongoose')

// refs: [{ modelo, ids, nombre }]. ids puede ser un id, una lista o vacío (se ignora).
// Devuelve null si todo es del restaurante, o el mensaje de error para responder 400.
async function referenciaAjena(uid, refs) {
  for (const { modelo, ids, nombre } of refs) {
    const lista = (Array.isArray(ids) ? ids : [ids]).filter(x => x != null && x !== '')
    if (!lista.length) continue
    if (lista.some(id => typeof id !== 'string' && !(id instanceof mongoose.Types.ObjectId)) ||
        lista.some(id => !mongoose.isValidObjectId(id) || String(id).length !== 24)) {
      return `${nombre} no es válido`
    }
    const unicos = [...new Set(lista.map(String))]
    const n = await modelo.countDocuments({ _id: { $in: unicos }, usuario: uid })
    if (n !== unicos.length) return `${nombre} no existe`
  }
  return null
}

module.exports = { referenciaAjena }
