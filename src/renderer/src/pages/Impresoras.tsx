import { useEffect, useState } from 'react'
import { Printer, LogOut, RefreshCw, Thermometer, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import type { PrinterState } from '../lib/api'

export default function Impresoras() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [printers, setPrinters] = useState<PrinterState[]>([])

  useEffect(() => {
    api.bambuStatus().then((s) => {
      setLoggedIn(s.loggedIn)
      setAccount(s.account)
      setPrinters(s.printers)
    })
    const off = api.onBambuUpdate((list) => setPrinters(list))
    return off
  }, [])

  if (loggedIn === null) return <p className="text-sm text-lavanda/50">Cargando…</p>

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-niebla">Impresoras</h1>
          <p className="text-sm text-lavanda/60 mt-1">
            {loggedIn ? `Conectado como ${account} · monitoreo en la nube` : 'Conectá tu cuenta de Bambu para ver el estado'}
          </p>
        </div>
        {loggedIn && (
          <div className="flex gap-2">
            <button
              onClick={() => api.bambuRefresh().then(setPrinters)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5"
            >
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
            <button
              onClick={async () => {
                await api.bambuLogout()
                setLoggedIn(false)
                setPrinters([])
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {!loggedIn ? (
        <LoginForm
          onLoggedIn={() => api.bambuStatus().then((s) => {
            setLoggedIn(s.loggedIn)
            setAccount(s.account)
            setPrinters(s.printers)
          })}
        />
      ) : printers.length === 0 ? (
        <div className="rounded-xl bg-navy border border-lavanda/10 p-8 text-center">
          <Loader2 className="w-8 h-8 text-lavanda/30 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-lavanda/60">Buscando impresoras y esperando datos…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {printers.map((p) => (
            <PrinterCard key={p.serial} p={p} />
          ))}
        </div>
      )}

      {loggedIn && (
        <p className="text-[11px] text-lavanda/30">
          Modo nube = solo lectura. Para enviar impresiones seguí usando Bambu Studio / Handy.
        </p>
      )}
    </div>
  )
}

const STATE_META: Record<string, { label: string; color: string; dot: string }> = {
  RUNNING: { label: 'Imprimiendo', color: 'text-ambar', dot: 'bg-ambar' },
  PREPARE: { label: 'Preparando', color: 'text-ambar', dot: 'bg-ambar' },
  PAUSE: { label: 'Pausada', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  FINISH: { label: 'Terminada', color: 'text-green-400', dot: 'bg-green-400' },
  FAILED: { label: 'Falló', color: 'text-red-400', dot: 'bg-red-400' },
  IDLE: { label: 'Libre', color: 'text-lavanda-light', dot: 'bg-lavanda' },
  OFFLINE: { label: 'Apagada / sin conexión', color: 'text-lavanda/40', dot: 'bg-lavanda/30' }
}

function PrinterCard({ p }: { p: PrinterState }) {
  const meta = STATE_META[p.state] || STATE_META.IDLE
  const moving = p.state === 'RUNNING' || p.state === 'PREPARE'
  const printing = moving || p.state === 'PAUSE'
  return (
    <div className="rounded-xl bg-navy border border-lavanda/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Printer className="w-4 h-4 text-lavanda/50 shrink-0" />
          <span className="text-sm font-medium text-niebla truncate" title={p.name}>{p.name}</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs ${meta.color}`}>
          <span className={`w-2 h-2 rounded-full ${meta.dot} ${moving ? 'animate-pulse' : ''}`} /> {meta.label}
        </span>
      </div>

      <p className="text-[11px] text-lavanda/40">{p.model || 'Bambu Lab'}</p>

      {printing && (
        <div>
          <div className="flex justify-between text-xs text-lavanda/60 mb-1">
            <span className="truncate max-w-[60%]" title={p.taskName || ''}>
              {p.taskName || (p.state === 'PAUSE' ? 'En pausa' : 'Imprimiendo…')}
            </span>
            <span>{p.percent != null ? `${p.percent}%` : ''}</span>
          </div>
          <div className="h-1.5 rounded-full bg-lavanda/10 overflow-hidden">
            <div className="h-full bg-ambar transition-all" style={{ width: `${p.percent ?? 0}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-lavanda/40 mt-1">
            {p.layer != null && p.totalLayers != null && <span>Capa {p.layer}/{p.totalLayers}</span>}
            {p.remainingMin != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {p.remainingMin} min
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-lavanda/60">
        {p.nozzleTemp != null && (
          <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-orange-400" /> Boquilla {p.nozzleTemp}°</span>
        )}
        {p.bedTemp != null && (
          <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-blue-400" /> Cama {p.bedTemp}°</span>
        )}
      </div>

      {(p.errorCode || p.hmsCount > 0) && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {p.errorCode ? `Error ${p.errorCode}` : `${p.hmsCount} aviso(s) del sistema`}
        </div>
      )}
    </div>
  )
}

function LoginForm({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const input =
    'w-full rounded-lg bg-navy border border-lavanda/15 px-3 py-2 text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-ambar/50'

  async function submit() {
    setError('')
    setBusy(true)
    try {
      if (needCode) {
        const r = await api.bambuLoginCode(account, code.trim())
        if (r.ok) onLoggedIn()
        else setError(r.error || 'Código inválido.')
      } else {
        const r = await api.bambuLogin(account.trim(), password)
        if (r.ok) onLoggedIn()
        else if (r.needCode) {
          setNeedCode(true)
          setError('Te enviamos un código por email. Ingresalo abajo.')
        } else setError(r.error || 'No se pudo iniciar sesión.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md rounded-xl bg-navy border border-lavanda/10 p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-niebla">Conectar cuenta de Bambu Lab</h2>
        <p className="text-xs text-lavanda/50 mt-1">
          Solo lectura del estado. No cambia la configuración de tus impresoras ni las saca de la nube.
        </p>
      </div>
      <label className="block">
        <span className="text-xs text-lavanda/60 mb-1 block">Email</span>
        <input value={account} onChange={(e) => setAccount(e.target.value)} className={input} placeholder="tu@email.com" disabled={needCode} />
      </label>
      {!needCode ? (
        <label className="block">
          <span className="text-xs text-lavanda/60 mb-1 block">Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </label>
      ) : (
        <label className="block">
          <span className="text-xs text-lavanda/60 mb-1 block">Código de verificación (email)</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={input} placeholder="123456" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </label>
      )}
      {error && <p className="text-xs text-ambar">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light disabled:opacity-50"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {needCode ? 'Verificar código' : 'Conectar'}
      </button>
      <p className="text-[10px] text-lavanda/30">
        Tu contraseña se usa solo para obtener un token de tu cuenta y se guarda localmente. Bambu puede pedirte un código por email la primera vez.
      </p>
    </div>
  )
}
