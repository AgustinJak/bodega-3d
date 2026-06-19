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
    thumbnailPath: string | null
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
  renameTag: (id: string, name: string) => Promise<boolean>
  deleteTag: (id: string) => Promise<boolean>
  getPaths: () => Promise<{ storageDir: string; dbPath: string; backupsDir: string; modelsDir: string }>
  openPath: (p: string) => Promise<string>
  backupNow: () => Promise<string>
  addImages: (modelId: string, sourcePaths: string[]) => Promise<ModelImage[]>
  deleteImage: (imageId: string) => Promise<boolean>
  setThumbnail: (modelId: string, filePath: string) => Promise<boolean>
  copyImage: (filePath: string) => Promise<boolean>
  getAppConfig: () => Promise<{
    notifications: boolean
    closeBehavior: 'ask' | 'tray' | 'quit'
    startWithWindows: boolean
    startMinimized: boolean
  }>
  setNotifications: (on: boolean) => Promise<boolean>
  setCloseBehavior: (v: 'ask' | 'tray' | 'quit') => Promise<boolean>
  setAutostart: (enabled: boolean, minimized: boolean) => Promise<boolean>
  onAskClose: (cb: () => void) => () => void
  respondClose: (choice: 'tray' | 'quit' | 'cancel', remember: boolean) => void
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
  onUpdateStatus: (cb: (data: UpdateStatus) => void) => () => void
  checkUpdates: () => Promise<{ packaged: boolean }>
  downloadUpdate: () => Promise<boolean>
  installUpdate: () => Promise<void>
  openReleases: () => Promise<void>
  getAppVersion: () => Promise<string>
  bambuStatus: () => Promise<{ loggedIn: boolean; account: string | null; printers: PrinterState[] }>
  bambuLogin: (account: string, password: string) => Promise<{ ok: boolean; needCode?: boolean; error?: string }>
  bambuLoginCode: (account: string, code: string) => Promise<{ ok: boolean; error?: string }>
  bambuLogout: () => Promise<boolean>
  bambuRefresh: () => Promise<PrinterState[]>
  onBambuUpdate: (cb: (printers: PrinterState[]) => void) => () => void
  getCam: (serial: string) => Promise<{ ip: string; code: string } | null>
  setCam: (serial: string, ip: string, code: string) => Promise<boolean>
  camStart: (serial: string) => Promise<{ ok: boolean; error?: string }>
  camStop: (serial: string) => Promise<boolean>
  onCamFrame: (cb: (data: { serial: string; frame?: string; error?: string; closed?: boolean }) => void) => () => void
}

export interface PrinterState {
  serial: string
  name: string
  model: string
  online: boolean
  state: string
  percent: number | null
  remainingMin: number | null
  taskName: string | null
  nozzleTemp: number | null
  bedTemp: number | null
  layer: number | null
  totalLayers: number | null
  errorCode: number | null
  hmsCount: number
  errorText: string | null
  updatedAt: number
}

export interface UpdateStatus {
  state: 'checking' | 'available' | 'none' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

declare global {
  interface Window {
    api: BodegaApi
  }
}

export const api = window.api
