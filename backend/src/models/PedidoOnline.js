const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  nombre:   String,
  cantidad: Number,
  precio:   Number,
}, { _id: false })

const pedidoOnlineSchema = new mongoose.Schema({
  usuario:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:         { type: [itemSchema], required: true },
  tipo:          { type: String, enum: ['mesa', 'takeaway'], required: true },
  mesaNumero:    { type: String, default: '' },
  clienteNombre: { type: String, default: '' },
  notas:         { type: String, default: '' },
  total:         { type: Number, required: true },
  estado:        { type: String, enum: ['pendiente', 'preparando', 'listo', 'entregado'], default: 'pendiente' },
}, { timestamps: true })

module.exports = mongoose.model('PedidoOnline', pedidoOnlineSchema)
