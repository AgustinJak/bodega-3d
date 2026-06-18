import { app, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { registerIpc } from './ipc'
import { setupUpdater } from './updater'
import { setupBambu } from './bambu'

// IMPORTANT: use the same app name as the original app so userData resolves to
// %APPDATA%\bodega-3d and we read/write the EXISTING data (DB + models).
app.setName('bodega-3d')
app.setPath('userData', join(app.getPath('appData'), 'bodega-3d'))

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } }
])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0F1729',
    title: 'Bodega 3D — Sendero 3D',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Serve local images/models via media://i/<base64url(absPath)>
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url)
      const b64 = url.pathname.replace(/^\//, '')
      const filePath = Buffer.from(b64, 'base64url').toString('utf8')
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (e) {
      return new Response('Not found', { status: 404 })
    }
  })

  registerIpc()
  createWindow()
  setupUpdater(() => mainWindow)
  setupBambu(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
