const mongoose = require('mongoose')

const franjaSchema = new mongoose.Schema(
  { desde: { type: String, default: '00:00' }, hasta: { type: String, default: '23:59' } },
  { _id: false }
)

const diaSchema = new mongoose.Schema(
  {
    dia:        { type: String, enum: ['dom','lun','mar','mie','jue','vie','sab'] },
    habilitado: { type: Boolean, default: true },
    franjas:    { type: [franjaSchema], default: () => [{ desde: '00:00', hasta: '23:59' }] },
  },
  { _id: false }
)

const DIAS_DEFAULT = ['dom','lun','mar','mie','jue','vie','sab'].map(dia => ({
  dia,
  habilitado: true,
  franjas: [{ desde: '00:00', hasta: '23:59' }],
}))

const seccionSchema = new mongoose.Schema(
  {
    habilitado:  { type: Boolean, default: false },
    horarios:    { type: [diaSchema], default: () => DIAS_DEFAULT },
    costoEnvio:  { type: Number, default: 0 },
  },
  { _id: false }
)

const configTiendaSchema = new mongoose.Schema(
  {
    usuario:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    habilitado: { type: Boolean, default: false },
    delivery:  { type: seccionSchema, default: () => ({ habilitado: false, horarios: DIAS_DEFAULT }) },
    retiro:    { type: seccionSchema, default: () => ({ habilitado: false, horarios: DIAS_DEFAULT }) },
    logo:        { type: String, default: null },
    portada:     { type: String, default: null },
    colorFondo:  { type: String, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model('ConfigTienda', configTiendaSchema)
