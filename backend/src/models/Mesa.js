const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  nombre:   String,
  cantidad: Number,
  precio:   Number,
  listo:    { type: Boolean, default: false },
  enviadoCant: { type: Number, default: 0 },   // unidades ya enviadas a cocina (comanda)
}, { _id: false })

const mesaSchema = new mongoose.Schema({
  numero:  { type: Number, required: true },
  zona:    { type: mongoose.Schema.Types.ObjectId, ref: 'Zona', required: true },
  estado:  { type: String, enum: ['libre', 'ocupada', 'cuenta'], default: 'libre' },
  col:     { type: Number, required: true },
  row:     { type: Number, required: true },
  hora:     { type: String, default: null },
  personas: { type: Number, default: null },
  items:    { type: [itemSchema], default: [] },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Mesa', mesaSchema)
