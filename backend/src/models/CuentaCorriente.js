const mongoose = require('mongoose')

const cuentaCorrienteSchema = new mongoose.Schema({
  clienteId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  tipo:       { type: String, default: 'cargo', enum: ['cargo', 'pago'] },
  monto:      { type: Number, required: true },
  medioPago:  { type: String, default: '' },
  caja:       { type: String, default: 'Principal' },
  fechaPago:  { type: String, default: null },
  comentario: { type: String, default: '' },
  usuario:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('CuentaCorriente', cuentaCorrienteSchema)
