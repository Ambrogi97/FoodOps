const mongoose = require('mongoose')

const recetaItemSchema = new mongoose.Schema({
  ingredienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingrediente' },
  cantNeta:      { type: Number, default: 0 },
  unidad:        { type: String, default: '' },
}, { _id: false })

const productoSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, trim: true },
  categoria:   { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true },
  precio:      { type: Number, required: true, min: 0 },
  costo:       { type: Number, default: 0, min: 0 },
  descripcion: { type: String, default: '' },
  imagen:      { type: String, default: '' },
  activo:      { type: Boolean, default: true },
  codigo:             { type: Number, default: null },
  areaImpresion:      { type: String, default: '' },
  controlStock:       { type: Boolean, default: false },
  venderSinStock:     { type: Boolean, default: false },
  permitirVenderSolo: { type: Boolean, default: true },
  tiempoPrepMin:      { type: Number, default: null },
  stockActual:        { type: Number, default: 0 },
  receta:             { type: [recetaItemSchema], default: [] },
  opciones:           { type: [{ grupo: String, items: [{ label: String, precio: { type: Number, default: 0 } }] }], default: [] },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Producto', productoSchema)
