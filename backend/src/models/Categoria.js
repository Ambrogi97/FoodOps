const mongoose = require('mongoose')

const categoriaSchema = new mongoose.Schema({
  nombre:  { type: String, required: true, trim: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('Categoria', categoriaSchema)
