import { create } from 'zustand';
import type { Task, Priority } from '../types';
import * as Q from '../db/queries';
import { cancelTaskReminder, scheduleTaskReminder } from '../utils/notifications';

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextDueDate(dueDate: string, recurrence: string): string {
  const date = new Date(dueDate + 'T00:00:00');
  if (recurrence === 'daily')        date.setDate(date.getDate() + 1);
  else if (recurrence === 'weekly')  date.setDate(date.getDate() + 7);
  else if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
  // Используем локальные компоненты даты, чтобы не съехать на день из-за UTC
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface TasksState {
  tasks: Task[];
  todayTasks: Task[];
  loading: boolean;
  fetchTasks: (projectId?: number) => Promise<void>;
  fetchTodayTasks: (date?: string) => Promise<void>;
  addTask: (title: string, priority?: Priority, projectId?: number, dueDate?: string, description?: string, parentId?: number) => Promise<void>;
  toggleTask: (id: number, currentStatus: string) => Promise<void>;
  changePriority: (id: number, priority: Priority) => Promise<void>;
  removeTask: (id: number) => Promise<void>;
  setNotificationId: (id: number, notificationId: string | null, reminderAt?: string | null) => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  todayTasks: [],
  loading: false,

  fetchTasks: async (projectId) => {
    set({ loading: true });
    const tasks = await Q.getTasks(projectId);
    set({ tasks, loading: false });
  },

  fetchTodayTasks: async (date) => {
    const todayTasks = await Q.getTodayTasks(date);
    set({ todayTasks });
  },

  addTask: async (title, priority = 'medium', projectId, dueDate, description, parentId) => {
    await Q.createTask(title, priority, projectId, dueDate, description, parentId);
    if (!parentId) {
      await get().fetchTasks(projectId);
      await get().fetchTodayTasks();
    }
  },

  toggleTask: async (id, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await Q.updateTaskStatus(id, newStatus);
    // Отменяем напоминание при выполнении задачи
    if (newStatus === 'completed') {
      const task = get().tasks.find(t => t.id === id) ?? get().todayTasks.find(t => t.id === id);
      if (task?.notification_id) {
        await cancelTaskReminder(task.notification_id);
        await Q.updateTaskNotificationId(id, null, null);
      }
      // Сбрасываем повторяющуюся задачу на следующую дату
      if (task?.recurrence && task.recurrence !== 'none') {
        const base = task.due_date ?? todayDateStr();
        const nextDate = getNextDueDate(base, task.recurrence);
        await Q.advanceRecurringTask(id, nextDate);
        // Переставляем напоминание на то же время в новую дату
        if (task.reminder_at) {
          const oldReminder = new Date(task.reminder_at);
          const newReminder = new Date(nextDate + 'T00:00:00');
          newReminder.setHours(oldReminder.getHours(), oldReminder.getMinutes(), 0, 0);
          if (newReminder > new Date()) {
            const newNotifId = await scheduleTaskReminder(task.title, newReminder, id);
            if (newNotifId) {
              await Q.updateTaskNotificationId(id, newNotifId, newReminder.toISOString());
            }
          }
        }
        await get().fetchTasks(task.project_id ?? undefined);
        await get().fetchTodayTasks();
        return;
      }
    }
    const tasks = get().tasks.map(t => t.id === id ? { ...t, status: newStatus as any, notification_id: newStatus === 'completed' ? null : t.notification_id, reminder_at: newStatus === 'completed' ? null : t.reminder_at } : t);
    const todayTasks = get().todayTasks.map(t => t.id === id ? { ...t, status: newStatus as any, notification_id: newStatus === 'completed' ? null : t.notification_id, reminder_at: newStatus === 'completed' ? null : t.reminder_at } : t);
    set({ tasks, todayTasks });
  },

  changePriority: async (id, priority) => {
    await Q.updateTask(id, { priority });
    set(s => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, priority } : t),
      todayTasks: s.todayTasks.map(t => t.id === id ? { ...t, priority } : t),
    }));
  },

  removeTask: async (id) => {
    const task = get().tasks.find(t => t.id === id) ?? get().todayTasks.find(t => t.id === id);
    if (task?.notification_id) {
      await cancelTaskReminder(task.notification_id);
    }
    await Q.deleteTask(id);
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      todayTasks: s.todayTasks.filter(t => t.id !== id),
    }));
  },

  setNotificationId: (id, notificationId, reminderAt) => {
    set(s => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, notification_id: notificationId, reminder_at: reminderAt ?? null } : t),
      todayTasks: s.todayTasks.map(t => t.id === id ? { ...t, notification_id: notificationId, reminder_at: reminderAt ?? null } : t),
    }));
  },
}));
