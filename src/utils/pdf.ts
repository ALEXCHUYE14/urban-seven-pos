// Generación de PDF con jsPDF · reporte diario y ticket 80mm
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { TIENDA } from '../lib/constants'
import { money, fechaLarga, folio } from './format'
import type { Caja, TicketData, VentaConDetalle } from '../types'

// Paleta corporativa en RGB para el PDF
const C = {
  ink: [20, 19, 18] as [number, number, number],
  ember: [224, 86, 30] as [number, number, number],
  stone: [120, 116, 108] as [number, number, number],
  line: [220, 216, 208] as [number, number, number]
}

/**
 * Reporte diario de cierre de caja — A4, diseño corporativo limpio.
 */
export function generarReporteDiarioPDF(
  caja: Caja,
  ventas: VentaConDetalle[],
  cajeroEmail: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 16

  // --- Encabezado: banda de marca ---
  doc.setFillColor(...C.ink)
  doc.rect(0, 0, W, 34, 'F')
  doc.setFillColor(...C.ember)
  doc.rect(0, 34, W, 1.4, 'F')

  doc.setTextColor(244, 241, 234)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(TIENDA.nombre, M, 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(168, 162, 150)
  doc.text(TIENDA.direccion, M, 24)
  doc.text('Reporte de cierre de caja', M, 29)

  doc.setTextColor(244, 241, 234)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('07', W - M, 22, { align: 'right' })

  let y = 46

  // --- Metadatos del turno ---
  doc.setTextColor(...C.ink)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMEN DEL TURNO', M, y)
  y += 2
  doc.setDrawColor(...C.line)
  doc.line(M, y, W - M, y)
  y += 7

  const meta: [string, string][] = [
    ['Cajero', cajeroEmail],
    ['Apertura', fechaLarga(caja.abierta_en)],
    ['Cierre', caja.cerrada_en ? fechaLarga(caja.cerrada_en) : '—'],
    ['Monto inicial', money(caja.monto_inicial)],
    ['N° de ventas', String(caja.num_ventas)]
  ]
  doc.setFontSize(9)
  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.stone)
    doc.text(k, M, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.ink)
    doc.text(v, M + 40, y)
    y += 6
  })

  y += 4

  // --- Totales por método de pago (cuadro destacado) ---
  const boxY = y
  doc.setFillColor(248, 246, 241)
  doc.roundedRect(M, boxY, W - M * 2, 26, 2, 2, 'F')
  const cols = [
    ['Efectivo', money(caja.total_efectivo)],
    ['Tarjeta', money(caja.total_tarjeta)],
    ['Yape/Transf.', money(caja.total_yape)],
    ['TOTAL', money(caja.total_ventas)]
  ]
  const cw = (W - M * 2) / cols.length
  cols.forEach(([k, v], i) => {
    const cx = M + cw * i + cw / 2
    doc.setFontSize(8); doc.setTextColor(...C.stone); doc.setFont('helvetica', 'normal')
    doc.text(k.toUpperCase(), cx, boxY + 9, { align: 'center' })
    const isTotal = k === 'TOTAL'
    doc.setFontSize(isTotal ? 13 : 11)
    doc.setTextColor(...(isTotal ? C.ember : C.ink))
    doc.setFont('helvetica', 'bold')
    doc.text(v, cx, boxY + 18, { align: 'center' })
  })
  y = boxY + 36

  // --- Tabla de ventas ---
  const rows = ventas.map((v) => [
    folio(v.correlativo),
    new Date(v.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    v.detalle_ventas.reduce((s, d) => s + d.cantidad, 0).toString(),
    v.metodo_pago,
    v.estado === 'anulada' ? 'ANULADA' : money(v.total)
  ])

  autoTable(doc, {
    startY: y,
    head: [['Folio', 'Hora', 'Ítems', 'Pago', 'Total']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: C.ink, textColor: [244, 241, 234], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: C.ink },
    alternateRowStyles: { fillColor: [248, 246, 241] },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: M, right: M }
  })

  // --- Pie ---
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(8); doc.setTextColor(...C.stone)
  doc.text(
    `Generado el ${fechaLarga(new Date().toISOString())} · ${TIENDA.nombre}`,
    M, pageH - 10
  )

  doc.save(`reporte-caja-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Ticket de venta en formato 80mm como PDF descargable (corporativo).
 */
export function generarTicketPDF(t: TicketData): void {
  // Altura dinámica según cantidad de líneas
  const lineH = 4.2
  const baseH = 78
  const h = baseH + t.items.length * lineH * 1.6
  const doc = new jsPDF({ unit: 'mm', format: [80, h] })
  const W = 80
  const M = 5
  let y = 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...C.ink)
  doc.text(TIENDA.nombre, W / 2, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.stone)
  doc.text(TIENDA.direccion, W / 2, y, { align: 'center' })
  y += 4
  doc.text(`Ticket N° ${folio(t.correlativo)}`, W / 2, y, { align: 'center' })
  y += 3.5
  doc.text(fechaLarga(t.fecha), W / 2, y, { align: 'center' })
  y += 4

  doc.setDrawColor(...C.ink)
  doc.setLineDashPattern([1, 1], 0)
  doc.line(M, y, W - M, y)
  doc.setLineDashPattern([], 0)
  y += 4

  // Cabecera de columnas
  doc.setFontSize(7)
  doc.setTextColor(...C.ink)
  doc.setFont('helvetica', 'bold')
  doc.text('Cant  Descripción', M, y)
  doc.text('Importe', W - M, y, { align: 'right' })
  y += 1.5
  doc.line(M, y, W - M, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  t.items.forEach(({ producto, cantidad }) => {
    const desc = `${cantidad}x ${producto.nombre}`
    doc.setFontSize(7.5)
    doc.text(doc.splitTextToSize(desc, 48), M, y)
    doc.text(money(producto.precio_venta * cantidad), W - M, y, { align: 'right' })
    y += 3.6
    doc.setFontSize(6.5)
    doc.setTextColor(...C.stone)
    doc.text(`     ${producto.talla} · ${producto.color} · ${money(producto.precio_venta)} c/u`, M, y)
    doc.setTextColor(...C.ink)
    y += 4
  })

  y += 1
  doc.setLineDashPattern([1, 1], 0)
  doc.line(M, y, W - M, y)
  doc.setLineDashPattern([], 0)
  y += 5

  const totRow = (label: string, val: string, bold = false, big = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(big ? 11 : 8)
    doc.text(label, M, y)
    doc.text(val, W - M, y, { align: 'right' })
    y += big ? 6 : 4.4
  }
  totRow('Op. gravada', money(t.subtotal))
  totRow('IGV (18%)', money(t.igv))
  doc.setTextColor(...C.ember)
  totRow('TOTAL', money(t.total), true, true)
  doc.setTextColor(...C.ink)

  totRow('Pago', t.metodo_pago.toUpperCase())
  if (t.monto_recibido != null) totRow('Recibido', money(t.monto_recibido))
  if (t.vuelto != null) totRow('Vuelto', money(t.vuelto))

  y += 2
  doc.setLineDashPattern([1, 1], 0)
  doc.line(M, y, W - M, y)
  doc.setLineDashPattern([], 0)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('¡Gracias por tu compra!', W / 2, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.stone)
  doc.text('Vuelve pronto · URBAN SEVEN 07', W / 2, y, { align: 'center' })

  doc.save(`ticket-${folio(t.correlativo)}.pdf`)
}
