const mongoose = require('mongoose')

const movimientoSchema = new mongoose.Schema({
  ingrediente:  { type: mongoose.Schema.Types.ObjectId, ref: 'Ingrediente', required: true },
  tipo:         { type: String, enum: ['entrada', 'salida'], required: true },
  cantidad:     { type: Number, required: true, min: 0 },
  descripcion:  { type: String, trim: true, default: '' },
  fecha:        { type: String, required: true },
  usuario:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('MovimientoStock', movimientoSchema)
