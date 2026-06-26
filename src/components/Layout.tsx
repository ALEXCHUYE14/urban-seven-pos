import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useCaja } from '../context/CajaContext'
import { useTheme } from '../context/ThemeContext'

const nav = [
  { to: '/',           label: 'Inicio',     icon: HomeIcon,     end: true },
  { to: '/pos',        label: 'Vender',     icon: BagIcon,      end: false },
  { to: '/inventario', label: 'Inventario', icon: BoxIcon,      end: false },
  { to: '/ventas',     label: 'Ventas',     icon: ListIcon,     end: false },
  { to: '/caja',       label: 'Caja',       icon: CashIcon,     end: false }
]

const navBottom = [
  { to: '/ajustes', label: 'Ajustes', icon: SettingsIcon, end: false }
]

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { abierta } = useCaja()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const salir = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30"
        style={{ background: 'var(--c-header-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <Logo size={30} />

          <div className="flex items-center gap-2">
            {/* Indicador de caja */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border
              ${abierta
                ? 'bg-success/[0.08] text-success border-success/20'
                : 'text-muted'}`}
              style={abierta ? {} : { background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
              {abierta
                ? <span className="status-dot-ok" />
                : <span className="status-dot-off" />}
              <span className="hidden sm:inline">{abierta ? 'Caja abierta' : 'Caja cerrada'}</span>
            </div>

            {/* Toggle de modo oscuro */}
            <button
              onClick={toggleTheme}
              className="btn-ghost !p-2 !rounded-lg"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Email + salir (desktop) */}
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-[11px] text-muted max-w-[140px] truncate px-1">
                {user?.email}
              </span>
              <button
                onClick={salir}
                className="btn-ghost !py-1.5 !px-3 !text-xs !rounded-lg"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Cuerpo ───────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl flex-1 flex">

        {/* Sidebar desktop */}
        <aside className="hidden sm:flex flex-col w-52 shrink-0 py-5 px-3 gap-0.5"
          style={{ borderRight: '1px solid var(--c-border)' }}>

          {/* Nav principal */}
          <nav className="flex flex-col gap-0.5">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                   ${isActive
                     ? 'bg-ember text-ink shadow-ember-sm'
                     : 'text-stone hover:text-bone hover:bg-bone/[0.05]'}`
                }
              >
                <Icon /> {label}
              </NavLink>
            ))}
          </nav>

          {/* Separador */}
          <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--c-divider)' }}>
            {navBottom.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                   ${isActive
                     ? 'bg-ember text-ink shadow-ember-sm'
                     : 'text-stone hover:text-bone hover:bg-bone/[0.05]'}`
                }
              >
                <Icon /> {label}
              </NavLink>
            ))}

            <div className="mt-2 px-3">
              <p className="text-[10.5px] text-muted truncate">{user?.email}</p>
              <button
                onClick={salir}
                className="mt-2 w-full btn-ghost !py-1.5 !text-xs !justify-start"
              >
                <LogoutIcon /> Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 min-w-0 p-5 pb-28 sm:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ── Nav inferior móvil ───────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30"
        style={{ background: 'var(--c-nav-bg)', backdropFilter: 'blur(14px)', borderTop: '1px solid var(--c-border-lg)' }}>
        <div className="grid grid-cols-6 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {[...nav, ...navBottom].map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[9.5px] font-bold tracking-wide uppercase transition-all
                 ${isActive ? 'text-ember' : 'text-muted'}`
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

/* ─── Iconos SVG (22×22, stroke) ─── */
function Ic({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
function HomeIcon()     { return <Ic><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></Ic> }
function BagIcon()      { return <Ic><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></Ic> }
function BoxIcon()      { return <Ic><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></Ic> }
function ListIcon()     { return <Ic><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Ic> }
function CashIcon()     { return <Ic><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></Ic> }
function SettingsIcon() { return <Ic><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Ic> }
function LogoutIcon()   { return <Ic><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Ic> }
function MoonIcon()     { return <Ic><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></Ic> }
function SunIcon()      { return <Ic><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></Ic> }
