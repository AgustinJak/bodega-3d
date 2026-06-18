import { ipcMain, dialog, BrowserWindow, shell, clipboard, nativeImage } from 'electron'
import { randomUUID } from 'crypto'
import { rmSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import { join } from 'path'
import { getDb, getStorageDir } from './db'
import { importModelFile, importImage, getPrintInfoFromPath } from './storage'

function now(): string {
  return new Date().toISOString()
}

function setModelTags(modelId: string, tagsCsv: string): void {
  const db = getDb()
  db.prepare('DELETE FROM model_tags WHERE modelId = ?').run(modelId)
  const names = (tagsCsv || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const ensureTag = db.prepare('INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING')
  const getTag = db.prepare('SELECT id FROM tags WHERE name = ?')
  const link = db.prepare('INSERT OR IGNORE INTO model_tags (modelId, tagId) VALUES (?, ?)')
  for (const name of names) {
    ensureTag.run(randomUUID(), name)
    const row = getTag.get(name) as { id: string } | undefined
    if (row) link.run(modelId, row.id)
  }
}

export function registerIpc(): void {
  // ---------- Models ----------
  ipcMain.handle('models:list', (_e, opts: { search?: string; categoryId?: string } = {}) => {
    const db = getDb()
    const search = opts.search?.trim() || null
    const categoryId = opts.categoryId || null
    return db
      .prepare(
        `SELECT m.id, m.name, m.description, m.fileType, m.fileName, m.thumbnailPath, m.categoryId,
                m.printCount, m.printTimeSeconds, m.filamentGrams, m.costData, m.updatedAt,
                c.name AS categoryName, c.color AS categoryColor,
                (SELECT COUNT(*) FROM model_images mi WHERE mi.modelId = m.id) AS imageCount,
                (SELECT group_concat(t.name, ',') FROM model_tags mt JOIN tags t ON t.id = mt.tagId WHERE mt.modelId = m.id) AS tagNames
         FROM models m LEFT JOIN categories c ON c.id = m.categoryId
         WHERE (@search IS NULL OR m.name LIKE @like OR m.description LIKE @like)
           AND (@categoryId IS NULL OR m.categoryId = @categoryId)
         ORDER BY m.updatedAt DESC`
      )
      .all({ search, like: search ? `%${search}%` : null, categoryId })
  })

  ipcMain.handle('models:get', (_e, id: string) => {
    const db = getDb()
    const model = db
      .prepare(
        `SELECT m.*, c.name AS categoryName, c.color AS categoryColor
         FROM models m LEFT JOIN categories c ON c.id = m.categoryId WHERE m.id = ?`
      )
      .get(id)
    if (!model) return null
    const images = db
      .prepare('SELECT * FROM model_images WHERE modelId = ? ORDER BY sortOrder, createdAt')
      .all(id)
    const tags = db
      .prepare('SELECT t.name FROM model_tags mt JOIN tags t ON t.id = mt.tagId WHERE mt.modelId = ? ORDER BY t.name')
      .all(id)
      .map((r: any) => r.name)
    return { ...model, images, tags }
  })

  // Copy a model file into storage and return info (no DB row yet)
  ipcMain.handle('models:import', (_e, sourcePath: string) => {
    const info = importModelFile(sourcePath)
    return { ...info, suggestedName: info.fileName.replace(/\.(stl|3mf|obj)$/i, '') }
  })

  ipcMain.handle('models:create', (_e, input: any) => {
    const db = getDb()
    const ts = now()
    db.prepare(
      `INSERT INTO models (id, name, description, filePath, fileName, fileSize, fileType, thumbnailPath,
        categoryId, notes, printCount, createdAt, updatedAt, printTimeSeconds, filamentGrams, costData)
       VALUES (@id, @name, @description, @filePath, @fileName, @fileSize, @fileType, @thumbnailPath,
        @categoryId, @notes, @printCount, @createdAt, @updatedAt, @printTimeSeconds, @filamentGrams, @costData)`
    ).run({
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      filePath: input.filePath,
      fileName: input.fileName,
      fileSize: input.fileSize ?? 0,
      fileType: input.fileType ?? '',
      thumbnailPath: input.thumbnailPath ?? null,
      categoryId: input.categoryId || null,
      notes: input.notes ?? null,
      printCount: input.printCount ?? 0,
      createdAt: ts,
      updatedAt: ts,
      printTimeSeconds: input.printTimeSeconds ?? null,
      filamentGrams: input.filamentGrams ?? null,
      costData: input.costData ?? null
    })
    if (input.tags !== undefined) setModelTags(input.id, input.tags)
    return input.id
  })

  ipcMain.handle('models:update', (_e, id: string, input: any) => {
    const db = getDb()
    db.prepare(
      `UPDATE models SET name=@name, description=@description, categoryId=@categoryId, notes=@notes,
        printTimeSeconds=@printTimeSeconds, filamentGrams=@filamentGrams, updatedAt=@updatedAt WHERE id=@id`
    ).run({
      id,
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId || null,
      notes: input.notes ?? null,
      printTimeSeconds: input.printTimeSeconds ?? null,
      filamentGrams: input.filamentGrams ?? null,
      updatedAt: now()
    })
    if (input.tags !== undefined) setModelTags(id, input.tags)
    return true
  })

  ipcMain.handle('models:delete', (_e, id: string) => {
    const db = getDb()
    db.prepare('DELETE FROM model_tags WHERE modelId = ?').run(id)
    db.prepare('DELETE FROM model_images WHERE modelId = ?').run(id)
    db.prepare('DELETE FROM print_queue WHERE modelId = ?').run(id)
    db.prepare('DELETE FROM models WHERE id = ?').run(id)
    try {
      rmSync(join(getStorageDir(), 'models', id), { recursive: true, force: true })
    } catch (e) {
      console.error('could not remove model dir', e)
    }
    return true
  })

  ipcMain.handle('models:incrementPrint', (_e, id: string, delta: number) => {
    const db = getDb()
    db.prepare('UPDATE models SET printCount = MAX(0, printCount + ?), updatedAt = ? WHERE id = ?').run(
      delta,
      now(),
      id
    )
    return (db.prepare('SELECT printCount FROM models WHERE id = ?').get(id) as any)?.printCount ?? 0
  })

  ipcMain.handle('models:saveCost', (_e, id: string, payload: any) => {
    const db = getDb()
    db.prepare(
      'UPDATE models SET costData=@costData, filamentGrams=@filamentGrams, printTimeSeconds=@printTimeSeconds, updatedAt=@updatedAt WHERE id=@id'
    ).run({
      id,
      costData: typeof payload.costData === 'string' ? payload.costData : JSON.stringify(payload.costData),
      filamentGrams: payload.filamentGrams ?? null,
      printTimeSeconds: payload.printTimeSeconds ?? null,
      updatedAt: now()
    })
    return true
  })

  // ---------- Categories ----------
  ipcMain.handle('categories:list', () => {
    return getDb()
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM models m WHERE m.categoryId = c.id) AS modelCount
         FROM categories c ORDER BY c.sortOrder, c.name`
      )
      .all()
  })
  ipcMain.handle('categories:create', (_e, input: { name: string; color?: string }) => {
    const id = randomUUID()
    getDb().prepare('INSERT INTO categories (id, name, color, sortOrder) VALUES (?, ?, ?, 0)').run(
      id,
      input.name,
      input.color ?? '#8B85B2'
    )
    return id
  })
  ipcMain.handle('categories:update', (_e, id: string, input: { name: string; color?: string }) => {
    getDb().prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(input.name, input.color ?? null, id)
    return true
  })
  ipcMain.handle('categories:delete', (_e, id: string) => {
    const db = getDb()
    db.prepare('UPDATE models SET categoryId = NULL WHERE categoryId = ?').run(id)
    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return true
  })

  // ---------- Tags ----------
  ipcMain.handle('tags:list', () => {
    return getDb()
      .prepare(
        `SELECT t.id, t.name, (SELECT COUNT(*) FROM model_tags mt WHERE mt.tagId = t.id) AS modelCount
         FROM tags t ORDER BY t.name`
      )
      .all()
  })

  ipcMain.handle('tags:rename', (_e, id: string, name: string) => {
    getDb().prepare('UPDATE tags SET name = ? WHERE id = ?').run(name.trim(), id)
    return true
  })
  ipcMain.handle('tags:delete', (_e, id: string) => {
    const db = getDb()
    db.prepare('DELETE FROM model_tags WHERE tagId = ?').run(id)
    db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    return true
  })

  // ---------- App data / paths / backup ----------
  ipcMain.handle('app:getPaths', () => {
    const s = getStorageDir()
    return { storageDir: s, dbPath: join(s, 'bodega3d.db'), backupsDir: join(s, 'backups'), modelsDir: join(s, 'models') }
  })
  ipcMain.handle('app:openPath', (_e, p: string) => shell.openPath(p))
  ipcMain.handle('app:backupNow', () => {
    const s = getStorageDir()
    const dbPath = join(s, 'bodega3d.db')
    const backupsDir = join(s, 'backups')
    mkdirSync(backupsDir, { recursive: true })
    try {
      getDb().pragma('wal_checkpoint(TRUNCATE)')
    } catch {
      /* ignore */
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = join(backupsDir, `bodega3d-manual-${stamp}.db`)
    copyFileSync(dbPath, dest)
    return dest
  })

  // ---------- Images ----------
  ipcMain.handle('images:add', (_e, modelId: string, sourcePaths: string[]) => {
    const db = getDb()
    const insert = db.prepare(
      'INSERT INTO model_images (id, modelId, fileName, filePath, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const base = (db.prepare('SELECT COUNT(*) c FROM model_images WHERE modelId = ?').get(modelId) as any).c
    let i = 0
    const added: any[] = []
    for (const src of sourcePaths) {
      const { fileName, filePath } = importImage(modelId, src)
      const id = randomUUID()
      insert.run(id, modelId, fileName, filePath, base + i, now())
      added.push({ id, modelId, fileName, filePath, sortOrder: base + i })
      i++
    }
    // first image becomes thumbnail if none set
    const m = db.prepare('SELECT thumbnailPath FROM models WHERE id = ?').get(modelId) as any
    if (m && !m.thumbnailPath && added[0]) {
      db.prepare('UPDATE models SET thumbnailPath = ?, updatedAt = ? WHERE id = ?').run(added[0].filePath, now(), modelId)
    }
    return added
  })
  ipcMain.handle('images:delete', (_e, imageId: string) => {
    getDb().prepare('DELETE FROM model_images WHERE id = ?').run(imageId)
    return true
  })
  ipcMain.handle('images:setThumbnail', (_e, modelId: string, filePath: string) => {
    getDb().prepare('UPDATE models SET thumbnailPath = ?, updatedAt = ? WHERE id = ?').run(filePath, now(), modelId)
    return true
  })
  ipcMain.handle('clipboard:copyImage', (_e, filePath: string) => {
    if (!filePath || !existsSync(filePath)) return false
    const img = nativeImage.createFromPath(filePath)
    if (img.isEmpty()) return false
    clipboard.writeImage(img)
    return true
  })

  // ---------- Settings ----------
  ipcMain.handle('settings:get', () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const out: Record<string, string> = {}
    for (const r of rows) out[r.key] = r.value
    return out
  })
  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    getDb()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, String(value))
    return true
  })

  // ---------- Stats ----------
  ipcMain.handle('stats:get', () => {
    const db = getDb()
    return {
      models: (db.prepare('SELECT COUNT(*) c FROM models').get() as any).c,
      categories: (db.prepare('SELECT COUNT(*) c FROM categories').get() as any).c,
      tags: (db.prepare('SELECT COUNT(*) c FROM tags').get() as any).c,
      totalPrints: (db.prepare('SELECT COALESCE(SUM(printCount),0) s FROM models').get() as any).s,
      queuePending: (db.prepare("SELECT COUNT(*) c FROM print_queue WHERE status='pending'").get() as any).c
    }
  })

  // ---------- Print info / dialogs ----------
  ipcMain.handle('printInfo:fromPath', (_e, p: string) => getPrintInfoFromPath(p))

  ipcMain.handle('dialog:pickModelFiles', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Importar modelos 3D',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Modelos 3D', extensions: ['3mf', 'stl', 'obj'] }]
    })
    return res.canceled ? [] : res.filePaths
  })

  // ---------- Slicer (BambuStudio) ----------
  function getSlicerPath(): string | null {
    const row = getDb().prepare("SELECT value FROM settings WHERE key = 'bambu_studio_path'").get() as
      | { value: string }
      | undefined
    return row?.value || null
  }

  ipcMain.handle('slicer:getPath', () => {
    const p = getSlicerPath()
    return { path: p, exists: !!(p && existsSync(p)) }
  })

  ipcMain.handle('slicer:setPath', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Seleccionar ejecutable de BambuStudio',
      properties: ['openFile'],
      filters: [{ name: 'Ejecutable', extensions: ['exe'] }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    const p = res.filePaths[0]
    getDb()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('bambu_studio_path', p)
    return p
  })

  // Open a model file in BambuStudio (or the default associated app as fallback)
  ipcMain.handle('slicer:open', async (_e, filePath: string) => {
    if (!filePath || !existsSync(filePath)) return { ok: false, error: 'El archivo del modelo no existe.' }
    const bambu = getSlicerPath()
    if (bambu && existsSync(bambu)) {
      try {
        spawn(bambu, [filePath], { detached: true, stdio: 'ignore' }).unref()
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    }
    // Fallback: open with the OS default app for .3mf
    const err = await shell.openPath(filePath)
    if (err) return { ok: false, error: err, needsPath: true }
    return { ok: true, usedDefault: true, needsPath: !bambu }
  })

  ipcMain.handle('shell:showItemInFolder', (_e, filePath: string) => {
    if (filePath && existsSync(filePath)) shell.showItemInFolder(filePath)
    return true
  })

  ipcMain.handle('dialog:pickImages', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Agregar imágenes',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    })
    return res.canceled ? [] : res.filePaths
  })
}
