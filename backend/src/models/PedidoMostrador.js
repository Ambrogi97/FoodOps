const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  productId: String,
  nombre:   String,
  cantidad: { type: Number, default: 1 },
  precio:   { type: Number, default: 0 },
}, { _id: false })

const pedidoMostradorSchema = new mongoose.Schema({
  numero:     { type: Number },
  etiqueta:   { type: String, default: '' },
  items:      { type: [itemSchema], default: [] },
  total:      { type: Number, default: 0 },
  estado:     { type: String, default: 'en_curso', enum: ['en_curso', 'cerrada'] },
  cliente:    { type: String, default: '' },
  metodoPago: { type: String, default: '' },
  usuario:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('PedidoMostrador', pedidoMostradorSchema)
