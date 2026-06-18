import type { Category, Tag, ModelListItem, ModelDetail, ModelImage, Stats } from '../types'

interface BodegaApi {
  listModels: (opts?: { search?: string; categoryId?: string }) => Promise<ModelListItem[]>
  getModel: (id: string) => Promise<ModelDetail | null>
  importModel: (sourcePath: string) => Promise<{
    id: string
    filePath: string
    fileName: string
    fileSize: number
    fileType: string
    printInfo: { printTimeSeconds: number | null; filamentGrams: number | null }
    suggestedName: string
  }>
  createModel: (input: Record<string, unknown>) => Promise<string>
  updateModel: (id: string, input: Record<string, unknown>) => Promise<boolean>
  deleteModel: (id: string) => Promise<boolean>
  incrementPrint: (id: string, delta: number) => Promise<number>
  saveCost: (
    id: string,
    payload: { costData: unknown; filamentGrams?: number | null; printTimeSeconds?: number | null }
  ) => Promise<boolean>
  listCategories: () => Promise<Category[]>
  createCategory: (input: { name: string; color?: string }) => Promise<string>
  updateCategory: (id: string, input: { name: string; color?: string }) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  listTags: () => Promise<Tag[]>
  addImages: (modelId: string, sourcePaths: string[]) => Promise<ModelImage[]>
  deleteImage: (imageId: string) => Promise<boolean>
  setThumbnail: (modelId: string, filePath: string) => Promise<boolean>
  getSettings: () => Promise<Record<string, string>>
  setSetting: (key: string, value: string) => Promise<boolean>
  getStats: () => Promise<Stats>
  getPrintInfoFromPath: (p: string) => Promise<{ printTimeSeconds: number | null; filamentGrams: number | null }>
  pickModelFiles: () => Promise<string[]>
  pickImages: () => Promise<string[]>
  openInSlicer: (
    filePath: string
  ) => Promise<{ ok: boolean; error?: string; usedDefault?: boolean; needsPath?: boolean }>
  getSlicerPath: () => Promise<{ path: string | null; exists: boolean }>
  setSlicerPath: () => Promise<string | null>
  showInFolder: (filePath: string) => Promise<boolean>
}

declare global {
  interface Window {
    api: BodegaApi
  }
}

export const api = window.api
