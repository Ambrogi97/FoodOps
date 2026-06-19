const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  nombre:   String,
  cantidad: { type: Number, default: 1 },
  precio:   { type: Number, default: 0 },
}, { _id: false })

const pedidoDeliverySchema = new mongoose.Schema({
  numero:         { type: Number },
  nombre:         { type: String, default: '' },
  telefono:       { type: String, default: '' },
  direccion: {
    calle:  { type: String, default: '' },
    numero: { type: String, default: '' },
    piso:   { type: String, default: '' },
    barrio: { type: String, default: '' },
  },
  repartidor:     { type: String, default: '' },
  tiempoEstimado: { type: String, default: '' },
  costoEnvio:     { type: Number, default: 0 },
  comentario:     { type: String, default: '' },
  items:          { type: [itemSchema], default: [] },
  total:          { type: Number, default: 0 },
  estado: {
    type: String,
    default: 'en_preparacion',
    enum: ['en_preparacion', 'listo_para_entregar', 'enviado', 'entregado'],
  },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('PedidoDelivery', pedidoDeliverySchema)
