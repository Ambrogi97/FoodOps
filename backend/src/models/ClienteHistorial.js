const mongoose = require('mongoose')

const clienteHistorialSchema = new mongoose.Schema({
  usuario:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email:     { type: String, required: true, lowercase: true, trim: true },
  nombre:    { type: String, default: '' },
  telefono:  { type: String, default: '' },
  direccion: { type: String, default: '' },
}, { timestamps: true })

clienteHistorialSchema.index({ usuario: 1, email: 1 }, { unique: true })

module.exports = mongoose.model('ClienteHistorial', clienteHistorialSchema)
