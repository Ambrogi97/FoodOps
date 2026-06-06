const mongoose = require('mongoose')

const clienteSchema = new mongoose.Schema({
  nombre:   { type: String, required: true, trim: true },
  telefono: { type: String, default: '' },
  email:    { type: String, default: '' },
  notas:    { type: String, default: '' },
  usuario:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Cliente', clienteSchema)
