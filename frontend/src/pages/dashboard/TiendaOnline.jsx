import { useState, useEffect, useRef } from 'react'
import { Plus, X, Check, Trash2, ImagePlus, RotateCcw } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { configService } from '../../services/api'
import './TiendaOnline.css'

const DIAS_LABELS = {
  dom: 'Dom', lun: 'Lun', mar: 'Mar', mie: 'Mié',
  jue: 'Jue', vie: 'Vie', sab: 'Sáb',
}

const DIAS_DEFAULT = ['dom','lun','mar','mie','jue','vie','sab'].map(dia => ({
  dia,
  habilitado: true,
  franjas: [{ desde: '00:00', hasta: '23:59' }],
}))

const SECCION_DEFAULT = { habilitado: false, horarios: DIAS_DEFAULT }

// ── Sub-componente: bloque de horarios por sección ────────────────────────────
function SeccionHorarios({ titulo, label, seccion, onChange, onToggle, showCostoEnvio }) {
  const disabled = !seccion.habilitado

  const toggleSeccion = () => {
    const next = { ...seccion, habilitado: !seccion.habilitado }
    onChange(next)
    onToggle?.(next)
  }

  const toggleDia = (i) => {
    const horarios = seccion.horarios.map((d, idx) =>
      idx === i ? { ...d, habilitado: !d.habilitado } : d
    )
    const next = { ...seccion, horarios }
    onChange(next)
    onToggle?.(next)
  }

  const setFranja = (diaIdx, franjaIdx, campo, valor) => {
    const horarios = seccion.horarios.map((d, i) => {
      if (i !== diaIdx) return d
      const franjas = d.franjas.map((f, j) => j === franjaIdx ? { ...f, [campo]: valor } : f)
      return { ...d, franjas }
    })
    onChange({ ...seccion, horarios })
  }

  const addFranja = (diaIdx) => {
    const horarios = seccion.horarios.map((d, i) =>
      i === diaIdx ? { ...d, franjas: [...d.franjas, { desde: '00:00', hasta: '23:59' }] } : d
    )
    onChange({ ...seccion, horarios })
  }

  const removeFranja = (diaIdx, franjaIdx) => {
    const horarios = seccion.horarios.map((d, i) => {
      if (i !== diaIdx) return d
      const franjas = d.franjas.filter((_, j) => j !== franjaIdx)
      return { ...d, franjas: franjas.length ? franjas : [{ desde: '00:00', hasta: '23:59' }] }
    })
    onChange({ ...seccion, horarios })
  }

  return (
    <div className="tienda-row">
      <div className="tienda-row-label">
        <span>{label}</span>
      </div>
      <div className="tienda-row-content">
        <h3 className="tienda-section-title">{titulo}</h3>
        <p className="tienda-section-desc">
          Al habilitar esta configuración, tu menú permitirá elegir la opción de{' '}
          {titulo.toLowerCase()}.<br />
          Los pedidos ingresarán a la sección de pedidos online.
        </p>

        {/* Toggle habilitar */}
        <label className="tienda-check-label tienda-check-label--seccion">
          <input
            type="checkbox"
            className="tienda-check"
            checked={seccion.habilitado}
            onChange={toggleSeccion}
          />
          <span>Habilitar</span>
        </label>

        {/* Costo de envío (solo Delivery) */}
        {showCostoEnvio && (
          <div className="tienda-costo-row">
            <label className="tienda-costo-label">Costo de envío</label>
            <input
              type="text"
              inputMode="numeric"
              className="tienda-costo-input"
              value={seccion.costoEnvio || ''}
              placeholder="0"
              disabled={disabled}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                onChange({ ...seccion, costoEnvio: val === '' ? 0 : Number(val) })
              }}
            />
          </div>
        )}

        {/* Grilla de días */}
        <div className={`tienda-dias ${disabled ? 'tienda-dias--disabled' : ''}`}>
          {seccion.horarios.map((dia, diaIdx) => (
            <div key={dia.dia} className="tienda-dia-group">
              {dia.franjas.map((franja, franjaIdx) => (
                <div key={franjaIdx} className="tienda-dia-row">
                  {franjaIdx === 0 ? (
                    <label className="tienda-dia-check">
                      <input
                        type="checkbox"
                        checked={dia.habilitado}
                        disabled={disabled}
                        onChange={() => toggleDia(diaIdx)}
                      />
                    </label>
                  ) : (
                    <span className="tienda-dia-check tienda-dia-check--spacer" />
                  )}

                  <span className={`tienda-dia-nombre ${(!dia.habilitado || disabled) ? 'tienda-dia-nombre--off' : ''}`}>
                    {franjaIdx === 0 ? DIAS_LABELS[dia.dia] : ''}
                  </span>

                  <input
                    type="time"
                    className={`tienda-time ${(!dia.habilitado || disabled) ? 'tienda-time--disabled' : ''}`}
                    value={franja.desde}
                    disabled={!dia.habilitado || disabled}
                    onChange={e => setFranja(diaIdx, franjaIdx, 'desde', e.target.value)}
                  />

                  <input
                    type="time"
                    className={`tienda-time ${(!dia.habilitado || disabled) ? 'tienda-time--disabled' : ''}`}
                    value={franja.hasta}
                    disabled={!dia.habilitado || disabled}
                    onChange={e => setFranja(diaIdx, franjaIdx, 'hasta', e.target.value)}
                  />

                  <button
                    className="tienda-btn-icon tienda-btn-remove"
                    onClick={() => removeFranja(diaIdx, franjaIdx)}
                    disabled={!dia.habilitado || disabled}
                    title="Eliminar franja"
                  >
                    <X size={14} />
                  </button>

                  {franjaIdx === dia.franjas.length - 1 ? (
                    <button
                      className="tienda-btn-icon tienda-btn-add"
                      onClick={() => addFranja(diaIdx)}
                      disabled={!dia.habilitado || disabled}
                      title="Agregar franja horaria"
                    >
                      <Plus size={14} />
                    </button>
                  ) : (
                    <span className="tienda-btn-icon tienda-btn-spacer" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helpers de recorte ────────────────────────────────────────────────────────
function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

async function getCroppedImg(imageSrc, cropPx) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width  = cropPx.width
  canvas.height = cropPx.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, cropPx.x, cropPx.y, cropPx.width, cropPx.height, 0, 0, cropPx.width, cropPx.height)
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92))
}

// ── Sub-componente: modal de recorte ─────────────────────────────────────────
function CropModal({ src, aspect, crop, zoom, onCropChange, onZoomChange, onCropComplete, onApply, onCancel, applying }) {
  return (
    <div className="crop-overlay">
      <div className="crop-modal">
        <div className="crop-header">
          <span>Ajustar imagen</span>
          <button className="crop-close" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="crop-area">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="crop-controls">
          <label className="crop-zoom-label">Zoom</label>
          <input
            type="range"
            className="crop-zoom-slider"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => onZoomChange(Number(e.target.value))}
          />
        </div>
        <div className="crop-footer">
          <button className="crop-btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="crop-btn-apply" onClick={onApply} disabled={applying}>
            {applying ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-componente: uploader de imagen ────────────────────────────────────────
function ImageUploader({ label, desc, previewClass, url, onUpload, onDelete, uploading, cropAspect }) {
  const inputRef = useRef()
  const [cropSrc, setCropSrc]   = useState(null)
  const [crop, setCrop]         = useState({ x: 0, y: 0 })
  const [zoom, setZoom]         = useState(1)
  const [cropPx, setCropPx]     = useState(null)
  const [applying, setApplying] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    if (cropAspect) {
      const reader = new FileReader()
      reader.onload = () => { setCropSrc(reader.result); setCrop({ x: 0, y: 0 }); setZoom(1) }
      reader.readAsDataURL(file)
    } else {
      onUpload(file)
    }
  }

  const handleApply = async () => {
    if (!cropPx) return
    setApplying(true)
    try {
      const blob = await getCroppedImg(cropSrc, cropPx)
      const file = new File([blob], 'imagen.jpg', { type: 'image/jpeg' })
      setCropSrc(null)
      onUpload(file)
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      {cropSrc && (
        <CropModal
          src={cropSrc}
          aspect={cropAspect}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, px) => setCropPx(px)}
          onApply={handleApply}
          onCancel={() => setCropSrc(null)}
          applying={applying}
        />
      )}
      <div className="tienda-row">
        <div className="tienda-row-label">
          <span>{label}</span>
        </div>
        <div className="tienda-row-content">
          <p className="tienda-section-desc">{desc}</p>

          {url && (
            <div className={`tienda-img-preview-wrap ${previewClass}`}>
              <img src={url} alt={label} className="tienda-img-preview" />
              <button className="tienda-img-delete" onClick={onDelete} title="Eliminar">
                <Trash2 size={15} />
              </button>
            </div>
          )}

          <div className="tienda-upload-row">
            <button
              className="tienda-btn-upload"
              onClick={() => inputRef.current.click()}
              disabled={uploading}
            >
              <ImagePlus size={15} />
              {uploading ? 'Subiendo…' : 'Seleccionar archivo'}
            </button>
            {!url && <span className="tienda-upload-hint">Sin archivo seleccionado</span>}
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
    </>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function TiendaOnline() {
  const [habilitado, setHabilitado] = useState(false)
  const [delivery, setDelivery]     = useState(SECCION_DEFAULT)
  const [retiro, setRetiro]         = useState(SECCION_DEFAULT)
  const [logo, setLogo]               = useState(null)
  const [portada, setPortada]         = useState(null)
  const [colorFondo, setColorFondo]   = useState('#f8fafc')
  const [fondoImagen, setFondoImagen] = useState(null)
  const [guardado, setGuardado]       = useState(false)
  const [subiendo, setSubiendo]       = useState({ logo: false, portada: false, fondoImagen: false })
  const [error, setError]           = useState(null)
  const cargado = useRef(false)

  useEffect(() => {
    configService.getTienda()
      .then(data => {
        setHabilitado(data.habilitado ?? false)
        setDelivery(data.delivery ?? SECCION_DEFAULT)
        setRetiro(data.retiro   ?? SECCION_DEFAULT)
        setLogo(data.logo             || null)
        setPortada(data.portada       || null)
        setColorFondo(data.colorFondo || '#f8fafc')
        setFondoImagen(data.fondoImagen || null)
        cargado.current = true
      })
      .catch(() => setError('No se pudo cargar la configuración'))
  }, [])

  // Guardado inmediato cuando se tilda/destilda un checkbox de sección o día
  // Cada función solo guarda su propia sección para no pisar la otra
  const guardarDelivery = async (newDelivery) => {
    try {
      await configService.saveTienda({ delivery: newDelivery })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 1500)
    } catch { setError('Error al guardar') }
  }
  const guardarRetiro = async (newRetiro) => {
    try {
      await configService.saveTienda({ retiro: newRetiro })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 1500)
    } catch { setError('Error al guardar') }
  }

  // Auto-guardado con debounce para cambios de horario (campos de hora)
  useEffect(() => {
    if (!cargado.current) return
    const t = setTimeout(async () => {
      try {
        await configService.saveTienda({ delivery, retiro })
        setGuardado(true)
        setTimeout(() => setGuardado(false), 1500)
      } catch {
        setError('Error al guardar')
      }
    }, 600)
    return () => clearTimeout(t)
  }, [delivery, retiro])

  const toggleHabilitado = async (valor) => {
    setHabilitado(valor)
    try {
      await configService.saveTienda({ habilitado: valor })
    } catch {
      setHabilitado(!valor)
      setError('Error al guardar')
    }
  }

  const guardarColorFondo = async (color) => {
    try {
      await configService.saveColorFondo(color)
    } catch {
      setError('Error al guardar el color de fondo')
    }
  }

  const handleUploadLogo = async (file) => {
    setSubiendo(s => ({ ...s, logo: true }))
    try { const res = await configService.uploadLogo(file); setLogo(res.url) }
    catch { setError('Error al subir el logo') }
    finally { setSubiendo(s => ({ ...s, logo: false })) }
  }

  const handleUploadPortada = async (file) => {
    setSubiendo(s => ({ ...s, portada: true }))
    try { const res = await configService.uploadPortada(file); setPortada(res.url) }
    catch { setError('Error al subir la portada') }
    finally { setSubiendo(s => ({ ...s, portada: false })) }
  }

  const handleUploadFondoImagen = async (file) => {
    setSubiendo(s => ({ ...s, fondoImagen: true }))
    try { const res = await configService.uploadFondoImagen(file); setFondoImagen(res.url) }
    catch { setError('Error al subir la imagen de fondo') }
    finally { setSubiendo(s => ({ ...s, fondoImagen: false })) }
  }

  return (
    <div className="tienda-wrap">

      {/* Habilitar tienda */}
      <div className="tienda-row">
        <div className="tienda-row-label"><span>TIENDA ONLINE</span></div>
        <div className="tienda-row-content">
          <h3 className="tienda-section-title">Habilitar tienda online</h3>
          <p className="tienda-section-desc">
            Al habilitar esta opción, tu menú estará disponible para recibir pedidos online.
          </p>
          <label className="tienda-check-label">
            <input type="checkbox" className="tienda-check" checked={habilitado}
              onChange={e => toggleHabilitado(e.target.checked)} />
            <span>Habilitar</span>
          </label>
        </div>
      </div>

      <div className="tienda-divider" />

      {/* Logo */}
      <ImageUploader
        label="LOGO"
        desc="Configurá el logo de tu local para mostrarlo en la parte superior de la Tienda Online."
        previewClass="tienda-img-preview-wrap--logo"
        url={logo}
        onUpload={handleUploadLogo}
        onDelete={async () => { await configService.deleteLogo(); setLogo(null) }}
        uploading={subiendo.logo}
        cropAspect={1}
      />

      <div className="tienda-divider" />

      {/* Portada */}
      <ImageUploader
        label="FOTO DE PORTADA"
        desc="Imagen de portada que se muestra en la parte superior de tu tienda online."
        previewClass="tienda-img-preview-wrap--portada"
        url={portada}
        onUpload={handleUploadPortada}
        onDelete={async () => { await configService.deletePortada(); setPortada(null) }}
        uploading={subiendo.portada}
        cropAspect={16/9}
      />

      <div className="tienda-divider" />

      {/* Color de fondo */}
      <div className="tienda-row">
        <div className="tienda-row-label"><span>FONDO DE LA CARTA</span></div>
        <div className="tienda-row-content">
          <h3 className="tienda-section-title">Color de fondo</h3>
          <p className="tienda-section-desc">
            Elegí el color de fondo que verán los clientes al abrir tu carta online.
          </p>
          <div className="tienda-color-row">
            <div className="tienda-color-preview" style={{ background: colorFondo }} />
            <input
              type="color"
              className="tienda-color-input"
              value={colorFondo}
              onChange={e => setColorFondo(e.target.value)}
              onBlur={e => guardarColorFondo(e.target.value)}
            />
            <button
              className="tienda-color-reset"
              onClick={() => { setColorFondo('#f8fafc'); guardarColorFondo('#f8fafc') }}
              title="Restablecer color por defecto"
            >
              <RotateCcw size={14} /> Restablecer
            </button>
          </div>
        </div>
      </div>

      <div className="tienda-divider" />

      {/* Imagen de fondo */}
      <ImageUploader
        label="IMAGEN DE FONDO"
        desc="Subí una imagen para usar como fondo de tu carta. Si hay imagen, tiene prioridad sobre el color."
        previewClass="tienda-img-preview-wrap--fondo"
        url={fondoImagen}
        onUpload={handleUploadFondoImagen}
        onDelete={async () => { await configService.deleteFondoImagen(); setFondoImagen(null) }}
        uploading={subiendo.fondoImagen}
      />

      <div className="tienda-divider" />

      {/* Delivery */}
      <SeccionHorarios
        label="DELIVERY"
        titulo="Habilitar delivery"
        seccion={delivery}
        onChange={setDelivery}
        onToggle={guardarDelivery}
        showCostoEnvio
      />

      <div className="tienda-divider" />

      {/* Retiro en el local */}
      <SeccionHorarios
        label="RETIRO EN LOCAL"
        titulo="Habilitar retiro en el local"
        seccion={retiro}
        onChange={setRetiro}
        onToggle={guardarRetiro}
      />

      {/* Indicador de guardado automático */}
      <div className="tienda-footer">
        {error && <span className="tienda-error">{error}</span>}
        {guardado && !error && (
          <span className="tienda-autosave"><Check size={13} /> Guardado</span>
        )}
      </div>

    </div>
  )
}
