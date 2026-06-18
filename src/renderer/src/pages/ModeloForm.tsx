import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Upload, FileBox, Save } from 'lucide-react'
import { api } from '../lib/api'
import { mediaUrl } from '../lib/media'
import type { Category } from '../types'

interface ImportedFile {
  id: string
  filePath: string
  fileName: string
  fileSize: number
  fileType: string
  thumbnailPath?: string | null
}

export default function ModeloForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const nav = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [imported, setImported] = useState<ImportedFile | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [horas, setHoras] = useState(0)
  const [minutos, setMinutos] = useState(0)
  const [gramos, setGramos] = useState(0)

  useEffect(() => {
    api.listCategories().then(setCategories)
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      api.getModel(id).then((m) => {
        if (!m) return
        setName(m.name)
        setCategoryId(m.categoryId || '')
        setTags(m.tags.join(', '))
        setDescription(m.description || '')
        setNotes(m.notes || '')
        setHoras(m.printTimeSeconds ? Math.floor(m.printTimeSeconds / 3600) : 0)
        setMinutos(m.printTimeSeconds ? Math.round((m.printTimeSeconds % 3600) / 60) : 0)
        setGramos(m.filamentGrams || 0)
      })
    }
  }, [isEdit, id])

  async function pickFile() {
    const paths = await api.pickModelFiles()
    if (!paths.length) return
    const info = await api.importModel(paths[0])
    setImported(info)
    setName((n) => n || info.suggestedName)
    if (info.printInfo.printTimeSeconds) {
      setHoras(Math.floor(info.printInfo.printTimeSeconds / 3600))
      setMinutos(Math.round((info.printInfo.printTimeSeconds % 3600) / 60))
    }
    if (info.printInfo.filamentGrams) setGramos(info.printInfo.filamentGrams)
  }

  async function save() {
    if (!name.trim()) {
      alert('El nombre es obligatorio.')
      return
    }
    const printTimeSeconds = horas * 3600 + minutos * 60 || null
    const filamentGrams = gramos || null
    setSaving(true)
    try {
      if (isEdit && id) {
        // (rama edición)
        await api.updateModel(id, {
          name: name.trim(),
          categoryId,
          tags,
          description,
          notes,
          printTimeSeconds,
          filamentGrams
        })
        nav(`/modelos/${id}`)
      } else {
        if (!imported) {
          alert('Importá un archivo 3D primero.')
          setSaving(false)
          return
        }
        await api.createModel({
          id: imported.id,
          name: name.trim(),
          filePath: imported.filePath,
          fileName: imported.fileName,
          fileSize: imported.fileSize,
          fileType: imported.fileType,
          categoryId,
          tags,
          description,
          notes,
          printTimeSeconds,
          filamentGrams,
          thumbnailPath: imported.thumbnailPath ?? null
        })
        nav(`/modelos/${imported.id}`)
      }
    } catch (e: any) {
      console.error('Error al guardar el modelo:', e)
      alert('No se pudo guardar el modelo:\n\n' + (e?.message || String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link to={isEdit ? `/modelos/${id}` : '/modelos'} className="flex items-center gap-2 text-sm text-lavanda/60 hover:text-niebla">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>
      <h1 className="font-display text-3xl font-bold text-niebla">{isEdit ? 'Editar modelo' : 'Nuevo modelo'}</h1>

      {!isEdit && (
        <div className="rounded-xl bg-navy border border-lavanda/10 p-5">
          {imported ? (
            <div className="flex items-center gap-3">
              {imported.thumbnailPath ? (
                <img
                  src={mediaUrl(imported.thumbnailPath)}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-lavanda/15"
                />
              ) : (
                <FileBox className="w-8 h-8 text-ambar" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-niebla truncate">{imported.fileName}</p>
                <p className="text-xs text-lavanda/50">
                  {(imported.fileSize / 1024 / 1024).toFixed(2)} MB · {imported.fileType.toUpperCase()}
                  {imported.thumbnailPath ? ' · preview detectada' : ''}
                </p>
              </div>
              <button onClick={pickFile} className="text-xs text-ambar hover:text-ambar-light">
                Cambiar
              </button>
            </div>
          ) : (
            <button
              onClick={pickFile}
              className="w-full flex flex-col items-center gap-2 py-8 border border-dashed border-lavanda/25 rounded-lg text-lavanda/50 hover:border-ambar/50 hover:text-ambar transition-colors"
            >
              <Upload className="w-7 h-7" />
              <span className="text-sm">Importar archivo 3D (.3mf, .stl, .obj)</span>
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Field label="Nombre *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Nombre del modelo" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags (separados por coma)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={input} placeholder="anime, katana, ..." />
          </Field>
        </div>

        <Field label="Descripción">
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Horas impresión">
            <input type="number" min={0} value={horas || ''} onChange={(e) => setHoras(parseInt(e.target.value) || 0)} className={input} />
          </Field>
          <Field label="Minutos">
            <input type="number" min={0} max={59} value={minutos || ''} onChange={(e) => setMinutos(parseInt(e.target.value) || 0)} className={input} />
          </Field>
          <Field label="Filamento (g)">
            <input type="number" min={0} step="0.1" value={gramos || ''} onChange={(e) => setGramos(parseFloat(e.target.value) || 0)} className={input} />
          </Field>
        </div>

        <Field label="Notas">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={input} />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ambar text-navy-deep font-medium text-sm hover:bg-ambar-light disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

const input =
  'w-full rounded-lg bg-navy border border-lavanda/15 px-3 py-2 text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-ambar/50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-lavanda/60 mb-1 block">{label}</span>
      {children}
    </label>
  )
}
