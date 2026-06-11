require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../src/models/User')

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)

  const existe = await User.findOne({ email: 'admin@gmail.com' })
  if (existe) {
    console.log('El usuario admin ya existe.')
    process.exit(0)
  }

  const password = await bcrypt.hash('admin', 10)
  await User.create({
    nombre: 'Admin',
    email: 'admin@gmail.com',
    password,
    restaurante: 'FoodOps Admin',
    plan: 'premium',
    role: 'admin',
  })

  console.log('Usuario admin creado: admin@gmail.com / admin')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
