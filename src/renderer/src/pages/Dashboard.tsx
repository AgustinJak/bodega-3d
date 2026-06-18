import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Layers, Tag, Printer, Calculator, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { formatInt } from '../lib/format'
import type { Stats, ModelListItem } from '../types'
import ModelCard from '../components/ModelCard'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<ModelListItem[]>([])

  useEffect(() => {
    api.getStats().then(setStats)
    api.listModels().then((m) => setRecent(m.slice(0, 6)))
  }, [])

  const cards = [
    { label: 'Modelos', value: stats?.models, icon: Boxes, color: 'text-ambar' },
    { label: 'Total impresiones', value: stats?.totalPrints, icon: Printer, color: 'text-lavanda-light' },
    { label: 'Categorías', value: stats?.categories, icon: Layers, color: 'text-purpura' },
    { label: 'Tags', value: stats?.tags, icon: Tag, color: 'text-ambar-light' }
  ]

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-niebla">Dashboard</h1>
          <p className="text-sm text-lavanda/60 mt-1">Resumen de tu bodega de modelos 3D</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/calculadora"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5 transition-colors"
          >
            <Calculator className="w-4 h-4" /> Calculadora
          </Link>
          <Link
            to="/modelos/nuevo"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo modelo
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-navy border border-lavanda/10 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-lavanda/50">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="mt-3 text-3xl font-bold text-niebla">{c.value != null ? formatInt(c.value) : '—'}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-niebla">Últimos modelos</h2>
          <Link to="/modelos" className="text-sm text-ambar hover:text-ambar-light">
            Ver todos →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-lavanda/50">No hay modelos todavía.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recent.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
