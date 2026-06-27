-- ============================================================
-- URBAN SEVEN POS · Migración v3 — Nuevas funciones
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLA: clientes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text         NOT NULL,
  telefono   text,
  email      text,
  notas      text,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_auth_all" ON public.clientes
  TO authenticated USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 2. TABLA: ajustes_stock (historial de movimientos)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ajustes_stock (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id    uuid        NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  usuario_id     uuid        NOT NULL REFERENCES auth.users(id),
  stock_anterior integer     NOT NULL,
  stock_nuevo    integer     NOT NULL,
  delta          integer     NOT NULL,
  motivo         text        NOT NULL DEFAULT 'ajuste_manual',
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ajustes_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ajustes_read"   ON public.ajustes_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "ajustes_insert" ON public.ajustes_stock FOR INSERT TO authenticated WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. ALTERAR TABLA: ventas — descuento y cliente
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS descuento_pct   numeric(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_monto numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cliente_id      uuid          REFERENCES public.clientes(id);

-- ────────────────────────────────────────────────────────────
-- 4. FUNCIÓN: aplicar_descuento
--    Ajusta total/subtotal/igv/vuelto en la venta y la caja.
--    Llámala después de procesar_venta cuando hay descuento.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.aplicar_descuento(
  p_venta_id      uuid,
  p_descuento_pct numeric   -- 0.01 a 99.99
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_venta          record;
  v_descuento_monto numeric(12,2);
  v_new_total       numeric(12,2);
  v_new_subtotal    numeric(12,2);
  v_new_igv         numeric(12,2);
  v_new_vuelto      numeric(12,2);
BEGIN
  IF p_descuento_pct <= 0 OR p_descuento_pct >= 100 THEN
    RAISE EXCEPTION 'Descuento debe estar entre 0.01 y 99.99';
  END IF;

  SELECT * INTO v_venta FROM public.ventas WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_venta_id;
  END IF;
  IF v_venta.estado <> 'completada' THEN
    RAISE EXCEPTION 'Solo se puede descontar una venta completada';
  END IF;

  v_descuento_monto := round(v_venta.total * p_descuento_pct / 100, 2);
  v_new_total       := v_venta.total - v_descuento_monto;
  v_new_subtotal    := round(v_new_total / 1.18, 2);
  v_new_igv         := v_new_total - v_new_subtotal;

  v_new_vuelto := CASE
    WHEN v_venta.monto_recibido IS NOT NULL
    THEN greatest(v_venta.monto_recibido - v_new_total, 0)
    ELSE NULL
  END;

  UPDATE public.ventas SET
    subtotal        = v_new_subtotal,
    igv             = v_new_igv,
    total           = v_new_total,
    vuelto          = v_new_vuelto,
    descuento_pct   = p_descuento_pct,
    descuento_monto = v_descuento_monto
  WHERE id = p_venta_id;

  UPDATE public.cajas SET
    total_ventas   = total_ventas   - v_descuento_monto,
    total_efectivo = total_efectivo - CASE WHEN v_venta.metodo_pago = 'efectivo' THEN v_descuento_monto ELSE 0 END,
    total_tarjeta  = total_tarjeta  - CASE WHEN v_venta.metodo_pago = 'tarjeta'  THEN v_descuento_monto ELSE 0 END,
    total_yape     = total_yape     - CASE WHEN v_venta.metodo_pago = 'yape'     THEN v_descuento_monto ELSE 0 END
  WHERE id = v_venta.caja_id;

  RETURN jsonb_build_object(
    'total',           v_new_total,
    'subtotal',        v_new_subtotal,
    'igv',             v_new_igv,
    'descuento_monto', v_descuento_monto,
    'vuelto',          v_new_vuelto
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_descuento TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. (Opcional) Dar rol admin al primer usuario
--    Reemplaza el email con el tuyo y ejecuta:
-- ────────────────────────────────────────────────────────────
-- UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data || '{"rol":"admin"}'
-- WHERE email = 'tu-email@dominio.com';
