const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  restaurante: { type: String, required: true, trim: true },
  plan: { type: String, enum: ['basico', 'profesional', 'premium'], default: 'basico' },
  role: { type: String, enum: ['admin', 'encargado', 'camarero', 'repartidor'], default: 'camarero' },
  cuentaPadreId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },
}, { timestamps: true })

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password)
}

module.exports = mongoose.model('User', userSchema)
