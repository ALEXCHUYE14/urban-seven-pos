import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCaja } from '../context/CajaContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import QRScanner from '../components/QRScanner'
import TicketModal from '../components/TicketModal'
import { money } from '../utils/format'
import { IGV_RATE, METODOS_PAGO } from '../lib/constants'
import type { ItemCarrito, MetodoPago, Producto, ResultadoVenta, TicketData } from '../types'

export default function POS() {
  const { abierta, caja, cargando: cajaCargando, refrescar } = useCaja()
  const { user } = useAuth()
  const { toast } = useToast()

  const [productos, setProductos]   = useState<Producto[]>([])
  const [busqueda, setBusqueda]     = useState('')
  const [carrito, setCarrito]       = useState<ItemCarrito[]>([])
  const [escaner, setEscaner]       = useState(false)
  const [cobroAbierto, setCobroAbierto] = useState(false)
  const [metodo, setMetodo]         = useState<MetodoPago>('efectivo')
  const [recibido, setRecibido]     = useState('')
  const [procesando, setProcesando] = useState(false)
  const [ticket, setTicket]         = useState<TicketData | null>(null)

  const cargar = async () => {
    const { data } = await supabase
      .from('productos').select('*')
      .eq('activo', true).gt('stock', 0).order('nombre')
    setProductos((data as Producto[]) ?? [])
  }
  useEffect(() => { void cargar() }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos.slice(0, 18)
    return productos.filter((p) =>
      [p.nombre, p.codigo_qr, p.color, p.talla].join(' ').toLowerCase().includes(q)
    )
  }, [productos, busqueda])

  const total = useMemo(
    () => carrito.reduce((s, i) => s + i.producto.precio_venta * i.cantidad, 0),
    [carrito]
  )
  const base   = total / (1 + IGV_RATE)
  const igv    = total - base
  const vuelto = recibido ? Number(recibido) - total : 0

  const agregar = (p: Producto) => {
    setCarrito((cs) => {
      const ex = cs.find((i) => i.producto.id === p.id)
      if (ex) {
        if (ex.cantidad >= p.stock) { toast(`Solo hay ${p.stock} en stock`, 'error'); return cs }
        return cs.map((i) => i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...cs, { producto: p, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito((cs) =>
      cs.flatMap((i) => {
        if (i.producto.id !== id) return [i]
        const nueva = i.cantidad + delta
        if (nueva <= 0) return []
        if (nueva > i.producto.stock) { toast(`Solo hay ${i.producto.stock} en stock`, 'error'); return [i] }
        return [{ ...i, cantidad: nueva }]
      })
    )
  }

  const manejarScan = async (codigo: string) => {
    const limpio = codigo.trim()
    const enCatalogo = productos.find((p) => p.codigo_qr === limpio)
    if (enCatalogo) { agregar(enCatalogo); toast(`+ ${enCatalogo.nombre}`, 'ok'); return }

    const { data } = await supabase.from('productos').select('*').eq('codigo_qr', limpio).maybeSingle()
    if (data && (data as Producto).stock > 0) {
      agregar(data as Producto); toast(`+ ${(data as Producto).nombre}`, 'ok')
    } else if (data) {
      toast('Sin stock disponible', 'error')
    } else {
      toast('Código no registrado. Agrégalo en Inventario.', 'error')
    }
  }

  const procesarVenta = async () => {
    if (!caja || carrito.length === 0) return
    if (metodo === 'efectivo' && recibido && Number(recibido) < total) {
      toast('El monto recibido es menor al total', 'error'); return
    }
    setProcesando(true)
    const items = carrito.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad }))
    const { data, error } = await supabase.rpc('procesar_venta', {
      p_caja_id:        caja.id,
      p_items:          items,
      p_metodo_pago:    metodo,
      p_monto_recibido: metodo === 'efectivo' && recibido ? Number(recibido) : null
    })
    setProcesando(false)

    if (error) { toast(error.message, 'error'); return }

    const res = data as ResultadoVenta
    setTicket({
      correlativo:    res.correlativo,
      fecha:          new Date().toISOString(),
      items:          carrito,
      subtotal:       res.subtotal,
      igv:            res.igv,
      total:          res.total,
      metodo_pago:    metodo,
      monto_recibido: recibido ? Number(recibido) : null,
      vuelto:         res.vuelto,
      cajero:         user?.email
    })
    setCarrito([])
    setRecibido('')
    setCobroAbierto(false)
    void cargar()
    void refrescar()
  }

  // ── Gate: sin caja abierta ────────────────────────────────────────
  if (cajaCargando) {
    return <div className="py-20 text-center text-muted text-sm">Verificando caja…</div>
  }
  if (!abierta) {
    return (
      <div className="max-w-sm mx-auto mt-12">
        <div className="card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-warn/10 grid place-items-center mx-auto">
            <LockIcon />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-bone">Caja cerrada</h2>
            <p className="text-stone text-sm mt-1.5">
              Debes abrir la caja del turno antes de registrar ventas.
            </p>
          </div>
          <Link to="/caja" className="btn-primary w-full">Abrir caja</Link>
        </div>
      </div>
    )
  }

  const numItems = carrito.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 max-w-6xl">

      {/* ── Catálogo ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Punto de venta</p>
            <h1 className="font-display font-black text-3xl tracking-tight text-bone">Vender</h1>
          </div>
          <button onClick={() => setEscaner(true)} className="btn-primary !py-2.5 gap-2">
            <QrIcon /> Escanear
          </button>
        </div>

        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input className="input pl-10" placeholder="Buscar prenda para agregar al carrito…"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        {/* Grid de productos con imagen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filtrados.map((p) => (
            <button key={p.id} onClick={() => agregar(p)}
              className="card-interactive p-0 overflow-hidden text-left active:scale-[.97]">
              {/* Imagen del producto */}
              <div className="h-24 bg-coal relative overflow-hidden">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre}
                    className="w-full h-full object-cover"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(168,162,150,0.2)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                )}
                {/* Overlay de stock bajo */}
                {p.stock <= 3 && (
                  <div className="absolute bottom-0 inset-x-0 bg-warn/85 text-ink text-[9px]
                                  font-bold text-center py-0.5">
                    {p.stock} en stock
                  </div>
                )}
              </div>

              <div className="p-2.5">
                <p className="font-semibold text-xs leading-tight line-clamp-2 text-bone">
                  {p.nombre}
                </p>
                <p className="text-[10px] text-muted mt-0.5">{p.talla} · {p.color}</p>
                <p className="font-mono font-bold text-ember text-sm mt-1.5">
                  {money(p.precio_venta)}
                </p>
              </div>
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="col-span-full text-center text-muted py-12 text-sm">
              Sin resultados para "{busqueda}".
            </p>
          )}
        </div>
      </div>

      {/* ── Carrito ──────────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-16 h-fit">
        <div className="card overflow-hidden">

          {/* Encabezado carrito */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-base text-bone">Carrito</h2>
              {numItems > 0 && (
                <span className="badge bg-ember text-ink">{numItems}</span>
              )}
            </div>
            {carrito.length > 0 && (
              <button onClick={() => setCarrito([])}
                className="text-xs text-muted hover:text-danger transition-colors">
                Vaciar
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-[38vh] lg:max-h-[44vh] overflow-y-auto divide-y"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {carrito.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-muted text-sm">
                  Escanea o toca una prenda para agregar al carrito.
                </p>
              </div>
            ) : carrito.map(({ producto, cantidad }) => (
              <div key={producto.id} className="flex items-center gap-3 p-3 animate-pop">
                {/* Miniatura */}
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-coal">
                  {producto.imagen_url
                    ? <img src={producto.imagen_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(168,162,150,0.3)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                  }
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-bone">{producto.nombre}</p>
                  <p className="text-[10.5px] text-muted">{producto.talla} · {money(producto.precio_venta)}</p>
                </div>

                {/* Cantidad */}
                <div className="flex items-center gap-1">
                  <button onClick={() => cambiarCantidad(producto.id, -1)}
                    className="btn-ghost !p-1 !rounded-lg !w-7 !h-7">
                    <MinusIcon />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-sm text-bone">
                    {cantidad}
                  </span>
                  <button onClick={() => cambiarCantidad(producto.id, +1)}
                    className="btn-ghost !p-1 !rounded-lg !w-7 !h-7">
                    <PlusIcon />
                  </button>
                </div>

                <span className="w-[4.5rem] text-right font-mono text-sm font-semibold text-bone shrink-0">
                  {money(producto.precio_venta * cantidad)}
                </span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(20,19,18,0.5)' }}>
            <div className="flex justify-between text-xs text-muted">
              <span>Op. gravada</span><span className="font-mono">{money(base)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>IGV (18%)</span><span className="font-mono">{money(igv)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-display font-extrabold text-lg text-bone">Total</span>
              <span className="font-mono font-black text-2xl text-ember">{money(total)}</span>
            </div>
            <button
              onClick={() => { setCobroAbierto(true); setRecibido('') }}
              disabled={carrito.length === 0}
              className="btn-primary w-full !py-3.5 mt-1 text-base font-black tracking-tight"
            >
              Cobrar {money(total)}
            </button>
          </div>
        </div>
      </div>

      {/* Escáner */}
      <Modal open={escaner} onClose={() => setEscaner(false)} title="Escanear prenda" maxW="max-w-md">
        {escaner && <QRScanner onScan={manejarScan} onClose={() => setEscaner(false)} />}
      </Modal>

      {/* Modal de cobro */}
      <Modal open={cobroAbierto} onClose={() => setCobroAbierto(false)} title="Cobrar venta" maxW="max-w-sm">
        <div className="space-y-5">
          <div className="text-center py-2">
            <p className="text-muted text-xs uppercase tracking-widest font-bold">Total a cobrar</p>
            <p className="font-mono font-black text-5xl text-ember mt-1">{money(total)}</p>
          </div>

          <div>
            <label className="label">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map((m) => (
                <button key={m.id}
                  onClick={() => setMetodo(m.id as MetodoPago)}
                  className={`btn !py-2.5 text-sm font-semibold border transition-all
                    ${metodo === m.id
                      ? 'bg-ember text-ink border-transparent shadow-ember-sm'
                      : 'bg-white/5 text-bone border-white/10 hover:bg-white/10'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {metodo === 'efectivo' && (
            <div>
              <label className="label">Monto recibido (S/)</label>
              <input className="input font-mono text-xl text-center" type="number" min={0} step="0.10"
                value={recibido} onChange={(e) => setRecibido(e.target.value)}
                placeholder={total.toFixed(2)} autoFocus />
              {recibido !== '' && (
                <div className={`flex justify-between mt-2 px-1 font-mono text-sm font-bold
                  ${vuelto < 0 ? 'text-danger' : 'text-success'}`}>
                  <span>Vuelto</span>
                  <span>{money(Math.max(vuelto, 0))}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={procesarVenta} disabled={procesando} className="btn-primary w-full !py-3.5">
            {procesando ? 'Procesando…' : 'Confirmar venta'}
          </button>
        </div>
      </Modal>

      {/* Ticket */}
      <TicketModal open={!!ticket} onClose={() => setTicket(null)} ticket={ticket} />
    </div>
  )
}

function QrIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01" /></svg> }
function PlusIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg> }
function MinusIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg> }
function LockIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C98A2B" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> }
