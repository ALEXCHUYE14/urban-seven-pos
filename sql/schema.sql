-- ============================================================================
-- URBAN SEVEN · CRM + POS · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en: Supabase Dashboard > SQL Editor (proyecto gwxksyrpgjfehcfezlhd)
-- Orden: este archivo es idempotente y se puede correr completo de una vez.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Utilidad: trigger genérico para updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tabla: productos (inventario de prendas)
-- ---------------------------------------------------------------------------
create table if not exists public.productos (
  id            uuid primary key default gen_random_uuid(),
  codigo_qr     text not null unique,
  nombre        text not null,
  categoria     text not null default 'General',
  talla         text not null default 'U',
  color         text not null default '-',
  precio_compra numeric(10,2) not null default 0 check (precio_compra >= 0),
  precio_venta  numeric(10,2) not null default 0 check (precio_venta >= 0),
  stock         integer not null default 0 check (stock >= 0),
  stock_minimo  integer not null default 3 check (stock_minimo >= 0),
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_productos_codigo_qr on public.productos (codigo_qr);
create index if not exists idx_productos_categoria  on public.productos (categoria);
create index if not exists idx_productos_nombre      on public.productos using gin (to_tsvector('spanish', nombre));

drop trigger if exists trg_productos_updated on public.productos;
create trigger trg_productos_updated
  before update on public.productos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Tabla: cajas (apertura / cierre de turno)
-- ---------------------------------------------------------------------------
create table if not exists public.cajas (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references auth.users (id) on delete cascade,
  estado          text not null default 'abierta' check (estado in ('abierta','cerrada')),
  monto_inicial   numeric(10,2) not null default 0 check (monto_inicial >= 0),
  monto_final     numeric(10,2),
  total_ventas    numeric(10,2) not null default 0,
  total_efectivo  numeric(10,2) not null default 0,
  total_tarjeta   numeric(10,2) not null default 0,
  total_yape      numeric(10,2) not null default 0,
  num_ventas      integer not null default 0,
  abierta_en      timestamptz not null default now(),
  cerrada_en      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_cajas_usuario_estado on public.cajas (usuario_id, estado);

-- Solo una caja abierta por usuario al mismo tiempo
create unique index if not exists uq_caja_abierta_por_usuario
  on public.cajas (usuario_id)
  where estado = 'abierta';

-- ---------------------------------------------------------------------------
-- 4. Tabla: ventas (cabecera)
-- ---------------------------------------------------------------------------
create table if not exists public.ventas (
  id            uuid primary key default gen_random_uuid(),
  caja_id       uuid not null references public.cajas (id) on delete restrict,
  usuario_id    uuid not null references auth.users (id) on delete restrict,
  correlativo   bigint generated always as identity,
  subtotal      numeric(10,2) not null default 0,  -- base imponible (sin IGV)
  igv           numeric(10,2) not null default 0,  -- 18%
  total         numeric(10,2) not null default 0,  -- subtotal + igv
  metodo_pago   text not null default 'efectivo' check (metodo_pago in ('efectivo','tarjeta','yape','transferencia')),
  monto_recibido numeric(10,2),
  vuelto        numeric(10,2),
  estado        text not null default 'completada' check (estado in ('completada','anulada')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_ventas_caja    on public.ventas (caja_id);
create index if not exists idx_ventas_fecha    on public.ventas (created_at);
create index if not exists idx_ventas_estado   on public.ventas (estado);

-- ---------------------------------------------------------------------------
-- 5. Tabla: detalle_ventas (líneas)
-- ---------------------------------------------------------------------------
create table if not exists public.detalle_ventas (
  id             uuid primary key default gen_random_uuid(),
  venta_id       uuid not null references public.ventas (id) on delete cascade,
  producto_id    uuid references public.productos (id) on delete set null,
  -- snapshot del producto al momento de la venta (auditoría)
  codigo_qr      text,
  nombre         text not null,
  talla          text,
  color          text,
  cantidad       integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  subtotal_linea numeric(10,2) not null
);

create index if not exists idx_detalle_venta on public.detalle_ventas (venta_id);

-- ============================================================================
-- 6. RPC: procesar_venta  (transacción atómica)
--    - Verifica que la caja esté abierta y pertenezca al usuario
--    - Verifica stock suficiente de cada ítem
--    - Inserta venta + detalles
--    - Descuenta stock
--    - Actualiza acumulados de la caja
--    Retorna el id y correlativo de la venta creada.
-- ============================================================================
create or replace function public.procesar_venta(
  p_caja_id        uuid,
  p_items          jsonb,        -- [{ producto_id, cantidad }, ...]
  p_metodo_pago    text default 'efectivo',
  p_monto_recibido numeric default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid        uuid := auth.uid();
  v_caja       public.cajas%rowtype;
  v_item       jsonb;
  v_prod       public.productos%rowtype;
  v_cant       integer;
  v_venta_id   uuid;
  v_correlativo bigint;
  v_subtotal   numeric(10,2) := 0;  -- total con IGV incluido (precio de venta es final)
  v_base       numeric(10,2) := 0;
  v_igv        numeric(10,2) := 0;
  v_total      numeric(10,2) := 0;
  v_linea      numeric(10,2);
  v_vuelto     numeric(10,2);
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene ítems';
  end if;

  -- Bloquea la caja y valida estado/propietario
  select * into v_caja
  from public.cajas
  where id = p_caja_id and usuario_id = v_uid
  for update;

  if not found then
    raise exception 'Caja no encontrada para este usuario';
  end if;
  if v_caja.estado <> 'abierta' then
    raise exception 'La caja está cerrada. Abra caja para vender.';
  end if;

  -- Validación de stock + cálculo de totales (precio_venta = precio final con IGV)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_cant := (v_item->>'cantidad')::int;
    if v_cant is null or v_cant <= 0 then
      raise exception 'Cantidad inválida en un ítem';
    end if;

    select * into v_prod
    from public.productos
    where id = (v_item->>'producto_id')::uuid
    for update;

    if not found then
      raise exception 'Producto no encontrado: %', v_item->>'producto_id';
    end if;
    if v_prod.stock < v_cant then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_prod.nombre, v_prod.stock, v_cant;
    end if;

    v_subtotal := v_subtotal + (v_prod.precio_venta * v_cant);
  end loop;

  v_total := round(v_subtotal, 2);
  v_base  := round(v_total / 1.18, 2);    -- desglose desde precio final
  v_igv   := round(v_total - v_base, 2);

  if p_monto_recibido is not null then
    v_vuelto := round(p_monto_recibido - v_total, 2);
    if v_vuelto < 0 then
      raise exception 'Monto recibido (% ) menor al total (% )', p_monto_recibido, v_total;
    end if;
  end if;

  -- Inserta cabecera
  insert into public.ventas (caja_id, usuario_id, subtotal, igv, total, metodo_pago, monto_recibido, vuelto)
  values (p_caja_id, v_uid, v_base, v_igv, v_total, p_metodo_pago, p_monto_recibido, v_vuelto)
  returning id, correlativo into v_venta_id, v_correlativo;

  -- Inserta líneas + descuenta stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_cant := (v_item->>'cantidad')::int;

    select * into v_prod
    from public.productos
    where id = (v_item->>'producto_id')::uuid;

    v_linea := round(v_prod.precio_venta * v_cant, 2);

    insert into public.detalle_ventas
      (venta_id, producto_id, codigo_qr, nombre, talla, color, cantidad, precio_unitario, subtotal_linea)
    values
      (v_venta_id, v_prod.id, v_prod.codigo_qr, v_prod.nombre, v_prod.talla, v_prod.color,
       v_cant, v_prod.precio_venta, v_linea);

    update public.productos
    set stock = stock - v_cant
    where id = v_prod.id;
  end loop;

  -- Actualiza acumulados de la caja
  update public.cajas
  set num_ventas    = num_ventas + 1,
      total_ventas   = total_ventas + v_total,
      total_efectivo = total_efectivo + case when p_metodo_pago = 'efectivo' then v_total else 0 end,
      total_tarjeta  = total_tarjeta  + case when p_metodo_pago = 'tarjeta'  then v_total else 0 end,
      total_yape     = total_yape     + case when p_metodo_pago in ('yape','transferencia') then v_total else 0 end
  where id = p_caja_id;

  return jsonb_build_object(
    'venta_id', v_venta_id,
    'correlativo', v_correlativo,
    'subtotal', v_base,
    'igv', v_igv,
    'total', v_total,
    'vuelto', v_vuelto
  );
end;
$$;

-- ============================================================================
-- 7. RPC: anular_venta  (reversa de stock + marca anulada)
-- ============================================================================
create or replace function public.anular_venta(p_venta_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_venta public.ventas%rowtype;
  v_det   public.detalle_ventas%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_venta from public.ventas where id = p_venta_id for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
  if v_venta.estado = 'anulada' then
    raise exception 'La venta ya está anulada';
  end if;

  -- Reponer stock
  for v_det in select * from public.detalle_ventas where venta_id = p_venta_id
  loop
    if v_det.producto_id is not null then
      update public.productos
      set stock = stock + v_det.cantidad
      where id = v_det.producto_id;
    end if;
  end loop;

  -- Revertir acumulados de la caja
  update public.cajas
  set num_ventas    = greatest(num_ventas - 1, 0),
      total_ventas   = greatest(total_ventas - v_venta.total, 0),
      total_efectivo = greatest(total_efectivo - case when v_venta.metodo_pago='efectivo' then v_venta.total else 0 end, 0),
      total_tarjeta  = greatest(total_tarjeta  - case when v_venta.metodo_pago='tarjeta'  then v_venta.total else 0 end, 0),
      total_yape     = greatest(total_yape     - case when v_venta.metodo_pago in ('yape','transferencia') then v_venta.total else 0 end, 0)
  where id = v_venta.caja_id;

  update public.ventas set estado = 'anulada' where id = p_venta_id;
end;
$$;

-- ============================================================================
-- 8. RPC: cerrar_caja  (calcula y sella el turno)
-- ============================================================================
create or replace function public.cerrar_caja(
  p_caja_id     uuid,
  p_monto_final numeric default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid  uuid := auth.uid();
  v_caja public.cajas%rowtype;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select * into v_caja
  from public.cajas
  where id = p_caja_id and usuario_id = v_uid
  for update;

  if not found then raise exception 'Caja no encontrada'; end if;
  if v_caja.estado = 'cerrada' then raise exception 'La caja ya está cerrada'; end if;

  update public.cajas
  set estado     = 'cerrada',
      cerrada_en = now(),
      monto_final = coalesce(p_monto_final, v_caja.monto_inicial + v_caja.total_efectivo)
  where id = p_caja_id;

  return jsonb_build_object(
    'caja_id', p_caja_id,
    'total_ventas', v_caja.total_ventas,
    'num_ventas', v_caja.num_ventas
  );
end;
$$;

-- ============================================================================
-- 9. Row Level Security
--    Modelo simple: cualquier usuario autenticado (staff de la tienda) opera
--    el inventario; las cajas/ventas quedan ligadas a su propietario.
-- ============================================================================
alter table public.productos      enable row level security;
alter table public.cajas          enable row level security;
alter table public.ventas         enable row level security;
alter table public.detalle_ventas enable row level security;

-- Productos: lectura/escritura para autenticados
drop policy if exists "productos_select" on public.productos;
create policy "productos_select" on public.productos
  for select to authenticated using (true);

drop policy if exists "productos_insert" on public.productos;
create policy "productos_insert" on public.productos
  for insert to authenticated with check (true);

drop policy if exists "productos_update" on public.productos;
create policy "productos_update" on public.productos
  for update to authenticated using (true) with check (true);

drop policy if exists "productos_delete" on public.productos;
create policy "productos_delete" on public.productos
  for delete to authenticated using (true);

-- Cajas: cada quien ve y gestiona las suyas
drop policy if exists "cajas_select" on public.cajas;
create policy "cajas_select" on public.cajas
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists "cajas_insert" on public.cajas;
create policy "cajas_insert" on public.cajas
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "cajas_update" on public.cajas;
create policy "cajas_update" on public.cajas
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Ventas: el dueño de la caja
drop policy if exists "ventas_select" on public.ventas;
create policy "ventas_select" on public.ventas
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists "ventas_insert" on public.ventas;
create policy "ventas_insert" on public.ventas
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "ventas_update" on public.ventas;
create policy "ventas_update" on public.ventas
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Detalle de ventas: visible si la venta es del usuario
drop policy if exists "detalle_select" on public.detalle_ventas;
create policy "detalle_select" on public.detalle_ventas
  for select to authenticated using (
    exists (select 1 from public.ventas v where v.id = venta_id and v.usuario_id = auth.uid())
  );

drop policy if exists "detalle_insert" on public.detalle_ventas;
create policy "detalle_insert" on public.detalle_ventas
  for insert to authenticated with check (
    exists (select 1 from public.ventas v where v.id = venta_id and v.usuario_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 10. Datos de ejemplo (opcional — comenta si no los quieres)
-- ---------------------------------------------------------------------------
insert into public.productos (codigo_qr, nombre, categoria, talla, color, precio_compra, precio_venta, stock, stock_minimo)
values
  ('US-HOODIE-001', 'Hoodie Oversize Seven', 'Hoodies', 'M', 'Negro',  45.00, 99.90, 12, 3),
  ('US-TEE-014',     'Polo Box Logo',          'Polos',   'L', 'Hueso',  18.00, 49.90, 25, 5),
  ('US-CARGO-007',   'Pantalón Cargo Urbano',  'Pantalones','32','Verde Militar', 60.00, 139.90, 8, 2),
  ('US-CAP-003',     'Gorra Trucker 07',       'Accesorios','U','Naranja', 12.00, 39.90, 4, 3)
on conflict (codigo_qr) do nothing;

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================
