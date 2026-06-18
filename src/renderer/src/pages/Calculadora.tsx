import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calculator, Settings2, Save, Check } from 'lucide-react'
import { api } from '../lib/api'
import { calcCost, settingsFromMap, MULTIPLIERS, DEFAULT_COST_SETTINGS } from '../lib/calc'
import type { CostSettings, ModelDetail } from '../types'
import { formatARS } from '../lib/format'

export default function Calculadora() {
  const [params] = useSearchParams()
  const modelId = params.get('model')

  const [settings, setSettings] = useState<CostSettings>(DEFAULT_COST_SETTINGS)
  const [showConfig, setShowConfig] = useState(false)
  const [savedCfg, setSavedCfg] = useState(false)
  const [savedCost, setSavedCost] = useState(false)

  const [horas, setHoras] = useState(0)
  const [minutos, setMinutos] = useState(0)
  const [gramos, setGramos] = useState(0)
  const [insumos, setInsumos] = useState(0)
  const [mult, setMult] = useState(4)

  const [model, setModel] = useState<ModelDetail | null>(null)

  useEffect(() => {
    api.getSettings().then((m) => setSettings(settingsFromMap(m)))
  }, [])

  useEffect(() => {
    if (modelId) {
      api.getModel(modelId).then((m) => {
        if (!m) return
        setModel(m)
        if (m.printTimeSeconds) {
          setHoras(Math.floor(m.printTimeSeconds / 3600))
          setMinutos(Math.round((m.printTimeSeconds % 3600) / 60))
        }
        if (m.filamentGrams) setGramos(m.filamentGrams)
      })
    }
  }, [modelId])

  const result = useMemo(
    () => calcCost(settings, { horas, minutos, gramos, insumos }, mult),
    [settings, horas, minutos, gramos, insumos, mult]
  )

  async function saveConfig() {
    await Promise.all([
      api.setSetting('calc_precioKg', String(settings.precioKg)),
      api.setSetting('calc_precioKwh', String(settings.precioKwh)),
      api.setSetting('calc_consumoW', String(settings.consumoW)),
      api.setSetting('calc_desgasteHoras', String(settings.desgasteHoras)),
      api.setSetting('calc_precioRepuestos', String(settings.precioRepuestos)),
      api.setSetting('calc_margenError', String(settings.margenError))
    ])
    setSavedCfg(true)
    setTimeout(() => setSavedCfg(false), 1500)
  }

  async function saveCostToModel() {
    if (!modelId) return
    const costData = {
      ...result,
      multiplicador: mult,
      insumos,
      savedAt: new Date().toISOString()
    }
    await api.saveCost(modelId, {
      costData,
      filamentGrams: gramos || null,
      printTimeSeconds: horas * 3600 + minutos * 60 || null
    })
    setSavedCost(true)
    setTimeout(() => setSavedCost(false), 1500)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-niebla flex items-center gap-3">
          <Calculator className="w-7 h-7 text-ambar" /> Calculadora de costos
        </h1>
        {model && <p className="text-sm text-lavanda/60 mt-1">Costeando: <span className="text-ambar">{model.name}</span></p>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="rounded-xl bg-navy border border-lavanda/10 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-niebla">Datos de impresión</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horas">
                <input type="number" min={0} value={horas || ''} onChange={(e) => setHoras(parseFloat(e.target.value) || 0)} className={input} />
              </Field>
              <Field label="Minutos">
                <input type="number" min={0} max={59} value={minutos || ''} onChange={(e) => setMinutos(parseFloat(e.target.value) || 0)} className={input} />
              </Field>
              <Field label="Filamento (g)">
                <input type="number" min={0} step="0.1" value={gramos || ''} onChange={(e) => setGramos(parseFloat(e.target.value) || 0)} className={input} />
              </Field>
              <Field label="Insumos ($)">
                <input type="number" min={0} value={insumos || ''} onChange={(e) => setInsumos(parseFloat(e.target.value) || 0)} className={input} />
              </Field>
            </div>

            <div>
              <span className="text-xs text-lavanda/60 mb-1.5 block">Multiplicador</span>
              <div className="flex gap-2">
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => setMult(m.value)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      mult === m.value
                        ? 'bg-ambar text-navy-deep font-medium'
                        : 'bg-lavanda/5 text-lavanda-light hover:bg-lavanda/10'
                    }`}
                  >
                    {m.label}
                    <span className="block text-[10px] opacity-70">x{m.value}</span>
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={mult}
                  onChange={(e) => setMult(parseFloat(e.target.value) || 1)}
                  className="w-16 rounded-lg bg-navy border border-lavanda/15 px-2 text-sm text-center text-niebla focus:outline-none focus:border-ambar/50"
                />
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="rounded-xl bg-navy border border-lavanda/10">
            <button
              onClick={() => setShowConfig((s) => !s)}
              className="w-full flex items-center justify-between p-4 text-sm text-lavanda-light"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Configuración de costos
              </span>
              <span className="text-lavanda/40">{showConfig ? '−' : '+'}</span>
            </button>
            {showConfig && (
              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio filamento ($/kg)">
                    <input type="number" value={settings.precioKg} onChange={(e) => upd(setSettings, 'precioKg', e.target.value)} className={input} />
                  </Field>
                  <Field label="Precio luz ($/kWh)">
                    <input type="number" value={settings.precioKwh} onChange={(e) => upd(setSettings, 'precioKwh', e.target.value)} className={input} />
                  </Field>
                  <Field label="Consumo impresora (W)">
                    <input type="number" value={settings.consumoW} onChange={(e) => upd(setSettings, 'consumoW', e.target.value)} className={input} />
                  </Field>
                  <Field label="Margen de error (%)">
                    <input type="number" value={settings.margenError} onChange={(e) => upd(setSettings, 'margenError', e.target.value)} className={input} />
                  </Field>
                  <Field label="Precio repuestos ($)">
                    <input type="number" value={settings.precioRepuestos} onChange={(e) => upd(setSettings, 'precioRepuestos', e.target.value)} className={input} />
                  </Field>
                  <Field label="Vida útil (horas)">
                    <input type="number" value={settings.desgasteHoras} onChange={(e) => upd(setSettings, 'desgasteHoras', e.target.value)} className={input} />
                  </Field>
                </div>
                <button
                  onClick={saveConfig}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lavanda/10 text-sm text-lavanda-light hover:bg-lavanda/20"
                >
                  {savedCfg ? <Check className="w-4 h-4 text-green-400" /> : <Save className="w-4 h-4" />}
                  {savedCfg ? 'Guardado' : 'Guardar configuración'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl bg-navy border border-ambar/20 p-6 space-y-3 h-fit">
          <h2 className="text-sm font-semibold text-niebla mb-2">Desglose</h2>
          <Row label="Material" value={result.precioMaterial} />
          <Row label="Electricidad" value={result.precioLuz} />
          <Row label="Desgaste máquina" value={result.desgasteMaquina} />
          <Row label="Margen de error" value={result.margenErrorVal} />
          <div className="border-t border-lavanda/10 my-2" />
          <Row label="Precio de fabricación" value={result.subtotalSinInsumos} highlight />
          {insumos > 0 && <Row label="Insumos" value={insumos} />}
          <div className="rounded-lg bg-ambar/10 border border-ambar/20 p-3 mt-3 flex justify-between items-center">
            <span className="text-sm font-bold text-ambar">TOTAL A COBRAR</span>
            <span className="text-2xl font-bold text-ambar">$ {formatARS(result.totalACobrar)}</span>
          </div>
          <div className="rounded-lg bg-lavanda/5 p-3 flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-lavanda-light">Precio MercadoLibre</span>
              <p className="text-[10px] text-lavanda/40">Con comisión (x1.8)</p>
            </div>
            <span className="text-lg font-bold text-lavanda-light">$ {formatARS(result.precioML)}</span>
          </div>

          {modelId && (
            <button
              onClick={saveCostToModel}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
            >
              {savedCost ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedCost ? 'Costeo guardado' : 'Guardar costeo en el modelo'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const input =
  'w-full rounded-lg bg-navy-deep border border-lavanda/15 px-3 py-2 text-sm text-niebla focus:outline-none focus:border-ambar/50'

function upd(setter: React.Dispatch<React.SetStateAction<CostSettings>>, key: keyof CostSettings, val: string) {
  setter((s) => ({ ...s, [key]: parseFloat(val) || 0 }))
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-lavanda/60 mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={highlight ? 'text-niebla font-medium' : 'text-lavanda/70'}>{label}</span>
      <span className={highlight ? 'text-niebla font-semibold' : 'text-niebla'}>$ {formatARS(value)}</span>
    </div>
  )
}
