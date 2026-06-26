import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { type ReactNode } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CajaProvider } from './context/CajaContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Inventario from './pages/Inventario'
import Ventas from './pages/Ventas'
import Caja from './pages/Caja'
import Ajustes from './pages/Ajustes'

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center bg-ink">
      <div className="text-center">
        <span className="jersey-number block mx-auto animate-pop" style={{ fontSize: '6rem' }}>07</span>
        <p className="mt-3 text-stone text-xs font-bold tracking-[0.22em] uppercase animate-fade-in">URBAN SEVEN</p>
      </div>
    </div>
  )
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function PrivateShell() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <CajaProvider>
      <Layout>
        <Outlet />
      </Layout>
    </CajaProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />

            <Route element={<PrivateShell />}>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/pos"        element={<POS />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/ventas"     element={<Ventas />} />
              <Route path="/caja"       element={<Caja />} />
              <Route path="/ajustes"    element={<Ajustes />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
