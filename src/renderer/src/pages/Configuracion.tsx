import { useEffect, useState } from 'react'
import {
  Coins, Bell, Save, Check, Plus, X, FolderOpen, HardDriveDownload, Trash2, Undo2, RefreshCw, ExternalLink, Download, DollarSign
} from 'lucide-react'
import { api } from '../lib/api'
import type { UpdateStatus } from '../lib/api'
import { settingsFromMap, DEFAULT_COST_SETTINGS } from '../lib/calc'
import { setCurrencySymbol } from '../lib/format'
import type { CostSettings } from '../types'

type Section = 'costos' | 'app'

const TABS: { id: Section; label: string; icon: any }[] = [
  { id: 'costos', label: 'Costos', icon: Coins },
  { id: 'app', label: 'Aplicación', icon: Bell }
]

export default function Configuracion() {
  const [tab, setTab] = useState<Section>('costos')
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-niebla">Configuración</h1>
      <div className="flex flex-wrap gap-1.5 border-b border-lavanda/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              tab === t.id ? 'bg-purpura/20 text-ambar font-medium' : 'text-lavanda-light hover:bg-lavanda/5'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'costos' && (
        <div className="space-y-4">
          <CostosSection />
          <ListasSection />
          <CurrencySection />
        </div>
      )}
      {tab === 'app' && (
        <div className="space-y-4">
          <AppSection />
          <SlicerSection />
          <DatosSection />
          <UpdatesSection />
        </div>
      )}
    </div>
  )
}

const input =
  'w-full rounded-lg bg-navy border border-lavanda/15 px-3 py-2 text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-ambar/50'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs uppercase tracking-wide text-lavanda/40 mb-2">{children}</h2>
}

function SavedBtn({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
    >
      {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saved ? 'Guardado' : 'Guardar'}
    </button>
  )
}

/* ---------------- Costos ---------------- */
function CostosSection() {
  const [s, setS] = useState<CostSettings>(DEFAULT_COST_SETTINGS)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    api.getSettings().then((m) => setS(settingsFromMap(m)))
  }, [])
  const upd = (k: keyof CostSettings, v: string) => setS((p) => ({ ...p, [k]: parseFloat(v) || 0 }))
  async function save() {
    await Promise.all([
      api.setSetting('calc_precioKg', String(s.precioKg)),
      api.setSetting('calc_precioKwh', String(s.precioKwh)),
      api.setSetting('calc_consumoW', String(s.consumoW)),
      api.setSetting('calc_desgasteHoras', String(s.desgasteHoras)),
      api.setSetting('calc_precioRepuestos', String(s.precioRepuestos)),
      api.setSetting('calc_margenError', String(s.margenError))
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }
  const fields: [keyof CostSettings, string][] = [
    ['precioKg', 'Precio filamento ($/kg)'],
    ['precioKwh', 'Precio luz ($/kWh)'],
    ['consumoW', 'Consumo impresora (W)'],
    ['margenError', 'Margen de error (%)'],
    ['precioRepuestos', 'Precio repuestos ($)'],
    ['desgasteHoras', 'Vida útil máquina (horas)']
  ]
  return (
    <div className="max-w-2xl rounded-xl bg-navy border border-lavanda/10 p-5 space-y-4">
      <SectionTitle>Parámetros de costo</SectionTitle>
      <p className="text-sm text-lavanda/60">Estos valores alimentan la calculadora de costos.</p>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(([k, label]) => (
          <label key={k} className="block">
            <span className="text-xs text-lavanda/60 mb-1 block">{label}</span>
            <input type="number" value={s[k]} onChange={(e) => upd(k, e.target.value)} className={input} />
          </label>
        ))}
      </div>
      <SavedBtn onClick={save} saved={saved} />
    </div>
  )
}

/* ---------------- Materiales e Impresoras ---------------- */
function ListEditor({ title, settingKey, placeholder }: { title: string; settingKey: string; placeholder: string }) {
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    api.getSettings().then((m) => {
      try {
        setItems(m[settingKey] ? JSON.parse(m[settingKey]) : [])
      } catch {
        setItems([])
      }
    })
  }, [settingKey])
  async function persist(next: string[]) {
    setItems(next)
    await api.setSetting(settingKey, JSON.stringify(next))
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }
  function add() {
    const v = draft.trim()
    if (!v || items.includes(v)) return
    persist([...items, v])
    setDraft('')
  }
  return (
    <div className="rounded-xl bg-navy border border-lavanda/10 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-niebla">{title}</h3>
        {saved && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Guardado
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && <p className="text-xs text-lavanda/40">Sin elementos.</p>}
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between bg-navy-deep rounded-lg px-3 py-2">
            <span className="text-sm text-niebla">{it}</span>
            <button onClick={() => persist(items.filter((_, idx) => idx !== i))} className="text-lavanda/40 hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className={input}
        />
        <button onClick={add} className="px-3 rounded-lg bg-ambar/20 text-ambar hover:bg-ambar/30">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ListasSection() {
  return (
    <div className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
      <ListEditor title="Materiales" settingKey="materials" placeholder="PLA Negro, PETG..." />
      <ListEditor title="Impresoras" settingKey="printers" placeholder="BambuLab X1C..." />
    </div>
  )
}

/* ---------------- Moneda ---------------- */
function CurrencySection() {
  const [symbol, setSymbol] = useState('$')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    api.getSettings().then((m) => setSymbol(m.currency_symbol || '$'))
  }, [])
  async function save() {
    const v = symbol.trim() || '$'
    setSymbol(v)
    setCurrencySymbol(v)
    await api.setSetting('currency_symbol', v)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }
  return (
    <div className="max-w-2xl rounded-xl bg-navy border border-lavanda/10 p-5 space-y-3">
      <SectionTitle>Moneda</SectionTitle>
      <div className="flex items-end gap-3">
        <label className="w-40">
          <span className="text-xs text-lavanda/60 mb-1 block flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Símbolo
          </span>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className={input} placeholder="$" maxLength={6} />
        </label>
        <SavedBtn onClick={save} saved={saved} />
      </div>
      <p className="text-[11px] text-lavanda/40">Se usa en los precios (ej. {symbol} 1.234,56). Cambialo por US$, ARS, etc.</p>
    </div>
  )
}

/* ---------------- BambuStudio ---------------- */
function SlicerSection() {
  const [info, setInfo] = useState<{ path: string | null; exists: boolean }>({ path: null, exists: false })
  const load = () => api.getSlicerPath().then(setInfo)
  useEffect(() => {
    load()
  }, [])
  async function change() {
    const p = await api.setSlicerPath()
    if (p) load()
  }
  return (
    <div className="max-w-2xl rounded-xl bg-navy border border-lavanda/10 p-5 space-y-3">
      <SectionTitle>BambuStudio</SectionTitle>
      <p className="text-xs text-lavanda/60">Para abrir los modelos .3mf directamente en el slicer desde la ficha de cada modelo.</p>
      <div className="bg-navy-deep rounded-lg px-3 py-2 text-sm break-all">
        {info.path ? (
          <span className={info.exists ? 'text-niebla' : 'text-red-400'}>
            {info.path} {info.exists ? '' : '(no encontrado)'}
          </span>
        ) : (
          <span className="text-lavanda/40">No configurada (se usa la app por defecto del sistema).</span>
        )}
      </div>
      <button onClick={change} className="px-4 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light">
        Elegir ejecutable…
      </button>
    </div>
  )
}

/* ---------------- Datos + Backups ---------------- */
function DatosSection() {
  const [paths, setPaths] = useState<{ storageDir: string; backupsDir: string } | null>(null)
  const [backups, setBackups] = useState<{ name: string; size: number; mtime: number }[]>([])
  const [msg, setMsg] = useState('')

  const loadBackups = () => api.listBackups().then(setBackups)
  useEffect(() => {
    api.getPaths().then((p) => setPaths({ storageDir: p.storageDir, backupsDir: p.backupsDir }))
    loadBackups()
  }, [])

  async function backup() {
    await api.backupNow()
    setMsg('Backup creado.')
    setTimeout(() => setMsg(''), 3000)
    loadBackups()
  }
  async function restore(name: string) {
    if (!confirm(`Restaurar "${name}"?\n\nSe reemplazará la base actual (se guarda un resguardo) y la app se reiniciará.`)) return
    await api.restoreBackup(name)
  }
  async function del(name: string) {
    if (!confirm(`¿Borrar el backup "${name}"?`)) return
    await api.deleteBackup(name)
    loadBackups()
  }

  return (
    <div className="max-w-2xl rounded-xl bg-navy border border-lavanda/10 p-5 space-y-4">
      <SectionTitle>Datos y backups</SectionTitle>
      <div>
        <p className="text-xs text-lavanda/50 break-all">{paths?.storageDir || '—'}</p>
        <p className="text-[11px] text-lavanda/40 mt-1">Acá viven la base, los modelos, las imágenes y los backups (uno automático por día).</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => paths && api.openPath(paths.storageDir)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5"
        >
          <FolderOpen className="w-4 h-4" /> Abrir carpeta
        </button>
        <button
          onClick={backup}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
        >
          <HardDriveDownload className="w-4 h-4" /> Hacer backup ahora
        </button>
        {msg && <span className="text-xs text-green-400 self-center">{msg}</span>}
      </div>

      <div>
        <p className="text-xs text-lavanda/50 mb-2">Backups guardados ({backups.length})</p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {backups.length === 0 && <p className="text-xs text-lavanda/40">No hay backups.</p>}
          {backups.map((b) => (
            <div key={b.name} className="flex items-center gap-2 bg-navy-deep rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-niebla truncate">{b.name}</p>
                <p className="text-[10px] text-lavanda/40">
                  {new Date(b.mtime).toLocaleString('es-AR')} · {(b.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button onClick={() => restore(b.name)} className="flex items-center gap-1 text-[11px] text-ambar hover:text-ambar-light px-2 py-1" title="Restaurar este backup">
                <Undo2 className="w-3.5 h-3.5" /> Restaurar
              </button>
              <button onClick={() => del(b.name)} className="text-lavanda/40 hover:text-red-400" title="Borrar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Aplicación ---------------- */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-10 h-6 rounded-full transition-colors ${on ? 'bg-ambar' : 'bg-lavanda/20'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-navy-deep transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm text-niebla">{title}</p>
        {desc && <p className="text-xs text-lavanda/50 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function AppSection() {
  const [cfg, setCfg] = useState<{
    notifications: boolean
    closeBehavior: 'ask' | 'tray' | 'quit'
    startWithWindows: boolean
    startMinimized: boolean
  }>({ notifications: true, closeBehavior: 'ask', startWithWindows: false, startMinimized: false })

  useEffect(() => {
    api.getAppConfig().then(setCfg)
  }, [])

  async function setNotif(v: boolean) {
    setCfg((c) => ({ ...c, notifications: v }))
    await api.setNotifications(v)
  }
  async function setClose(v: 'ask' | 'tray' | 'quit') {
    setCfg((c) => ({ ...c, closeBehavior: v }))
    await api.setCloseBehavior(v)
  }
  async function setAuto(enabled: boolean, minimized: boolean) {
    setCfg((c) => ({ ...c, startWithWindows: enabled, startMinimized: minimized }))
    await api.setAutostart(enabled, minimized)
  }

  return (
    <div className="max-w-2xl rounded-xl bg-navy border border-lavanda/10 p-5">
      <SectionTitle>General</SectionTitle>
      <div className="divide-y divide-lavanda/10">
        <Row title="Notificaciones de escritorio" desc="Avisos cuando una impresora termina, falla o tiene un error.">
          <Toggle on={cfg.notifications} onChange={setNotif} />
        </Row>
        <Row title="Al cerrar la ventana" desc="Minimizar deja la app en segundo plano para seguir recibiendo notificaciones.">
          <select value={cfg.closeBehavior} onChange={(e) => setClose(e.target.value as any)} className={input + ' w-auto'}>
            <option value="ask">Preguntar siempre</option>
            <option value="tray">Minimizar a la bandeja</option>
            <option value="quit">Cerrar la aplicación</option>
          </select>
        </Row>
        <Row title="Iniciar con Windows" desc="Abre la Bodega automáticamente cuando prendés la PC.">
          <Toggle on={cfg.startWithWindows} onChange={(v) => setAuto(v, cfg.startMinimized)} />
        </Row>
        <Row title="Iniciar minimizado en la bandeja" desc="Arranca en segundo plano (sin abrir la ventana), solo el ícono de la bandeja.">
          <div className={cfg.startWithWindows ? '' : 'opacity-40 pointer-events-none'}>
            <Toggle on={cfg.startMinimized} onChange={(v) => setAuto(cfg.startWithWindows, v)} />
          </div>
        </Row>
      </div>
    </div>
  )
}

/* ---------------- Actualizaciones ---------------- */
function UpdatesSection() {
  const [version, setVersion] = useState('')
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    api.getAppVersion().then(setVersion)
    const off = api.onUpdateStatus((d) => {
      setStatus(d)
      if (d.state !== 'checking') setBusy(false)
    })
    return off
  }, [])

  async function check() {
    setNote('')
    setStatus(null)
    setBusy(true)
    const r = await api.checkUpdates()
    if (!r.packaged) {
      setBusy(false)
      setNote('Las actualizaciones automáticas funcionan en la app instalada (no en modo desarrollo).')
    }
  }

  const label = () => {
    switch (status?.state) {
      case 'checking':
        return 'Buscando actualizaciones…'
      case 'none':
        return 'Estás usando la última versión ✓'
      case 'available':
        return `Nueva versión disponible: v${status.version}`
      case 'downloading':
        return `Descargando… ${status.percent ?? 0}%`
      case 'downloaded':
        return `Versión v${status.version} lista para instalar`
      case 'error':
        return 'No se pudo verificar (revisá tu conexión).'
      default:
        return ''
    }
  }

  return (
    <div className="max-w-2xl rounded-xl bg-navy border border-lavanda/10 p-5 space-y-4">
      <SectionTitle>Actualizaciones</SectionTitle>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-lavanda/60">Versión instalada</p>
          <p className="text-2xl font-bold text-ambar mt-0.5">{version ? `v${version}` : '—'}</p>
        </div>
        <button
          onClick={check}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Buscar actualizaciones
        </button>
      </div>

      {label() && (
        <div className="rounded-lg bg-navy-deep px-3 py-2 text-sm text-lavanda-light flex items-center justify-between gap-3">
          <span>{label()}</span>
          {status?.state === 'available' && (
            <button
              onClick={() => api.downloadUpdate()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ambar text-navy-deep text-xs font-medium hover:bg-ambar-light shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Actualizar ahora
            </button>
          )}
          {status?.state === 'downloaded' && (
            <button
              onClick={() => api.installUpdate()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ambar text-navy-deep text-xs font-medium hover:bg-ambar-light shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reiniciar e instalar
            </button>
          )}
        </div>
      )}

      {note && <p className="text-xs text-lavanda/60">{note}</p>}

      <button onClick={() => api.openReleases()} className="flex items-center gap-2 text-xs text-lavanda/60 hover:text-ambar">
        <ExternalLink className="w-3.5 h-3.5" /> Ver todas las versiones en GitHub
      </button>
    </div>
  )
}
