import { randomUUID } from 'crypto'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, statSync, writeFileSync } from 'fs'
import AdmZip from 'adm-zip'
import { getStorageDir } from './db'

export interface PrintInfo {
  printTimeSeconds: number | null
  filamentGrams: number | null
}

export interface Extracted3mf extends PrintInfo {
  thumbnail: Buffer | null
}

/** Extrae del .3mf de Bambu/Orca los datos del slicer (tiempo + gramos) y la miniatura. */
export function extract3mfInfo(filePath: string): Extracted3mf {
  const out: Extracted3mf = { printTimeSeconds: null, filamentGrams: null, thumbnail: null }
  try {
    if (extname(filePath).toLowerCase() !== '.3mf') return out
    const zip = new AdmZip(filePath)
    const entries = zip.getEntries()
    const byName = new Map(entries.map((e) => [e.entryName.replace(/\\/g, '/'), e]))

    // slice_info.config → tiempo (prediction) + peso (weight). Sólo presente si el .3mf está sliceado.
    const sliceEntry =
      byName.get('Metadata/slice_info.config') ||
      entries.find((e) => e.entryName.toLowerCase().includes('slice_info'))
    if (sliceEntry) {
      const xml = sliceEntry.getData().toString('utf8')
      // Sumar TODAS las placas (un proyecto con varias placas tiene varios prediction/weight)
      const preds = [...xml.matchAll(/key\s*=\s*"prediction"\s+value\s*=\s*"(\d+)"/g)].map((m) => parseInt(m[1], 10))
      if (preds.length) out.printTimeSeconds = preds.reduce((a, b) => a + b, 0)
      const weights = [...xml.matchAll(/key\s*=\s*"weight"\s+value\s*=\s*"([\d.]+)"/g)].map((m) => parseFloat(m[1]))
      if (weights.length) out.filamentGrams = Math.round(weights.reduce((a, b) => a + b, 0) * 100) / 100
    }

    // miniatura/preview del modelo (la genera el slicer)
    const candidates = [
      'Auxiliaries/.thumbnails/thumbnail_middle.png',
      'Metadata/plate_1.png',
      'Auxiliaries/.thumbnails/thumbnail_3mf.png',
      'Metadata/top_1.png',
      'Auxiliaries/.thumbnails/thumbnail_small.png'
    ]
    let thumbEntry = candidates.map((n) => byName.get(n)).find(Boolean)
    if (!thumbEntry) {
      thumbEntry = entries.find(
        (e) => /(plate_\d+|thumbnail).*\.png$/i.test(e.entryName) && !/no_light|pick_/i.test(e.entryName)
      )
    }
    if (thumbEntry) {
      const data = thumbEntry.getData()
      if (data && data.length > 0) out.thumbnail = data
    }
  } catch (e) {
    console.error('extract3mfInfo failed:', e)
  }
  return out
}

export function getPrintInfoFromPath(filePath: string): PrintInfo {
  const r = extract3mfInfo(filePath)
  return { printTimeSeconds: r.printTimeSeconds, filamentGrams: r.filamentGrams }
}

/** Copia un modelo a storage/models/<id>/, extrae datos del slicer y guarda la miniatura del .3mf. */
export function importModelFile(sourcePath: string): {
  id: string
  filePath: string
  fileName: string
  fileSize: number
  fileType: string
  printInfo: PrintInfo
  thumbnailPath: string | null
} {
  const id = randomUUID()
  const fileName = basename(sourcePath)
  const fileType = extname(sourcePath).replace('.', '').toLowerCase()
  const modelDir = join(getStorageDir(), 'models', id)
  mkdirSync(modelDir, { recursive: true })
  const dest = join(modelDir, fileName)
  copyFileSync(sourcePath, dest)
  const fileSize = statSync(dest).size

  const info = extract3mfInfo(dest)
  let thumbnailPath: string | null = null
  if (info.thumbnail) {
    const tp = join(modelDir, 'preview.png')
    writeFileSync(tp, info.thumbnail)
    thumbnailPath = tp
  }

  return {
    id,
    filePath: dest,
    fileName,
    fileSize,
    fileType,
    printInfo: { printTimeSeconds: info.printTimeSeconds, filamentGrams: info.filamentGrams },
    thumbnailPath
  }
}

/** Copia una imagen a la carpeta del modelo. */
export function importImage(modelId: string, sourcePath: string): { fileName: string; filePath: string } {
  const modelDir = join(getStorageDir(), 'models', modelId)
  mkdirSync(modelDir, { recursive: true })
  const ext = extname(sourcePath) || '.png'
  const fileName = `${randomUUID()}${ext}`
  const dest = join(modelDir, fileName)
  copyFileSync(sourcePath, dest)
  return { fileName, filePath: dest }
}

export function modelDirExists(id: string): boolean {
  return existsSync(join(getStorageDir(), 'models', id))
}
