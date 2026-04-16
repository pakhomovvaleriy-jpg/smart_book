import { create } from 'zustand';
import type { Subtask } from '../types';
import * as Q from '../db/queries';

interface SubtasksState {
  subtasks: Subtask[];
  loading: boolean;
  fetchSubtasks: (taskId: number) => Promise<void>;
  addSubtask: (taskId: number, title: string) => Promise<void>;
  toggleSubtask: (id: number, completed: number) => Promise<void>;
  removeSubtask: (id: number) => Promise<void>;
  clear: () => void;
}

export const useSubtasksStore = create<SubtasksState>((set, get) => ({
  subtasks: [],
  loading: false,

  fetchSubtasks: async (taskId) => {
    set({ loading: true });
    const subtasks = await Q.getSubtasks(taskId);
    set({ subtasks, loading: false });
  },

  addSubtask: async (taskId, title) => {
    const orderIndex = get().subtasks.length;
    const id = await Q.createSubtask(taskId, title, orderIndex);
    const newSubtask: Subtask = {
      id,
      task_id: taskId,
      title,
      completed: 0,
      order_index: orderIndex,
      created_at: new Date().toISOString(),
    };
    set(s => ({ subtasks: [...s.subtasks, newSubtask] }));
  },

  toggleSubtask: async (id, completed) => {
    const next = completed === 1 ? 0 : 1;
    await Q.toggleSubtask(id, next);
    set(s => ({
      subtasks: s.subtasks.map(st => st.id === id ? { ...st, completed: next } : st),
    }));
  },

  removeSubtask: async (id) => {
    await Q.deleteSubtask(id);
    set(s => ({ subtasks: s.subtasks.filter(st => st.id !== id) }));
  },

  clear: () => set({ subtasks: [] }),
}));
