import { useEffect, useState } from 'react'
import {
  Coins, Boxes, Tag as TagIcon, Layers, Layers3, Database, Save, Check, Plus, Trash2, Pencil, FolderOpen, HardDriveDownload, X, RefreshCw, ExternalLink, Download
} from 'lucide-react'
import { api } from '../lib/api'
import type { UpdateStatus } from '../lib/api'
import { settingsFromMap, DEFAULT_COST_SETTINGS } from '../lib/calc'
import type { CostSettings, Category, Tag } from '../types'

type Section = 'costos' | 'listas' | 'categorias' | 'tags' | 'slicer' | 'datos' | 'updates'

const TABS: { id: Section; label: string; icon: any }[] = [
  { id: 'costos', label: 'Costos', icon: Coins },
  { id: 'listas', label: 'Materiales e impresoras', icon: Boxes },
  { id: 'categorias', label: 'Categorías', icon: Layers },
  { id: 'tags', label: 'Tags', icon: TagIcon },
  { id: 'slicer', label: 'BambuStudio', icon: Layers3 },
  { id: 'datos', label: 'Datos', icon: Database },
  { id: 'updates', label: 'Actualizaciones', icon: RefreshCw }
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
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === t.id ? 'bg-purpura/20 text-ambar font-medium' : 'text-lavanda-light hover:bg-lavanda/5'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'costos' && <CostosSection />}
      {tab === 'listas' && <ListasSection />}
      {tab === 'categorias' && <CategoriasSection />}
      {tab === 'tags' && <TagsSection />}
      {tab === 'slicer' && <SlicerSection />}
      {tab === 'datos' && <DatosSection />}
      {tab === 'updates' && <UpdatesSection />}
    </div>
  )
}

const input =
  'w-full rounded-lg bg-navy border border-lavanda/15 px-3 py-2 text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-ambar/50'

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

/* ---------------- Categorías ---------------- */
function CategoriasSection() {
  const [cats, setCats] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#8B85B2')
  const load = () => api.listCategories().then(setCats)
  useEffect(() => {
    load()
  }, [])
  async function create() {
    if (!newName.trim()) return
    await api.createCategory({ name: newName.trim(), color: newColor })
    setNewName('')
    load()
  }
  async function del(c: Category) {
    if (!confirm(`¿Borrar la categoría "${c.name}"? Los modelos quedarán sin categoría.`)) return
    await api.deleteCategory(c.id)
    load()
  }
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl bg-navy border border-lavanda/10 p-4 flex gap-2 items-end">
        <label className="flex-1">
          <span className="text-xs text-lavanda/60 mb-1 block">Nueva categoría</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className={input} placeholder="Nombre" />
        </label>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-10 h-10 rounded-lg bg-navy border border-lavanda/15 cursor-pointer"
          title="Color"
        />
        <button onClick={create} className="px-4 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {cats.map((c) => (
          <CategoryRow key={c.id} cat={c} onChanged={load} onDelete={() => del(c)} />
        ))}
      </div>
    </div>
  )
}

function CategoryRow({ cat, onChanged, onDelete }: { cat: Category; onChanged: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(cat.name)
  const [color, setColor] = useState(cat.color || '#8B85B2')
  async function save() {
    await api.updateCategory(cat.id, { name: name.trim(), color })
    setEditing(false)
    onChanged()
  }
  return (
    <div className="flex items-center gap-3 bg-navy border border-lavanda/10 rounded-lg px-3 py-2">
      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#8B85B2' }} />
      {editing ? (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} flex-1`} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
          <button onClick={save} className="text-ambar hover:text-ambar-light">
            <Check className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-niebla">{cat.name}</span>
          <span className="text-xs text-lavanda/40">{cat.modelCount ?? 0} modelos</span>
          <button onClick={() => setEditing(true)} className="text-lavanda/50 hover:text-niebla">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-lavanda/50 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}

/* ---------------- Tags ---------------- */
function TagsSection() {
  const [tags, setTags] = useState<Tag[]>([])
  const load = () => api.listTags().then(setTags)
  useEffect(() => {
    load()
  }, [])
  async function rename(t: Tag) {
    const name = prompt('Nuevo nombre del tag:', t.name)
    if (!name || !name.trim() || name.trim() === t.name) return
    try {
      await api.renameTag(t.id, name.trim())
      load()
    } catch {
      alert('Ya existe un tag con ese nombre.')
    }
  }
  async function del(t: Tag) {
    if (!confirm(`¿Borrar el tag "${t.name}"? Se quitará de ${t.modelCount ?? 0} modelo(s).`)) return
    await api.deleteTag(t.id)
    load()
  }
  return (
    <div className="max-w-2xl flex flex-wrap gap-2">
      {tags.length === 0 && <p className="text-sm text-lavanda/40">No hay tags.</p>}
      {tags.map((t) => (
        <div key={t.id} className="flex items-center gap-2 bg-navy border border-lavanda/10 rounded-lg pl-3 pr-2 py-1.5">
          <span className="text-sm text-niebla">{t.name}</span>
          <span className="text-[10px] text-lavanda/40">{t.modelCount ?? 0}</span>
          <button onClick={() => rename(t)} className="text-lavanda/40 hover:text-niebla">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => del(t)} className="text-lavanda/40 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
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
      <h3 className="text-sm font-semibold text-niebla">Ruta de BambuStudio</h3>
      <p className="text-xs text-lavanda/60">
        Se usa para abrir los modelos .3mf directamente en el slicer desde la ficha de cada modelo.
      </p>
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

/* ---------------- Datos ---------------- */
function DatosSection() {
  const [paths, setPaths] = useState<{ storageDir: string; backupsDir: string } | null>(null)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    api.getPaths().then((p) => setPaths({ storageDir: p.storageDir, backupsDir: p.backupsDir }))
  }, [])
  async function backup() {
    const dest = await api.backupNow()
    setMsg(`Backup creado: ${dest}`)
    setTimeout(() => setMsg(''), 4000)
  }
  return (
    <div className="max-w-2xl rounded-xl bg-navy border border-lavanda/10 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-niebla mb-1">Carpeta de datos</h3>
        <p className="text-xs text-lavanda/50 break-all">{paths?.storageDir || '—'}</p>
        <p className="text-[11px] text-lavanda/40 mt-1">
          Acá viven la base de datos, los modelos, las imágenes y los backups automáticos (uno por día).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => paths && api.openPath(paths.storageDir)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5"
        >
          <FolderOpen className="w-4 h-4" /> Abrir carpeta de datos
        </button>
        <button
          onClick={() => paths && api.openPath(paths.backupsDir)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5"
        >
          <FolderOpen className="w-4 h-4" /> Ver backups
        </button>
        <button
          onClick={backup}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
        >
          <HardDriveDownload className="w-4 h-4" /> Hacer backup ahora
        </button>
      </div>
      {msg && <p className="text-xs text-green-400 break-all">{msg}</p>}
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-niebla">Versión instalada</h3>
          <p className="text-2xl font-bold text-ambar mt-1">{version ? `v${version}` : '—'}</p>
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

      <button
        onClick={() => api.openReleases()}
        className="flex items-center gap-2 text-xs text-lavanda/60 hover:text-ambar"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Ver todas las versiones en GitHub
      </button>
    </div>
  )
}
