import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync } from 'fs'

let _db: Database.Database | null = null

export function closeDb(): void {
  if (_db) {
    try {
      _db.close()
    } catch {
      /* noop */
    }
    _db = null
  }
}

export function getStorageDir(): string {
  const dir = join(app.getPath('userData'), 'storage')
  mkdirSync(join(dir, 'models'), { recursive: true })
  return dir
}

export function getDb(): Database.Database {
  if (_db) return _db
  const storage = getStorageDir()
  const dbPath = join(storage, 'bodega3d.db')

  // Daily backup before opening (one per calendar day)
  try {
    if (existsSync(dbPath)) {
      const stamp = new Date().toISOString().slice(0, 10)
      const backupDir = join(storage, 'backups')
      mkdirSync(backupDir, { recursive: true })
      const bkp = join(backupDir, `bodega3d-${stamp}.db`)
      if (!existsSync(bkp)) copyFileSync(dbPath, bkp)
    }
  } catch (e) {
    console.error('DB backup failed:', e)
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  _db = db
  return db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, color TEXT, sortOrder INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      filePath TEXT NOT NULL, fileName TEXT NOT NULL, fileSize INTEGER NOT NULL, fileType TEXT NOT NULL,
      thumbnailPath TEXT, categoryId TEXT REFERENCES categories(id), notes TEXT,
      printCount INTEGER DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      printTimeSeconds INTEGER, filamentGrams REAL, costData TEXT
    );
    CREATE TABLE IF NOT EXISTS model_tags (
      modelId TEXT NOT NULL REFERENCES models(id), tagId TEXT NOT NULL REFERENCES tags(id),
      PRIMARY KEY (modelId, tagId)
    );
    CREATE TABLE IF NOT EXISTS model_images (
      id TEXT PRIMARY KEY, modelId TEXT NOT NULL REFERENCES models(id),
      fileName TEXT NOT NULL, filePath TEXT NOT NULL, sortOrder INTEGER DEFAULT 0, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS print_queue (
      id TEXT PRIMARY KEY, modelId TEXT NOT NULL REFERENCES models(id), copies INTEGER DEFAULT 1,
      notes TEXT, priority INTEGER DEFAULT 0, status TEXT DEFAULT 'pending', material TEXT,
      printerProfile TEXT, orderInfo TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_styles (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, promptBase TEXT NOT NULL,
      negativePrompt TEXT NOT NULL DEFAULT '', strength REAL DEFAULT 0.4, sortOrder INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    );
  `)

  // Idempotent column adds (for older DBs)
  const cols = (db.prepare('PRAGMA table_info(models)').all() as { name: string }[]).map((c) => c.name)
  if (!cols.includes('printTimeSeconds')) db.exec('ALTER TABLE models ADD COLUMN printTimeSeconds INTEGER')
  if (!cols.includes('filamentGrams')) db.exec('ALTER TABLE models ADD COLUMN filamentGrams REAL')
  if (!cols.includes('costData')) db.exec('ALTER TABLE models ADD COLUMN costData TEXT')
}
