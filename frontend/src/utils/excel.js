// Exporta una tabla a un archivo de Excel real (.xlsx), sin librerías externas.
// A diferencia del CSV, el .xlsx guarda el ancho de cada columna, el formato de las fechas
// y de los montos, y los títulos en negrita: Excel lo abre listo para leer.
//
// columnas: [{ titulo, tipo: 'texto' | 'numero' | 'id' | 'moneda' | 'fecha' | 'fechaHora', ancho? }]
// filas:    arrays de valores. Las fechas pueden venir como Date o como "dd/mm/aaaa [hh:mm]".

// Caracteres de control que no admite XML (todo lo menor a un espacio salvo tab y saltos de línea)
const sinControl = s => [...s].filter(c => c >= ' ' || c === '\t' || c === '\n' || c === '\r').join('')
const esc = s => sinControl(String(s ?? ''))
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// "dd/mm/aaaa hh:mm" o Date → número de serie de Excel (días desde 30/12/1899)
function serialExcel(v) {
  let y, m, d, hh, mm
  if (v instanceof Date && !isNaN(v)) { y = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate(); hh = v.getHours(); mm = v.getMinutes() }
  else {
    const x = String(v ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
    if (!x) return null
    d = +x[1]; m = +x[2]; y = +x[3]; hh = +(x[4] || 0); mm = +(x[5] || 0)
  }
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000 + (hh * 60 + mm) / 1440
}

const letraCol = i => { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26) } return s }

// Estilos (índices de cellXfs en styles.xml)
const ESTILO = { texto: 0, titulo: 1, fecha: 2, fechaHora: 3, moneda: 4, numero: 5 }
const ANCHO_DEFECTO = { texto: 18, fecha: 12, fechaHora: 17, moneda: 14, numero: 10 }

function hojaXml(columnas, filas) {
  const cols = columnas.map((c, i) => {
    const largoMax = Math.max(c.titulo.length, ...filas.slice(0, 500).map(f => String(f[i] ?? '').length))
    const ancho = c.ancho ?? Math.min(60, Math.max(ANCHO_DEFECTO[c.tipo] ?? 12, largoMax + 2))
    return `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`
  }).join('')
  const celda = (ref, v, tipo) => {
    if (v === null || v === undefined || v === '') return ''
    if (tipo === 'fecha' || tipo === 'fechaHora') {
      const s = serialExcel(v)
      if (s != null) return `<c r="${ref}" s="${ESTILO[tipo]}"><v>${tipo === 'fecha' ? Math.floor(s) : s}</v></c>`
    }
    // "id": número sin separador de miles (p. ej. el número de venta)
    if (tipo === 'id' && isFinite(Number(v))) return `<c r="${ref}"><v>${Number(v)}</v></c>`
    if ((tipo === 'moneda' || tipo === 'numero') && v !== '' && isFinite(Number(v))) {
      return `<c r="${ref}" s="${ESTILO[tipo]}"><v>${Number(v)}</v></c>`
    }
    return `<c r="${ref}" t="inlineStr" s="${ESTILO.texto}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
  }
  const encabezado = `<row r="1">${columnas.map((c, i) => `<c r="${letraCol(i)}1" t="inlineStr" s="${ESTILO.titulo}"><is><t>${esc(c.titulo)}</t></is></c>`).join('')}</row>`
  const cuerpo = filas.map((f, j) => `<row r="${j + 2}">${columnas.map((c, i) => celda(`${letraCol(i)}${j + 2}`, f[i], c.tipo)).join('')}</row>`).join('')
  const ultima = `${letraCol(columnas.length - 1)}${filas.length + 1}`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols><sheetData>${encabezado}${cuerpo}</sheetData>
${filas.length ? `<autoFilter ref="A1:${ultima}"/>` : ''}</worksheet>`
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="166" formatCode="&quot;$&quot;\\ #,##0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1A1A2E"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

function archivos(nombreHoja, columnas, filas) {
  const hoja = esc(String(nombreHoja || 'Datos').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))
  return [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${hoja}" sheetId="1" r:id="rId1"/></sheets>${filas.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${hoja.replace(/'/g, "''")}'!$A$1:$${letraCol(columnas.length - 1)}$${filas.length + 1}</definedName></definedNames>` : ''}</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', ESTILOS],
    ['xl/worksheets/sheet1.xml', hojaXml(columnas, filas)],
  ]
}

// ── ZIP mínimo (sin compresión, "stored"), suficiente para un .xlsx ──────────
const TABLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
const crc32 = bytes => { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0 }

function zip(entradas) {
  const enc = new TextEncoder()
  const partes = [], central = []
  let offset = 0
  for (const [nombre, contenido] of entradas) {
    const n = enc.encode(nombre), datos = enc.encode(contenido), crc = crc32(datos)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true)  // UTF-8
    local.setUint16(8, 0, true); local.setUint32(14, crc, true)
    local.setUint32(18, datos.length, true); local.setUint32(22, datos.length, true); local.setUint16(26, n.length, true)
    partes.push(new Uint8Array(local.buffer), n, datos)
    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true)
    cen.setUint32(16, crc, true); cen.setUint32(20, datos.length, true); cen.setUint32(24, datos.length, true)
    cen.setUint16(28, n.length, true); cen.setUint32(42, offset, true)
    central.push(new Uint8Array(cen.buffer), n)
    offset += 30 + n.length + datos.length
  }
  const tamCentral = central.reduce((a, b) => a + b.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, entradas.length, true); fin.setUint16(10, entradas.length, true)
  fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true)
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function descargarExcel(nombreArchivo, nombreHoja, columnas, filas) {
  const blob = zip(archivos(nombreHoja, columnas, filas))
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Para pruebas
export const _interno = { archivos, zip, serialExcel }
