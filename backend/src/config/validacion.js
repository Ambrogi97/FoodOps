// Límites globales para todos los modelos de Mongoose.
// Se carga ANTES de definir los modelos (ver index.js).
//
// Sin esto el servidor aceptaba cualquier número o texto: precios de 10^40,
// porcentajes de -5000%, guiones de películas como nombre, etc.
const mongoose = require('mongoose')

// Las validaciones también corren en findOneAndUpdate / updateOne
mongoose.set('runValidators', true)

const MAX_GENERAL = 1e9   // tope para cualquier número sin regla propia

// Reglas por nombre de campo: [mínimo, máximo]
const REGLAS_NUMERO = {
  // dinero
  precio: [0, 1e9], costo: [0, 1e9], costoEnvio: [0, 1e9], importe: [0, 1e9],
  monto: [0, 1e9], montoUsado: [0, 1e12], total: [0, 1e10], totalFinal: [0, 1e10],
  valor: [0, 1e9],
  // porcentajes
  merma: [0, 100], descuento: [0, 100],
  // cantidades
  cantidad: [0, 100000], cantNeta: [0, 100000], personas: [0, 500],
  stockActual: [-1e6, 1e7], stockMinimo: [0, 1e7],
  // tiempos (minutos)
  tiempoPrepMin: [0, 1440], tiempoPrepDefecto: [0, 1440], tiempoEstimadoMin: [0, 1440],
  // geografía
  lat: [-90, 90], lng: [-180, 180], radioKm: [0, 500],
  // otros
  estrellas: [1, 5], col: [0, 1000], row: [0, 1000],
}

// Largo máximo de textos por nombre de campo (el resto: 300)
const LARGO_TEXTO = {
  descripcion: 2000, comentario: 2000, notas: 2000,
  imagen: 1000, logo: 1000, portada: 1000, fondoImagen: 1000,
}
const LARGO_DEFAULT = 300

// Cantidad máxima de elementos en listas
const LARGO_LISTA = { pushSuscripciones: 50, permisos: 200 }
const LISTA_DEFAULT = 500

const msgMin = (min) => `El valor de "{PATH}" no puede ser menor a ${min}`
const msgMax = (max) => `El valor de "{PATH}" supera el máximo permitido (${max.toLocaleString('es-AR')})`

function limitesGlobales(schema) {
  schema.eachPath((path, tipo) => {
    const campo = path.split('.').pop()
    if (campo === '__v' || campo === '_id') return

    if (tipo.instance === 'Number') {
      const [min, max] = REGLAS_NUMERO[campo] || [-MAX_GENERAL, MAX_GENERAL]
      // Respeta un min/max que el modelo ya tenga definido
      if (!tipo.validators.some(v => v.type === 'min')) tipo.min(min, msgMin(min))
      if (!tipo.validators.some(v => v.type === 'max')) tipo.max(max, msgMax(max))
    }

    if (tipo.instance === 'String' && !tipo.validators.some(v => v.type === 'maxlength')) {
      const largo = LARGO_TEXTO[campo] || LARGO_DEFAULT
      tipo.maxlength(largo, `"{PATH}" es demasiado largo (máximo ${largo} caracteres)`)
    }

    if (tipo.instance === 'Array') {
      const max = LARGO_LISTA[campo] || LISTA_DEFAULT
      tipo.validate({
        validator: (v) => !Array.isArray(v) || v.length <= max,
        message: `"{PATH}" tiene demasiados elementos (máximo ${max})`,
      })
    }
  })
}

mongoose.plugin(limitesGlobales)

module.exports = { REGLAS_NUMERO, LARGO_TEXTO }
