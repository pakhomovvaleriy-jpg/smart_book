export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'pending' | 'completed';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  project_id?: number;
  parent_id?: number | null;
  due_date?: string;
  notification_id?: string | null;
  reminder_at?: string | null;
  recurrence?: Recurrence;
  tags: string[];
  attachments?: string[];
  created_at: string;
  updated_at: string;
  // подсчёт подпунктов (добавляется через JOIN)
  subtask_count?: number;
  subtask_completed_count?: number;
  // дочерние задачи (2-й уровень иерархии)
  child_count?: number;
  child_completed_count?: number;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: number; // 0 или 1 (SQLite)
  order_index: number;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  project_id?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}
