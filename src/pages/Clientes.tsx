import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import type { Cliente } from '../types'

type FormMode =
  | { tipo: 'cerrado' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; cliente: Cliente }

export default function Clientes() {
  const { toast } = useToast()
  const [clientes, setClientes]   = useState<Cliente[]>([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [form, setForm]           = useState<FormMode>({ tipo: 'cerrado' })
  const [guardando, setGuardando] = useState(false)
  const [borrandoId, setBorrandoId] = useState<string | null>(null)

  // Form fields
  const [fNombre,   setFNombre]   = useState('')
  const [fTelefono, setFTelefono] = useState('')
  const [fEmail,    setFEmail]    = useState('')
  const [fNotas,    setFNotas]    = useState('')

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('clientes').select('*').order('nombre')
    if (error) toast(error.message, 'error')
    else setClientes((data as Cliente[]) ?? [])
    setCargando(false)
  }
  useEffect(() => { void cargar() }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(c =>
      [c.nombre, c.telefono ?? '', c.email ?? ''].join(' ').toLowerCase().includes(q)
    )
  }, [clientes, busqueda])

  const abrirNuevo = () => {
    setFNombre(''); setFTelefono(''); setFEmail(''); setFNotas('')
    setForm({ tipo: 'nuevo' })
  }

  const abrirEditar = (c: Cliente) => {
    setFNombre(c.nombre)
    setFTelefono(c.telefono ?? '')
    setFEmail(c.email ?? '')
    setFNotas(c.notas ?? '')
    setForm({ tipo: 'editar', cliente: c })
  }

  const guardar = async () => {
    if (!fNombre.trim()) return
    setGuardando(true)
    const payload = {
      nombre:   fNombre.trim(),
      telefono: fTelefono.trim() || null,
      email:    fEmail.trim() || null,
      notas:    fNotas.trim() || null
    }
    if (form.tipo === 'editar') {
      const { error } = await supabase
        .from('clientes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.cliente.id)
      if (error) toast(error.message, 'error')
      else { toast('Cliente actualizado', 'ok'); setForm({ tipo: 'cerrado' }); void cargar() }
    } else {
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) toast(error.message, 'error')
      else { toast('Cliente registrado', 'ok'); setForm({ tipo: 'cerrado' }); void cargar() }
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? No se borran sus ventas asociadas.')) return
    setBorrandoId(id)
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    setBorrandoId(null)
    if (error) toast(error.message, 'error')
    else { toast('Cliente eliminado', 'ok'); void cargar() }
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Encabezado ── */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="eyebrow">CRM básico</p>
          <h1 className="font-display font-black text-3xl tracking-tight text-bone">Clientes</h1>
        </div>
        <button onClick={abrirNuevo} className="btn-ghost !py-2.5 gap-2">
          <PlusIcon /> Nuevo cliente
        </button>
      </div>

      {/* ── KPI ── */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-muted">Total de clientes</p>
          <p className="font-mono font-black text-2xl text-bone mt-0.5">{clientes.length}</p>
        </div>
        <UsersIcon />
      </div>

      {/* ── Búsqueda ── */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input className="input pl-10"
          placeholder="Buscar por nombre, teléfono o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {/* ── Lista ── */}
      {cargando ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-stone text-sm">
            {busqueda
              ? `Sin resultados para "${busqueda}".`
              : 'No hay clientes registrados. ¡Agrega el primero!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((c) => (
            <div key={c.id} className="card p-4 flex items-center gap-3 animate-pop">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0
                              bg-ember/10 text-ember font-bold text-base select-none">
                {c.nombre[0].toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-bone">{c.nombre}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {[c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </p>
                {c.notas && (
                  <p className="text-[10.5px] text-muted/70 mt-0.5 italic truncate">{c.notas}</p>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <button onClick={() => abrirEditar(c)}
                  className="btn-ghost !p-2 !rounded-lg"
                  aria-label="Editar cliente">
                  <EditIcon />
                </button>
                <button onClick={() => eliminar(c.id)}
                  disabled={borrandoId === c.id}
                  className="btn-ghost !p-2 !rounded-lg text-danger hover:bg-danger/10"
                  aria-label="Eliminar cliente">
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal
        open={form.tipo !== 'cerrado'}
        onClose={() => setForm({ tipo: 'cerrado' })}
        title={form.tipo === 'editar' ? 'Editar cliente' : 'Nuevo cliente'}
        maxW="max-w-sm"
      >
        {form.tipo !== 'cerrado' && (
          <div className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={fNombre}
                onChange={(e) => setFNombre(e.target.value)}
                placeholder="Nombre completo"
                autoFocus />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" type="tel" value={fTelefono}
                onChange={(e) => setFTelefono(e.target.value)}
                placeholder="+51 900 000 000" />
            </div>
            <div>
              <label className="label">Correo</label>
              <input className="input" type="email" value={fEmail}
                onChange={(e) => setFEmail(e.target.value)}
                placeholder="cliente@email.com" />
            </div>
            <div>
              <label className="label">Notas</label>
              <input className="input" value={fNotas}
                onChange={(e) => setFNotas(e.target.value)}
                placeholder="Preferencias, talla habitual…" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setForm({ tipo: 'cerrado' })} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button onClick={guardar}
                disabled={guardando || !fNombre.trim()}
                className="btn-primary flex-1">
                {guardando ? 'Guardando…' : form.tipo === 'editar' ? 'Guardar cambios' : 'Registrar cliente'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* Iconos */
function Ic({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
function PlusIcon()  { return <Ic><path d="M12 5v14M5 12h14" /></Ic> }
function EditIcon()  { return <Ic><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Ic> }
function TrashIcon() { return <Ic><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Ic> }
function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="text-muted">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
