import { Colors } from '../constants/colors';
import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const scheme = useThemeStore(s => s.scheme);
  return Colors[scheme];
}
