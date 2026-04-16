import { useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '../ui/ThemedText';
import { TagChip } from '../ui/TagChip';
import { useTheme } from '../../hooks/useTheme';
import type { Note } from '../../types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  note: Note;
  onPress: (note: Note) => void;
  onDelete: (id: number) => void;
  cardIndex?: number;
}

export function NoteItem({ note, onPress, onDelete, cardIndex = 0 }: Props) {
  const theme = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const isAlt = cardIndex % 2 === 1;

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRef.current?.close();
    onDelete(note.id);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity onPress={handleDelete} style={styles.deleteAction} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={22} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.container, {
          backgroundColor: isAlt ? theme.primaryLight : theme.card,
          borderColor: isAlt ? theme.primary + '30' : theme.border,
        }]}
        onPress={() => onPress(note)}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title} numberOfLines={1}>{note.title}</ThemedText>
          <TouchableOpacity onPress={handleDelete} style={styles.trashBtn} hitSlop={6}>
            <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        {note.content ? (
          <ThemedText variant="secondary" style={styles.preview} numberOfLines={2}>
            {note.content}
          </ThemedText>
        ) : null}
        {note.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.map(tag => (
              <TagChip key={tag} tag={tag} small />
            ))}
          </View>
        )}
        <ThemedText variant="secondary" style={styles.date}>
          {format(new Date(note.updated_at), 'd MMM, HH:mm', { locale: ru })}
        </ThemedText>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  trashBtn: {
    padding: 4,
    marginLeft: 8,
  },
  preview: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  date: {
    fontSize: 11,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 12,
    marginBottom: 8,
    marginLeft: 6,
  },
});
