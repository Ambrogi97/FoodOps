const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  nombre:   String,
  cantidad: Number,
  precio:   Number,
}, { _id: false })

const ventaSchema = new mongoose.Schema({
  mesa:    { type: String, required: true },
  inicio:  { type: String, required: true },
  cierre:  { type: String, required: true },
  estado:  { type: String, default: 'cerrada' },
  items:   { type: [itemSchema], default: [] },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Venta', ventaSchema)
