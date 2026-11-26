const mongoose = require('mongoose')

// Pagos de Mercado Pago ya acreditados. El índice único de paymentId hace que
// el mismo pago no se acredite dos veces aunque el aviso llegue repetido.
const pagoMPSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  usuario:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan:      { type: String, required: true },
  monto:     { type: Number, required: true },
  moneda:    { type: String, required: true },
  venceEl:   { type: Date,   required: true },
}, { timestamps: true })

module.exports = mongoose.model('PagoMP', pagoMPSchema)
