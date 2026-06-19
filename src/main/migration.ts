import { ipcMain, dialog, BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { randomUUID } from 'crypto'
import { join, basename } from 'path'
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, copyFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import AdmZip from 'adm-zip'
import { getDb, getStorageDir } from './db'

/** Extrae un .zip a un directorio usando el tar del sistema (bajo consumo de memoria); cae a adm-zip si falla. */
function extractZip(zipPath: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true })
  try {
    execFileSync('tar', ['-xf', zipPath, '-C', destDir], { stdio: 'ignore' })
  } catch {
    new AdmZip(zipPath).extractAllTo(destDir, true)
  }
}

function now(): string {
  return new Date().toISOString()
}
const tick = () => new Promise<void>((r) => setImmediate(r))

function sendProgress(e: IpcMainInvokeEvent, phase: 'export' | 'import', current: number, total: number, name: string) {
  try {
    e.sender.send('migration:progress', { phase, current, total, name })
  } catch {
    /* noop */
  }
}

export function registerMigrationIpc(): void {
  // ---------- Exportar ----------
  ipcMain.handle('migration:export', async (e, ids?: string[]) => {
    const db = getDb()
    const win = BrowserWindow.getFocusedWindow()
    const stamp = new Date().toISOString().slice(0, 10)
    const res = await dialog.showSaveDialog(win!, {
      title: 'Exportar modelos',
      defaultPath: `bodega-3d-modelos-${stamp}.zip`,
      filters: [{ name: 'Bundle Bodega 3D', extensions: ['zip'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }

    let rows: any[]
    if (ids && ids.length) {
      const ph = ids.map(() => '?').join(',')
      rows = db
        .prepare(
          `SELECT m.*, c.name AS catName, c.color AS catColor FROM models m
           LEFT JOIN categories c ON c.id = m.categoryId WHERE m.id IN (${ph})`
        )
        .all(...ids)
    } else {
      rows = db
        .prepare(
          `SELECT m.*, c.name AS catName, c.color AS catColor FROM models m
           LEFT JOIN categories c ON c.id = m.categoryId`
        )
        .all()
    }

    const storage = getStorageDir()
    const zip = new AdmZip()
    const models: any[] = []
    const total = rows.length

    for (let i = 0; i < rows.length; i++) {
      const m = rows[i]
      sendProgress(e, 'export', i + 1, total, m.name)
      await tick()
      const tags = db
        .prepare('SELECT t.name FROM model_tags mt JOIN tags t ON t.id = mt.tagId WHERE mt.modelId = ?')
        .all(m.id)
        .map((r: any) => r.name)
      const images = db
        .prepare('SELECT fileName, sortOrder FROM model_images WHERE modelId = ? ORDER BY sortOrder')
        .all(m.id)
      models.push({
        name: m.name,
        description: m.description,
        fileName: m.fileName,
        fileSize: m.fileSize,
        fileType: m.fileType,
        notes: m.notes,
        printCount: m.printCount,
        printTimeSeconds: m.printTimeSeconds,
        filamentGrams: m.filamentGrams,
        costData: m.costData,
        categoryName: m.catName ?? null,
        categoryColor: m.catColor ?? null,
        thumbnailName: m.thumbnailPath ? basename(m.thumbnailPath) : null,
        tags,
        images,
        folder: m.id
      })
      const dir = join(storage, 'models', m.id)
      if (existsSync(dir)) zip.addLocalFolder(dir, `models/${m.id}`)
    }

    const manifest = { app: 'bodega-3d', version: 1, exportedAt: now(), models }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'))
    sendProgress(e, 'export', total, total, 'Comprimiendo y guardando…')
    await tick()
    zip.writeZip(res.filePath)
    return { ok: true, count: models.length, path: res.filePath }
  })

  // ---------- Importar ----------
  ipcMain.handle('migration:import', async (e) => {
    const db = getDb()
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Importar modelos (bundle .zip)',
      properties: ['openFile'],
      filters: [{ name: 'Bundle Bodega 3D', extensions: ['zip'] }]
    })
    if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true }

    const storage = getStorageDir()
    const tempDir = join(tmpdir(), 'bodega-import-' + randomUUID())
    try {
      extractZip(res.filePaths[0], tempDir)
    } catch (err: any) {
      return { ok: false, error: 'No se pudo abrir el bundle: ' + (err?.message || err) }
    }

    const manifestPath = join(tempDir, 'manifest.json')
    if (!existsSync(manifestPath)) {
      rmSync(tempDir, { recursive: true, force: true })
      return { ok: false, error: 'El archivo no es un bundle válido de Bodega 3D.' }
    }
    let manifest: any
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch {
      rmSync(tempDir, { recursive: true, force: true })
      return { ok: false, error: 'No se pudo leer el bundle.' }
    }

    const ensureCategory = (name: string | null, color: string | null): string | null => {
      if (!name) return null
      db.prepare('INSERT INTO categories (id, name, color, sortOrder) VALUES (?, ?, ?, 0) ON CONFLICT(name) DO NOTHING').run(
        randomUUID(),
        name,
        color ?? '#8B85B2'
      )
      const row = db.prepare('SELECT id FROM categories WHERE name = ?').get(name) as { id: string } | undefined
      return row?.id ?? null
    }
    const setTags = (modelId: string, tags: string[]) => {
      const ensureTag = db.prepare('INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING')
      const getTag = db.prepare('SELECT id FROM tags WHERE name = ?')
      const link = db.prepare('INSERT OR IGNORE INTO model_tags (modelId, tagId) VALUES (?, ?)')
      for (const name of tags || []) {
        ensureTag.run(randomUUID(), name)
        const t = getTag.get(name) as { id: string } | undefined
        if (t) link.run(modelId, t.id)
      }
    }

    const list = manifest.models || []
    const total = list.length
    let imported = 0
    let skipped = 0

    try {
    for (let i = 0; i < list.length; i++) {
      const m = list[i]
      sendProgress(e, 'import', i + 1, total, m.name)
      await tick()

      const dup = db.prepare('SELECT 1 FROM models WHERE name = ? AND fileName = ?').get(m.name, m.fileName)
      if (dup) {
        skipped++
        continue
      }

      const newId = randomUUID()
      const destDir = join(storage, 'models', newId)
      mkdirSync(destDir, { recursive: true })

      // Copiar los archivos del modelo desde el temp (a disco, sin cargar todo en memoria)
      const srcDir = join(tempDir, 'models', m.folder)
      if (existsSync(srcDir)) {
        for (const f of readdirSync(srcDir, { withFileTypes: true })) {
          if (f.isFile()) copyFileSync(join(srcDir, f.name), join(destDir, f.name))
        }
      }

      const categoryId = ensureCategory(m.categoryName, m.categoryColor)
      const filePath = join(destDir, m.fileName)
      const thumbnailPath = m.thumbnailName ? join(destDir, m.thumbnailName) : null
      const ts = now()

      db.prepare(
        `INSERT INTO models (id, name, description, filePath, fileName, fileSize, fileType, thumbnailPath,
          categoryId, notes, printCount, createdAt, updatedAt, printTimeSeconds, filamentGrams, costData)
         VALUES (@id, @name, @description, @filePath, @fileName, @fileSize, @fileType, @thumbnailPath,
          @categoryId, @notes, @printCount, @createdAt, @updatedAt, @printTimeSeconds, @filamentGrams, @costData)`
      ).run({
        id: newId,
        name: m.name,
        description: m.description ?? null,
        filePath,
        fileName: m.fileName,
        fileSize: m.fileSize ?? 0,
        fileType: m.fileType ?? '',
        thumbnailPath,
        categoryId,
        notes: m.notes ?? null,
        printCount: m.printCount ?? 0,
        createdAt: ts,
        updatedAt: ts,
        printTimeSeconds: m.printTimeSeconds ?? null,
        filamentGrams: m.filamentGrams ?? null,
        costData: m.costData ?? null
      })

      const insImg = db.prepare(
        'INSERT INTO model_images (id, modelId, fileName, filePath, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      )
      for (const img of m.images || []) {
        insImg.run(randomUUID(), newId, img.fileName, join(destDir, img.fileName), img.sortOrder ?? 0, ts)
      }
      setTags(newId, m.tags || [])
      imported++
    }
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }

    return { ok: true, imported, skipped }
  })
}
