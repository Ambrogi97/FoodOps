require('dotenv').config()
const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
const mongoose = require('mongoose')
const User     = require('../src/models/User')

const email = process.argv[2]
if (!email) { console.error('Uso: node scripts/makeAdmin.js <email>'); process.exit(1) }

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true })
  if (!user) { console.error('Usuario no encontrado:', email); process.exit(1) }
  console.log(`✓ ${user.nombre} (${user.email}) ahora es admin`)
  process.exit(0)
}).catch(e => { console.error(e); process.exit(1) })
