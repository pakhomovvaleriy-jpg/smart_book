import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';

// Стабильный цвет по тексту тега
const TAG_COLORS = [
  '#6366F1', '#EC4899', '#F59E0B', '#22C55E',
  '#14B8A6', '#3B82F6', '#A855F7', '#EF4444',
];

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface Props {
  tag: string;
  onRemove?: () => void;
  onPress?: () => void;
  small?: boolean;
}

export function TagChip({ tag, onRemove, onPress, small }: Props) {
  const color = tagColor(tag);
  const bg = color + '20';

  const content = (
    <View style={[styles.chip, small && styles.chipSmall, { backgroundColor: bg, borderColor: color + '40' }]}>
      <ThemedText style={[styles.label, small && styles.labelSmall, { color }]}>
        #{tag}
      </ThemedText>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={6}>
          <Ionicons name="close" size={small ? 11 : 13} color={color} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  chipSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
});
