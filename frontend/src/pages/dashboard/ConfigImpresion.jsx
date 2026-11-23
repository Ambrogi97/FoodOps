import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { configService } from '../../services/api'
import {
  CONFIG_IMPRESION_DEFAULT, actualizarCacheImpresion,
  imprimirPruebaComanda, imprimirPruebaTicket,
} from '../../utils/impresion'

function Interruptor({ checked, onChange }) {
  return (
    <label className="cfg-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="cfg-toggle-track"><span className="cfg-toggle-thumb" /></span>
    </label>
  )
}

export default function ConfigImpresion() {
  const [cfg, setCfg]           = useState(CONFIG_IMPRESION_DEFAULT)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuard]   = useState(false)
  const [msg, setMsg]           = useState({ tipo: '', texto: '' })

  useEffect(() => {
    configService.getImpresion()
      .then(c => setCfg({ ...CONFIG_IMPRESION_DEFAULT, ...c }))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const set = (campo, valor) => setCfg(c => ({ ...c, [campo]: valor }))

  const guardar = async (e) => {
    e?.preventDefault()
    setGuard(true); setMsg({ tipo: '', texto: '' })
    try {
      const guardada = await configService.saveImpresion(cfg)
      actualizarCacheImpresion(guardada)
      setCfg({ ...CONFIG_IMPRESION_DEFAULT, ...guardada })
      setMsg({ tipo: 'ok', texto: 'Configuración guardada' })
    } catch (err) {
      setMsg({ tipo: 'err', texto: err.message })
    } finally {
      setGuard(false)
    }
  }

  // Las pruebas usan lo que está en pantalla, aunque todavía no se haya guardado
  const probar = (fn) => { actualizarCacheImpresion(cfg); fn() }

  if (cargando) return <p className="cfg-loading">Cargando...</p>

  return (
    <form onSubmit={guardar} className="cfg-form" style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="cfg-form-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 className="cfg-section-heading">Impresora</h3>
        <p className="cfg-section-desc">
          FoodOps imprime dos tipos de papel: la <strong>comanda</strong> (para cocina y barra, sin precios y con letra grande)
          y el <strong>ticket</strong> (para el cliente o el cadete, con precios y total).
        </p>
        <div className="cfg-field">
          <label>Ancho del papel</label>
          <select className="cfg-input" value={cfg.anchoPapel} onChange={e => set('anchoPapel', Number(e.target.value))}>
            <option value={80}>80 mm (comandera estándar)</option>
            <option value={58}>58 mm (comandera chica)</option>
          </select>
        </div>
        <p className="cfg-section-desc">
          Si la comanda sale con letra chica o con textos pegados, la comandera está instalada en Windows con el
          controlador <strong>"Genérico / Solo texto"</strong>: instalá el controlador del fabricante para que se respete el formato.
        </p>
      </div>

      <div className="cfg-form-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 className="cfg-section-heading">Comanda (cocina y barra)</h3>
        <p className="cfg-section-desc">Sin precios: arriba el origen, la fecha y el área en letra chica, y abajo los productos en letra grande.</p>
        <div className="cfg-field">
          <label>Tamaño de letra de los productos</label>
          <select className="cfg-input" value={cfg.comandaTamano} onChange={e => set('comandaTamano', e.target.value)}>
            <option value="normal">Normal</option>
            <option value="grande">Grande</option>
            <option value="muy-grande">Muy grande</option>
          </select>
        </div>
        <div className="cfg-field">
          <label>Área (Cocina / Barra)</label>
          <select className="cfg-input" value={cfg.comandaArea} onChange={e => set('comandaArea', e.target.value)}>
            <option value="texto">Debajo de la fecha, en letra chica</option>
            <option value="recuadro">En un recuadro destacado</option>
            <option value="oculto">No mostrar</option>
          </select>
        </div>
        <div className="cfg-check-row">
          <label>Mostrar el número de venta</label>
          <Interruptor checked={cfg.comandaNumero} onChange={v => set('comandaNumero', v)} />
        </div>
        <div className="cfg-check-row">
          <label>Mostrar cliente, personas de la mesa y datos de entrega</label>
          <Interruptor checked={cfg.comandaCliente} onChange={v => set('comandaCliente', v)} />
        </div>
        <div className="cfg-check-row">
          <label>Separar por área: una comanda para Cocina y otra para Barra</label>
          <Interruptor checked={cfg.comandaPorArea} onChange={v => set('comandaPorArea', v)} />
        </div>
        <p className="cfg-section-desc">
          El área de cada producto se elige en <strong>Productos → Categorías</strong> (o en cada producto). Si no tiene, va a Cocina.
        </p>
        <div className="cfg-check-row">
          <label>Imprimir la comanda automáticamente al crear o guardar un pedido (Mostrador y Delivery)</label>
          <Interruptor checked={cfg.comandaAlGuardar} onChange={v => set('comandaAlGuardar', v)} />
        </div>
        <div className="cfg-field">
          <label>Copias de cada comanda</label>
          <select className="cfg-input" value={cfg.copiasComanda} onChange={e => set('copiasComanda', Number(e.target.value))}>
            {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <button type="button" className="cfg-btn-dark" onClick={() => probar(imprimirPruebaComanda)}>
            <Printer size={14} /> Probar comanda
          </button>
        </div>
      </div>

      <div className="cfg-form-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 className="cfg-section-heading">Ticket (cliente y cadete)</h3>
        <div className="cfg-field">
          <label>Tamaño de letra</label>
          <select className="cfg-input" value={cfg.ticketTamano} onChange={e => set('ticketTamano', e.target.value)}>
            <option value="normal">Normal</option>
            <option value="grande">Grande</option>
          </select>
        </div>
        <div className="cfg-field">
          <label>Encabezado</label>
          <input className="cfg-input" maxLength={60} placeholder="Si lo dejás vacío, se usa el nombre del restaurante"
            value={cfg.encabezado} onChange={e => set('encabezado', e.target.value)} />
        </div>
        <div className="cfg-field">
          <label>Datos del local</label>
          <textarea className="cfg-input" rows={2} maxLength={200} placeholder="Dirección, teléfono, CUIT…"
            value={cfg.datosLocal} onChange={e => set('datosLocal', e.target.value)} />
        </div>
        <div className="cfg-field">
          <label>Leyenda</label>
          <input className="cfg-input" maxLength={120} value={cfg.leyenda} onChange={e => set('leyenda', e.target.value)} />
        </div>
        <div className="cfg-field">
          <label>Mensaje al pie</label>
          <input className="cfg-input" maxLength={120} value={cfg.pie} onChange={e => set('pie', e.target.value)} />
        </div>
        <div className="cfg-field">
          <label>Copias del ticket</label>
          <select className="cfg-input" value={cfg.copiasTicket} onChange={e => set('copiasTicket', Number(e.target.value))}>
            {[1, 2, 3].map(n => <option key={n} value={n}>{n === 2 ? '2 (cliente y cadete)' : n}</option>)}
          </select>
        </div>
        <div>
          <button type="button" className="cfg-btn-dark" onClick={() => probar(imprimirPruebaTicket)}>
            <Printer size={14} /> Probar ticket
          </button>
        </div>
      </div>

      <div className="cfg-form-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 className="cfg-section-heading">Imprimir sin ventana de confirmación</h3>
        <p className="cfg-section-desc">
          Por seguridad, el navegador siempre pregunta antes de imprimir. Para que salga directo por la comandera:
        </p>
        <ol className="cfg-section-desc" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>En la computadora del local, configurá la comandera como <strong>impresora predeterminada</strong> de Windows.</li>
          <li>Creá un acceso directo a Chrome y en <em>Destino</em> agregá al final: <code>--kiosk-printing</code></li>
          <li>Abrí FoodOps desde ese acceso directo: las comandas y tickets se imprimen al instante.</li>
        </ol>
      </div>

      {msg.texto && (
        <p className={msg.tipo === 'err' ? 'cfg-err' : ''} style={msg.tipo === 'ok' ? { color: '#16a34a', fontSize: '0.85rem', margin: 0 } : undefined}>{msg.texto}</p>
      )}
      <div>
        <button type="submit" className="cfg-btn-save" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  )
}
