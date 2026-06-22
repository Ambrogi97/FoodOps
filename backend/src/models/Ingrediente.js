const mongoose = require('mongoose')

const ingredienteSchema = new mongoose.Schema({
  nombre:       { type: String, required: true, trim: true },
  unidad:       { type: String, required: true, trim: true },
  costo:        { type: Number, default: 0, min: 0 },
  stockActual:  { type: Number, default: 0 },
  stockMinimo:  { type: Number, default: 0 },
  merma:        { type: Number, default: 0 },
  controlStock: { type: Boolean, default: false },
  categoria:    { type: String, default: 'Varios', trim: true },
  usuario:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Ingrediente', ingredienteSchema)
