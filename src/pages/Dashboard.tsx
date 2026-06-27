import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCaja } from '../context/CajaContext'
import { money, hora, folio } from '../utils/format'
import { TIENDA } from '../lib/constants'
import type { Producto, VentaConDetalle } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const { caja, abierta, cargando } = useCaja()
  const [ventas, setVentas]       = useState<VentaConDetalle[]>([])
  const [bajoStock, setBajoStock] = useState<Producto[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let vivo = true
    const cargar = async () => {
      setLoading(true)
      const { data: prods } = await supabase
        .from('productos').select('*').eq('activo', true).order('stock', { ascending: true })

      const bajos = ((prods as Producto[]) ?? []).filter((p) => p.stock <= p.stock_minimo)

      if (!abierta || !caja) {
        if (vivo) { setVentas([]); setBajoStock(bajos); setLoading(false) }
        return
      }

      const { data } = await supabase
        .from('ventas').select('*, detalle_ventas(*)')
        .eq('caja_id', caja.id).eq('estado', 'completada')
        .order('created_at', { ascending: false })

      if (vivo) {
        setVentas((data as VentaConDetalle[]) ?? [])
        setBajoStock(bajos)
        setLoading(false)
      }
    }
    if (!cargando) void cargar()
    return () => { vivo = false }
  }, [caja, abierta, cargando])

  const resumen = useMemo(() => {
    const total    = ventas.reduce((s, v) => s + Number(v.total), 0)
    const unidades = ventas.reduce((s, v) => s + v.detalle_ventas.reduce((a, d) => a + d.cantidad, 0), 0)
    const ticketProm = ventas.length ? total / ventas.length : 0
    return { total, unidades, num: ventas.length, ticketProm }
  }, [ventas])

  const nombreCorto = (user?.email ?? '').split('@')[0]

  return (
    <div className="space-y-6 animate-slide-up max-w-5xl">

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{TIENDA.nombre}</p>
          <h1 className="font-display font-black text-4xl sm:text-5xl text-bone leading-none tracking-tight mt-1">
            Hola, <span className="capitalize">{nombreCorto || 'equipo'}</span>
          </h1>
        </div>
        <span className="jersey-number select-none text-bone/[0.06] hidden sm:block"
          style={{ fontSize: '5rem' }}>07</span>
      </div>

      {/* ── Banner caja cerrada ── */}
      {!abierta && (
        <div className="card p-5 sm:p-6"
          style={{ borderColor: 'rgba(224,86,30,0.25)', background: 'var(--c-banner-bg)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="eyebrow text-warn">Turno sin iniciar</p>
              <h2 className="font-display font-bold text-xl text-bone mt-1">
                Abre tu caja para comenzar a vender
              </h2>
              <p className="text-sm text-muted mt-1">
                Sin caja abierta no se pueden registrar ventas.
              </p>
            </div>
            <Link to="/caja" className="btn-primary whitespace-nowrap shrink-0">
              Abrir caja
            </Link>
          </div>
        </div>
      )}

      {/* ── KPIs del turno ── */}
      {abierta && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Vendido hoy" value={money(resumen.total)} accent />
            <KpiCard label="N° ventas" value={String(resumen.num)} />
            <KpiCard label="Prendas" value={String(resumen.unidades)} />
            <KpiCard label="Ticket prom." value={money(resumen.ticketProm)} />
          </div>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <QuickLink to="/pos"        title="Vender"     sub="Cobrar prendas" />
            <QuickLink to="/inventario" title="Inventario" sub="Escanear / editar" />
            <QuickLink to="/ventas"     title="Ventas"     sub="Historial del día" />
            <QuickLink to="/caja"       title="Caja"       sub="Arqueo y cierre" />
          </div>

          {/* Últimas ventas */}
          <section className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--c-divider)' }}>
              <h3 className="font-display font-bold text-base text-bone">Últimas ventas</h3>
              <Link to="/ventas" className="text-xs font-bold text-ember hover:underline">
                Ver todas →
              </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
              </div>
            ) : ventas.length === 0 ? (
              <div className="py-12 text-center px-5">
                <p className="text-muted text-sm">
                  Aún no hay ventas en este turno. ¡A vender!
                </p>
                <Link to="/pos" className="btn-primary mt-4 inline-flex !py-2 !px-4 !text-sm">
                  Ir al POS
                </Link>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--c-divider)' }}>
                {ventas.slice(0, 6).map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
                      style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
                      <span className="font-mono text-[9px] text-muted">#{v.correlativo}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-bone font-medium">
                        {v.detalle_ventas.reduce((a, d) => a + d.cantidad, 0)} prenda(s)
                      </p>
                      <p className="text-[11px] text-muted">
                        {hora(v.created_at)} · <span className="capitalize">{v.metodo_pago}</span>
                      </p>
                    </div>
                    <span className="font-mono font-bold text-bone text-sm">
                      {money(v.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* ── Alertas de stock ── */}
      <section className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--c-divider)' }}>
          <h3 className="font-display font-bold text-base text-bone">Alertas de stock</h3>
          <span className={`chip text-[11px] ${
            bajoStock.length ? 'text-warn border-warn/25' : 'text-muted'
          }`}>
            {bajoStock.length === 0 ? 'OK' : `${bajoStock.length} alerta${bajoStock.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {bajoStock.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center px-5">
            Todo el inventario está por encima del mínimo.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--c-divider)' }}>
            {bajoStock.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-coal">
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(168,162,150,0.3)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                      </div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-bone truncate">{p.nombre}</p>
                  <p className="text-[10.5px] text-muted">{p.categoria} · {p.talla} · {p.color}</p>
                </div>
                <span className={`font-mono text-sm font-bold shrink-0 ${
                  p.stock === 0 ? 'text-danger' : 'text-warn'
                }`}>
                  {p.stock}/{p.stock_minimo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? '' : ''}`}
      style={accent ? { borderColor: 'rgba(224,86,30,0.3)' } : {}}>
      <p className="text-[10.5px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1.5 font-mono font-black text-xl sm:text-2xl leading-none ${
        accent ? 'text-ember' : 'text-bone'
      }`}>
        {value}
      </p>
    </div>
  )
}

function QuickLink({ to, title, sub }: { to: string; title: string; sub: string }) {
  return (
    <Link to={to} className="card-interactive p-4">
      <p className="font-display font-bold text-sm text-bone">{title}</p>
      <p className="text-[10.5px] text-muted mt-0.5">{sub}</p>
    </Link>
  )
}
