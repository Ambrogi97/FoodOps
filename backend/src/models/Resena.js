const mongoose = require('mongoose')

const resenaSchema = new mongoose.Schema({
  pedido:    { type: mongoose.Schema.Types.ObjectId, ref: 'PedidoOnline', required: true, unique: true },
  usuario:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  estrellas: { type: Number, min: 1, max: 5, required: true },
  comentario:{ type: String, default: '' },
  token:     { type: String, required: true },
}, { timestamps: true })

module.exports = mongoose.model('Resena', resenaSchema)
