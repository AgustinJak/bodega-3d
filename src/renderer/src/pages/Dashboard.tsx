import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Layers, Tag, Printer, Calculator, Plus } from 'lucide-react'
import { api } from '../lib/api'
import type { PrinterState } from '../lib/api'
import { formatInt } from '../lib/format'
import type { Stats, ModelListItem } from '../types'
import ModelCard from '../components/ModelCard'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<ModelListItem[]>([])
  const [printers, setPrinters] = useState<PrinterState[]>([])
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.getStats().then(setStats)
    api.listModels().then((m) => setRecent(m.slice(0, 6)))
    api.bambuStatus().then((s) => setPrinters(s.printers))
    api.getSettings().then((m) => {
      try {
        if (m.bambu_hidden) setHidden(new Set(JSON.parse(m.bambu_hidden)))
      } catch {
        /* noop */
      }
    })
    const off = api.onBambuUpdate(setPrinters)
    return off
  }, [])

  const visible = printers.filter((p) => !hidden.has(p.serial))
  const printing = visible.filter((p) => p.state === 'RUNNING' || p.state === 'PREPARE').length
  const withError = visible.filter((p) => p.errorText || p.state === 'FAILED').length
  const offline = visible.filter((p) => p.state === 'OFFLINE').length
  const free = visible.length - printing - withError - offline

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

      {visible.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-niebla">Impresoras</h2>
            <Link to="/impresoras" className="text-sm text-ambar hover:text-ambar-light">
              Ver panel →
            </Link>
          </div>
          <div className="rounded-xl bg-navy border border-lavanda/10 p-5 flex flex-wrap gap-x-8 gap-y-3">
            <FarmStat label="Imprimiendo" value={printing} color="text-ambar" dot="bg-ambar" />
            <FarmStat label="Libres" value={free} color="text-lavanda-light" dot="bg-lavanda" />
            <FarmStat label="Con error" value={withError} color="text-red-400" dot="bg-red-400" />
            {offline > 0 && <FarmStat label="Apagadas" value={offline} color="text-lavanda/40" dot="bg-lavanda/30" />}
            <div className="ml-auto flex items-center text-sm text-lavanda/40">{visible.length} en total</div>
          </div>
        </section>
      )}

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

function FarmStat({ label, value, color, dot }: { label: string; value: number; color: string; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-sm text-lavanda/60">{label}</span>
    </div>
  )
}
