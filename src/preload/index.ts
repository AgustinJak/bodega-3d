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
  renameTag: (id: string, name: string) => ipcRenderer.invoke('tags:rename', id, name),
  deleteTag: (id: string) => ipcRenderer.invoke('tags:delete', id),

  // App data / paths / backup
  getPaths: () => ipcRenderer.invoke('app:getPaths'),
  openPath: (p: string) => ipcRenderer.invoke('app:openPath', p),
  backupNow: () => ipcRenderer.invoke('app:backupNow'),

  // Images
  addImages: (modelId: string, sourcePaths: string[]) => ipcRenderer.invoke('images:add', modelId, sourcePaths),
  deleteImage: (imageId: string) => ipcRenderer.invoke('images:delete', imageId),
  setThumbnail: (modelId: string, filePath: string) => ipcRenderer.invoke('images:setThumbnail', modelId, filePath),
  copyImage: (filePath: string) => ipcRenderer.invoke('clipboard:copyImage', filePath),

  // Config de la app (notificaciones, cierre, autostart)
  getAppConfig: () => ipcRenderer.invoke('appcfg:get'),
  setNotifications: (on: boolean) => ipcRenderer.invoke('appcfg:setNotifications', on),
  setCloseBehavior: (v: string) => ipcRenderer.invoke('appcfg:setCloseBehavior', v),
  setAutostart: (enabled: boolean, minimized: boolean) => ipcRenderer.invoke('appcfg:setAutostart', enabled, minimized),
  onAskClose: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('app:ask-close', listener)
    return () => ipcRenderer.removeListener('app:ask-close', listener)
  },
  respondClose: (choice: 'tray' | 'quit' | 'cancel', remember: boolean) =>
    ipcRenderer.send('app:close-choice', { choice, remember }),

  // Settings & stats
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getStats: () => ipcRenderer.invoke('stats:get'),

  // Migración (exportar/importar modelos)
  exportModels: (ids?: string[]) => ipcRenderer.invoke('migration:export', ids),
  importBundle: () => ipcRenderer.invoke('migration:import'),

  // Files / dialogs
  getPrintInfoFromPath: (p: string) => ipcRenderer.invoke('printInfo:fromPath', p),
  pickModelFiles: () => ipcRenderer.invoke('dialog:pickModelFiles'),
  pickImages: () => ipcRenderer.invoke('dialog:pickImages'),

  // Slicer (BambuStudio)
  openInSlicer: (filePath: string) => ipcRenderer.invoke('slicer:open', filePath),
  getSlicerPath: () => ipcRenderer.invoke('slicer:getPath'),
  setSlicerPath: () => ipcRenderer.invoke('slicer:setPath'),
  showInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),

  // Updates
  onUpdateStatus: (cb: (data: any) => void) => {
    const listener = (_e: unknown, data: any) => cb(data)
    ipcRenderer.on('update:status', listener)
    return () => ipcRenderer.removeListener('update:status', listener)
  },
  checkUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  openReleases: () => ipcRenderer.invoke('updater:openReleases'),
  getAppVersion: () => ipcRenderer.invoke('updater:currentVersion'),

  // Impresoras Bambu (nube, solo lectura)
  bambuStatus: () => ipcRenderer.invoke('bambu:status'),
  bambuLogin: (account: string, password: string) => ipcRenderer.invoke('bambu:login', account, password),
  bambuLoginCode: (account: string, code: string) => ipcRenderer.invoke('bambu:loginCode', account, code),
  bambuLogout: () => ipcRenderer.invoke('bambu:logout'),
  bambuRefresh: () => ipcRenderer.invoke('bambu:refresh'),
  onBambuUpdate: (cb: (printers: any[]) => void) => {
    const listener = (_e: unknown, data: any[]) => cb(data)
    ipcRenderer.on('bambu:update', listener)
    return () => ipcRenderer.removeListener('bambu:update', listener)
  },

  // Cámara (local, requiere LAN Mode Liveview + IP + access code)
  getCam: (serial: string) => ipcRenderer.invoke('bambu:getCam', serial),
  setCam: (serial: string, ip: string, code: string) => ipcRenderer.invoke('bambu:setCam', serial, ip, code),
  camStart: (serial: string) => ipcRenderer.invoke('bambu:camStart', serial),
  camStop: (serial: string) => ipcRenderer.invoke('bambu:camStop', serial),
  onCamFrame: (cb: (data: { serial: string; frame?: string; error?: string; closed?: boolean }) => void) => {
    const listener = (_e: unknown, data: any) => cb(data)
    ipcRenderer.on('bambu:cam', listener)
    return () => ipcRenderer.removeListener('bambu:cam', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
