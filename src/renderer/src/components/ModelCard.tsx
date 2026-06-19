import { Link } from 'react-router-dom'
import { Box, Printer, ImageOff, Check } from 'lucide-react'
import type { ModelListItem } from '../types'
import { mediaUrl } from '../lib/media'

export default function ModelCard({
  model,
  selectable,
  selected,
  onToggleSelect
}: {
  model: ModelListItem
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const thumb = mediaUrl(model.thumbnailPath)
  const tags = (model.tagNames || '').split(',').filter(Boolean).slice(0, 3)

  return (
    <Link
      to={`/modelos/${model.id}`}
      className={`lift group rounded-xl bg-navy border overflow-hidden ${
        selected ? 'border-ambar' : 'border-lavanda/10 hover:border-ambar/40'
      }`}
    >
      <div className="aspect-square bg-navy-deep relative flex items-center justify-center overflow-hidden">
        {selectable && (
          <button
            onClick={(ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              onToggleSelect?.(model.id)
            }}
            className={`absolute bottom-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
              selected
                ? 'bg-ambar border-ambar text-navy-deep'
                : 'bg-navy-deep/80 border-lavanda/40 text-transparent hover:border-ambar'
            }`}
            title={selected ? 'Quitar de la selección' : 'Seleccionar'}
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        {thumb ? (
          <img src={thumb} alt={model.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
        ) : (
          <ImageOff className="w-10 h-10 text-lavanda/20" />
        )}
        {model.categoryName && (
          <span
            className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: (model.categoryColor || '#8B85B2') + '33',
              color: model.categoryColor || '#B8B3D1'
            }}
          >
            {model.categoryName}
          </span>
        )}
        {model.printCount > 0 && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-niebla bg-navy-deep/80 px-2 py-0.5 rounded-full">
            <Printer className="w-3 h-3" /> {model.printCount}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-lavanda/40 shrink-0" />
          <h3 className="text-sm font-medium text-niebla truncate" title={model.name}>
            {model.name}
          </h3>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((t) => (
              <span key={t} className="text-[10px] text-lavanda/60 bg-lavanda/5 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
