import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name={icon} size={40} color={theme.primary} />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText variant="secondary" style={styles.subtitle}>{subtitle}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
