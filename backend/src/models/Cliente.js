const mongoose = require('mongoose')

const clienteSchema = new mongoose.Schema({
  nombre:           { type: String, required: true, trim: true },
  email:            { type: String, default: '', trim: true },
  telefono:         { type: String, default: '', trim: true },
  numeroTributario: { type: String, default: '', trim: true },
  fechaNacimiento:  { type: String, default: null },
  direccion:        { type: String, default: '', trim: true },
  comentario:       { type: String, default: '' },
  origen:           { type: String, default: 'Local', enum: ['Local', 'Online', 'App', 'Delivery'] },
  grupo:            { type: String, default: '', trim: true },
  activo:           { type: Boolean, default: true },
  usuario:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Cliente', clienteSchema)
