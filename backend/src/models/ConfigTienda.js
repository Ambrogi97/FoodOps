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

const formaPagoSchema = new mongoose.Schema(
  {
    nombre:     { type: String, required: true },
    descuento:  { type: Number, default: 0 },
    habilitado: { type: Boolean, default: true },
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
    fondoImagen: { type: String, default: null },
    formasPago:     { type: [formaPagoSchema], default: () => [
      { nombre: 'Efectivo', descuento: 0, habilitado: true },
      { nombre: 'Transferencia', descuento: 0, habilitado: true },
    ]},
    pedidoCounter:    { type: Number, default: 0 },
    tiempoEstimadoMin:{ type: Number, default: 30 },
    zonaDelivery: {
      lat:     { type: Number, default: null },
      lng:     { type: Number, default: null },
      radioKm: { type: Number, default: null },
    },
    pushSuscripciones: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Meta de ventas del mes para la pantalla de Inicio (0 = sin meta)
    metaVentasMensual: { type: Number, default: 0, min: 0, max: 100_000_000_000 },
    // Impresión de comandas (cocina/barra) y tickets (cliente/cadete)
    impresion: {
      anchoPapel:       { type: Number,  enum: [58, 80], default: 80 },
      encabezado:       { type: String,  default: '', maxlength: 60 },   // vacío = nombre del restaurante
      datosLocal:       { type: String,  default: '', maxlength: 200 },  // dirección, teléfono, CUIT…
      pie:              { type: String,  default: '¡Gracias por su compra!', maxlength: 120 },
      leyenda:          { type: String,  default: 'Documento no válido como factura', maxlength: 120 },
      comandaPorArea:   { type: Boolean, default: true },   // una comanda para Cocina y otra para Barra
      comandaAlGuardar: { type: Boolean, default: false },  // imprime la comanda al crear/guardar el pedido
      copiasComanda:    { type: Number,  default: 1, min: 1, max: 3 },
      copiasTicket:     { type: Number,  default: 1, min: 1, max: 3 },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('ConfigTienda', configTiendaSchema)
