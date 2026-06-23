const mongoose = require('mongoose')

const cuentaCorrienteProveedorSchema = new mongoose.Schema({
  proveedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', required: true },
  tipo:        { type: String, enum: ['cargo', 'pago'], default: 'cargo' },
  monto:       { type: Number, required: true },
  medioPago:   { type: String, default: '' },
  fechaPago:   { type: String, default: null },
  comentario:  { type: String, default: '' },
  usuario:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('CuentaCorrienteProveedor', cuentaCorrienteProveedorSchema)
