import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { TIENDA } from '../lib/constants'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [verPass,  setVerPass]  = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    const { error } = await signIn(email.trim(), password)
    setCargando(false)
    if (error) setError(error)
    else navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <header className="p-5">
        <Logo size={36} />
      </header>

      <div className="flex-1 grid lg:grid-cols-2">

        {/* Panel izquierdo — identidad de marca */}
        <div className="hidden lg:flex relative items-center justify-center overflow-hidden"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1A1916 0%, #141312 100%)' }} />
          <span className="jersey-number absolute -right-6 -bottom-20 select-none"
            style={{ fontSize: '22rem', color: 'transparent',
              WebkitTextStroke: '2px rgba(244,241,234,0.05)' }}>
            07
          </span>
          <div className="relative z-10 px-12 max-w-md">
            <p className="eyebrow mb-5">Tienda de ropa urbana · Piura</p>
            <h1 className="font-display font-black text-6xl leading-[0.92] tracking-tighter">
              VISTE<br />LA CIUDAD<br />
              <span className="text-ember">CON ACTITUD.</span>
            </h1>
            <p className="mt-7 text-stone text-sm leading-relaxed max-w-sm">
              Sistema de gestión y punto de venta. Inventario con escáner QR dual,
              control de caja y tickets profesionales en un solo lugar.
            </p>

            {/* Features */}
            <div className="mt-8 space-y-2">
              {['Escáner QR · Lector físico · Cámara', 'Control de caja por turno', 'Tickets 80mm e informes PDF'].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#E0561E" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span className="text-stone text-sm">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">

            <div className="mb-8">
              <p className="eyebrow mb-2">Acceso al sistema</p>
              <h2 className="font-display font-extrabold text-3xl tracking-tight text-bone">
                Inicia sesión
              </h2>
              <p className="text-muted text-sm mt-1.5">
                Usa tu cuenta del equipo {TIENDA.nombre}.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Correo electrónico</label>
                <input
                  id="email" type="email" autoComplete="email" required
                  className="input" placeholder="tucorreo@urbanseven.pe"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="password">Contraseña</label>
                <div className="relative">
                  <input
                    id="password" type={verPass ? 'text' : 'password'}
                    autoComplete="current-password" required
                    className="input pr-12" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-bone transition-colors"
                    aria-label="Ver contraseña"
                  >
                    {verPass ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm text-bone animate-slide-up"
                  style={{ background: 'rgba(194,69,47,0.12)', border: '1px solid rgba(194,69,47,0.3)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={cargando} className="btn-primary w-full !py-3.5 !text-base mt-1">
                {cargando ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted">
              ¿Problemas para acceder?{' '}
              <a
                href={TIENDA.whatsappSoporte}
                target="_blank" rel="noopener noreferrer"
                className="text-ember font-semibold hover:underline"
              >
                Contactar soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 2.9M6.6 6.6A13.2 13.2 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4.1-.8M1 1l22 22M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}
