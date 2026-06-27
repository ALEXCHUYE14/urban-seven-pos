// Tipos del dominio · URBAN SEVEN POS

export type MetodoPago = 'efectivo' | 'tarjeta' | 'yape'

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface AjusteStock {
  id: string
  producto_id: string
  usuario_id: string
  stock_anterior: number
  stock_nuevo: number
  delta: number
  motivo: string
  created_at: string
}

export interface Producto {
  id: string
  codigo_qr: string
  nombre: string
  categoria: string
  talla: string
  color: string
  precio_compra: number
  precio_venta: number
  stock: number
  stock_minimo: number
  imagen_url: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export type ProductoInput = Omit<
  Producto,
  'id' | 'created_at' | 'updated_at' | 'activo'
> & { activo?: boolean; imagen_url?: string | null }

export interface Caja {
  id: string
  usuario_id: string
  estado: 'abierta' | 'cerrada'
  monto_inicial: number
  monto_final: number | null
  total_ventas: number
  total_efectivo: number
  total_tarjeta: number
  total_yape: number
  num_ventas: number
  abierta_en: string
  cerrada_en: string | null
  created_at: string
}

export interface ItemCarrito {
  producto: Producto
  cantidad: number
}

export interface Venta {
  id: string
  caja_id: string
  usuario_id: string
  correlativo: number
  subtotal: number
  igv: number
  total: number
  descuento_pct: number
  descuento_monto: number
  cliente_id: string | null
  metodo_pago: MetodoPago
  monto_recibido: number | null
  vuelto: number | null
  estado: 'completada' | 'anulada'
  created_at: string
}

export interface DetalleVenta {
  id: string
  venta_id: string
  producto_id: string | null
  codigo_qr: string | null
  nombre: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  subtotal_linea: number
}

export interface VentaConDetalle extends Venta {
  detalle_ventas: DetalleVenta[]
}

// Respuesta de la RPC procesar_venta
export interface ResultadoVenta {
  venta_id: string
  correlativo: number
  subtotal: number
  igv: number
  total: number
  vuelto: number | null
}

// Datos consolidados para imprimir / exportar un ticket
export interface TicketData {
  correlativo: number
  fecha: string
  items: ItemCarrito[]
  subtotal: number
  igv: number
  total: number
  descuento_pct?: number
  descuento_monto?: number
  metodo_pago: MetodoPago
  monto_recibido?: number | null
  vuelto?: number | null
  cajero?: string
}
