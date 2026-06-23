const mongoose = require('mongoose')

const proveedorSchema = new mongoose.Schema({
  nombre:   { type: String, required: true, trim: true },
  rubro:    { type: String, default: '' },
  telefono: { type: String, default: '' },
  email:    { type: String, default: '' },
  notas:    { type: String, default: '' },
  activo:   { type: Boolean, default: true },
  calle:    { type: String, default: '' },
  numero:   { type: String, default: '' },
  piso:     { type: String, default: '' },
  ciudad:   { type: String, default: '' },
  usuario:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Proveedor', proveedorSchema)
