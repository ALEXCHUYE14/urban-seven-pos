import Modal from './Modal'
import Logo from './Logo'
import { TIENDA } from '../lib/constants'
import { money, fechaLarga, folio } from '../utils/format'
import { generarTicketPDF } from '../utils/pdf'
import type { TicketData } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  ticket: TicketData | null
}

/**
 * Muestra el ticket en formato 80mm. El bloque #print-area es lo único
 * que el CSS @media print deja visible al imprimir en ticketera térmica.
 */
export default function TicketModal({ open, onClose, ticket }: Props) {
  if (!ticket) return null

  const imprimir = () => window.print()

  return (
    <Modal open={open} onClose={onClose} title="Venta registrada" maxW="max-w-sm">
      <div className="space-y-4">
        {/* Vista del ticket (también es el área de impresión) */}
        <div className="mx-auto rounded-lg overflow-hidden shadow-card" style={{ width: '80mm', maxWidth: '100%' }}>
          <div id="print-area" className="ticket-80">
            <div className="t-center">
              <TicketLogo />
              <div className="t-brand">{TIENDA.nombre}</div>
              <div className="t-small">{TIENDA.direccion}</div>
              <div className="t-small">RUC / Boleta de venta interna</div>
            </div>

            <hr className="t-hr" />
            <div className="t-row t-small">
              <span>Ticket</span><span className="t-bold">N° {folio(ticket.correlativo)}</span>
            </div>
            <div className="t-row t-small">
              <span>Fecha</span><span>{fechaLarga(ticket.fecha)}</span>
            </div>
            {ticket.cajero && (
              <div className="t-row t-small"><span>Cajero</span><span>{ticket.cajero}</span></div>
            )}

            <hr className="t-hr" />
            <table>
              <thead>
                <tr><th>Cant. / Descripción</th><th style={{ textAlign: 'right' }}>Importe</th></tr>
              </thead>
              <tbody>
                {ticket.items.map(({ producto, cantidad }) => (
                  <tr key={producto.id}>
                    <td>
                      <span className="t-bold">{cantidad}x</span> {producto.nombre}
                      <div className="t-small" style={{ color: '#444' }}>
                        {producto.talla} · {producto.color} · {money(producto.precio_venta)} c/u
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{money(producto.precio_venta * cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="t-hr" />
            <div className="t-row t-small"><span>Op. gravada</span><span>{money(ticket.subtotal)}</span></div>
            <div className="t-row t-small"><span>IGV (18%)</span><span>{money(ticket.igv)}</span></div>
            <div className="t-row" style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
              <span>TOTAL</span><span>{money(ticket.total)}</span>
            </div>

            <hr className="t-hr" />
            <div className="t-row t-small"><span>Método de pago</span><span className="t-bold">{ticket.metodo_pago.toUpperCase()}</span></div>
            {ticket.monto_recibido != null && (
              <div className="t-row t-small"><span>Recibido</span><span>{money(ticket.monto_recibido)}</span></div>
            )}
            {ticket.vuelto != null && (
              <div className="t-row t-small"><span>Vuelto</span><span>{money(ticket.vuelto)}</span></div>
            )}

            <hr className="t-hr" />
            <div className="t-center t-small">
              <div className="t-bold" style={{ fontSize: 12 }}>¡Gracias por tu compra!</div>
              <div>Cambios dentro de 7 días con ticket.</div>
              <div style={{ marginTop: 4 }}>URBAN SEVEN · 07</div>
            </div>
          </div>
        </div>

        {/* Acciones (no se imprimen) */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={imprimir} className="btn-ghost">
            <PrinterIcon /> Imprimir 80mm
          </button>
          <button onClick={() => generarTicketPDF(ticket)} className="btn-ghost">
            <PdfIcon /> Ticket PDF
          </button>
        </div>
        <button onClick={onClose} className="btn-primary w-full">Nueva venta</button>
      </div>
    </Modal>
  )
}

function TicketLogo() {
  // En el ticket usamos el logo real centrado; el componente Logo cae al
  // numeral 07 si la imagen no existe todavía.
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </svg>
  )
}
function PdfIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
    </svg>
  )
}
