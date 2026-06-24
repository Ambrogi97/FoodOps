const mongoose = require('mongoose')

const roleSchema = new mongoose.Schema({
  propietarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nombre:        { type: String, required: true, trim: true },
  key:           { type: String, required: true, trim: true },
  permisos:      { type: [String], default: [] },
  esFijo:        { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('Role', roleSchema)
