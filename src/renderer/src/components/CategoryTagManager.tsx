import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Category, Tag } from '../types'

const input =
  'w-full rounded-lg bg-navy-deep border border-lavanda/15 px-3 py-2 text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-ambar/50'

export default function CategoryTagManager() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-niebla mb-2">Categorías</h3>
        <Categorias />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-niebla mb-2">Tags</h3>
        <Tags />
      </div>
    </div>
  )
}

function Categorias() {
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
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <label className="flex-1">
          <span className="text-xs text-lavanda/60 mb-1 block">Nueva categoría</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className={input} placeholder="Nombre" onKeyDown={(e) => e.key === 'Enter' && create()} />
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
    <div className="flex items-center gap-3 bg-navy-deep border border-lavanda/10 rounded-lg px-3 py-2">
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

function Tags() {
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
    <div className="flex flex-wrap gap-2">
      {tags.length === 0 && <p className="text-sm text-lavanda/40">No hay tags.</p>}
      {tags.map((t) => (
        <div key={t.id} className="flex items-center gap-2 bg-navy-deep border border-lavanda/10 rounded-lg pl-3 pr-2 py-1.5">
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
