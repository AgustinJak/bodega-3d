import { randomUUID } from 'crypto'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, statSync } from 'fs'
import AdmZip from 'adm-zip'
import { getStorageDir } from './db'

export interface PrintInfo {
  printTimeSeconds: number | null
  filamentGrams: number | null
}

/** Parse a .3mf (Bambu/Orca slice metadata) for print time + filament weight. */
export function getPrintInfoFromPath(filePath: string): PrintInfo {
  const result: PrintInfo = { printTimeSeconds: null, filamentGrams: null }
  try {
    if (extname(filePath).toLowerCase() !== '.3mf') return result
    const entries = new AdmZip(filePath).getEntries()
    for (const entry of entries) {
      const name = entry.entryName
      if (name === 'Metadata/slice_info.config' || name.toLowerCase().includes('slice_info')) {
        const xml = entry.getData().toString('utf8')
        const pred = xml.match(/key\s*=\s*"prediction"\s+value\s*=\s*"(\d+)"/)
        if (pred) result.printTimeSeconds = parseInt(pred[1], 10)
        const weight = xml.match(/key\s*=\s*"weight"\s+value\s*=\s*"([\d.]+)"/)
        if (weight) result.filamentGrams = parseFloat(weight[1])
      }
    }
  } catch (e) {
    console.error('getPrintInfoFromPath failed:', e)
  }
  return result
}

/** Copy a model file (.3mf/.stl/...) into storage/models/<id>/ and return its new location. */
export function importModelFile(sourcePath: string): {
  id: string
  filePath: string
  fileName: string
  fileSize: number
  fileType: string
  printInfo: PrintInfo
} {
  const id = randomUUID()
  const fileName = basename(sourcePath)
  const fileType = extname(sourcePath).replace('.', '').toLowerCase()
  const modelDir = join(getStorageDir(), 'models', id)
  mkdirSync(modelDir, { recursive: true })
  const dest = join(modelDir, fileName)
  copyFileSync(sourcePath, dest)
  const fileSize = statSync(dest).size
  return { id, filePath: dest, fileName, fileSize, fileType, printInfo: getPrintInfoFromPath(dest) }
}

/** Copy an image into a model's folder, return its stored path. */
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
