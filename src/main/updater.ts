import { autoUpdater } from 'electron-updater'
import { app, ipcMain, shell, type BrowserWindow } from 'electron'

const RELEASES_URL = 'https://github.com/AgustinJak/bodega-3d/releases/latest'

export function setupUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = false // no descargar sin permiso: primero preguntamos
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  const send = (data: Record<string, unknown>) => {
    try {
      getWindow()?.webContents.send('update:status', data)
    } catch {
      /* ventana cerrada */
    }
  }

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => send({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => send({ state: 'none' }))
  autoUpdater.on('download-progress', (p) => send({ state: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => send({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => send({ state: 'error', error: String((err as Error)?.message || err) }))

  ipcMain.handle('updater:check', () => {
    if (!app.isPackaged) return { packaged: false }
    autoUpdater.checkForUpdates().catch((e) => send({ state: 'error', error: String(e?.message || e) }))
    return { packaged: true }
  })
  ipcMain.handle('updater:download', () => {
    autoUpdater.downloadUpdate().catch((e) => send({ state: 'error', error: String(e?.message || e) }))
    return true
  })
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })
  ipcMain.handle('updater:openReleases', () => shell.openExternal(RELEASES_URL))
  ipcMain.handle('updater:currentVersion', () => app.getVersion())

  // Chequeo automático al iniciar (solo app empaquetada)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        /* sin red o sin releases: silencioso */
      })
    }, 3500)
  }
}
