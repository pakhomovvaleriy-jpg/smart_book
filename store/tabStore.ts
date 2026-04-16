import { create } from 'zustand';

interface TabState {
  activeTab: number;
  setTab: (index: number) => void;
}

export const useTabStore = create<TabState>((set) => ({
  activeTab: 0,
  setTab: (index) => set({ activeTab: index }),
}));
