const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  nombre:   String,
  cantidad: Number,
  precio:   Number,
}, { _id: false })

const ventaSchema = new mongoose.Schema({
  numero:     { type: Number },
  mesa:       { type: String, required: true },
  inicio:     { type: String, required: true },
  cierre:     { type: String, default: null },
  estado:     { type: String, default: 'cerrada', enum: ['cerrada', 'en_curso'] },
  tipo:       { type: String, default: 'salon' },
  metodoPago: { type: String, default: 'Efectivo' },
  personas:   { type: Number, default: 1 },
  items:      { type: [itemSchema], default: [] },
  usuario:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Venta', ventaSchema)
