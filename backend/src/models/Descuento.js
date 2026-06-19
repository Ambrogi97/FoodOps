const mongoose = require('mongoose')

const descuentoSchema = new mongoose.Schema({
  nombre:     { type: String, required: true },
  tipo:       { type: String, default: 'sin_importe', enum: ['sin_importe', 'porcentaje', 'fijo'] },
  valor:      { type: Number, default: null },
  estado:     { type: String, default: 'activo', enum: ['activo', 'inactivo'] },
  vecesUsado: { type: Number, default: 0 },
  montoUsado: { type: Number, default: 0 },
  ultimaVez:  { type: Date, default: null },
  usuario:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Descuento', descuentoSchema)
