import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, PackageOpen, Download, Upload, Loader2, CheckSquare } from 'lucide-react'
import { api } from '../lib/api'
import type { ModelListItem, Category } from '../types'
import ModelCard from '../components/ModelCard'

export default function Modelos() {
  const [models, setModels] = useState<ModelListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'' | 'export' | 'import'>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [progress, setProgress] = useState<{ phase: 'export' | 'import'; current: number; total: number; name: string } | null>(null)

  useEffect(() => {
    const off = api.onMigrationProgress((p) => setProgress(p))
    return off
  }, [])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const load = useCallback(() => {
    setLoading(true)
    api.listModels({ search: search || undefined, categoryId: categoryId || undefined }).then((m) => {
      setModels(m)
      setLoading(false)
    })
  }, [search, categoryId])

  useEffect(() => {
    api.listCategories().then(setCategories)
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 180)
    return () => clearTimeout(t)
  }, [load])

  async function exportModels() {
    setBusy('export')
    try {
      const ids = selected.size ? [...selected] : undefined
      const r = await api.exportModels(ids)
      if (r.ok) {
        alert(`Se exportaron ${r.count} modelos a:\n${r.path}\n\nPasale ese archivo .zip a tu amigo para que lo importe.`)
        setSelected(new Set())
        setSelectMode(false)
      } else if (!r.canceled) alert('No se pudo exportar.')
    } finally {
      setBusy('')
      setProgress(null)
    }
  }
  async function importBundle() {
    setBusy('import')
    try {
      const r = await api.importBundle()
      if (r.ok) {
        alert(`Se importaron ${r.imported} modelos${r.skipped ? ` (${r.skipped} ya existían y se saltaron)` : ''}.`)
        load()
      } else if (!r.canceled) {
        alert('No se pudo importar: ' + (r.error || ''))
      }
    } finally {
      setBusy('')
      setProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-niebla">Modelos</h1>
          <p className="text-sm text-lavanda/60 mt-1">{models.length} modelos en la biblioteca</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectMode((s) => !s)
              setSelected(new Set())
            }}
            disabled={!!busy}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm disabled:opacity-50 ${
              selectMode ? 'border-ambar/50 text-ambar bg-ambar/10' : 'border-lavanda/20 text-lavanda-light hover:bg-lavanda/5'
            }`}
            title="Elegir modelos para exportar"
          >
            <CheckSquare className="w-4 h-4" /> {selectMode ? `Seleccionados: ${selected.size}` : 'Seleccionar'}
          </button>
          <button
            onClick={importBundle}
            disabled={!!busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5 disabled:opacity-50"
            title="Importar modelos de un amigo (.zip)"
          >
            {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar
          </button>
          <button
            onClick={exportModels}
            disabled={!!busy || (selectMode && selected.size === 0)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5 disabled:opacity-50"
            title={selectMode ? 'Exportar los modelos seleccionados' : 'Exportar todos tus modelos a un .zip'}
          >
            {busy === 'export' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {selectMode ? `Exportar (${selected.size})` : 'Exportar'}
          </button>
          <Link
            to="/modelos/nuevo"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
          >
            <Plus className="w-4 h-4" /> Nuevo modelo
          </Link>
        </div>
      </header>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavanda/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelo de la biblioteca..."
            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-navy border border-lavanda/15 text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-ambar/50"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-navy border border-lavanda/15 text-sm text-niebla focus:outline-none focus:border-ambar/50"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.modelCount ?? 0})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-lavanda/50 py-12 text-center">Cargando…</p>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen className="w-12 h-12 text-lavanda/20 mb-3" />
          <p className="text-niebla font-medium">No hay modelos</p>
          <p className="text-sm text-lavanda/50 mt-1">Importá tu primer modelo 3D para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {models.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              selectable={selectMode}
              selected={selected.has(m.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {progress && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fade_0.12s_ease-out]">
          <div className="w-[380px] max-w-[90vw] rounded-2xl bg-navy border border-lavanda/15 shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              {progress.phase === 'export' ? (
                <Download className="w-5 h-5 text-ambar" />
              ) : (
                <Upload className="w-5 h-5 text-ambar" />
              )}
              <h2 className="font-display text-lg font-bold text-niebla">
                {progress.phase === 'export' ? 'Exportando…' : 'Importando…'}
              </h2>
            </div>
            <p className="text-xs text-lavanda/60 truncate" title={progress.name}>
              {progress.current}/{progress.total} · {progress.name}
            </p>
            <div className="mt-3 h-2 rounded-full bg-lavanda/10 overflow-hidden">
              <div
                className="h-full bg-ambar transition-all duration-200"
                style={{ width: `${progress.total ? Math.round((progress.current / progress.total) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
