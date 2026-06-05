const mongoose = require('mongoose')

const zonaSchema = new mongoose.Schema({
  label:     { type: String, required: true, trim: true },
  removible: { type: Boolean, default: true },
  usuario:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Zona', zonaSchema)
