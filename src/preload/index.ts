import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Models
  listModels: (opts?: { search?: string; categoryId?: string }) => ipcRenderer.invoke('models:list', opts ?? {}),
  getModel: (id: string) => ipcRenderer.invoke('models:get', id),
  importModel: (sourcePath: string) => ipcRenderer.invoke('models:import', sourcePath),
  createModel: (input: any) => ipcRenderer.invoke('models:create', input),
  updateModel: (id: string, input: any) => ipcRenderer.invoke('models:update', id, input),
  deleteModel: (id: string) => ipcRenderer.invoke('models:delete', id),
  incrementPrint: (id: string, delta: number) => ipcRenderer.invoke('models:incrementPrint', id, delta),
  saveCost: (id: string, payload: any) => ipcRenderer.invoke('models:saveCost', id, payload),

  // Categories
  listCategories: () => ipcRenderer.invoke('categories:list'),
  createCategory: (input: { name: string; color?: string }) => ipcRenderer.invoke('categories:create', input),
  updateCategory: (id: string, input: { name: string; color?: string }) =>
    ipcRenderer.invoke('categories:update', id, input),
  deleteCategory: (id: string) => ipcRenderer.invoke('categories:delete', id),

  // Tags
  listTags: () => ipcRenderer.invoke('tags:list'),

  // Images
  addImages: (modelId: string, sourcePaths: string[]) => ipcRenderer.invoke('images:add', modelId, sourcePaths),
  deleteImage: (imageId: string) => ipcRenderer.invoke('images:delete', imageId),
  setThumbnail: (modelId: string, filePath: string) => ipcRenderer.invoke('images:setThumbnail', modelId, filePath),

  // Settings & stats
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getStats: () => ipcRenderer.invoke('stats:get'),

  // Files / dialogs
  getPrintInfoFromPath: (p: string) => ipcRenderer.invoke('printInfo:fromPath', p),
  pickModelFiles: () => ipcRenderer.invoke('dialog:pickModelFiles'),
  pickImages: () => ipcRenderer.invoke('dialog:pickImages'),

  // Slicer (BambuStudio)
  openInSlicer: (filePath: string) => ipcRenderer.invoke('slicer:open', filePath),
  getSlicerPath: () => ipcRenderer.invoke('slicer:getPath'),
  setSlicerPath: () => ipcRenderer.invoke('slicer:setPath'),
  showInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
