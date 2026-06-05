const mongoose = require('mongoose')

const gastoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true, trim: true },
  monto:       { type: Number, required: true, min: 0 },
  categoria:   {
    type: String,
    required: true,
    enum: ['ingredientes', 'bebidas', 'servicios', 'sueldos', 'alquiler', 'mantenimiento', 'otro'],
  },
  fecha:   { type: String, required: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Gasto', gastoSchema)
