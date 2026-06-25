import { type ReactNode, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxW?: string
}

export default function Modal({ open, onClose, title, children, maxW = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(12,11,10,0.82)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative w-full ${maxW} animate-slide-up
                    rounded-t-xl2 sm:rounded-xl2 max-h-[93vh] overflow-y-auto`}
        style={{
          background: 'linear-gradient(160deg, #2A2822 0%, #1F1E1A 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px -16px rgba(0,0,0,0.9), 0 1px 0 0 rgba(255,255,255,0.06) inset'
        }}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(38,36,31,0.95)',
              backdropFilter: 'blur(8px)'
            }}>
            <h3 className="font-display font-extrabold text-base tracking-tight text-bone">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="btn-ghost !p-2 !rounded-lg text-muted hover:text-bone"
              aria-label="Cerrar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
