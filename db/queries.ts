import { getDatabase } from './database';
import type { Task, Note, Project, Priority, TaskStatus, Subtask } from '../types';

// Возвращает дату в локальном часовом поясе (не UTC), чтобы не "съезжало" на день
function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw ?? '[]'); } catch { return []; }
}

function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

function parseAttachments(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw ?? '[]'); } catch { return []; }
}

// ─── PROJECTS ───────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const db = await getDatabase();
  return db.getAllAsync<Project>('SELECT * FROM projects ORDER BY created_at DESC');
}

export async function createProject(name: string, color: string, icon: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO projects (name, color, icon) VALUES (?, ?, ?)',
    [name, color, icon]
  );
  return result.lastInsertRowId;
}

export async function deleteProject(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
}

export async function getProjectStats(): Promise<{ project_id: number; total: number; completed: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT project_id,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM tasks
    WHERE project_id IS NOT NULL AND parent_id IS NULL
    GROUP BY project_id
  `);
}

// ─── TASKS ──────────────────────────────────────────────────────────────────

const TASK_FIELDS = `
  t.*,
  (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) as subtask_count,
  (SELECT COALESCE(SUM(s.completed), 0) FROM subtasks s WHERE s.task_id = t.id) as subtask_completed_count,
  (SELECT COUNT(*) FROM tasks c WHERE c.parent_id = t.id) as child_count,
  (SELECT COUNT(*) FROM tasks c WHERE c.parent_id = t.id AND c.status = 'completed') as child_completed_count
`;

export async function getTasks(projectId?: number): Promise<Task[]> {
  const db = await getDatabase();
  const rows = projectId !== undefined
    ? await db.getAllAsync<any>(
        `SELECT ${TASK_FIELDS} FROM tasks t
         WHERE t.parent_id IS NULL AND t.project_id = ?
         ORDER BY t.order_index ASC, t.created_at DESC`,
        [projectId]
      )
    : await db.getAllAsync<any>(
        `SELECT ${TASK_FIELDS} FROM tasks t
         WHERE t.parent_id IS NULL
         ORDER BY t.order_index ASC, t.created_at DESC`
      );
  return rows.map(r => ({ ...r, tags: parseTags(r.tags), attachments: parseAttachments(r.attachments) }));
}

export async function getTaskById(id: number): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT ${TASK_FIELDS} FROM tasks t WHERE t.id = ?`,
    [id]
  );
  if (!row) return null;
  return { ...row, tags: parseTags(row.tags), attachments: parseAttachments(row.attachments) };
}

export async function getTodayTasks(date?: string): Promise<Task[]> {
  const db = await getDatabase();
  const todayStr = localDateStr();
  const target = date ?? todayStr;
  const isToday = target === todayStr;

  const rows = isToday
    ? await db.getAllAsync<any>(
        `SELECT ${TASK_FIELDS} FROM tasks t
         WHERE t.parent_id IS NULL
           AND (
             t.due_date = ?
             OR (t.due_date IS NULL AND t.project_id IS NULL)
             OR (t.recurrence = 'daily' AND t.status != 'completed' AND t.due_date < ?)
             OR (t.recurrence = 'weekly' AND t.status != 'completed' AND t.due_date < ?
                 AND strftime('%w', t.due_date) = strftime('%w', ?))
             OR (t.recurrence = 'monthly' AND t.status != 'completed' AND t.due_date < ?
                 AND strftime('%d', t.due_date) = strftime('%d', ?))
           )
         ORDER BY t.status ASC, t.priority DESC, t.created_at DESC`,
        [target, target, target, target, target, target]
      )
    : await db.getAllAsync<any>(
        `SELECT ${TASK_FIELDS} FROM tasks t
         WHERE t.parent_id IS NULL
           AND t.due_date = ?
         ORDER BY t.status ASC, t.priority DESC, t.created_at DESC`,
        [target]
      );
  return rows.map(r => ({ ...r, tags: parseTags(r.tags), attachments: parseAttachments(r.attachments) }));
}

export async function getChildTasks(parentId: number): Promise<Task[]> {
  const db = await getDatabase();
  return db.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at ASC`,
    [parentId]
  );
}

export async function createTask(
  title: string,
  priority: Priority = 'medium',
  projectId?: number,
  dueDate?: string,
  description?: string,
  parentId?: number,
  recurrence: string = 'none'
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO tasks (title, description, priority, project_id, due_date, parent_id, recurrence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description ?? null, priority, projectId ?? null, dueDate ?? null, parentId ?? null, recurrence]
  );
  return result.lastInsertRowId;
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, id]
  );
}

export async function updateTask(
  id: number,
  fields: Partial<Pick<Task, 'title' | 'description' | 'priority'>> & { due_date?: string | null; project_id?: number | null; recurrence?: string }
): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  await db.runAsync(
    `UPDATE tasks SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`,
    [...values, id]
  );
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

// ─── NOTES ──────────────────────────────────────────────────────────────────

export async function getNotes(projectId?: number): Promise<Note[]> {
  const db = await getDatabase();
  const rows = projectId !== undefined
    ? await db.getAllAsync<any>('SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC', [projectId])
    : await db.getAllAsync<any>('SELECT * FROM notes ORDER BY updated_at DESC');
  return rows.map(r => ({ ...r, tags: parseTags(r.tags) }));
}

export async function createNote(title: string, content: string, projectId?: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO notes (title, content, project_id) VALUES (?, ?, ?)',
    [title, content, projectId ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateNote(id: number, title: string, content: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
    [title, content, id]
  );
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

export async function advanceRecurringTask(id: number, nextDate: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE tasks SET due_date = ?, status = 'pending', updated_at = datetime('now') WHERE id = ?",
    [nextDate, id]
  );
}

export async function updateTaskNotificationId(id: number, notificationId: string | null, reminderAt?: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE tasks SET notification_id = ?, reminder_at = ?, updated_at = datetime('now') WHERE id = ?",
    [notificationId, reminderAt ?? null, id]
  );
}

export async function updateTaskTags(id: number, tags: string[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE tasks SET tags = ?, updated_at = datetime('now') WHERE id = ?",
    [serializeTags(tags), id]
  );
}

export async function updateNoteTags(id: number, tags: string[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE notes SET tags = ?, updated_at = datetime('now') WHERE id = ?",
    [serializeTags(tags), id]
  );
}

// ─── SUBTASKS ────────────────────────────────────────────────────────────────

export async function getSubtasks(taskId: number): Promise<Subtask[]> {
  const db = await getDatabase();
  return db.getAllAsync<Subtask>(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC, created_at ASC',
    [taskId]
  );
}

export async function createSubtask(taskId: number, title: string, orderIndex: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO subtasks (task_id, title, order_index) VALUES (?, ?, ?)',
    [taskId, title, orderIndex]
  );
  return result.lastInsertRowId;
}

export async function toggleSubtask(id: number, completed: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE subtasks SET completed = ? WHERE id = ?', [completed, id]);
}

export async function deleteSubtask(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM subtasks WHERE id = ?', [id]);
}

export async function updateSubtaskTitle(id: number, title: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE subtasks SET title = ? WHERE id = ?', [title, id]);
}

export async function updateTaskAttachments(id: number, attachments: string[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE tasks SET attachments = ?, updated_at = datetime('now') WHERE id = ?",
    [JSON.stringify(attachments), id]
  );
}

// ─── STATISTICS ──────────────────────────────────────────────────────────────

export async function getWeeklyStats(days: string[]): Promise<{ date: string; completed: number; created: number }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(`
    SELECT
      d.date,
      COALESCE(SUM(CASE WHEN t.status = 'completed' AND date(t.updated_at) = d.date THEN 1 ELSE 0 END), 0) as completed,
      COALESCE(SUM(CASE WHEN date(t.created_at) = d.date THEN 1 ELSE 0 END), 0) as created
    FROM (SELECT value as date FROM json_each('[${days.map(d => `"${d}"`).join(',')}]')) d
    LEFT JOIN tasks t ON t.parent_id IS NULL
    GROUP BY d.date
    ORDER BY d.date ASC
  `);
  return rows;
}

export async function getOverallStats(): Promise<{
  total: number; completed: number; pending: number;
  total_notes: number; total_projects: number;
}> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(`
    SELECT
      (SELECT COUNT(*) FROM tasks WHERE parent_id IS NULL) as total,
      (SELECT COUNT(*) FROM tasks WHERE parent_id IS NULL AND status = 'completed') as completed,
      (SELECT COUNT(*) FROM tasks WHERE parent_id IS NULL AND status = 'pending') as pending,
      (SELECT COUNT(*) FROM notes) as total_notes,
      (SELECT COUNT(*) FROM projects) as total_projects
  `);
  return row ?? { total: 0, completed: 0, pending: 0, total_notes: 0, total_projects: 0 };
}

export async function getTopProjects(): Promise<{ project_id: number; name: string; color: string; total: number; completed: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT p.id as project_id, p.name, p.color,
      COUNT(t.id) as total,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id AND t.parent_id IS NULL
    GROUP BY p.id
    ORDER BY total DESC
    LIMIT 5
  `);
}
