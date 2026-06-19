import { ipcMain, type BrowserWindow } from 'electron'
import tls from 'tls'
import { getDb } from './db'

/**
 * Cámara local de las A1/A1 mini (sin LAN-only): requiere activar "LAN Mode Liveview"
 * en la impresora y estar en la misma red. Protocolo: TLS al puerto 6000, handshake con
 * usuario "bblp" + access code, y luego frames JPEG (header de 16 bytes; los primeros 4 = tamaño).
 */

const sockets = new Map<string, tls.TLSSocket>()
let getWin: (() => BrowserWindow | null) | null = null

function setting(key: string): string | null {
  const r = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return r?.value ?? null
}
function camKey(serial: string) {
  return `bambu_cam_${serial}`
}

function buildAuth(accessCode: string): Buffer {
  const buf = Buffer.alloc(80)
  buf.writeUInt32LE(0x40, 0)
  buf.writeUInt32LE(0x3000, 4)
  buf.writeUInt32LE(0, 8)
  buf.writeUInt32LE(0, 12)
  buf.write('bblp', 16) // usuario (campo de 32 bytes)
  buf.write(accessCode, 48) // access code (campo de 32 bytes)
  return buf
}

function stop(serial: string): void {
  const s = sockets.get(serial)
  if (s) {
    try {
      s.destroy()
    } catch {
      /* noop */
    }
    sockets.delete(serial)
  }
}

function start(serial: string, ip: string, code: string): void {
  stop(serial)
  const send = (data: Record<string, unknown>) => {
    try {
      getWin?.()?.webContents.send('bambu:cam', { serial, ...data })
    } catch {
      /* noop */
    }
  }

  const socket = tls.connect({ host: ip, port: 6000, rejectUnauthorized: false, timeout: 12000 }, () => {
    socket.write(buildAuth(code))
  })
  sockets.set(serial, socket)

  let buf = Buffer.alloc(0)
  let expecting = 0
  socket.on('data', (d) => {
    buf = Buffer.concat([buf, d])
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (expecting === 0) {
        if (buf.length < 16) break
        expecting = buf.readUInt32LE(0)
        buf = buf.subarray(16)
        if (expecting <= 0 || expecting > 8_000_000) {
          // header inválido → reiniciar buffer
          expecting = 0
          buf = Buffer.alloc(0)
          break
        }
      }
      if (buf.length < expecting) break
      const jpeg = buf.subarray(0, expecting)
      buf = buf.subarray(expecting)
      expecting = 0
      send({ frame: 'data:image/jpeg;base64,' + jpeg.toString('base64') })
    }
  })

  socket.on('timeout', () => {
    send({ error: 'Tiempo de espera agotado (¿IP correcta? ¿misma red?)' })
    stop(serial)
  })
  socket.on('error', (e) => {
    send({ error: 'No se pudo conectar: ' + e.message })
    stop(serial)
  })
  socket.on('close', () => send({ closed: true }))
}

export function setupBambuCam(getWindow: () => BrowserWindow | null): void {
  getWin = getWindow

  ipcMain.handle('bambu:getCam', (_e, serial: string) => {
    try {
      const v = setting(camKey(serial))
      return v ? JSON.parse(v) : null
    } catch {
      return null
    }
  })

  ipcMain.handle('bambu:setCam', (_e, serial: string, ip: string, code: string) => {
    getDb()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(camKey(serial), JSON.stringify({ ip: ip.trim(), code: code.trim() }))
    return true
  })

  ipcMain.handle('bambu:camStart', (_e, serial: string) => {
    let cfg: { ip: string; code: string } | null = null
    try {
      const v = setting(camKey(serial))
      cfg = v ? JSON.parse(v) : null
    } catch {
      cfg = null
    }
    if (!cfg?.ip || !cfg?.code) return { ok: false, error: 'Falta configurar IP y Access Code.' }
    start(serial, cfg.ip, cfg.code)
    return { ok: true }
  })

  ipcMain.handle('bambu:camStop', (_e, serial: string) => {
    stop(serial)
    return true
  })
}
