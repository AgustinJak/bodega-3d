import { app, BrowserWindow, protocol, net, Tray, Menu, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { registerIpc } from './ipc'
import { setupUpdater } from './updater'
import { setupBambu } from './bambu'
import { setupBambuCam } from './bambu-cam'
import { registerMigrationIpc } from './migration'
import { getDb } from './db'

// Mismo nombre de app que la versión original → usa %APPDATA%\bodega-3d (datos existentes)
app.setName('bodega-3d')
app.setPath('userData', join(app.getPath('appData'), 'bodega-3d'))
app.setAppUserModelId('com.sendero3d.bodega3d') // notificaciones de Windows

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } }
])

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuiting = false
const startHidden = process.argv.includes('--hidden')

function getSetting(key: string): string | null {
  try {
    const r = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return r?.value ?? null
  } catch {
    return null
  }
}
function setSetting(key: string, value: string): void {
  try {
    getDb()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, String(value))
  } catch {
    /* noop */
  }
}

function iconPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(app.getAppPath(), 'build', 'icon.ico')
}

function createTray(): void {
  if (tray) return
  try {
    const img = nativeImage.createFromPath(iconPath())
    tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img)
    tray.setToolTip('Bodega 3D')
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Abrir Bodega 3D', click: () => showWindow() },
        { type: 'separator' },
        {
          label: 'Salir',
          click: () => {
            isQuiting = true
            app.quit()
          }
        }
      ])
    )
    tray.on('click', () => showWindow())
    tray.on('double-click', () => showWindow())
  } catch (e) {
    console.error('tray error', e)
  }
}

function showWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    show: !startHidden,
    backgroundColor: '#0F1729',
    title: 'Bodega 3D — Sendero 3D',
    icon: iconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Evitar que se abran ventanas nuevas (ej. clic del medio en un modelo abría una ventana en blanco)
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Interceptar el cierre según preferencia (preguntar / bandeja / cerrar)
  mainWindow.on('close', (e) => {
    if (isQuiting) return
    const behavior = getSetting('close_behavior') || 'ask'
    if (behavior === 'quit') {
      isQuiting = true // cerrar de verdad la app
      return
    }
    if (behavior === 'tray') {
      e.preventDefault()
      mainWindow?.hide()
      return
    }
    // preguntar con un modal propio (estilo de la app) en el renderer
    e.preventDefault()
    showWindow()
    mainWindow?.webContents.send('app:ask-close')
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerAppConfigIpc(): void {
  ipcMain.handle('appcfg:get', () => ({
    notifications: getSetting('notifications_enabled') !== '0',
    closeBehavior: getSetting('close_behavior') || 'ask',
    startWithWindows: app.getLoginItemSettings().openAtLogin,
    startMinimized: getSetting('start_minimized') === '1'
  }))
  ipcMain.handle('appcfg:setNotifications', (_e, on: boolean) => {
    setSetting('notifications_enabled', on ? '1' : '0')
    return true
  })
  ipcMain.handle('appcfg:setCloseBehavior', (_e, v: string) => {
    setSetting('close_behavior', v)
    return true
  })
  ipcMain.handle('appcfg:setAutostart', (_e, enabled: boolean, minimized: boolean) => {
    setSetting('start_with_windows', enabled ? '1' : '0')
    setSetting('start_minimized', minimized ? '1' : '0')
    try {
      app.setLoginItemSettings({ openAtLogin: !!enabled, args: minimized ? ['--hidden'] : [] })
    } catch (e) {
      console.error('setLoginItemSettings error', e)
    }
    return true
  })

  // Respuesta del modal de cierre (renderer)
  ipcMain.on('app:close-choice', (_e, data: { choice?: string; remember?: boolean }) => {
    const choice = data?.choice
    if (!choice || choice === 'cancel') return
    if (data?.remember && (choice === 'tray' || choice === 'quit')) setSetting('close_behavior', choice)
    if (choice === 'tray') {
      mainWindow?.hide()
    } else if (choice === 'quit') {
      isQuiting = true
      app.quit()
    }
  })
}

// Instancia única: si ya hay una corriendo, enfocarla
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())

  app.whenReady().then(() => {
    protocol.handle('media', (request) => {
      try {
        const url = new URL(request.url)
        const b64 = url.pathname.replace(/^\//, '')
        const filePath = Buffer.from(b64, 'base64url').toString('utf8')
        return net.fetch(pathToFileURL(filePath).toString())
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })

    registerIpc()
    registerAppConfigIpc()
    registerMigrationIpc()
    createWindow()
    createTray()
    setupUpdater(() => mainWindow)
    setupBambu(() => mainWindow)
    setupBambuCam(() => mainWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else showWindow()
    })
  })
}

app.on('before-quit', () => {
  isQuiting = true
})

// No cerrar la app cuando se oculta a la bandeja (solo salir explícitamente)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuiting) app.quit()
})
