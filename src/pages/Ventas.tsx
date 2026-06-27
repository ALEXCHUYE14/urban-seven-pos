import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import TicketModal from '../components/TicketModal'
import { money, fechaLarga, hora, folio } from '../utils/format'
import type { Producto, TicketData, VentaConDetalle } from '../types'

type Filtro = 'hoy' | 'semana' | 'todas'
type Modo   = 'lista' | 'reportes'

export default function Ventas() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ventas,    setVentas]    = useState<VentaConDetalle[]>([])
  const [cargando,  setCargando]  = useState(true)
  const [filtro,    setFiltro]    = useState<Filtro>('hoy')
  const [modo,      setModo]      = useState<Modo>('lista')
  const [ticket,    setTicket]    = useState<TicketData | null>(null)
  const [expandida, setExpandida] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    let q = supabase
      .from('ventas').select('*, detalle_ventas(*)')
      .order('created_at', { ascending: false })

    if (filtro === 'hoy') {
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
      q = q.gte('created_at', inicio.toISOString())
    } else if (filtro === 'semana') {
      const inicio = new Date(); inicio.setDate(inicio.getDate() - 7)
      q = q.gte('created_at', inicio.toISOString())
    }
    const { data, error } = await q
    if (error) toast(error.message, 'error')
    else setVentas((data as VentaConDetalle[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { void cargar() }, [filtro])

  const ventasCompletadas = useMemo(
    () => ventas.filter(v => v.estado === 'completada'),
    [ventas]
  )

  const totalPeriodo = useMemo(
    () => ventasCompletadas.reduce((s, v) => s + v.total, 0),
    [ventasCompletadas]
  )

  // ── Reportes ──────────────────────────────────────────────────────────
  const reportePorMetodo = useMemo(() => ({
    efectivo: ventasCompletadas.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + v.total, 0),
    yape:     ventasCompletadas.filter(v => v.metodo_pago === 'yape'    ).reduce((s, v) => s + v.total, 0),
    tarjeta:  ventasCompletadas.filter(v => v.metodo_pago === 'tarjeta' ).reduce((s, v) => s + v.total, 0),
  }), [ventasCompletadas])

  const topProductos = useMemo(() => {
    const map = new Map<string, { nombre: string; cantidad: number; total: number }>()
    ventasCompletadas.forEach(v => {
      v.detalle_ventas.forEach(d => {
        const prev = map.get(d.nombre) ?? { nombre: d.nombre, cantidad: 0, total: 0 }
        map.set(d.nombre, {
          nombre:   d.nombre,
          cantidad: prev.cantidad + d.cantidad,
          total:    prev.total + d.subtotal_linea
        })
      })
    })
    return [...map.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)
  }, [ventasCompletadas])

  const ticketPromedio = ventasCompletadas.length > 0
    ? totalPeriodo / ventasCompletadas.length
    : 0

  const anular = async (v: VentaConDetalle) => {
    if (!confirm(`¿Anular la venta ${folio(v.correlativo)}? Se repondrá el stock.`)) return
    const { error } = await supabase.rpc('anular_venta', { p_venta_id: v.id })
    if (error) toast(error.message, 'error')
    else { toast('Venta anulada y stock repuesto', 'ok'); void cargar() }
  }

  const reimprimir = (v: VentaConDetalle) => {
    const items = v.detalle_ventas.map((d) => ({
      producto: {
        id: d.producto_id ?? d.id,
        nombre: d.nombre,
        talla: d.talla ?? '',
        color: d.color ?? '',
        precio_venta: d.precio_unitario,
        imagen_url: null
      } as Producto,
      cantidad: d.cantidad
    }))
    setTicket({
      correlativo:     v.correlativo,
      fecha:           v.created_at,
      items,
      subtotal:        v.subtotal,
      igv:             v.igv,
      total:           v.total,
      descuento_pct:   v.descuento_pct > 0 ? v.descuento_pct : undefined,
      descuento_monto: v.descuento_monto > 0 ? v.descuento_monto : undefined,
      metodo_pago:     v.metodo_pago,
      monto_recibido:  v.monto_recibido,
      vuelto:          v.vuelto,
      cajero:          user?.email
    })
  }

  const filtroLabels: Record<Filtro, string> = { hoy: 'Hoy', semana: '7 días', todas: 'Todo' }

  return (
    <div className="max-w-3xl space-y-5">

      {/* ── Encabezado ── */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="eyebrow">Historial</p>
          <h1 className="font-display font-black text-3xl tracking-tight text-bone">Ventas</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle lista / reportes */}
          <div className="flex gap-0.5 p-1 rounded-xl"
            style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
            {(['lista', 'reportes'] as Modo[]).map((m) => (
              <button key={m} onClick={() => setModo(m)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize
                  ${modo === m ? 'bg-ember text-ink shadow-ember-sm' : 'text-muted hover:text-bone'}`}>
                {m === 'lista' ? 'Lista' : 'Reportes'}
              </button>
            ))}
          </div>

          {/* Selector de período */}
          <div className="flex gap-0.5 p-1 rounded-xl"
            style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
            {(['hoy', 'semana', 'todas'] as Filtro[]).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${filtro === f ? 'bg-ember text-ink shadow-ember-sm' : 'text-muted hover:text-bone'}`}>
                {filtroLabels[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Resumen del período ── */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider font-bold">
            Total {filtro === 'todas' ? 'histórico' : filtro === 'hoy' ? 'de hoy' : 'últimos 7 días'}
          </p>
          <p className="font-mono font-black text-2xl text-ember mt-0.5">
            {money(totalPeriodo)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">{ventasCompletadas.length} ventas</p>
          <p className="text-xs text-muted">{ventas.filter(v => v.estado === 'anulada').length} anuladas</p>
        </div>
      </div>

      {/* ── Vista: Lista ── */}
      {modo === 'lista' && (
        cargando ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : ventas.length === 0 ? (
          <div className="card p-12 text-center text-muted text-sm">
            No hay ventas en este período.
          </div>
        ) : (
          <div className="space-y-2">
            {ventas.map((v) => {
              const abierta = expandida === v.id
              const anulada = v.estado === 'anulada'
              return (
                <div key={v.id} className={`card overflow-hidden transition-opacity ${anulada ? 'opacity-55' : ''}`}>
                  <button onClick={() => setExpandida(abierta ? null : v.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                    <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                      style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
                      <span className="font-mono text-[10px] text-muted">#{v.correlativo}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-bone">{money(v.total)}</p>
                        {v.descuento_pct > 0 && (
                          <span className="chip text-warn text-[10px]"
                            style={{ borderColor: 'rgba(176,120,40,0.3)' }}>
                            -{v.descuento_pct}%
                          </span>
                        )}
                        {anulada && (
                          <span className="chip text-danger text-[10px]"
                            style={{ borderColor: 'rgba(194,69,47,0.3)' }}>
                            Anulada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted">
                        {hora(v.created_at)} ·{' '}
                        {v.detalle_ventas.reduce((s, d) => s + d.cantidad, 0)} ítems ·{' '}
                        <span className="capitalize">{v.metodo_pago}</span>
                      </p>
                    </div>
                    <svg className={`text-muted transition-transform shrink-0 ${abierta ? 'rotate-180' : ''}`}
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {abierta && (
                    <div className="px-4 pb-4 space-y-3 animate-slide-down"
                      style={{ borderTop: '1px solid var(--c-divider)' }}>
                      <p className="text-xs text-muted pt-3">{fechaLarga(v.created_at)}</p>
                      <div className="space-y-1.5">
                        {v.detalle_ventas.map((d) => (
                          <div key={d.id} className="flex justify-between text-sm">
                            <span className="text-stone">
                              {d.cantidad}× {d.nombre}
                              <span className="text-muted"> ({d.talla}/{d.color})</span>
                            </span>
                            <span className="font-mono text-bone">{money(d.subtotal_linea)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1 pt-2" style={{ borderTop: '1px solid var(--c-divider)' }}>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">IGV incluido</span>
                          <span className="font-mono text-muted">{money(v.igv)}</span>
                        </div>
                        {v.descuento_pct > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-warn">Descuento ({v.descuento_pct}%)</span>
                            <span className="font-mono text-warn">- {money(v.descuento_monto)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => reimprimir(v)}
                          className="btn-ghost flex-1 !py-2 !text-xs gap-1.5">
                          <PrintIcon /> Reimprimir
                        </button>
                        {!anulada && (
                          <button onClick={() => anular(v)}
                            className="btn-ghost !py-2 !text-xs text-danger hover:bg-danger/10 px-4">
                            Anular
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Vista: Reportes ── */}
      {modo === 'reportes' && (
        cargando ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Ticket promedio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <p className="text-[10.5px] uppercase tracking-wider text-muted">Ticket promedio</p>
                <p className="font-mono font-black text-2xl text-bone mt-0.5">{money(ticketPromedio)}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10.5px] uppercase tracking-wider text-muted">Ventas cerradas</p>
                <p className="font-mono font-black text-2xl text-bone mt-0.5">{ventasCompletadas.length}</p>
              </div>
            </div>

            {/* Por método de pago */}
            <div className="card p-5 space-y-3">
              <h3 className="font-display font-bold text-base text-bone">Por método de pago</h3>
              {[
                { label: 'Efectivo',    value: reportePorMetodo.efectivo },
                { label: 'Yape / Plin', value: reportePorMetodo.yape    },
                { label: 'Tarjeta',     value: reportePorMetodo.tarjeta  },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <span className="text-sm text-stone">{label}</span>
                  </div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--c-surface-sm)' }}>
                    <div className="h-full bg-ember rounded-full transition-all"
                      style={{ width: totalPeriodo > 0 ? `${Math.round(value / totalPeriodo * 100)}%` : '0%' }} />
                  </div>
                  <span className="font-mono font-bold text-sm text-bone w-24 text-right shrink-0">
                    {money(value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Top productos */}
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--c-divider)' }}>
                <h3 className="font-display font-bold text-base text-bone">Top productos</h3>
              </div>
              {topProductos.length === 0 ? (
                <p className="text-muted text-sm py-8 text-center">Sin datos en este período.</p>
              ) : (
                <ul className="divide-y" style={{ '--tw-divide-opacity': '1' } as React.CSSProperties}>
                  {topProductos.map((p, i) => (
                    <li key={p.nombre}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ borderColor: 'var(--c-divider)' }}>
                      <span className="w-5 text-xs text-muted font-mono shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-bone font-medium truncate">{p.nombre}</p>
                        <p className="text-[11px] text-muted">{p.cantidad} unidades vendidas</p>
                      </div>
                      <span className="font-mono font-bold text-sm text-ember shrink-0">
                        {money(p.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )
      )}

      <TicketModal open={!!ticket} onClose={() => setTicket(null)} ticket={ticket} />
    </div>
  )
}

function PrintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </svg>
  )
}
