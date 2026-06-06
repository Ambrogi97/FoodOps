const mongoose = require('mongoose')

const proveedorSchema = new mongoose.Schema({
  nombre:   { type: String, required: true, trim: true },
  rubro:    { type: String, default: '' },
  telefono: { type: String, default: '' },
  email:    { type: String, default: '' },
  notas:    { type: String, default: '' },
  usuario:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Proveedor', proveedorSchema)
