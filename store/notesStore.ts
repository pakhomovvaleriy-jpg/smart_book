import { create } from 'zustand';
import type { Note } from '../types';
import * as Q from '../db/queries';

interface NotesState {
  notes: Note[];
  loading: boolean;
  fetchNotes: (projectId?: number) => Promise<void>;
  addNote: (title: string, content: string, projectId?: number) => Promise<number>;
  editNote: (id: number, title: string, content: string) => Promise<void>;
  removeNote: (id: number) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,

  fetchNotes: async (projectId) => {
    set({ loading: true });
    const notes = await Q.getNotes(projectId);
    set({ notes, loading: false });
  },

  addNote: async (title, content, projectId) => {
    const id = await Q.createNote(title, content, projectId);
    await get().fetchNotes(projectId);
    return id;
  },

  editNote: async (id, title, content) => {
    await Q.updateNote(id, title, content);
    set(s => ({
      notes: s.notes.map(n => n.id === id ? { ...n, title, content } : n),
    }));
  },

  removeNote: async (id) => {
    await Q.deleteNote(id);
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
  },
}));
