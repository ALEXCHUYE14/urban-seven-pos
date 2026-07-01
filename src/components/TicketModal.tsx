import Modal from './Modal'
import { TIENDA } from '../lib/constants'
import { money, fechaLarga, folio } from '../utils/format'
import { generarTicketPDF } from '../utils/pdf'
import type { TicketData } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  ticket: TicketData | null
}

/* ─────────────────────────────────────────────────────────────────────────────
   Genera el HTML completo del ticket para impresora térmica 80mm.
   Sin <script> interno — React gestiona la llamada a print() desde el iframe.
───────────────────────────────────────────────────────────────────────────── */
function buildTicketHTML(t: TicketData): string {
  const fol   = folio(t.correlativo)
  const fecha = fechaLarga(t.fecha)

  const itemsHTML = t.items.map(({ producto, cantidad }) => `
    <tr>
      <td>
        <b>${cantidad}&times;</b>&nbsp;${producto.nombre}
        <div class="sub">${producto.talla}&nbsp;&middot;&nbsp;${producto.color}&nbsp;&middot;&nbsp;${money(producto.precio_venta)}&nbsp;c/u</div>
      </td>
      <td class="r"><b>${money(producto.precio_venta * cantidad)}</b></td>
    </tr>`).join('')

  const descHTML = (t.descuento_pct && t.descuento_pct > 0)
    ? `<div class="row g"><span>Descuento (${t.descuento_pct}%)</span><span>&minus;&nbsp;${money(t.descuento_monto ?? 0)}</span></div>`
    : ''

  const cajeroHTML = t.cajero
    ? `<div class="row"><span class="d">Cajero</span><span>${t.cajero}</span></div>`
    : ''

  const reciboHTML = t.monto_recibido != null
    ? `<div class="row"><span class="d">Recibido</span><span>${money(t.monto_recibido)}</span></div>`
    : ''

  const vueltoHTML = t.vuelto != null
    ? `<div class="row"><span class="d">Vuelto</span><span><b>${money(t.vuelto)}</b></span></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ticket ${fol}</title>
<style>
  /* ── Reset absoluto: quita todo margen del navegador ── */
  @page {
    size: 80mm auto;
    margin: 0mm 0mm 0mm 0mm;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    width: 80mm;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    width: 80mm;
    margin: 0 !important;
    padding: 0 !important;
    /* Arial rinde mejor que Courier en térmicas: bordes más definidos */
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.45;
    color: #000;
    background: #fff;
  }

  /* ══ Contenedor principal ══ */
  .tk { padding: 3mm 3.5mm 5mm; }

  /* ══ Cabecera ══ */
  .hd { text-align: center; padding-bottom: 2.5mm; }
  .brand {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 23px;
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 1;
    margin-bottom: 1.5mm;
  }
  .addr { font-size: 9.5px; color: #444; line-height: 1.4; }
  .doctype {
    display: inline-block;
    margin-top: 2mm;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    border: 1.5px solid #000;
    padding: 0.8mm 3mm;
  }

  /* ══ Número de folio ══ */
  .folio { text-align: center; padding: 2mm 0; }
  .folio-lbl { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 2.5px; }
  .folio-num {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 21px;
    font-weight: 900;
    letter-spacing: 4px;
    line-height: 1.15;
  }

  /* ══ Separadores ══ */
  .dash  { border: none; border-top: 1px dashed #aaa; margin: 2mm 0; }
  .solid { border: none; border-top: 2px solid #000; margin: 1mm 0; }

  /* ══ Filas clave → valor ══ */
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 4px;
    padding: 0.9mm 0;
    font-size: 10.5px;
  }
  .d { color: #555; }
  .g { color: #1a6e38; font-weight: 700; }

  /* ══ Tabla de productos ══ */
  table  { width: 100%; border-collapse: collapse; margin: 1mm 0 0.5mm; }
  th {
    font-size: 9px;
    font-weight: 700;
    text-align: left;
    padding-bottom: 2.5px;
    border-bottom: 2px solid #000;
  }
  th:last-child { text-align: right; }
  td { font-size: 10.5px; vertical-align: top; padding: 2.5px 0; line-height: 1.4; }
  td.r { text-align: right; white-space: nowrap; padding-left: 5px; }
  .sub { font-size: 9px; color: #666; margin-top: 0.8mm; }

  /* ══ Bloque de totales ══ */
  .totals { margin: 0.5mm 0 1mm; }
  .row-sm { display: flex; justify-content: space-between; font-size: 10.5px; padding: 0.8mm 0; }
  .row-sm .d { color: #555; }
  .total-big {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-top: 2.5px solid #000;
    padding-top: 2.5mm;
    margin-top: 1.5mm;
  }
  .total-big .lbl {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 14px;
    font-weight: 900;
  }
  .total-big .amt {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 23px;
    font-weight: 900;
  }

  /* ══ Método de pago ══ */
  .pay {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 12px;
    font-weight: 900;
  }

  /* ══ Pie de página ══ */
  .footer { text-align: center; padding-top: 2.5mm; border-top: 1px dashed #bbb; margin-top: 3mm; }
  .thanks {
    font-family: 'Arial Black', Arial, sans-serif;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.5px;
  }
  .policy { font-size: 8.5px; color: #444; margin: 1.5mm 0 1mm; line-height: 1.55; }
  .bfooter { font-size: 7.5px; color: #bbb; letter-spacing: 5px; margin-top: 2mm; }
  .cut { text-align: center; font-size: 8px; color: #ccc; letter-spacing: 5px; margin-top: 4mm; }
</style>
</head>
<body>
<div class="tk">

  <div class="hd">
    <div class="brand">URBAN SEVEN</div>
    <div class="addr">${TIENDA.direccion}</div>
    <div><span class="doctype">Boleta de venta interna</span></div>
  </div>

  <hr class="dash">

  <div class="folio">
    <div class="folio-lbl">N&ordm;&nbsp;de&nbsp;ticket</div>
    <div class="folio-num">${fol}</div>
  </div>

  <hr class="dash">

  <div class="row"><span class="d">Fecha</span><span><b>${fecha}</b></span></div>
  ${cajeroHTML}

  <hr class="dash">

  <table>
    <thead>
      <tr>
        <th>Descripci&oacute;n</th>
        <th style="text-align:right">Importe</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="totals">
    <hr class="solid">
    <div class="row-sm"><span class="d">Op.&nbsp;gravada</span><span>${money(t.subtotal)}</span></div>
    <div class="row-sm"><span class="d">IGV&nbsp;(18%)</span><span>${money(t.igv)}</span></div>
    ${descHTML}
    <div class="total-big">
      <span class="lbl">TOTAL</span>
      <span class="amt">${money(t.total)}</span>
    </div>
  </div>

  <hr class="dash">

  <div class="row">
    <span class="d">Forma&nbsp;de&nbsp;pago</span>
    <span class="pay">${t.metodo_pago.toUpperCase()}</span>
  </div>
  ${reciboHTML}
  ${vueltoHTML}

  <div class="footer">
    <div class="thanks">&iexcl;GRACIAS&nbsp;POR&nbsp;TU&nbsp;COMPRA!</div>
    <div class="policy">
      Cambios dentro de 7 d&iacute;as con este ticket.<br>
      Solo aplica para productos sin uso.
    </div>
    <div class="bfooter">URBAN&nbsp;&middot;&nbsp;SEVEN&nbsp;&middot;&nbsp;07</div>
  </div>

  <div class="cut">&#8213;&nbsp;&#8213;&nbsp;&#8213;&nbsp;&#8213;&nbsp;&#8213;&nbsp;&#8213;</div>

</div>
</body>
</html>`
}

/* ─────────────────────────────────────────────────────────────────────────────
   Imprime el ticket usando un iframe oculto de ancho exacto 80mm.
   Flujo:
     1. Se crea el iframe (width = 302px ≈ 80mm a 96dpi).
     2. Se escribe el HTML del ticket.
     3. En onload, se fuerza width:80mm y se espera un requestAnimationFrame
        para que el navegador haya recalculado el layout completo.
     4. Se mide documentElement.scrollHeight (más fiable que body.scrollHeight).
     5. Se inyecta @page con el tamaño exacto en mm → sin espacio sobrante.
     6. Se llama print() 500ms después (margen para que el @page se aplique).
───────────────────────────────────────────────────────────────────────────── */
const FRAME_ID   = '__urban7_print_frame'
const PX_PER_MM  = 3.7795275591  // 96dpi estándar CSS

function imprimirTicket(ticket: TicketData) {
  document.getElementById(FRAME_ID)?.remove()

  const frame = document.createElement('iframe')
  frame.id    = FRAME_ID
  frame.setAttribute('title', 'Impresión de ticket')
  // Oculto, ancho exacto 80mm en px para layout correcto, fuera del viewport
  frame.style.cssText = [
    'position:fixed', 'right:0', 'bottom:0',
    'width:302px',   // 80mm a 96dpi — necesario para el layout del ticket
    'height:1px',
    'border:none',
    'opacity:0',
    'pointer-events:none',
    'z-index:-9999',
    'overflow:hidden'
  ].join(';')

  frame.onload = () => {
    const doc  = frame.contentDocument
    const body = doc?.body
    const html = doc?.documentElement
    if (!doc || !body || !html) return

    // Elimina cualquier margen residual del navegador en html + body
    html.style.cssText += ';margin:0!important;padding:0!important;width:80mm!important;'
    body.style.cssText += ';margin:0!important;padding:0!important;width:80mm!important;'

    // requestAnimationFrame asegura que el reflow terminó antes de medir
    requestAnimationFrame(() => {
      // scrollHeight del documentElement es la medida más confiable
      const heightPx = Math.max(html.scrollHeight, body.scrollHeight, body.offsetHeight)
      // +2mm de seguridad para evitar corte al final
      const heightMm = Math.ceil(heightPx / PX_PER_MM) + 2

      // Inyecta @page con tamaño exacto DESPUÉS de medir → sin espacio sobrante
      const st = doc.createElement('style')
      st.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0mm 0mm 0mm 0mm; }`
      doc.head.appendChild(st)

      // 500ms para que el browser aplique el nuevo @page antes de imprimir
      setTimeout(() => {
        try {
          frame.contentWindow?.focus()
          frame.contentWindow?.print()
        } catch { /* usuario canceló o bloqueó popup */ }
        setTimeout(() => document.getElementById(FRAME_ID)?.remove(), 4000)
      }, 500)
    })
  }

  document.body.appendChild(frame)

  // Escribir HTML → dispara el evento 'load' del iframe
  const doc = frame.contentDocument!
  doc.open()
  doc.write(buildTicketHTML(ticket))
  doc.close()
}

/* ─────────────────────────────────────────────────────────────────────────────
   Componente modal del ticket
───────────────────────────────────────────────────────────────────────────── */
export default function TicketModal({ open, onClose, ticket }: Props) {
  if (!ticket) return null

  return (
    <Modal open={open} onClose={onClose} title="Venta registrada" maxW="max-w-sm">
      <div className="space-y-4">

        {/* ── Vista previa en pantalla ── */}
        <div
          id="print-area"
          className="ticket-80 mx-auto rounded-lg overflow-hidden"
          style={{ maxWidth: '100%', boxShadow: '0 2px 16px -4px rgba(0,0,0,0.18)' }}
        >
          {/* Cabecera */}
          <div className="t-center">
            <TicketLogo />
            <div className="t-brand">{TIENDA.nombre}</div>
            <div className="t-small">{TIENDA.direccion}</div>
            <div className="t-small" style={{ marginTop: 3, fontWeight: 700, fontSize: 9 }}>
              Boleta de venta interna
            </div>
          </div>

          {/* Folio */}
          <div className="t-center" style={{ margin: '6px 0 4px' }}>
            <div style={{ fontSize: 7.5, color: '#999', textTransform: 'uppercase', letterSpacing: 2 }}>
              N° de ticket
            </div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 3 }}>
              {folio(ticket.correlativo)}
            </div>
          </div>

          <hr className="t-hr" />

          <div className="t-row t-small">
            <span style={{ color: '#888' }}>Fecha</span>
            <span className="t-bold">{fechaLarga(ticket.fecha)}</span>
          </div>
          {ticket.cajero && (
            <div className="t-row t-small">
              <span style={{ color: '#888' }}>Cajero</span>
              <span>{ticket.cajero}</span>
            </div>
          )}

          <hr className="t-hr" />

          {/* Productos */}
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {ticket.items.map(({ producto, cantidad }) => (
                <tr key={producto.id}>
                  <td>
                    <span className="t-bold">{cantidad}×</span> {producto.nombre}
                    <div className="t-small" style={{ color: '#777' }}>
                      {producto.talla} · {producto.color} · {money(producto.precio_venta)} c/u
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="t-bold">{money(producto.precio_venta * cantidad)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <hr className="t-hr" style={{ borderTopStyle: 'solid', borderTopWidth: 2, borderTopColor: '#000' }} />
          <div className="t-row t-small">
            <span style={{ color: '#777' }}>Op. gravada</span>
            <span>{money(ticket.subtotal)}</span>
          </div>
          <div className="t-row t-small">
            <span style={{ color: '#777' }}>IGV (18%)</span>
            <span>{money(ticket.igv)}</span>
          </div>
          {ticket.descuento_pct != null && ticket.descuento_pct > 0 && (
            <div className="t-row t-small" style={{ color: '#1a6e38', fontWeight: 700 }}>
              <span>Descuento ({ticket.descuento_pct}%)</span>
              <span>− {money(ticket.descuento_monto ?? 0)}</span>
            </div>
          )}
          <div className="t-row" style={{
            fontSize: 15, fontWeight: 900, marginTop: 5, paddingTop: 5,
            borderTop: '2.5px solid #000', fontFamily: "'Archivo', sans-serif"
          }}>
            <span>TOTAL</span>
            <span>{money(ticket.total)}</span>
          </div>

          {/* Pago */}
          <hr className="t-hr" />
          <div className="t-row t-small">
            <span style={{ color: '#777' }}>Forma de pago</span>
            <span className="t-bold" style={{ fontSize: 11 }}>{ticket.metodo_pago.toUpperCase()}</span>
          </div>
          {ticket.monto_recibido != null && (
            <div className="t-row t-small">
              <span style={{ color: '#777' }}>Recibido</span>
              <span>{money(ticket.monto_recibido)}</span>
            </div>
          )}
          {ticket.vuelto != null && (
            <div className="t-row t-small">
              <span style={{ color: '#777' }}>Vuelto</span>
              <span className="t-bold">{money(ticket.vuelto)}</span>
            </div>
          )}

          {/* Footer */}
          <hr className="t-hr" />
          <div className="t-center t-small" style={{ paddingBottom: 6 }}>
            <div className="t-bold" style={{ fontSize: 11, letterSpacing: 0.5 }}>
              ¡GRACIAS POR TU COMPRA!
            </div>
            <div style={{ marginTop: 3, color: '#666', lineHeight: 1.5, fontSize: 8.5 }}>
              Cambios dentro de 7 días con este ticket.<br />
              Solo aplica para productos sin uso.
            </div>
            <div style={{ marginTop: 6, letterSpacing: 5, fontSize: 7.5, color: '#bbb' }}>
              URBAN · SEVEN · 07
            </div>
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => imprimirTicket(ticket)} className="btn-primary gap-2">
            <PrinterIcon /> Imprimir 80mm
          </button>
          <button onClick={() => generarTicketPDF(ticket)} className="btn-ghost gap-2">
            <PdfIcon /> Ticket PDF
          </button>
        </div>
        <button onClick={onClose} className="btn-ghost w-full">Nueva venta</button>
      </div>
    </Modal>
  )
}

/* ── Sub-componentes ── */
function TicketLogo() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
      <img
        src={TIENDA.logo}
        alt={TIENDA.nombre}
        className="t-logo"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

function PrinterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </svg>
  )
}
function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 15h6M9 11h3" />
    </svg>
  )
}
