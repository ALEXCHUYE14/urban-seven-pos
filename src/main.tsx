import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// ── Error Boundary de emergencia ──────────────────────────────────────
// Atrapa cualquier error de render y muestra mensaje legible en lugar de
// pantallazo en blanco. Clave para diagnosticar fallos en producción.
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#141312',
          color: '#F4F1EA',
          minHeight: '100vh',
          boxSizing: 'border-box'
        }}>
          <div style={{ maxWidth: 560, margin: '3rem auto' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#E0561E', marginBottom: 12 }}>
              Error de aplicación
            </p>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>
              Algo salió mal
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#A8A296', marginBottom: 20, lineHeight: 1.5 }}>
              La aplicación encontró un error inesperado. Intenta recargar la página.
              Si el error persiste, limpia la caché del navegador (Ctrl+Shift+R).
            </p>
            <pre style={{
              fontSize: '0.75rem',
              color: '#6B6760',
              background: '#1E1D1A',
              border: '1px solid #2A2822',
              borderRadius: 10,
              padding: '1rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              marginBottom: 20,
              maxHeight: 240,
              overflow: 'auto'
            }}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: '#E0561E',
                color: '#141312',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
              onClick={() => window.location.reload()}
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Registrar SW: actualiza en segundo plano y fuerza recarga cuando hay
// una nueva versión lista (evita que la caché sirva chunks obsoletos).
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Nueva versión lista → recargar para que el nuevo SW tome control
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
)
