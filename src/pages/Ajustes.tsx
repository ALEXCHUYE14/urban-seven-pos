import { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import TicketModal from '../components/TicketModal'
import { TIENDA } from '../lib/constants'
import type { TicketData } from '../types'

/* ── Ticket de prueba estático ── */
const TICKET_PRUEBA: TicketData = {
  correlativo: 0,
  fecha: new Date().toISOString(),
  items: [
    {
      producto: {
        id: 'test-1',
        codigo_qr: 'US-HOODIE-001',
        nombre: 'Hoodie Oversize Seven',
        categoria: 'Hoodies',
        talla: 'M',
        color: 'Negro',
        precio_venta: 99.90,
        precio_compra: 45.00,
        stock: 12,
        stock_minimo: 3,
        imagen_url: null,
        activo: true,
        created_at: '',
        updated_at: ''
      },
      cantidad: 1
    },
    {
      producto: {
        id: 'test-2',
        codigo_qr: 'US-TEE-014',
        nombre: 'Polo Box Logo',
        categoria: 'Polos',
        talla: 'L',
        color: 'Hueso',
        precio_venta: 49.90,
        precio_compra: 18.00,
        stock: 25,
        stock_minimo: 5,
        imagen_url: null,
        activo: true,
        created_at: '',
        updated_at: ''
      },
      cantidad: 2
    }
  ],
  subtotal: 169.32,
  igv: 30.48,
  total: 199.70,
  metodo_pago: 'efectivo',
  monto_recibido: 200.00,
  vuelto: 0.30,
  cajero: 'test@urbanseven.pe'
}

type Tab = 'impresion' | 'tienda' | 'cuenta' | 'migracion'

export default function Ajustes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('impresion')
  const [ticketPrueba, setTicketPrueba] = useState<TicketData | null>(null)
  const [copiado,   setCopiado]   = useState(false)
  const [copiadoV3, setCopiadoV3] = useState(false)

  const lanzarPrueba = () => {
    setTicketPrueba({ ...TICKET_PRUEBA, cajero: user?.email ?? 'test@urbanseven.pe' })
    toast('Vista previa lista — usa el botón "Imprimir 80mm" para probar tu impresora', 'info')
  }

  const copiarSQL = async () => {
    try {
      await navigator.clipboard.writeText(SQL_MIGRACION.trim())
      setCopiado(true)
      toast('SQL copiado al portapapeles', 'ok')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast('No se pudo copiar. Selecciona el texto manualmente.', 'error')
    }
  }

  const copiarSQLv3 = async () => {
    try {
      await navigator.clipboard.writeText(SQL_MIGRACION_V3.trim())
      setCopiadoV3(true)
      toast('SQL v3 copiado al portapapeles', 'ok')
      setTimeout(() => setCopiadoV3(false), 2500)
    } catch {
      toast('No se pudo copiar. Selecciona el texto manualmente.', 'error')
    }
  }

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'impresion',  label: 'Impresión',   icon: <PrinterIcon /> },
    { id: 'tienda',     label: 'Tienda',       icon: <StoreIcon /> },
    { id: 'cuenta',     label: 'Cuenta',       icon: <UserIcon /> },
    { id: 'migracion',  label: 'BD / Storage', icon: <DatabaseIcon /> }
  ]

  return (
    <div className="max-w-2xl space-y-6 animate-slide-up">

      {/* ── Encabezado ── */}
      <div>
        <p className="eyebrow">Configuración</p>
        <h1 className="font-display font-black text-3xl tracking-tight text-bone">Ajustes</h1>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-divider)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-lg text-xs font-bold transition-all
              ${tab === t.id ? 'bg-ember text-ink shadow-ember-sm' : 'text-stone hover:text-bone'}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TAB: Impresión
      ══════════════════════════════════ */}
      {tab === 'impresion' && (
        <div className="space-y-4 animate-fade-in">

          {/* Prueba de impresión */}
          <Section
            title="Prueba de impresión"
            subtitle="Genera un ticket de muestra para verificar la configuración de tu impresora térmica 80mm."
          >
            <div className="space-y-4">
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--c-surface-xs)', border: '1px solid var(--c-border)' }}>
                <InfoRow label="Ancho de papel" value="80 mm (térmico)" />
                <InfoRow label="Tamaño de página" value="80mm × auto (longitud variable)" />
                <InfoRow label="Márgenes" value="0 mm (configurados vía @page CSS)" />
                <InfoRow label="Orientación" value="Vertical / Portrait" />
              </div>

              <p className="text-sm text-stone leading-relaxed">
                Para imprimir en ticketera térmica: conecta la impresora, abre la vista previa y
                usa <span className="text-bone font-semibold">"Imprimir 80mm"</span>. El navegador
                enviará el área de impresión directamente al driver.
              </p>

              <button onClick={lanzarPrueba} className="btn-primary w-full !py-3.5 gap-2.5">
                <PrinterIcon />
                Realizar prueba de impresión
              </button>

              <div className="rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(201,138,43,0.08)', border: '1px solid rgba(201,138,43,0.2)' }}>
                <p className="text-xs font-bold text-warn flex items-center gap-2">
                  <TipIcon /> Consejos para impresora térmica
                </p>
                <ul className="text-xs text-stone space-y-1 pl-1">
                  <li>• Selecciona tu impresora térmica en el diálogo de impresión.</li>
                  <li>• Configura el tamaño de papel como <span className="text-bone">80mm × Auto</span>.</li>
                  <li>• Desactiva encabezados/pies de página en las opciones de impresión.</li>
                  <li>• Escala: 100% (sin "ajustar a la página").</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Ticket PDF */}
          <Section title="Reporte PDF" subtitle="Genera reportes en A4 para exportar o archivar.">
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'var(--c-surface-xs)', border: '1px solid var(--c-border)' }}>
              <InfoRow label="Formato" value="A4 (210 × 297 mm)" />
              <InfoRow label="Generado con" value="jsPDF 4 + AutoTable" />
              <InfoRow label="Disponible en" value="Caja → Reporte PDF / Ventas → Reimprimir" />
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: Tienda
      ══════════════════════════════════ */}
      {tab === 'tienda' && (
        <div className="space-y-4 animate-fade-in">
          <Section title="Datos de la tienda" subtitle="Aparecen en tickets y reportes. Para cambiarlos, edita src/lib/constants.ts.">
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--c-surface-xs)', border: '1px solid var(--c-border)' }}>
              <InfoRow label="Nombre" value={TIENDA.nombre} />
              <InfoRow label="Dirección" value={TIENDA.direccion} />
              <InfoRow label="Soporte WhatsApp" value={TIENDA.whatsappSoporte} />
            </div>
          </Section>

          <Section title="Parámetros fiscales" subtitle="Configuración de impuestos vigente.">
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'var(--c-surface-xs)', border: '1px solid var(--c-border)' }}>
              <InfoRow label="IGV" value="18% (incluido en el precio de venta)" />
              <InfoRow label="Moneda" value="Soles peruanos (PEN)" />
              <InfoRow label="Formato de fecha" value="es-PE (DD/MM/AAAA HH:MM)" />
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: Cuenta
      ══════════════════════════════════ */}
      {tab === 'cuenta' && (
        <div className="space-y-4 animate-fade-in">
          <Section title="Sesión activa" subtitle="Datos de la cuenta con la que iniciaste sesión.">
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--c-surface-xs)', border: '1px solid var(--c-border)' }}>
              <InfoRow label="Email" value={user?.email ?? '—'} />
              <InfoRow label="ID de usuario" value={user?.id ? user.id.slice(0, 18) + '…' : '—'} />
              <InfoRow label="Proveedor" value="Email + Contraseña (Supabase Auth)" />
            </div>
          </Section>

          <Section title="Cambiar contraseña" subtitle="Envía un enlace de restablecimiento a tu correo.">
            <button
              onClick={async () => {
                if (!user?.email) return
                const { error } = await import('../lib/supabase').then(m =>
                  m.supabase.auth.resetPasswordForEmail(user.email!, {
                    redirectTo: window.location.origin
                  })
                )
                if (error) toast(error.message, 'error')
                else toast('Enlace enviado. Revisa tu correo.', 'ok')
              }}
              className="btn-ghost w-full gap-2"
            >
              <MailIcon /> Enviar enlace de restablecimiento
            </button>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: BD / Storage
      ══════════════════════════════════ */}
      {tab === 'migracion' && (
        <div className="space-y-4 animate-fade-in">
          <Section
            title="Migración v2 — Imágenes de productos"
            subtitle="Habilita la columna imagen_url y el bucket de Supabase Storage."
          >
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--c-border-lg)' }}>
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: 'var(--c-surface-sm)', borderBottom: '1px solid var(--c-border)' }}>
                <span className="text-[11px] font-mono text-stone">migration_v2_storage.sql</span>
                <button
                  onClick={copiarSQL}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors
                    ${copiado ? 'text-success' : 'text-stone hover:text-bone'}`}
                >
                  {copiado ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar</>}
                </button>
              </div>
              <pre className="text-[11.5px] font-mono text-stone/90 p-4 overflow-x-auto leading-relaxed"
                style={{ background: 'var(--c-surface-sm)', borderRadius: '0.75rem' }}>
                <code>{SQL_MIGRACION.trim()}</code>
              </pre>
            </div>

            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'rgba(63,125,92,0.08)', border: '1px solid rgba(63,125,92,0.2)' }}>
              <p className="text-xs font-bold text-success flex items-center gap-2">
                <CheckIcon /> Pasos para aplicar la migración
              </p>
              <ol className="text-xs text-stone space-y-1 pl-1">
                <li>1. Ve a <span className="text-bone">supabase.com</span> → tu proyecto.</li>
                <li>2. Menú lateral: <span className="text-bone">SQL Editor</span> → <span className="text-bone">New query</span>.</li>
                <li>3. Pega el SQL de arriba y presiona <span className="text-bone">Run ▶</span>.</li>
                <li>4. Verifica que el bucket <span className="text-bone font-mono">products</span> aparezca en <span className="text-bone">Storage</span>.</li>
              </ol>
            </div>
          </Section>

          <Section
            title="Migración v3 — CRM, Descuentos e Historial de stock"
            subtitle="Agrega las tablas clientes, ajustes_stock, columnas de descuento en ventas y la función aplicar_descuento."
          >
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--c-border-lg)' }}>
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ background: 'var(--c-surface-sm)', borderBottom: '1px solid var(--c-border)' }}>
                <span className="text-[11px] font-mono text-stone">migration_v3_features.sql</span>
                <button
                  onClick={copiarSQLv3}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors
                    ${copiadoV3 ? 'text-success' : 'text-stone hover:text-bone'}`}
                >
                  {copiadoV3 ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar</>}
                </button>
              </div>
              <pre className="text-[11.5px] font-mono text-stone/90 p-4 overflow-x-auto leading-relaxed max-h-64"
                style={{ background: 'var(--c-surface-sm)', borderRadius: '0.75rem' }}>
                <code>{SQL_MIGRACION_V3.trim()}</code>
              </pre>
            </div>

            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'rgba(63,125,92,0.08)', border: '1px solid rgba(63,125,92,0.2)' }}>
              <p className="text-xs font-bold text-success flex items-center gap-2">
                <CheckIcon /> Aplicar después de v2
              </p>
              <ol className="text-xs text-stone space-y-1 pl-1">
                <li>1. Asegúrate de haber aplicado la migración v2 primero.</li>
                <li>2. Copia este SQL y ejecútalo en <span className="text-bone">SQL Editor → New query</span>.</li>
                <li>3. Verifica que las tablas <span className="text-bone font-mono">clientes</span> y <span className="text-bone font-mono">ajustes_stock</span> aparezcan en <span className="text-bone">Table Editor</span>.</li>
              </ol>
            </div>
          </Section>
        </div>
      )}

      {/* Modal de ticket de prueba */}
      <TicketModal
        open={!!ticketPrueba}
        onClose={() => setTicketPrueba(null)}
        ticket={ticketPrueba}
      />
    </div>
  )
}

/* ─── SQL de migración ────────────────────────────────────────────── */
const SQL_MIGRACION = `
-- ================================================================
-- URBAN SEVEN POS · Migración v2
-- Habilita imagen_url en productos + bucket de Supabase Storage
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Columna de URL de imagen en la tabla de productos
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS imagen_url text;

-- 2. Bucket público para imágenes de prendas
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage
-- Lectura pública (para mostrar imágenes en la app)
DROP POLICY IF EXISTS "products_public_read"  ON storage.objects;
CREATE POLICY "products_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'products');

-- Subida solo para usuarios autenticados
DROP POLICY IF EXISTS "products_auth_insert" ON storage.objects;
CREATE POLICY "products_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products');

-- Actualización solo para usuarios autenticados
DROP POLICY IF EXISTS "products_auth_update" ON storage.objects;
CREATE POLICY "products_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'products');

-- Eliminación solo para usuarios autenticados
DROP POLICY IF EXISTS "products_auth_delete" ON storage.objects;
CREATE POLICY "products_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'products');
`

/* ─── SQL migración v3 ───────────────────────────────────────────── */
const SQL_MIGRACION_V3 = `
-- ================================================================
-- URBAN SEVEN POS · Migración v3
-- CRM (clientes), historial de stock (ajustes_stock),
-- descuentos en ventas y función aplicar_descuento
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Tabla de clientes (CRM básico)
CREATE TABLE IF NOT EXISTS public.clientes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  telefono   text,
  email      text,
  notas      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_auth_all" ON public.clientes;
CREATE POLICY "clientes_auth_all" ON public.clientes
  TO authenticated USING (true) WITH CHECK (true);

-- 2. Historial de ajustes de stock
CREATE TABLE IF NOT EXISTS public.ajustes_stock (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id    uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  usuario_id     uuid NOT NULL REFERENCES auth.users(id),
  stock_anterior integer NOT NULL,
  stock_nuevo    integer NOT NULL,
  delta          integer NOT NULL,
  motivo         text NOT NULL DEFAULT 'ajuste_manual',
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ajustes_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ajustes_read"   ON public.ajustes_stock;
DROP POLICY IF EXISTS "ajustes_insert" ON public.ajustes_stock;
CREATE POLICY "ajustes_read"   ON public.ajustes_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "ajustes_insert" ON public.ajustes_stock FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Columnas de descuento y cliente en ventas
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS descuento_pct   numeric(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_monto numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cliente_id      uuid REFERENCES public.clientes(id);

-- 4. Función para aplicar descuento post-venta (no modifica procesar_venta)
CREATE OR REPLACE FUNCTION public.aplicar_descuento(
  p_venta_id      uuid,
  p_descuento_pct numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v               record;
  nuevo_total     numeric;
  nuevo_subtotal  numeric;
  nuevo_igv       numeric;
  desc_monto      numeric;
  nuevo_vuelto    numeric;
BEGIN
  SELECT * INTO v FROM public.ventas WHERE id = p_venta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venta no encontrada'; END IF;

  -- Calcular descuento sobre el total bruto original
  desc_monto    := round(v.total * p_descuento_pct / 100, 2);
  nuevo_total   := v.total - desc_monto;
  nuevo_subtotal := round(nuevo_total / 1.18, 2);
  nuevo_igv      := nuevo_total - nuevo_subtotal;
  nuevo_vuelto   := CASE WHEN v.monto_recibido IS NOT NULL
                         THEN v.monto_recibido - nuevo_total
                         ELSE NULL END;

  UPDATE public.ventas SET
    descuento_pct   = p_descuento_pct,
    descuento_monto = desc_monto,
    total           = nuevo_total,
    subtotal        = nuevo_subtotal,
    igv             = nuevo_igv,
    vuelto          = nuevo_vuelto
  WHERE id = p_venta_id;

  -- Ajustar totales en la caja
  UPDATE public.cajas SET
    total_ventas = total_ventas - desc_monto,
    total_efectivo = CASE WHEN v.metodo_pago = 'efectivo' THEN total_efectivo - desc_monto ELSE total_efectivo END,
    total_yape     = CASE WHEN v.metodo_pago = 'yape'     THEN total_yape     - desc_monto ELSE total_yape     END,
    total_tarjeta  = CASE WHEN v.metodo_pago = 'tarjeta'  THEN total_tarjeta  - desc_monto ELSE total_tarjeta  END
  WHERE id = v.caja_id;

  RETURN jsonb_build_object(
    'total',           nuevo_total,
    'subtotal',        nuevo_subtotal,
    'igv',             nuevo_igv,
    'descuento_monto', desc_monto,
    'vuelto',          nuevo_vuelto
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_descuento TO authenticated;
`

/* ─── Sub-componentes ─── */
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-base text-bone">{title}</h2>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-stone shrink-0">{label}</span>
      <span className="text-xs text-bone font-medium text-right break-all">{value}</span>
    </div>
  )
}

/* ─── Iconos ─── */
function Ic({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
function PrinterIcon()  { return <Ic><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></Ic> }
function StoreIcon()    { return <Ic><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Ic> }
function UserIcon()     { return <Ic><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ic> }
function DatabaseIcon() { return <Ic><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M21 19c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14" /><path d="M21 5v14" /></Ic> }
function MailIcon()     { return <Ic><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Ic> }
function TipIcon()      { return <Ic><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></Ic> }
function CheckIcon()    { return <Ic><path d="M20 6 9 17l-5-5" /></Ic> }
function CopyIcon()     { return <Ic><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Ic> }
