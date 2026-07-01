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
   Genera un documento HTML autocontenido listo para impresora térmica 80mm.
   Se abre en ventana emergente separada del SPA para que @page size: 80mm auto
   calcule la altura real del ticket, sin que el DOM de la app interfiera.
───────────────────────────────────────────────────────────────────────────── */
function buildTicketHTML(t: TicketData): string {
  const fol   = folio(t.correlativo)
  const fecha = fechaLarga(t.fecha)

  const itemsHTML = t.items.map(({ producto, cantidad }) => `
    <tr>
      <td>
        <b>${cantidad}&times;</b> ${producto.nombre}
        <div class="sub">${producto.talla} &middot; ${producto.color} &middot; ${money(producto.precio_venta)} c/u</div>
      </td>
      <td class="r"><b>${money(producto.precio_venta * cantidad)}</b></td>
    </tr>`).join('')

  const descHTML = (t.descuento_pct && t.descuento_pct > 0)
    ? `<div class="row green"><span>Descuento (${t.descuento_pct}%)</span><span>- ${money(t.descuento_monto ?? 0)}</span></div>`
    : ''

  const cajeroHTML = t.cajero
    ? `<div class="row"><span class="dim">Cajero</span><span>${t.cajero}</span></div>`
    : ''

  const reciboHTML = t.monto_recibido != null
    ? `<div class="row"><span class="dim">Recibido</span><span>${money(t.monto_recibido)}</span></div>`
    : ''

  const vueltoHTML = t.vuelto != null
    ? `<div class="row"><span class="dim">Vuelto</span><span><b>${money(t.vuelto)}</b></span></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ticket N° ${fol}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; background: #fff; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    color: #000;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ticket { padding: 5mm 4mm 10mm; }

  /* ── Header ── */
  .hd { text-align: center; margin-bottom: 3mm; }
  .brand { font-family: Arial Black, Arial, sans-serif; font-size: 21px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
  .addr  { font-size: 8px; color: #555; margin-top: 1.5mm; line-height: 1.4; }
  .dtype { display: inline-block; margin-top: 2.5mm; font-size: 7.5px; font-weight: 700;
           letter-spacing: 0.8px; text-transform: uppercase; border: 1px solid #000; padding: 1mm 2.5mm; }

  /* ── Folio ── */
  .folio     { text-align: center; margin: 3mm 0; }
  .folio-lbl { font-size: 7px; color: #888; text-transform: uppercase; letter-spacing: 2px; }
  .folio-num { font-family: Arial Black, Arial, sans-serif; font-size: 18px; font-weight: 900; letter-spacing: 3px; }

  /* ── Separadores ── */
  .dash  { border: none; border-top: 1px dashed #aaa; margin: 3mm 0; }
  .solid { border: none; border-top: 2px solid #000; margin: 2mm 0; }

  /* ── Filas clave-valor ── */
  .row  { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; font-size: 9.5px; padding: 1mm 0; }
  .dim  { color: #555; }
  .green{ color: #1a7a3a; font-weight: 700; }

  /* ── Tabla de ítems ── */
  table { width: 100%; border-collapse: collapse; margin: 1.5mm 0; }
  th  { font-size: 8.5px; font-weight: 700; text-align: left; border-bottom: 2px solid #000; padding-bottom: 2.5px; }
  th:last-child { text-align: right; }
  td  { font-size: 9.5px; vertical-align: top; padding: 2.5px 0; line-height: 1.4; }
  td.r{ text-align: right; white-space: nowrap; padding-left: 6px; }
  .sub{ font-size: 7.5px; color: #666; margin-top: 0.5mm; }

  /* ── Totales ── */
  .total-block { margin: 0 0 2mm; }
  .row-sm { display: flex; justify-content: space-between; font-size: 9px; padding: 1mm 0; }
  .row-sm .dim { color: #555; }
  .total-big {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-top: 2.5mm; padding-top: 2.5mm; border-top: 2px solid #000;
  }
  .total-big .lbl { font-family: Arial Black, Arial, sans-serif; font-size: 14px; font-weight: 900; }
  .total-big .amt { font-family: Arial Black, Arial, sans-serif; font-size: 20px; font-weight: 900; }

  /* ── Pago ── */
  .pay-method { font-family: Arial Black, Arial, sans-serif; font-size: 12px; font-weight: 900; }

  /* ── Footer ── */
  .footer { text-align: center; margin-top: 4mm; padding-top: 3mm; border-top: 1px dashed #aaa; }
  .thanks { font-family: Arial Black, Arial, sans-serif; font-size: 12px; font-weight: 900; letter-spacing: 0.5px; }
  .policy { font-size: 8px; color: #555; margin: 2mm 0 1mm; line-height: 1.5; }
  .brand-f{ font-size: 7.5px; color: #aaa; letter-spacing: 4px; margin-top: 2.5mm; }
  .cut    { text-align: center; color: #ccc; font-size: 9px; letter-spacing: 4px; margin-top: 6mm; }
</style>
</head>
<body>
<div class="ticket">

  <div class="hd">
    <div class="brand">URBAN SEVEN</div>
    <div class="addr">${TIENDA.direccion}</div>
    <div><span class="dtype">Boleta de venta interna</span></div>
  </div>

  <hr class="dash">

  <div class="folio">
    <div class="folio-lbl">Nº de ticket</div>
    <div class="folio-num">${fol}</div>
  </div>

  <hr class="dash">

  <div class="row"><span class="dim">Fecha</span><span><b>${fecha}</b></span></div>
  ${cajeroHTML}

  <hr class="dash">

  <table>
    <thead><tr><th>Descripci&oacute;n</th><th style="text-align:right">Importe</th></tr></thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="total-block">
    <hr class="solid">
    <div class="row-sm"><span class="dim">Op. gravada</span><span>${money(t.subtotal)}</span></div>
    <div class="row-sm"><span class="dim">IGV (18%)</span><span>${money(t.igv)}</span></div>
    ${descHTML}
    <div class="total-big">
      <span class="lbl">TOTAL</span>
      <span class="amt">${money(t.total)}</span>
    </div>
  </div>

  <hr class="dash">

  <div class="row">
    <span class="dim">Forma de pago</span>
    <span class="pay-method">${t.metodo_pago.toUpperCase()}</span>
  </div>
  ${reciboHTML}
  ${vueltoHTML}

  <div class="footer">
    <div class="thanks">&iexcl;GRACIAS POR TU COMPRA!</div>
    <div class="policy">
      Cambios dentro de 7 d&iacute;as presentando este ticket.<br>
      Solo aplica para productos sin uso.
    </div>
    <div class="brand-f">URBAN &middot; SEVEN &middot; 07</div>
  </div>

  <div class="cut">- - - - - - - - - - - -</div>
</div>

<script>
  window.addEventListener('load', function () {
    setTimeout(function () {
      window.focus();
      window.print();
      setTimeout(function () { window.close(); }, 800);
    }, 250);
  });
</script>
</body>
</html>`
}

/* ─────────────────────────────────────────────────────────────────────────────
   Componente modal
───────────────────────────────────────────────────────────────────────────── */
export default function TicketModal({ open, onClose, ticket }: Props) {
  if (!ticket) return null

  const imprimir = () => {
    const html = buildTicketHTML(ticket)
    // Abre ventana del tamaño exacto del rollo 80mm (~302px a 96dpi)
    const win = window.open(
      '',
      '_blank',
      'width=340,height=640,scrollbars=no,menubar=no,toolbar=no,status=no,resizable=no,location=no'
    )
    if (!win) {
      // Popup bloqueado — usar window.print() como fallback
      window.print()
      return
    }
    win.document.write(html)
    win.document.close()
  }

  return (
    <Modal open={open} onClose={onClose} title="Venta registrada" maxW="max-w-sm">
      <div className="space-y-4">

        {/* ── Vista previa del ticket ── */}
        <div
          id="print-area"
          className="ticket-80 mx-auto rounded-lg shadow-card overflow-hidden"
          style={{ maxWidth: '100%' }}
        >
          {/* Cabecera */}
          <div className="t-center">
            <TicketLogo />
            <div className="t-brand">{TIENDA.nombre}</div>
            <div className="t-small">{TIENDA.direccion}</div>
            <div className="t-small" style={{ marginTop: 3, fontWeight: 700 }}>
              Boleta de venta interna
            </div>
          </div>

          {/* Folio */}
          <div className="t-center" style={{ margin: '6px 0 2px' }}>
            <div className="t-small" style={{ color: '#888', letterSpacing: '1.5px', textTransform: 'uppercase', fontSize: 8 }}>
              N° de ticket
            </div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: '2px' }}>
              {folio(ticket.correlativo)}
            </div>
          </div>

          <hr className="t-hr" />
          <div className="t-row t-small">
            <span className="t-bold">Fecha</span>
            <span>{fechaLarga(ticket.fecha)}</span>
          </div>
          {ticket.cajero && (
            <div className="t-row t-small">
              <span style={{ color: '#888' }}>Cajero</span>
              <span>{ticket.cajero}</span>
            </div>
          )}

          <hr className="t-hr" />
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
                    <div className="t-small" style={{ color: '#666' }}>
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
            <span style={{ color: '#666' }}>Op. gravada</span>
            <span>{money(ticket.subtotal)}</span>
          </div>
          <div className="t-row t-small">
            <span style={{ color: '#666' }}>IGV (18%)</span>
            <span>{money(ticket.igv)}</span>
          </div>
          {ticket.descuento_pct != null && ticket.descuento_pct > 0 && (
            <div className="t-row t-small" style={{ color: '#1a7a3a', fontWeight: 700 }}>
              <span>Descuento ({ticket.descuento_pct}%)</span>
              <span>- {money(ticket.descuento_monto ?? 0)}</span>
            </div>
          )}
          <div className="t-row" style={{ fontSize: 15, fontWeight: 900, marginTop: 5, paddingTop: 4, borderTop: '2px solid #000', fontFamily: "'Archivo', sans-serif" }}>
            <span>TOTAL</span>
            <span>{money(ticket.total)}</span>
          </div>

          {/* Pago */}
          <hr className="t-hr" />
          <div className="t-row t-small">
            <span style={{ color: '#666' }}>Forma de pago</span>
            <span className="t-bold" style={{ fontSize: 11 }}>{ticket.metodo_pago.toUpperCase()}</span>
          </div>
          {ticket.monto_recibido != null && (
            <div className="t-row t-small">
              <span style={{ color: '#666' }}>Recibido</span>
              <span>{money(ticket.monto_recibido)}</span>
            </div>
          )}
          {ticket.vuelto != null && (
            <div className="t-row t-small">
              <span style={{ color: '#666' }}>Vuelto</span>
              <span className="t-bold">{money(ticket.vuelto)}</span>
            </div>
          )}

          {/* Footer */}
          <hr className="t-hr" />
          <div className="t-center t-small" style={{ paddingBottom: 4 }}>
            <div className="t-bold" style={{ fontSize: 11, letterSpacing: 0.5 }}>¡GRACIAS POR TU COMPRA!</div>
            <div style={{ marginTop: 3, color: '#666', lineHeight: 1.5 }}>
              Cambios dentro de 7 días con este ticket.<br />
              Solo aplica para productos sin uso.
            </div>
            <div style={{ marginTop: 5, letterSpacing: 4, fontSize: 8, color: '#aaa' }}>
              URBAN · SEVEN · 07
            </div>
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={imprimir} className="btn-primary gap-2">
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
