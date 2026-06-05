const mongoose = require('mongoose')

const ingredienteSchema = new mongoose.Schema({
  nombre:  { type: String, required: true, trim: true },
  unidad:  { type: String, required: true, enum: ['kg', 'g', 'l', 'ml', 'unid.'] },
  costo:   { type: Number, default: 0, min: 0 },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Ingrediente', ingredienteSchema)
