import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import QRScanner from '../components/QRScanner'
import ProductoForm from '../components/ProductoForm'
import { money } from '../utils/format'
import type { Producto, ProductoInput } from '../types'

type ModoForm =
  | { tipo: 'cerrado' }
  | { tipo: 'nuevo'; codigo?: string }
  | { tipo: 'editar'; producto: Producto }

interface AjusteConProducto {
  id: string
  delta: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string
  created_at: string
  productos: { nombre: string; codigo_qr: string } | null
}

function parsearCSV(texto: string): ProductoInput[] {
  const lineas = texto.trim().split(/\r?\n/)
  if (lineas.length < 2) return []
  const sep = lineas[0].includes(';') ? ';' : ','
  const encabezados = lineas[0].split(sep).map(s => s.trim().toLowerCase().replace(/"/g, ''))
  return lineas.slice(1).flatMap((linea) => {
    const valores = linea.split(sep).map(s => s.trim().replace(/"/g, ''))
    const row: Record<string, string> = {}
    encabezados.forEach((col, i) => { row[col] = valores[i] ?? '' })
    if (!row['codigo_qr'] || !row['nombre']) return []
    return [{
      codigo_qr:     row['codigo_qr'],
      nombre:        row['nombre'],
      categoria:     row['categoria'] || 'General',
      talla:         row['talla'] || 'U',
      color:         row['color'] || '',
      precio_compra: Number(row['precio_compra'] || row['costo'] || 0),
      precio_venta:  Number(row['precio_venta'] || row['precio'] || 0),
      stock:         Number(row['stock'] || 0),
      stock_minimo:  Number(row['stock_minimo'] || row['minimo'] || 3),
      imagen_url:    null
    }]
  })
}

export default function Inventario() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [escanerAbierto, setEscanerAbierto] = useState(false)
  const [form, setForm]           = useState<ModoForm>({ tipo: 'cerrado' })
  const [guardando, setGuardando] = useState(false)

  // CSV import
  const csvRef   = useRef<HTMLInputElement>(null)
  const [csvProductos, setCsvProductos]   = useState<ProductoInput[]>([])
  const [csvModal, setCsvModal]           = useState(false)
  const [importando, setImportando]       = useState(false)

  // Historial ajustes
  const [historialModal, setHistorialModal]   = useState(false)
  const [historial, setHistorial]             = useState<AjusteConProducto[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('productos').select('*')
      .eq('activo', true).order('updated_at', { ascending: false })
    if (error) toast(error.message, 'error')
    else setProductos((data as Producto[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { void cargar() }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) =>
      [p.nombre, p.codigo_qr, p.categoria, p.color, p.talla].join(' ').toLowerCase().includes(q)
    )
  }, [productos, busqueda])

  const bajoStock = productos.filter((p) => p.stock <= p.stock_minimo)

  // Escáner externo
  const manejarScan = async (codigo: string) => {
    setEscanerAbierto(false)
    const limpio = codigo.trim()
    const { data, error } = await supabase
      .from('productos').select('*').eq('codigo_qr', limpio).maybeSingle()
    if (error) { toast(error.message, 'error'); return }
    if (data) {
      toast(`Prenda encontrada: ${(data as Producto).nombre}`, 'ok')
      setForm({ tipo: 'editar', producto: data as Producto })
    } else {
      toast('Código nuevo. Completa los datos.', 'info')
      setForm({ tipo: 'nuevo', codigo: limpio })
    }
  }

  const guardar = async (input: ProductoInput) => {
    setGuardando(true)
    if (form.tipo === 'editar') {
      const { error } = await supabase.from('productos').update(input).eq('id', form.producto.id)
      if (error) toast(error.message, 'error')
      else { toast('Prenda actualizada', 'ok'); setForm({ tipo: 'cerrado' }); void cargar() }
    } else {
      const { error } = await supabase.from('productos').insert(input)
      if (error)
        toast(error.code === '23505' ? 'Ya existe una prenda con ese código QR.' : error.message, 'error')
      else { toast('Prenda agregada al inventario', 'ok'); setForm({ tipo: 'cerrado' }); void cargar() }
    }
    setGuardando(false)
  }

  const incrementarStock = async (p: Producto, delta: number) => {
    const stockAnterior = p.stock
    const nuevo = Math.max(0, stockAnterior + delta)
    // Optimistic update
    setProductos((xs) => xs.map((x) => x.id === p.id ? { ...x, stock: nuevo } : x))

    const { error } = await supabase.from('productos').update({ stock: nuevo }).eq('id', p.id)
    if (error) { toast(error.message, 'error'); void cargar(); return }

    // Log del ajuste (no bloquea UI si falla — solo avisa)
    if (user?.id) {
      const { error: logErr } = await supabase.from('ajustes_stock').insert({
        producto_id:    p.id,
        usuario_id:     user.id,
        stock_anterior: stockAnterior,
        stock_nuevo:    nuevo,
        delta,
        motivo:         'ajuste_manual'
      })
      if (logErr) toast('Stock actualizado (no se pudo guardar en historial)', 'info')
    }
  }

  const eliminar = async (p: Producto) => {
    if (!confirm(`¿Dar de baja "${p.nombre}"? No se borra el historial de ventas.`)) return
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', p.id)
    if (error) toast(error.message, 'error')
    else { toast('Prenda dada de baja', 'ok'); void cargar() }
  }

  // ── CSV Import ──────────────────────────────────────────────────────────
  const onCSVSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target?.result as string
      const parsed = parsearCSV(texto)
      if (parsed.length === 0) {
        toast('No se encontraron productos válidos en el CSV', 'error')
        return
      }
      setCsvProductos(parsed)
      setCsvModal(true)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const importarCSV = async () => {
    if (csvProductos.length === 0) return
    setImportando(true)
    const { error } = await supabase
      .from('productos')
      .upsert(
        csvProductos.map(p => ({ ...p, activo: true })),
        { onConflict: 'codigo_qr' }
      )
    setImportando(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast(`${csvProductos.length} productos importados`, 'ok')
      setCsvModal(false)
      setCsvProductos([])
      void cargar()
    }
  }

  // ── Historial de ajustes ────────────────────────────────────────────────
  const abrirHistorial = async () => {
    setHistorialModal(true)
    setCargandoHistorial(true)
    const { data, error } = await supabase
      .from('ajustes_stock')
      .select('*, productos(nombre, codigo_qr)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) toast(error.message, 'error')
    else setHistorial((data as AjusteConProducto[]) ?? [])
    setCargandoHistorial(false)
  }

  const fmtFechaCorta = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Encabezado ── */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="font-display font-black text-3xl tracking-tight text-bone">Inventario</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={abrirHistorial} className="btn-ghost !py-2.5 gap-2 !text-xs">
            <HistoryIcon /> Historial
          </button>
          <button onClick={() => csvRef.current?.click()} className="btn-ghost !py-2.5 gap-2 !text-xs">
            <UploadIcon /> CSV
          </button>
          <button onClick={() => setEscanerAbierto(true)} className="btn-primary !py-2.5 gap-2">
            <QrIcon /> Escanear
          </button>
          <button onClick={() => setForm({ tipo: 'nuevo' })} className="btn-ghost !py-2.5 gap-2">
            <PlusIcon /> Agregar
          </button>
        </div>
      </div>

      {/* File input oculto para CSV */}
      <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={onCSVSeleccionado} />

      {/* ── KPIs rápidos ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Prendas"   value={productos.length.toString()} />
        <StatCard label="Unidades"  value={productos.reduce((s, p) => s + p.stock, 0).toString()} />
        <StatCard label="Bajo stock" value={bajoStock.length.toString()} alerta={bajoStock.length > 0} />
      </div>

      {/* ── Búsqueda ── */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input className="input pl-10"
          placeholder="Buscar nombre, código, color, talla…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {/* ── Lista ── */}
      {cargando ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-4 h-36 skeleton" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-stone text-sm">
            No hay prendas que coincidan. Escanea un código o agrega una nueva.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtrados.map((p) => {
            const critico = p.stock <= p.stock_minimo
            return (
              <div key={p.id} className="card p-0 overflow-hidden flex flex-col animate-pop
                                          hover:border-bone/[0.12] transition-all duration-150">
                {/* Imagen o placeholder */}
                <div className="relative h-28 bg-coal shrink-0">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre}
                      className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                        stroke="rgba(168,162,150,0.25)" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-bone/80 backdrop-blur-sm
                                  rounded-lg px-2 py-1 font-mono font-bold text-ink text-sm"
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                    {money(p.precio_venta)}
                  </div>
                  {critico && (
                    <div className="absolute top-2 left-2 bg-warn/90 rounded-md px-2 py-0.5
                                    text-[10px] font-bold text-ink">
                      BAJO STOCK
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3.5 flex flex-col gap-2.5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate text-bone">{p.nombre}</p>
                      <p className="text-[10.5px] text-muted font-mono mt-0.5">{p.codigo_qr}</p>
                    </div>
                    <p className="text-[10.5px] text-muted shrink-0 font-mono">
                      costo {money(p.precio_compra)}
                    </p>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <span className="chip">{p.categoria}</span>
                    <span className="chip">T.{p.talla}</span>
                    <span className="chip">{p.color}</span>
                  </div>

                  {/* Stock + acciones */}
                  <div className="flex items-center justify-between pt-2.5"
                    style={{ borderTop: '1px solid var(--c-divider)' }}>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => incrementarStock(p, -1)}
                        className="btn-ghost !p-1.5 !rounded-lg" aria-label="Restar 1">
                        <MinusIcon />
                      </button>
                      <div className="text-center w-14">
                        <span className={`font-mono font-black text-lg ${critico ? 'text-warn' : 'text-bone'}`}>
                          {p.stock}
                        </span>
                        <span className="text-[9px] text-muted block leading-none">en stock</span>
                      </div>
                      <button onClick={() => incrementarStock(p, +1)}
                        className="btn-ghost !p-1.5 !rounded-lg" aria-label="Sumar 1">
                        <PlusSmIcon />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setForm({ tipo: 'editar', producto: p })}
                        className="btn-ghost !p-2 !rounded-lg" aria-label="Editar">
                        <EditIcon />
                      </button>
                      <button onClick={() => eliminar(p)}
                        className="btn-ghost !p-2 !rounded-lg text-danger hover:bg-danger/10"
                        aria-label="Dar de baja">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Escáner externo ── */}
      <Modal open={escanerAbierto} onClose={() => setEscanerAbierto(false)}
        title="Escanear código QR" maxW="max-w-md">
        {escanerAbierto && (
          <QRScanner onScan={manejarScan} onClose={() => setEscanerAbierto(false)} />
        )}
      </Modal>

      {/* ── Formulario alta / edición ── */}
      <Modal open={form.tipo !== 'cerrado'} onClose={() => setForm({ tipo: 'cerrado' })}
        title={form.tipo === 'editar' ? 'Editar prenda' : 'Nueva prenda'}>
        {form.tipo !== 'cerrado' && (
          <ProductoForm
            inicial={form.tipo === 'editar' ? form.producto : undefined}
            codigoPrecargado={form.tipo === 'nuevo' ? form.codigo : undefined}
            guardando={guardando}
            onSubmit={guardar}
            onCancel={() => setForm({ tipo: 'cerrado' })}
          />
        )}
      </Modal>

      {/* ── Modal CSV ── */}
      <Modal
        open={csvModal}
        onClose={() => { setCsvModal(false); setCsvProductos([]) }}
        title={`Importar ${csvProductos.length} productos`}
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone">
            Si el código QR ya existe se actualizará; si no, se creará nuevo.
          </p>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {csvProductos.slice(0, 12).map((p, i) => (
              <div key={i} className="text-xs px-3 py-2 rounded-lg"
                style={{ background: 'var(--c-surface-sm)' }}>
                <span className="font-mono text-muted">{p.codigo_qr}</span>
                {' · '}
                <span className="text-bone font-semibold">{p.nombre}</span>
                {' · '}
                <span className="text-muted">T.{p.talla} · {p.categoria}</span>
                {' · '}
                <span className="text-ember font-mono">{money(p.precio_venta)}</span>
              </div>
            ))}
            {csvProductos.length > 12 && (
              <p className="text-xs text-muted text-center py-1.5">
                …y {csvProductos.length - 12} más
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setCsvModal(false); setCsvProductos([]) }}
              className="btn-ghost flex-1">
              Cancelar
            </button>
            <button onClick={importarCSV} disabled={importando} className="btn-primary flex-1">
              {importando ? 'Importando…' : 'Confirmar importación'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Historial ── */}
      <Modal open={historialModal} onClose={() => setHistorialModal(false)}
        title="Historial de ajustes" maxW="max-w-lg">
        {cargandoHistorial ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : historial.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">
            Aún no hay ajustes de stock registrados.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
            {historial.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--c-surface-sm)' }}>
                <div className={`w-7 h-7 rounded-lg grid place-items-center text-xs font-black shrink-0
                  ${a.delta > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {a.delta > 0 ? `+${a.delta}` : a.delta}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-bone font-medium truncate">
                    {a.productos?.nombre ?? 'Producto eliminado'}
                  </p>
                  <p className="text-[10.5px] text-muted">
                    {a.stock_anterior} → {a.stock_nuevo} uds · {a.motivo}
                  </p>
                </div>
                <span className="text-[10.5px] text-muted shrink-0">{fmtFechaCorta(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function StatCard({ label, value, alerta }: { label: string; value: string; alerta?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-[10.5px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`font-display font-black text-2xl mt-0.5 ${alerta ? 'text-warn' : 'text-bone'}`}>
        {value}
      </p>
    </div>
  )
}

/* Iconos */
function QrIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01" /></svg> }
function PlusIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg> }
function PlusSmIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg> }
function MinusIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg> }
function EditIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg> }
function TrashIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg> }
function UploadIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg> }
function HistoryIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /></svg> }
