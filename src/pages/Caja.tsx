import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCaja } from '../context/CajaContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { money, fechaLarga } from '../utils/format'
import { generarReporteDiarioPDF } from '../utils/pdf'
import type { VentaConDetalle } from '../types'

export default function Caja() {
  const { caja, abierta, cargando, abrirCaja, cerrarCaja } = useCaja()
  const { user } = useAuth()
  const { toast } = useToast()

  const [montoInicial,    setMontoInicial]    = useState('')
  const [montoFinal,      setMontoFinal]      = useState('')
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [trabajando,      setTrabajando]      = useState(false)

  const abrir = async () => {
    setTrabajando(true)
    const { error } = await abrirCaja(Number(montoInicial) || 0)
    setTrabajando(false)
    if (error) toast(error, 'error')
    else { toast('¡Caja abierta! A vender.', 'ok'); setMontoInicial('') }
  }

  const descargarReporte = async (): Promise<VentaConDetalle[]> => {
    if (!caja) return []
    const { data, error } = await supabase
      .from('ventas').select('*, detalle_ventas(*)')
      .eq('caja_id', caja.id).order('created_at', { ascending: true })
    if (error) { toast(error.message, 'error'); return [] }
    return (data as VentaConDetalle[]) ?? []
  }

  const cerrar = async () => {
    if (!caja) return
    setTrabajando(true)
    const ventas = await descargarReporte()
    generarReporteDiarioPDF(
      { ...caja, monto_final: Number(montoFinal) || null, cerrada_en: new Date().toISOString() },
      ventas,
      user?.email ?? '—'
    )
    const { error } = await cerrarCaja(montoFinal ? Number(montoFinal) : undefined)
    setTrabajando(false)
    setConfirmarCierre(false)
    if (error) toast(error, 'error')
    else { toast('Caja cerrada y reporte descargado', 'ok'); setMontoFinal('') }
  }

  const soloReporte = async () => {
    const ventas = await descargarReporte()
    if (caja) generarReporteDiarioPDF(caja, ventas, user?.email ?? '—')
  }

  if (cargando) return (
    <div className="py-20 text-center text-muted text-sm">Cargando caja…</div>
  )

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <p className="eyebrow">Control de efectivo</p>
        <h1 className="font-display font-black text-3xl tracking-tight text-bone">Caja</h1>
      </div>

      {/* ── Caja cerrada: formulario de apertura ── */}
      {!abierta ? (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="status-dot-off" />
            <p className="font-semibold text-bone">Sin turno activo</p>
          </div>
          <p className="text-sm text-muted">
            Ingresa el monto inicial en efectivo con el que abres el turno.
          </p>
          <div>
            <label className="label">Monto inicial (S/)</label>
            <input className="input font-mono text-xl text-center" type="number"
              min={0} step="0.10" value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              placeholder="0.00" />
          </div>
          <button onClick={abrir} disabled={trabajando} className="btn-primary w-full !py-3.5">
            {trabajando ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </div>
      ) : caja && (
        <>
          {/* ── Turno activo ── */}
          <div className="card p-6 space-y-5">
            {/* Estado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="status-dot-ok" />
                <p className="font-semibold text-success">Caja abierta</p>
              </div>
              <span className="text-xs text-muted">{fechaLarga(caja.abierta_en)}</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <BoxMetric label="Ventas del turno"    value={money(caja.total_ventas)}  destacado />
              <BoxMetric label="N° de ventas"         value={String(caja.num_ventas)} />
              <BoxMetric label="Monto inicial"        value={money(caja.monto_inicial)} />
              <BoxMetric label="Efectivo esperado"    value={money(caja.monto_inicial + caja.total_efectivo)} />
            </div>

            {/* Por método */}
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="Efectivo"    value={money(caja.total_efectivo)} />
              <MiniMetric label="Tarjeta"     value={money(caja.total_tarjeta)} />
              <MiniMetric label="Yape/Transf" value={money(caja.total_yape)} />
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={soloReporte} className="btn-ghost gap-2">
                <PdfIcon /> Reporte PDF
              </button>
              <button onClick={() => setConfirmarCierre(true)} className="btn-danger gap-2">
                <LockIcon /> Cerrar caja
              </button>
            </div>
          </div>

          <p className="text-xs text-muted px-1 leading-relaxed">
            Al cerrar la caja se descarga el reporte del turno. El historial completo
            permanece disponible en la sección Ventas.
          </p>
        </>
      )}

      {/* ── Modal confirmación de cierre ── */}
      <Modal open={confirmarCierre} onClose={() => setConfirmarCierre(false)}
        title="Cerrar caja" maxW="max-w-sm">
        {caja && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-2.5"
              style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
              <LineResumen label="Ventas del turno"     value={money(caja.total_ventas)} />
              <LineResumen label="Efectivo en caja"     value={money(caja.monto_inicial + caja.total_efectivo)} fuerte />
            </div>

            <div>
              <label className="label">Monto contado en caja — arqueo (opcional)</label>
              <input className="input font-mono text-xl text-center" type="number"
                min={0} step="0.10" value={montoFinal}
                onChange={(e) => setMontoFinal(e.target.value)}
                placeholder="0.00" />
              {montoFinal !== '' && (
                <DiferenciaLine
                  esperado={caja.monto_inicial + caja.total_efectivo}
                  contado={Number(montoFinal)}
                />
              )}
            </div>

            <p className="text-xs text-muted">
              Se descargará el reporte diario en PDF automáticamente.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setConfirmarCierre(false)} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button onClick={cerrar} disabled={trabajando} className="btn-danger flex-1">
                {trabajando ? 'Cerrando…' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function BoxMetric({ label, value, destacado }: { label: string; value: string; destacado?: boolean }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`font-mono font-bold text-lg mt-0.5 ${destacado ? 'text-ember' : 'text-bone'}`}>
        {value}
      </p>
    </div>
  )
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: 'var(--c-surface-sm)', border: '1px solid var(--c-border)' }}>
      <p className="text-[9.5px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-mono text-sm font-semibold text-bone mt-0.5">{value}</p>
    </div>
  )
}
function LineResumen({ label, value, fuerte }: { label: string; value: string; fuerte?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${fuerte ? 'font-bold text-bone' : 'text-stone'}`}>{value}</span>
    </div>
  )
}
function DiferenciaLine({ esperado, contado }: { esperado: number; contado: number }) {
  const dif = contado - esperado
  const ok  = Math.abs(dif) < 0.005
  return (
    <div className={`flex justify-between mt-2 px-1 font-mono text-sm font-bold
      ${ok ? 'text-success' : dif > 0 ? 'text-warn' : 'text-danger'}`}>
      <span>{ok ? 'Cuadra exacto' : dif > 0 ? 'Sobrante' : 'Faltante'}</span>
      <span>{money(Math.abs(dif))}</span>
    </div>
  )
}
function PdfIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg> }
function LockIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> }
