import { useEffect, useState } from 'react'
import { Download, RefreshCw, X, AlertCircle, Rocket, Clock } from 'lucide-react'
import { api } from '../lib/api'
import type { UpdateStatus } from '../lib/api'

export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const off = api.onUpdateStatus((data) => {
      setStatus(data)
      if (data.state === 'available' || data.state === 'downloaded') setDismissed(false)
    })
    return off
  }, [])

  if (!status || dismissed) return null
  if (status.state === 'checking' || status.state === 'none') return null

  const base =
    'fixed bottom-5 right-5 z-50 w-80 rounded-xl border shadow-2xl p-4 bg-navy text-niebla animate-[slide-up_0.2s_ease-out]'

  // 1) Disponible — preguntar antes de descargar
  if (status.state === 'available') {
    return (
      <div className={`${base} border-ambar/40`}>
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-ambar shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Nueva versión disponible</p>
            <p className="text-xs text-lavanda/60 mt-0.5">
              {status.version ? `Versión v${status.version}` : 'Hay una actualización'} lista para descargar.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => api.downloadUpdate()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
              >
                <Download className="w-4 h-4" /> Actualizar ahora
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-lavanda/25 text-sm text-lavanda-light hover:bg-lavanda/5"
              >
                <Clock className="w-4 h-4" /> Más tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2) Descargando
  if (status.state === 'downloading') {
    return (
      <div className={`${base} border-lavanda/20`}>
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-ambar shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Descargando actualización…</p>
            <p className="text-xs text-lavanda/60 mt-0.5">{status.percent != null ? `${status.percent}%` : ''}</p>
            <div className="mt-2 h-1.5 rounded-full bg-lavanda/10 overflow-hidden">
              <div className="h-full bg-ambar transition-all" style={{ width: `${status.percent ?? 0}%` }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 3) Descargada — lista para instalar
  if (status.state === 'downloaded') {
    return (
      <div className={`${base} border-ambar/40`}>
        <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-lavanda/40 hover:text-niebla">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <Rocket className="w-5 h-5 text-ambar shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">¡Actualización lista!</p>
            <p className="text-xs text-lavanda/60 mt-0.5">
              {status.version ? `v${status.version}` : 'La versión nueva'} se instalará al reiniciar.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setInstalling(true)
                  api.installUpdate()
                }}
                disabled={installing}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light disabled:opacity-80"
              >
                <RefreshCw className={`w-4 h-4 ${installing ? 'animate-spin' : ''}`} />
                {installing ? 'Reiniciando…' : 'Reiniciar e instalar'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex items-center justify-center px-3 py-2 rounded-lg border border-lavanda/25 text-sm text-lavanda-light hover:bg-lavanda/5"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 4) Error
  return (
    <div className={`${base} border-red-500/30`}>
      <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-lavanda/40 hover:text-niebla">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">No se pudo actualizar</p>
          <p className="text-xs text-lavanda/60 mt-0.5">Podés descargar la última versión desde GitHub.</p>
          <button
            onClick={() => api.openReleases()}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-lavanda/25 text-sm text-lavanda-light hover:bg-lavanda/5"
          >
            Ver en GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
