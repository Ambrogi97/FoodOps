const mongoose = require('mongoose')

const gastoSchema = new mongoose.Schema({
  descripcion:      { type: String, default: '' },
  monto:            { type: Number, default: 0 },
  categoria:        { type: String, default: '' },
  comentario:       { type: String, default: '' },
  importe:          { type: Number, default: 0 },
  proveedor:        { type: String, default: '' },
  categoriaId:      { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriaGasto', default: null },
  estadoPago:       { type: String, default: 'pagado', enum: ['pagado', 'pendiente', 'vencido'] },
  medioPago:        { type: String, default: '' },
  fecha:            { type: String, required: true },
  fechaVencimiento: { type: String, default: null },
  usuario:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Gasto', gastoSchema)
