import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (texto: string) => void
  onClose?: () => void
  cooldown?: number
}

const REGION_ID = 'qr-reader-region'

export default function QRScanner({ onScan, onClose, cooldown = 1500 }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const ultimo     = useRef<{ texto: string; t: number }>({ texto: '', t: 0 })
  // Ref para el callback: el escáner captura esta ref en el closure, pero siempre
  // llama a la versión más reciente sin necesidad de reiniciar el escáner.
  const onScanRef  = useRef(onScan)
  const [error,  setError]  = useState<string | null>(null)
  const [activo, setActivo] = useState(false)

  // Mantiene la ref actualizada sin reiniciar el efecto del escáner
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    let cancelado = false
    const scanner = new Html5Qrcode(REGION_ID, { verbose: false })
    scannerRef.current = scanner

    const config = {
      fps: 12,
      qrbox: (w: number, h: number) => {
        const min  = Math.min(w, h)
        const size = Math.floor(min * 0.7)
        return { width: size, height: size }
      },
      aspectRatio: 1.0
    }

    const handle = (texto: string) => {
      const ahora = Date.now()
      if (texto === ultimo.current.texto && ahora - ultimo.current.t < cooldown) return
      ultimo.current = { texto, t: ahora }
      if (navigator.vibrate) navigator.vibrate(40)
      onScanRef.current(texto)
    }

    scanner
      .start({ facingMode: 'environment' }, config, handle, () => { /* sin match: ignorar */ })
      .then(() => { if (!cancelado) setActivo(true) })
      .catch((e) => {
        if (cancelado) return
        setError(
          e?.toString().includes('NotAllowed')
            ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
            : 'No se pudo iniciar la cámara. Verifica que estés en HTTPS o localhost.'
        )
      })

    return () => {
      cancelado = true
      const s = scannerRef.current
      if (s) s.stop().then(() => s.clear()).catch(() => { /* noop */ })
    }
  // Solo depende de `cooldown` — el callback se accede vía ref y nunca reinicia el escáner
  }, [cooldown])

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl2 overflow-hidden bg-black aspect-square border border-white/10">
        <div id={REGION_ID} className="w-full h-full [&_video]:object-cover [&_video]:!w-full [&_video]:!h-full" />

        {activo && !error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative w-[70%] aspect-square">
              <span className="absolute -top-px -left-px w-7 h-7 border-t-4 border-l-4 border-ember rounded-tl-lg" />
              <span className="absolute -top-px -right-px w-7 h-7 border-t-4 border-r-4 border-ember rounded-tr-lg" />
              <span className="absolute -bottom-px -left-px w-7 h-7 border-b-4 border-l-4 border-ember rounded-bl-lg" />
              <span className="absolute -bottom-px -right-px w-7 h-7 border-b-4 border-r-4 border-ember rounded-br-lg" />
              <div className="absolute inset-x-0 h-0.5 bg-ember/80 shadow-[0_0_12px_2px_rgba(224,86,30,0.7)] animate-scan-line" />
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="text-sm text-bone/90">{error}</p>
          </div>
        )}
        {!activo && !error && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-sm text-stone animate-pulse">Iniciando cámara…</p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone">
        Apunta al código QR de la prenda para detectarlo automáticamente.
      </p>

      {onClose && (
        <button onClick={onClose} className="btn-ghost w-full">Cerrar escáner</button>
      )}
    </div>
  )
}
