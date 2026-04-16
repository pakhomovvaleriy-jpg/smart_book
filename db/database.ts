import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('smartbook.db');
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync('PRAGMA journal_mode = WAL;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'folder',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Миграции
  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;`);
  } catch { }

  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;`);
  } catch { }

  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';`);
  } catch { }

  try {
    await db.execAsync(`ALTER TABLE notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';`);
  } catch { }

  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN notification_id TEXT;`);
  } catch { }

  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN reminder_at TEXT;`);
  } catch { }

  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none';`);
  } catch { }
}
