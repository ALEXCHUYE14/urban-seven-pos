// Utilidades de formato

export const PEN = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2
})

export const money = (n: number | null | undefined): string =>
  PEN.format(Number(n ?? 0))

export const fechaLarga = (iso: string): string =>
  new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

export const fechaCorta = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

export const hora = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

// Correlativo tipo ticket: 0000123
export const folio = (n: number): string => String(n).padStart(7, '0')
