import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import QRScanner from './QRScanner'
import { CATEGORIAS, TALLAS } from '../lib/constants'
import type { Producto, ProductoInput } from '../types'

interface Props {
  inicial?: Partial<Producto>
  codigoPrecargado?: string
  guardando: boolean
  onSubmit: (data: ProductoInput) => void
  onCancel: () => void
}

const BUCKET = 'products'

const VACIO: ProductoInput = {
  codigo_qr:    '',
  nombre:       '',
  categoria:    'General',
  talla:        'M',
  color:        '',
  precio_compra: 0,
  precio_venta:  0,
  stock:         1,
  stock_minimo:  3,
  imagen_url:    null
}

export default function ProductoForm({ inicial, codigoPrecargado, guardando, onSubmit, onCancel }: Props) {
  const { toast } = useToast()
  const [f, setF] = useState<ProductoInput>(VACIO)

  // Escáner de cámara inline
  const [camaraActiva, setCamaraActiva] = useState(false)

  // Imagen
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [subiendoImg,   setSubiendoImg]   = useState(false)

  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const nombreRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setF({
      ...VACIO,
      ...inicial,
      codigo_qr: inicial?.codigo_qr ?? codigoPrecargado ?? ''
    } as ProductoInput)
    setImagenPreview(inicial?.imagen_url ?? null)
    setImagenArchivo(null)
    setCamaraActiva(false)
  }, [inicial, codigoPrecargado])

  const set = <K extends keyof ProductoInput>(k: K, v: ProductoInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }))

  // ── Lector físico de código de barras ──────────────────────────────────
  // El lector actúa como teclado rápido y envía Enter al finalizar.
  // Capturamos Enter para avanzar al campo Nombre sin enviar el formulario.
  const onCodigoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      nombreRef.current?.focus()
    }
  }

  // ── Cámara inline ──────────────────────────────────────────────────────
  const onCamaraScan = (codigo: string) => {
    set('codigo_qr', codigo.trim())
    setCamaraActiva(false)
    setTimeout(() => nombreRef.current?.focus(), 80)
  }

  // ── Imagen ─────────────────────────────────────────────────────────────
  const onImagenSeleccionada = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast('La imagen no puede superar 5 MB', 'error'); return }
    if (imagenPreview?.startsWith('blob:')) URL.revokeObjectURL(imagenPreview)
    setImagenArchivo(file)
    setImagenPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const quitarImagen = () => {
    if (imagenPreview?.startsWith('blob:')) URL.revokeObjectURL(imagenPreview)
    setImagenArchivo(null)
    setImagenPreview(null)
    set('imagen_url', null)
  }

  // ── Submit: sube imagen → llama al padre ───────────────────────────────
  const handleSubmit = async () => {
    const trimmed: ProductoInput = {
      ...f,
      codigo_qr: f.codigo_qr.trim(),
      nombre:    f.nombre.trim()
    }
    if (!trimmed.codigo_qr || !trimmed.nombre) return

    let imagenUrl: string | null = inicial?.imagen_url ?? null

    if (imagenArchivo) {
      setSubiendoImg(true)
      const safe = trimmed.codigo_qr.replace(/[^a-zA-Z0-9]/g, '_')
      const ext  = imagenArchivo.name.split('.').pop() ?? 'jpg'
      const path = `${safe}_${Date.now()}.${ext}`

      const { data: upData, error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, imagenArchivo, { upsert: true, contentType: imagenArchivo.type })

      setSubiendoImg(false)

      if (upErr) {
        toast(
          upErr.message.includes('Bucket not found')
            ? 'Bucket "products" no encontrado — ejecuta la migración SQL v2.'
            : upErr.message,
          'error'
        )
        return
      }
      imagenUrl = supabase.storage.from(BUCKET).getPublicUrl(upData.path).data.publicUrl
    }

    onSubmit({ ...trimmed, imagen_url: imagenUrl })
  }

  const margen    = f.precio_venta - f.precio_compra
  const margenPct = f.precio_venta > 0 ? (margen / f.precio_venta) * 100 : 0
  const valido    = f.codigo_qr.trim() && f.nombre.trim() && f.precio_venta >= 0
  const ocupado   = guardando || subiendoImg

  return (
    <div className="space-y-5">

      {/* ─── Código QR / Barras ──────────────────────────────────── */}
      <div>
        <label className="label">Código QR · Barras</label>
        <div className="flex gap-2">
          <input
            className="input font-mono flex-1"
            value={f.codigo_qr}
            onChange={(e) => set('codigo_qr', e.target.value)}
            onKeyDown={onCodigoKeyDown}
            placeholder="US-HOODIE-001 · o usa tu lector físico"
            autoFocus={!codigoPrecargado && !inicial?.id}
          />
          <button
            type="button"
            onClick={() => setCamaraActiva((v) => !v)}
            title={camaraActiva ? 'Cerrar cámara' : 'Escanear con cámara'}
            className={`btn shrink-0 !px-3 transition-colors ${
              camaraActiva
                ? 'bg-ember text-ink shadow-ember-sm'
                : 'bg-white/5 text-stone border border-white/10 hover:text-bone hover:bg-white/10'
            }`}
          >
            <CameraQrIcon />
          </button>
        </div>

        <p className="text-[10.5px] text-muted mt-1.5 flex items-center gap-1.5">
          <KeyboardIcon />
          Lector físico USB/BT: simplemente escanea con el campo activo.
        </p>

        {codigoPrecargado && !inicial && (
          <p className="text-[10.5px] text-ember mt-1 flex items-center gap-1.5">
            <CheckIcon /> Código detectado por escáner.
          </p>
        )}

        {/* Escáner de cámara inline (toggle) */}
        {camaraActiva && (
          <div className="mt-3 animate-slide-down">
            <QRScanner onScan={onCamaraScan} onClose={() => setCamaraActiva(false)} />
          </div>
        )}
      </div>

      {/* ─── Nombre ──────────────────────────────────────────────── */}
      <div>
        <label className="label">Nombre de la prenda</label>
        <input
          ref={nombreRef}
          className="input"
          value={f.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          placeholder="Hoodie Oversize Seven"
        />
      </div>

      {/* ─── Categoría · Talla ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={f.categoria}
            onChange={(e) => set('categoria', e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Talla</label>
          <select className="input" value={f.talla}
            onChange={(e) => set('talla', e.target.value)}>
            {TALLAS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ─── Color ───────────────────────────────────────────────── */}
      <div>
        <label className="label">Color</label>
        <input className="input" value={f.color}
          onChange={(e) => set('color', e.target.value)}
          placeholder="Negro · Hueso · Verde militar" />
      </div>

      {/* ─── Precios ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Costo (S/)</label>
          <input className="input font-mono" type="number" min={0} step="0.10"
            value={f.precio_compra}
            onChange={(e) => set('precio_compra', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Precio venta (S/)</label>
          <input className="input font-mono" type="number" min={0} step="0.10"
            value={f.precio_venta}
            onChange={(e) => set('precio_venta', Number(e.target.value))} />
        </div>
      </div>

      {f.precio_venta > 0 && (
        <div className="flex items-center justify-between px-0.5 text-[11px]">
          <span className="text-muted">Margen unitario</span>
          <span className={`font-mono font-semibold ${margen >= 0 ? 'text-success' : 'text-danger'}`}>
            S/ {margen.toFixed(2)} · {margenPct.toFixed(0)}%
          </span>
        </div>
      )}

      {/* ─── Stock ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Stock</label>
          <input className="input font-mono" type="number" min={0}
            value={f.stock}
            onChange={(e) => set('stock', Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Stock mínimo (alerta)</label>
          <input className="input font-mono" type="number" min={0}
            value={f.stock_minimo}
            onChange={(e) => set('stock_minimo', Number(e.target.value))} />
        </div>
      </div>

      {/* ─── Imagen ──────────────────────────────────────────────── */}
      <div>
        <label className="label">Foto de la prenda</label>

        {imagenPreview ? (
          <div className="relative group rounded-xl overflow-hidden border border-white/10"
            style={{ height: '12rem' }}>
            <img
              src={imagenPreview}
              alt="Vista previa"
              className="w-full h-full object-cover"
              onError={() => setImagenPreview(null)}
            />
            {/* Overlay de acciones al hacer hover */}
            <div className="absolute inset-0 flex items-center justify-center gap-2
                            opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(20,19,18,0.65)', backdropFilter: 'blur(4px)' }}>
              <button type="button" onClick={() => galleryRef.current?.click()}
                className="btn-ghost !py-2 !px-3 !text-xs !rounded-lg">
                <ImageIcon /> Cambiar
              </button>
              <button type="button" onClick={quitarImagen}
                className="btn-ghost !py-2 !px-3 !text-xs !rounded-lg text-danger">
                <TrashSmIcon /> Quitar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="btn-ghost flex-col !py-6 !rounded-xl gap-2 border-dashed !border-white/15 hover:!border-ember/40">
              <TakePhotoIcon />
              <span className="text-xs font-semibold">Tomar foto</span>
              <span className="text-[10px] text-muted">Cámara trasera</span>
            </button>
            <button type="button" onClick={() => galleryRef.current?.click()}
              className="btn-ghost flex-col !py-6 !rounded-xl gap-2 border-dashed !border-white/15 hover:!border-ember/40">
              <GalleryIcon />
              <span className="text-xs font-semibold">Subir imagen</span>
              <span className="text-[10px] text-muted">Galería / archivo</span>
            </button>
          </div>
        )}

        {/* Inputs de archivo ocultos */}
        <input ref={cameraRef}  type="file" accept="image/*" capture="environment"
          className="hidden" onChange={onImagenSeleccionada} />
        <input ref={galleryRef} type="file" accept="image/*"
          className="hidden" onChange={onImagenSeleccionada} />

        {subiendoImg && (
          <p className="text-[11px] text-ember mt-2 flex items-center gap-1.5 animate-pulse">
            <UploadIcon /> Subiendo imagen a Supabase Storage…
          </p>
        )}
      </div>

      {/* ─── Acciones ────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!valido || ocupado}
          className="btn-primary flex-1"
        >
          {subiendoImg ? 'Subiendo…' : guardando ? 'Guardando…'
            : inicial?.id ? 'Guardar cambios' : 'Agregar prenda'}
        </button>
      </div>
    </div>
  )
}

/* ─── Iconos ─── */
function Ic({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
function CameraQrIcon()  { return <Ic><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></Ic> }
function TakePhotoIcon() { return <Ic><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></Ic> }
function GalleryIcon()   { return <Ic><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Ic> }
function ImageIcon()     { return <Ic><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Ic> }
function TrashSmIcon()   { return <Ic><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Ic> }
function UploadIcon()    { return <Ic><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></Ic> }
function KeyboardIcon()  { return <Ic><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" /></Ic> }
function CheckIcon()     { return <Ic><path d="M20 6 9 17l-5-5" /></Ic> }
