import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeCtx {
  theme: Theme
  toggleTheme: () => void
}

const Ctx = createContext<ThemeCtx | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('urban7-theme') as Theme | null
      if (saved === 'dark' || saved === 'light') return saved
    } catch { /* sin acceso a localStorage */ }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('urban7-theme', theme) } catch { /* ignorar */ }
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return <Ctx.Provider value={{ theme, toggleTheme }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return c
}
