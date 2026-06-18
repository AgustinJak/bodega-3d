import { useEffect, useState } from 'react'
import { Download, RefreshCw, X, AlertCircle, Rocket } from 'lucide-react'
import { api } from '../lib/api'
import type { UpdateStatus } from '../lib/api'

export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

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

  if (status.state === 'available' || status.state === 'downloading') {
    return (
      <div className={`${base} border-lavanda/20`}>
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-ambar shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Nueva versión {status.version ? `v${status.version}` : ''}</p>
            <p className="text-xs text-lavanda/60 mt-0.5">
              Descargando… {status.state === 'downloading' && status.percent != null ? `${status.percent}%` : ''}
            </p>
            {status.state === 'downloading' && (
              <div className="mt-2 h-1.5 rounded-full bg-lavanda/10 overflow-hidden">
                <div className="h-full bg-ambar transition-all" style={{ width: `${status.percent ?? 0}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

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
              Versión {status.version ? `v${status.version}` : 'nueva'} descargada. Reiniciá para instalarla.
            </p>
            <button
              onClick={() => api.installUpdate()}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
            >
              <RefreshCw className="w-4 h-4" /> Reiniciar e instalar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // error
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
