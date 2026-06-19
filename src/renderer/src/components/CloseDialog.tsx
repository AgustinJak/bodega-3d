import { useEffect, useState } from 'react'
import { MinusSquare, Power, X, LogOut } from 'lucide-react'
import { api } from '../lib/api'

export default function CloseDialog() {
  const [open, setOpen] = useState(false)
  const [remember, setRemember] = useState(false)

  useEffect(() => {
    const off = api.onAskClose(() => {
      setRemember(false)
      setOpen(true)
    })
    return off
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') choose('cancel')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function choose(c: 'tray' | 'quit' | 'cancel') {
    api.respondClose(c, remember)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fade_0.12s_ease-out]"
      onClick={() => choose('cancel')}
    >
      <div
        className="w-[420px] max-w-[90vw] rounded-2xl bg-navy border border-lavanda/15 shadow-2xl p-6 animate-[slide-up_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-niebla">¿Cerrar Bodega 3D?</h2>
            <p className="text-sm text-lavanda/60 mt-1">
              Minimizar la deja en segundo plano para seguir recibiendo las notificaciones de tus impresoras.
            </p>
          </div>
          <button onClick={() => choose('cancel')} className="text-lavanda/40 hover:text-niebla shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <button
            onClick={() => choose('tray')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ambar text-navy-deep font-medium hover:bg-ambar-light transition-colors"
          >
            <MinusSquare className="w-5 h-5" />
            <span className="text-left">
              Minimizar a la bandeja
              <span className="block text-xs font-normal opacity-70">Sigue corriendo en segundo plano</span>
            </span>
          </button>

          <button
            onClick={() => choose('quit')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-lavanda/20 text-lavanda-light hover:bg-lavanda/5 transition-colors"
          >
            <Power className="w-5 h-5" />
            <span className="text-left">
              Cerrar la aplicación
              <span className="block text-xs font-normal text-lavanda/40">Se dejan de recibir notificaciones</span>
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-lavanda/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-[var(--color-ambar)] w-4 h-4"
            />
            Recordar mi elección
          </label>
          <button
            onClick={() => choose('cancel')}
            className="flex items-center gap-1.5 text-sm text-lavanda/50 hover:text-niebla"
          >
            <LogOut className="w-4 h-4 rotate-180" /> Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
