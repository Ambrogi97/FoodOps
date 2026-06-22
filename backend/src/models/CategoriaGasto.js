const mongoose = require('mongoose')

const categoriaGastoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  categoriaFinanciera: {
    type: String,
    default: 'Gastos administrativos',
    enum: ['Gastos administrativos', 'Gastos operacionales', 'Compra de mercadería'],
  },
  activo:  { type: Boolean, default: true },
  parent:  { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriaGasto', default: null },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('CategoriaGasto', categoriaGastoSchema)
