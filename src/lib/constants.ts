// Constantes de marca y negocio · URBAN SEVEN

export const TIENDA = {
  nombre: 'URBAN SEVEN',
  direccion: 'Urb. San José, jirón H, 176 - Piura',
  whatsappSoporte: 'https://wa.me/51924996961',
  logo: '/img/logo.png'
} as const

export const IGV_RATE = 0.18

export const CATEGORIAS = [
  'Polos',
  'Hoodies',
  'Pantalones',
  'Casacas',
  'Shorts',
  'Accesorios',
  'Calzado',
  'General'
] as const

export const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', 'U'] as const

export const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'yape',     label: 'Yape / Plin' },
  { id: 'tarjeta',  label: 'Tarjeta' }
] as const
