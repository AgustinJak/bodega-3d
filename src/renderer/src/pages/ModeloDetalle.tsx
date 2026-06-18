import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Trash2, Printer, Plus, Minus, Calculator, ImagePlus, ImageOff, Star, X, Layers, FolderOpen
} from 'lucide-react'
import { api } from '../lib/api'
import type { ModelDetail } from '../types'
import { mediaUrl } from '../lib/media'
import { formatARS, formatGrams, formatInt, formatPrintTime } from '../lib/format'

export default function ModeloDetalle() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [model, setModel] = useState<ModelDetail | null>(null)
  const [active, setActive] = useState(0)

  const load = useCallback(() => {
    if (id) api.getModel(id).then((m) => setModel(m))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!model) return <p className="text-sm text-lavanda/50">Cargando…</p>

  const cost = model.costData ? safeParse(model.costData) : null
  const images = model.images
  const mainImg = images[active]?.filePath || model.thumbnailPath

  async function changePrint(delta: number) {
    if (!id) return
    await api.incrementPrint(id, delta)
    load()
  }

  async function addImages() {
    if (!id) return
    const paths = await api.pickImages()
    if (paths.length) {
      await api.addImages(id, paths)
      load()
    }
  }

  async function removeImage(imageId: string) {
    await api.deleteImage(imageId)
    setActive(0)
    load()
  }

  async function del() {
    if (!id) return
    if (!confirm(`¿Eliminar "${model!.name}"? Esta acción no se puede deshacer.`)) return
    await api.deleteModel(id)
    nav('/modelos')
  }

  async function openInBambu() {
    if (!model) return
    const res = await api.openInSlicer(model.filePath)
    if (res.ok && !res.needsPath) return
    // Couldn't find BambuStudio (or opened with default app and no path set): offer to configure it
    const msg = res.ok
      ? 'Se abrió con la app predeterminada. ¿Querés elegir el ejecutable de BambuStudio para abrirlo siempre con él?'
      : `No se pudo abrir en BambuStudio${res.error ? `: ${res.error}` : ''}. ¿Querés seleccionar el ejecutable de BambuStudio?`
    if (!confirm(msg)) return
    const picked = await api.setSlicerPath()
    if (picked) {
      const r2 = await api.openInSlicer(model.filePath)
      if (!r2.ok) alert(`No se pudo abrir: ${r2.error || ''}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/modelos" className="flex items-center gap-2 text-sm text-lavanda/60 hover:text-niebla">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <div className="flex gap-2">
          <button
            onClick={openInBambu}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light"
            title="Abrir el .3mf en BambuStudio"
          >
            <Layers className="w-4 h-4" /> Abrir en BambuStudio
          </button>
          <button
            onClick={() => api.showInFolder(model.filePath)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5"
            title="Mostrar el archivo en el explorador"
          >
            <FolderOpen className="w-4 h-4" /> Ver archivo
          </button>
          <Link
            to={`/calculadora?model=${model.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5"
          >
            <Calculator className="w-4 h-4" /> Calcular costo
          </Link>
          <Link
            to={`/modelos/${model.id}/editar`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-lavanda/20 text-sm text-lavanda-light hover:bg-lavanda/5"
          >
            <Pencil className="w-4 h-4" /> Editar
          </Link>
          <button
            onClick={del}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="aspect-square rounded-xl bg-navy border border-lavanda/10 flex items-center justify-center overflow-hidden">
            {mainImg ? (
              <img src={mediaUrl(mainImg)} alt={model.name} className="w-full h-full object-contain" />
            ) : (
              <ImageOff className="w-12 h-12 text-lavanda/20" />
            )}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((img, i) => (
              <div key={img.id} className="relative group">
                <button
                  onClick={() => setActive(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border ${
                    i === active ? 'border-ambar' : 'border-lavanda/15'
                  }`}
                >
                  <img src={mediaUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                </button>
                <button
                  onClick={() => api.setThumbnail(model.id, img.filePath).then(load)}
                  title="Usar como portada"
                  className="absolute -top-1.5 -left-1.5 bg-navy-deep rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star className="w-3 h-3 text-ambar" />
                </button>
                <button
                  onClick={() => removeImage(img.id)}
                  title="Quitar"
                  className="absolute -top-1.5 -right-1.5 bg-navy-deep rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
            <button
              onClick={addImages}
              className="w-16 h-16 rounded-lg border border-dashed border-lavanda/25 flex items-center justify-center text-lavanda/40 hover:border-ambar/50 hover:text-ambar"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            {model.categoryName && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: (model.categoryColor || '#8B85B2') + '33',
                  color: model.categoryColor || '#B8B3D1'
                }}
              >
                {model.categoryName}
              </span>
            )}
            <h1 className="font-display text-3xl font-bold text-niebla mt-3">{model.name}</h1>
            {model.description && <p className="text-sm text-lavanda/70 mt-2">{model.description}</p>}
          </div>

          {model.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {model.tags.map((t) => (
                <span key={t} className="text-xs text-lavanda-light bg-lavanda/8 px-2 py-1 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Info label="Archivo" value={`${model.fileName}`} />
            <Info label="Tipo" value={model.fileType?.toUpperCase()} />
            <Info label="Tiempo impresión" value={formatPrintTime(model.printTimeSeconds)} />
            <Info label="Filamento" value={formatGrams(model.filamentGrams)} />
          </div>

          {/* Print counter */}
          <div className="rounded-xl bg-navy border border-lavanda/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-lavanda-light">
              <Printer className="w-4 h-4 text-ambar" /> Impresiones
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => changePrint(-1)} className="p-1.5 rounded-md bg-lavanda/10 hover:bg-lavanda/20">
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-bold text-niebla w-10 text-center">{formatInt(model.printCount)}</span>
              <button onClick={() => changePrint(1)} className="p-1.5 rounded-md bg-ambar/20 text-ambar hover:bg-ambar/30">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cost */}
          {cost && (
            <div className="rounded-xl bg-navy border border-ambar/20 p-4 space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-ambar/70 mb-2">Costeo guardado</p>
              <Row label="Precio de fabricación" value={cost.subtotalSinInsumos} />
              {cost.insumos > 0 && <Row label="Insumos" value={cost.insumos} />}
              <div className="flex justify-between items-center pt-2 border-t border-lavanda/10">
                <span className="text-sm font-semibold text-ambar">Total a cobrar</span>
                <span className="text-lg font-bold text-ambar">$ {formatARS(cost.totalACobrar)}</span>
              </div>
              {cost.precioML != null && (
                <div className="flex justify-between items-center text-xs text-lavanda/60">
                  <span>Precio MercadoLibre (x1.8)</span>
                  <span>$ {formatARS(cost.precioML)}</span>
                </div>
              )}
            </div>
          )}

          {model.notes && (
            <div>
              <p className="text-xs uppercase tracking-wide text-lavanda/40 mb-1">Notas</p>
              <p className="text-sm text-lavanda/80 whitespace-pre-wrap">{model.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-navy border border-lavanda/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-lavanda/40">{label}</p>
      <p className="text-sm text-niebla truncate" title={value}>
        {value || '—'}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-lavanda/70">{label}</span>
      <span className="text-niebla font-medium">$ {formatARS(value)}</span>
    </div>
  )
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
