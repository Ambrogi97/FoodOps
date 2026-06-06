const mongoose = require('mongoose')

const productoSchema = new mongoose.Schema({
  nombre:   { type: String, required: true, trim: true },
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true },
  precio:   { type: Number, required: true, min: 0 },
  costo:    { type: Number, default: 0, min: 0 },
  imagen:   { type: String, default: '' },
  activo:   { type: Boolean, default: true },
  usuario:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Producto', productoSchema)
