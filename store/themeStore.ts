import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Scheme = 'light' | 'dark';

interface ThemeState {
  scheme: Scheme;
  load: () => Promise<void>;
  toggle: () => Promise<void>;
}

const KEY = 'app_theme';

export const useThemeStore = create<ThemeState>((set, get) => ({
  scheme: 'light',

  load: async () => {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') {
      set({ scheme: saved });
    }
  },

  toggle: async () => {
    const next: Scheme = get().scheme === 'light' ? 'dark' : 'light';
    set({ scheme: next });
    await AsyncStorage.setItem(KEY, next);
  },
}));
