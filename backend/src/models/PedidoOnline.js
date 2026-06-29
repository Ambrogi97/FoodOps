const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  nombre:   String,
  cantidad: Number,
  precio:   Number,
}, { _id: false })

const pedidoOnlineSchema = new mongoose.Schema({
  usuario:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:            { type: [itemSchema], required: true },
  tipo:             { type: String, enum: ['mesa', 'takeaway', 'delivery'], required: true },
  mesaNumero:       { type: String, default: '' },
  direccion:        { type: String, default: '' },
  clienteNombre:    { type: String, default: '' },
  clienteEmail:     { type: String, default: '' },
  clienteTelefono:  { type: String, default: '' },
  formaPago:        { type: String, default: '' },
  descuento:        { type: Number, default: 0 },
  notas:            { type: String, default: '' },
  total:            { type: Number, required: true },
  totalFinal:       { type: Number, default: 0 },
  estado:           { type: String, enum: ['pendiente', 'preparando', 'listo', 'entregado'], default: 'pendiente' },
}, { timestamps: true })

module.exports = mongoose.model('PedidoOnline', pedidoOnlineSchema)
