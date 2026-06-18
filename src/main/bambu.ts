import { ipcMain, type BrowserWindow } from 'electron'
import mqtt, { type MqttClient } from 'mqtt'
import { getDb } from './db'

/**
 * Integración con Bambu Lab en MODO NUBE (solo lectura).
 * - Login con cuenta Bambu (token).
 * - Lista de impresoras vinculadas.
 * - MQTT de la nube de Bambu para estado en vivo.
 * No envía comandos ni archivos (el bloqueo ACS lo impide en nube; eso requeriría LAN mode).
 */

const API = 'https://api.bambulab.com'
const MQTT_HOST = 'mqtts://us.mqtt.bambulab.com:8883'

interface DeviceInfo {
  serial: string
  name: string
  model: string
  online: boolean
}

export interface PrinterState {
  serial: string
  name: string
  model: string
  online: boolean
  state: string // IDLE | RUNNING | PAUSE | FINISH | FAILED | PREPARE | OFFLINE
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

let client: MqttClient | null = null
let devices: DeviceInfo[] = []
const raw = new Map<string, any>() // estado crudo acumulado por serial (A1 manda parciales)
let getWin: (() => BrowserWindow | null) | null = null

// Base de descripciones de errores de Bambu (código → texto en español)
const hmsDb = { error: {} as Record<string, string>, hms: {} as Record<string, string> }

function toHex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0').toUpperCase()
}

async function loadHmsDb(): Promise<void> {
  try {
    const res = await fetch('https://e.bambulab.com/query.php?lang=es')
    const data = (await res.json())?.data
    const deList = data?.device_error?.es ?? data?.device_error?.en ?? []
    const dhList = data?.device_hms?.es ?? data?.device_hms?.en ?? []
    for (const e of deList) if (e.ecode) hmsDb.error[String(e.ecode).toUpperCase()] = e.intro
    for (const e of dhList) if (e.ecode) hmsDb.hms[String(e.ecode).toUpperCase()] = e.intro
    console.log('[bambu] HMS DB cargada:', Object.keys(hmsDb.error).length, 'errores,', Object.keys(hmsDb.hms).length, 'hms')
  } catch (e: any) {
    console.log('[bambu] no se pudo cargar HMS DB:', e?.message)
  }
}

function errorInfo(p: any): { code: string; text: string } | null {
  if (p?.print_error && p.print_error !== 0) {
    const code = toHex8(p.print_error)
    let text = hmsDb.error[code]
    if (!text && (p.print_error & 0xffff) === 0x8011) text = 'Sin filamento (AMS)'
    return { code, text: text || `Error ${code}` }
  }
  if (Array.isArray(p?.hms) && p.hms.length) {
    const e = p.hms[0]
    const code = toHex8(e.attr) + toHex8(e.code)
    return { code, text: hmsDb.hms[code] || `Aviso del sistema (${code})` }
  }
  return null
}

function setting(key: string): string | null {
  const r = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return r?.value ?? null
}
function saveSetting(key: string, value: string): void {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}
function clearSetting(key: string): void {
  getDb().prepare('DELETE FROM settings WHERE key = ?').run(key)
}

function decodeJwtUser(token: string): string | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
    let u: any = payload.username || payload.user_id || payload.uid || payload.sub || null
    if (u && !String(u).startsWith('u_') && /^\d+$/.test(String(u))) u = 'u_' + u
    return u ? String(u) : null
  } catch {
    return null
  }
}

/** Resuelve el usuario MQTT (u_<uid>). El token de Bambu suele ser opaco, así que se pide el uid a la API. */
async function resolveMqttUser(token: string): Promise<string | null> {
  const fromJwt = decodeJwtUser(token)
  if (fromJwt) return fromJwt
  const endpoints = ['/v1/design-user-service/my/preference', '/v1/user-service/my/preference']
  for (const ep of endpoints) {
    try {
      const res = await fetch(API + ep, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      const uid = data?.uid ?? data?.userId ?? data?.user_id
      if (uid) return 'u_' + String(uid)
    } catch (e: any) {
      console.log('[bambu] preference error', ep, e?.message)
    }
  }
  return null
}

async function postJson(path: string, body: unknown, token?: string): Promise<any> {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { _status: res.status, _raw: text }
  }
}

async function fetchDevices(token: string): Promise<DeviceInfo[]> {
  const res = await fetch(`${API}/v1/iot-service/api/user/bind`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()
  const list = data?.devices ?? []
  return list.map((d: any) => ({
    serial: d.dev_id,
    name: d.name || d.dev_id,
    model: d.dev_product_name || d.dev_model_name || '',
    online: !!d.online
  }))
}

function computeState(d: DeviceInfo): PrinterState {
  const p = raw.get(d.serial)?.print ?? {}
  const gstate = p.gcode_state as string | undefined
  return {
    serial: d.serial,
    name: d.name,
    model: d.model,
    online: d.online,
    state: d.online ? gstate || 'IDLE' : 'OFFLINE',
    percent: typeof p.mc_percent === 'number' ? p.mc_percent : null,
    remainingMin: typeof p.mc_remaining_time === 'number' ? p.mc_remaining_time : null,
    taskName: p.subtask_name || p.gcode_file || null,
    nozzleTemp: typeof p.nozzle_temper === 'number' ? Math.round(p.nozzle_temper) : null,
    bedTemp: typeof p.bed_temper === 'number' ? Math.round(p.bed_temper) : null,
    layer: typeof p.layer_num === 'number' ? p.layer_num : null,
    totalLayers: typeof p.total_layer_num === 'number' ? p.total_layer_num : null,
    errorCode: typeof p.print_error === 'number' && p.print_error !== 0 ? p.print_error : null,
    hmsCount: Array.isArray(p.hms) ? p.hms.length : 0,
    errorText: d.online ? errorInfo(p)?.text ?? null : null,
    updatedAt: Date.now()
  }
}

function broadcast(): void {
  const states = devices.map(computeState)
  try {
    getWin?.()?.webContents.send('bambu:update', states)
  } catch {
    /* ventana cerrada */
  }
}

function deepMerge(target: any, src: any): any {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {}
      deepMerge(target[k], src[k])
    } else {
      target[k] = src[k]
    }
  }
  return target
}

function connectMqtt(token: string, user: string): void {
  if (client) {
    try {
      client.end(true)
    } catch {
      /* noop */
    }
    client = null
  }
  client = mqtt.connect(MQTT_HOST, {
    username: user,
    password: token,
    reconnectPeriod: 5000,
    connectTimeout: 15000,
    rejectUnauthorized: true
  })

  client.on('connect', () => {
    console.log('[bambu] MQTT CONNECTED')
    for (const d of devices) {
      client!.subscribe(`device/${d.serial}/report`, (err) => {
        if (err) console.log('[bambu] subscribe error', d.serial, err.message)
      })
      client!.publish(
        `device/${d.serial}/request`,
        JSON.stringify({ pushing: { sequence_id: '0', command: 'pushall', version: 1, push_target: 1 } })
      )
    }
    broadcast()
  })

  client.on('message', (topic, payload) => {
    const m = topic.match(/^device\/(.+)\/report$/)
    if (!m) return
    const serial = m[1]
    try {
      const msg = JSON.parse(payload.toString())
      const cur = raw.get(serial) ?? {}
      raw.set(serial, deepMerge(cur, msg))
      broadcast()
    } catch {
      /* json inválido */
    }
  })

  client.on('error', (e) => console.log('[bambu] mqtt error', e.message))
  client.on('close', () => console.log('[bambu] mqtt close'))
  client.on('offline', () => console.log('[bambu] mqtt offline'))
}

async function startSession(token: string, refresh?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    devices = await fetchDevices(token)
    saveSetting('bambu_token', token)
    if (refresh) saveSetting('bambu_refresh', refresh)
    const user = await resolveMqttUser(token)
    if (!user) {
      console.log('[bambu] no se pudo resolver el usuario MQTT')
      return { ok: false, error: 'Conectó pero no se pudo resolver el usuario para el estado en vivo.' }
    }
    connectMqtt(token, user)
    broadcast()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
}

export function setupBambu(getWindow: () => BrowserWindow | null): void {
  getWin = getWindow
  loadHmsDb().then(() => broadcast())

  ipcMain.handle('bambu:status', () => ({
    loggedIn: !!setting('bambu_token'),
    account: setting('bambu_account'),
    printers: devices.map(computeState)
  }))

  ipcMain.handle('bambu:login', async (_e, account: string, password: string) => {
    const data = await postJson('/v1/user-service/user/login', { account, password })
    if (data.accessToken) {
      saveSetting('bambu_account', account)
      const r = await startSession(data.accessToken, data.refreshToken)
      return r.ok ? { ok: true } : { ok: false, error: r.error }
    }
    if (data.loginType === 'verifyCode') {
      // pedir código por email
      await postJson('/v1/user-service/user/sendemail/code', { email: account, type: 'codeLogin' })
      saveSetting('bambu_account', account)
      return { ok: false, needCode: true }
    }
    if (data.tfaKey) {
      return { ok: false, error: 'Tu cuenta usa verificación en dos pasos por app (no soportado todavía). Usá código por email.' }
    }
    return { ok: false, error: data.error || 'No se pudo iniciar sesión. Revisá email y contraseña.' }
  })

  ipcMain.handle('bambu:loginCode', async (_e, account: string, code: string) => {
    const data = await postJson('/v1/user-service/user/login', { account, code })
    if (data.accessToken) {
      saveSetting('bambu_account', account)
      const r = await startSession(data.accessToken, data.refreshToken)
      return r.ok ? { ok: true } : { ok: false, error: r.error }
    }
    return { ok: false, error: data.error || 'Código inválido o expirado.' }
  })

  ipcMain.handle('bambu:logout', () => {
    try {
      client?.end(true)
    } catch {
      /* noop */
    }
    client = null
    devices = []
    raw.clear()
    clearSetting('bambu_token')
    clearSetting('bambu_refresh')
    broadcast()
    return true
  })

  ipcMain.handle('bambu:refresh', async () => {
    const token = setting('bambu_token')
    if (token) {
      try {
        devices = await fetchDevices(token)
        broadcast()
      } catch {
        /* token vencido */
      }
    }
    return devices.map(computeState)
  })

  // Reconexión automática al iniciar si hay token guardado
  const token = setting('bambu_token')
  if (token) {
    startSession(token, setting('bambu_refresh') || undefined).catch(() => {})
  }
}
