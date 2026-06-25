-- ============================================================================
-- URBAN SEVEN · Migración v2 — Soporte de imágenes de productos
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Esta migración es IDEMPOTENTE: se puede correr más de una vez sin problema.
-- ============================================================================

-- 1. Agregar columna imagen_url a productos (si no existe)
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS imagen_url text;

-- 2. Crear bucket de Storage para imágenes de productos
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage para el bucket "products"
-- Lectura pública (cualquier persona puede ver las imágenes)
DROP POLICY IF EXISTS "products_public_read" ON storage.objects;
CREATE POLICY "products_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Subida solo para usuarios autenticados
DROP POLICY IF EXISTS "products_auth_insert" ON storage.objects;
CREATE POLICY "products_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products');

-- Actualización solo para usuarios autenticados
DROP POLICY IF EXISTS "products_auth_update" ON storage.objects;
CREATE POLICY "products_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products')
  WITH CHECK (bucket_id = 'products');

-- Eliminación solo para usuarios autenticados
DROP POLICY IF EXISTS "products_auth_delete" ON storage.objects;
CREATE POLICY "products_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products');

-- ============================================================================
-- FIN DE MIGRACIÓN v2
-- ============================================================================
