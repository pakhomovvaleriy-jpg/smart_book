import { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '../ui/ThemedText';
import { useTheme } from '../../hooks/useTheme';
import type { Subtask, Priority } from '../../types';
import { PriorityColors } from '../../constants/colors';

interface Props {
  subtask: Subtask;
  priority: Priority;
  onToggle: (id: number, completed: number) => void;
  onDelete: (id: number) => void;
}

export function SubtaskItem({ subtask, priority, onToggle, onDelete }: Props) {
  const theme = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const done = subtask.completed === 1;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(subtask.id, subtask.completed);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRef.current?.close();
    onDelete(subtask.id);
  };

  const renderRightActions = (_: any, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-70, 0], outputRange: [1, 0.5], extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity onPress={handleDelete} style={styles.deleteAction} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={18} color="#fff" />
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
      <View style={[styles.container, { borderBottomColor: theme.border }]}>
        <View style={[styles.priorityDot, { backgroundColor: PriorityColors[priority] }]} />
        <TouchableOpacity onPress={handleToggle} style={styles.checkbox} hitSlop={6}>
          <View style={[
            styles.checkCircle,
            { borderColor: done ? theme.primary : theme.border },
            done && { backgroundColor: theme.primary },
          ]}>
            {done && <Ionicons name="checkmark" size={10} color="#fff" />}
          </View>
        </TouchableOpacity>
        <ThemedText
          style={[
            styles.title,
            done && { textDecorationLine: 'line-through', opacity: 0.45 },
          ]}
          numberOfLines={2}
        >
          {subtask.title}
        </ThemedText>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
    backgroundColor: 'transparent',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkbox: {},
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    marginLeft: 4,
  },
});
