import { useState } from 'react'
import { TIENDA } from '../lib/constants'

interface Props {
  size?: number
  variant?: 'dark' | 'light'
  className?: string
}

/**
 * Logo de URBAN SEVEN. Renderiza /public/img/logo.png.
 * Si la imagen aún no existe, cae a una marca tipográfica con el dorsal 07,
 * de modo que la app nunca se ve rota durante el desarrollo.
 */
export default function Logo({ size = 44, variant = 'light', className = '' }: Props) {
  const [falló, setFalló] = useState(false)
  const fg = variant === 'light' ? 'text-bone' : 'text-ink'

  if (falló) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div
          className="grid place-items-center rounded-xl bg-ember text-ink font-display font-black"
          style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
          07
        </div>
        <span className={`font-display font-black tracking-tightest leading-none ${fg}`}
              style={{ fontSize: size * 0.42 }}>
          URBAN<br />SEVEN
        </span>
      </div>
    )
  }

  return (
    <img
      src={TIENDA.logo}
      alt={TIENDA.nombre}
      onError={() => setFalló(true)}
      style={{ height: size, width: 'auto' }}
      className={`object-contain ${className}`}
    />
  )
}
