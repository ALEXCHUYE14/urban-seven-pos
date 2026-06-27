import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Caja } from '../types'

interface CajaCtx {
  caja: Caja | null
  cargando: boolean
  abierta: boolean
  abrirCaja: (montoInicial: number) => Promise<{ error: string | null }>
  cerrarCaja: (montoFinal?: number) => Promise<{ error: string | null }>
  refrescar: () => Promise<void>
}

const Ctx = createContext<CajaCtx | undefined>(undefined)

// Clave de caché local para render instantáneo antes de reconciliar con Supabase
const LS_KEY = 'urban-seven-caja-activa'

function leerCache(uid: string): Caja | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Caja
    // Solo válido si pertenece al usuario actual y está marcada abierta
    return c.usuario_id === uid && c.estado === 'abierta' ? c : null
  } catch {
    return null
  }
}

function guardarCache(c: Caja | null) {
  if (c && c.estado === 'abierta') localStorage.setItem(LS_KEY, JSON.stringify(c))
  else localStorage.removeItem(LS_KEY)
}

export function CajaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [caja, setCaja] = useState<Caja | null>(null)
  const [cargando, setCargando] = useState(true)

  // Reconciliación con la base: fuente de verdad es Supabase
  const refrescar = useCallback(async () => {
    if (!user) {
      setCaja(null)
      guardarCache(null)
      setCargando(false)
      return
    }
    const { data, error } = await supabase
      .from('cajas')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('estado', 'abierta')
      .order('abierta_en', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error) {
      const activa = (data as Caja) ?? null
      setCaja(activa)
      guardarCache(activa)
    }
    setCargando(false)
  }, [user])

  // Al montar / cambiar usuario:
  //  1) Pinta de inmediato la caja cacheada (evita parpadeo y el "abre caja otra vez")
  //  2) Reconcilia con Supabase en segundo plano
  useEffect(() => {
    if (!user) {
      setCaja(null)
      setCargando(false)
      return
    }
    const cacheada = leerCache(user.id)
    if (cacheada) {
      setCaja(cacheada)
      setCargando(false) // UI usable al instante
    } else {
      setCargando(true)
    }
    void refrescar()
  }, [user, refrescar])

  const abrirCaja = async (montoInicial: number) => {
    if (!user) return { error: 'No autenticado' }
    const { data, error } = await supabase
      .from('cajas')
      .insert({ usuario_id: user.id, monto_inicial: montoInicial, estado: 'abierta' })
      .select('*')
      .single()

    if (error) {
      // Violación del índice único = ya hay una caja abierta: reconciliar y continuar sin error
      if (error.code === '23505') {
        await refrescar()
        return { error: null }
      }
      return { error: error.message }
    }
    const nueva = data as Caja
    setCaja(nueva)
    guardarCache(nueva)
    return { error: null }
  }

  const cerrarCaja = async (montoFinal?: number) => {
    if (!caja) return { error: 'No hay caja abierta' }
    const { error } = await supabase.rpc('cerrar_caja', {
      p_caja_id: caja.id,
      p_monto_final: montoFinal ?? null
    })
    if (error) return { error: error.message }
    setCaja(null)
    guardarCache(null)
    return { error: null }
  }

  return (
    <Ctx.Provider
      value={{
        caja,
        cargando,
        abierta: !!caja && caja.estado === 'abierta',
        abrirCaja,
        cerrarCaja,
        refrescar
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useCaja() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCaja debe usarse dentro de <CajaProvider>')
  return c
}
