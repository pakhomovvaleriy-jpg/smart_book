import { create } from 'zustand';
import type { Project } from '../types';
import * as Q from '../db/queries';

interface ProjectsState {
  projects: Project[];
  fetchProjects: () => Promise<void>;
  addProject: (name: string, color: string, icon: string) => Promise<void>;
  removeProject: (id: number) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],

  fetchProjects: async () => {
    const projects = await Q.getProjects();
    set({ projects });
  },

  addProject: async (name, color, icon) => {
    await Q.createProject(name, color, icon);
    await get().fetchProjects();
  },

  removeProject: async (id) => {
    await Q.deleteProject(id);
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
  },
}));
