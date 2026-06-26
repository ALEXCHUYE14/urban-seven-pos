import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type Tipo = 'ok' | 'error' | 'info'
interface Toast { id: number; tipo: Tipo; texto: string }

interface ToastCtx { toast: (texto: string, tipo?: Tipo) => void }
const Ctx = createContext<ToastCtx | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const toast = useCallback((texto: string, tipo: Tipo = 'info') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs.slice(-3), { id, tipo, texto }])
    setTimeout(() => setItems((xs) => xs.filter((t) => t.id !== id)), 3600)
  }, [])

  const iconos: Record<Tipo, ReactNode> = {
    ok:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>,
    error: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>,
    info:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
  }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed z-[100] inset-x-0 bottom-24 sm:bottom-5 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto animate-slide-up max-w-xs w-full flex items-center gap-3
                       rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              background:
                t.tipo === 'ok'    ? 'rgba(236,252,243,0.99)' :
                t.tipo === 'error' ? 'rgba(254,241,240,0.99)' :
                                     'rgba(255,255,255,0.99)',
              border:
                t.tipo === 'ok'    ? '1px solid rgba(42,112,72,0.3)'  :
                t.tipo === 'error' ? '1px solid rgba(194,69,47,0.3)'  :
                                     '1px solid rgba(0,0,0,0.1)',
              color: '#1C1A17',
              boxShadow: '0 4px 16px -4px rgba(0,0,0,0.12)'
            }}
          >
            <span className={
              t.tipo === 'ok'    ? 'text-success' :
              t.tipo === 'error' ? 'text-danger'  : 'text-stone'
            }>
              {iconos[t.tipo]}
            </span>
            <span className="leading-snug">{t.texto}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return c
}
