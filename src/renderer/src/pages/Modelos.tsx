import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, PackageOpen, Download, Upload, Loader2 } from 'lucide-react'
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

  async function exportAll() {
    setBusy('export')
    try {
      const r = await api.exportModels()
      if (r.ok) alert(`Se exportaron ${r.count} modelos a:\n${r.path}\n\nPasale ese archivo .zip a tu amigo para que lo importe.`)
      else if (!r.canceled) alert('No se pudo exportar.')
    } finally {
      setBusy('')
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
            onClick={importBundle}
            disabled={!!busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5 disabled:opacity-50"
            title="Importar modelos de un amigo (.zip)"
          >
            {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar
          </button>
          <button
            onClick={exportAll}
            disabled={!!busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5 disabled:opacity-50"
            title="Exportar todos tus modelos a un .zip para compartir"
          >
            {busy === 'export' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exportar
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
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}
    </div>
  )
}
