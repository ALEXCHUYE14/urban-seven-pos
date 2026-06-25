import { createClient } from '@supabase/supabase-js'

// Las credenciales se leen de variables de entorno (ver .env.example).
// La ANON KEY es pública por diseño y está protegida por las políticas RLS.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Falla temprano y claro si falta configuración
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'urban-seven-auth'
  }
})
