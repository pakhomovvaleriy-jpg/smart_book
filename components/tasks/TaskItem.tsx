import { useRef, useState } from 'react';
import {
  TouchableOpacity, View, StyleSheet, Animated, Modal, Pressable,
  Platform, useWindowDimensions, Alert,
} from 'react-native';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ThemedText } from '../ui/ThemedText';
import { TagChip } from '../ui/TagChip';
import { DatePickerModal } from '../ui/DatePickerModal';
import { useTheme } from '../../hooks/useTheme';
import { PriorityColors } from '../../constants/colors';
import { updateTaskNotificationId } from '../../db/queries';
import { scheduleTaskReminder, cancelTaskReminder } from '../../utils/notifications';
import { useTasksStore } from '../../store/tasksStore';
import type { Task, Priority } from '../../types';

function formatReminderAt(isoString: string): string {
  const date = new Date(isoString);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (isToday(date)) return time;
  return format(date, 'd MMM', { locale: ru }) + ' ' + time;
}

function formatDate(dateStr: string): { label: string; overdue: boolean } {
  const date = parseISO(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = date < today;
  if (isToday(date)) return { label: 'Сегодня', overdue: false };
  if (isTomorrow(date)) return { label: 'Завтра', overdue: false };
  if (isYesterday(date)) return { label: 'Вчера', overdue: true };
  return { label: format(date, 'd MMM', { locale: ru }), overdue };
}

interface Props {
  task: Task;
  onToggle: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onChangePriority?: (id: number, priority: Priority) => void;
  hideDateIfToday?: boolean;
  noBorder?: boolean;
  cardIndex?: number;
}

export function TaskItem({ task, onToggle, onDelete, hideDateIfToday, cardIndex = 0 }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const swipeRef = useRef<Swipeable>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { setNotificationId } = useTasksStore();

  const isAlt = cardIndex % 2 === 1;
  const done = task.status === 'completed';
  const childCount = task.child_count ?? 0;
  const childDone = task.child_completed_count ?? 0;

  // Reminder modal state
  const [showReminder, setShowReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderHour, setReminderHour] = useState(9);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(task.id, task.status);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRef.current?.close();
    onDelete(task.id);
  };

  const openReminderModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (task.reminder_at) {
      const rd = new Date(task.reminder_at);
      setReminderDate(rd);
      setReminderHour(rd.getHours());
      setReminderMinute(rd.getMinutes());
    } else if (task.due_date) {
      setReminderDate(new Date(task.due_date + 'T00:00:00'));
      setReminderHour(9);
      setReminderMinute(0);
    } else {
      setReminderDate(new Date());
      setReminderHour(9);
      setReminderMinute(0);
    }
    setShowReminder(true);
  };

  const handleSetReminder = async () => {
    if (!reminderDate) return;
    if (task.notification_id) await cancelTaskReminder(task.notification_id);
    const fireDate = new Date(reminderDate);
    fireDate.setHours(reminderHour, reminderMinute, 0, 0);
    if (fireDate <= new Date()) {
      Alert.alert('Выбери время в будущем');
      return;
    }
    const id = await scheduleTaskReminder(task.title, fireDate, task.id);
    if (id) {
      const reminderAt = fireDate.toISOString();
      await updateTaskNotificationId(task.id, id, reminderAt);
      setNotificationId(task.id, id, reminderAt);
    }
    setShowReminder(false);
  };

  const handleCancelReminder = async () => {
    if (!task.notification_id) return;
    await cancelTaskReminder(task.notification_id);
    await updateTaskNotificationId(task.id, null, null);
    setNotificationId(task.id, null, null);
    setShowReminder(false);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.5], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={handleDelete} style={styles.deleteAction} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={22} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Swipeable ref={swipeRef} renderRightActions={renderRightActions} rightThreshold={40} overshootRight={false}>
        <Animated.View style={[styles.cardOuter, done && { opacity: 0.6 }, { transform: [{ scale: scaleAnim }] }]}>
          <View
            style={[
              styles.cardInner,
              {
                backgroundColor: done ? theme.card : isAlt ? theme.primaryLight : theme.card,
                borderWidth: 1,
                borderColor: isAlt && !done ? theme.primary + '30' : theme.border,
              },
            ]}
            onTouchStart={handlePressIn}
            onTouchEnd={handlePressOut}
            onTouchCancel={handlePressOut}
          >
            {/* Полоска приоритета */}
            <View style={[styles.priorityAccent, { backgroundColor: PriorityColors[task.priority] }]}>
              <ThemedText style={styles.priorityAccentLabel}>
                {task.priority === 'low' ? 'НИЗ' : task.priority === 'medium' ? 'СРД' : 'ВЫС'}
              </ThemedText>
            </View>

            {/* Чекбокс */}
            <TouchableOpacity onPress={handleToggle} style={styles.checkbox}>
              <View style={[
                styles.checkCircle,
                { borderColor: done ? theme.primary : theme.border },
                done && { backgroundColor: theme.primary },
              ]}>
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>

            {/* Контент — клик открывает экран, долгое нажатие — напоминание */}
            <TouchableOpacity
              style={styles.content}
              onPress={() => router.push(`/task/${task.id}`)}
              onLongPress={openReminderModal}
              delayLongPress={400}
            >
              <View style={styles.titleRow}>
                <ThemedText
                  style={[styles.title, done && { textDecorationLine: 'line-through', opacity: 0.45 }]}
                  numberOfLines={1}
                >
                  {task.title}
                </ThemedText>
                {task.recurrence && task.recurrence !== 'none' && (
                  <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="repeat" size={12} color={theme.primary} />
                  </View>
                )}
                {task.notification_id && (
                  <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="notifications" size={12} color={theme.primary} />
                    {task.reminder_at && (
                      <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
                        {formatReminderAt(task.reminder_at)}
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>

              {task.tags?.length > 0 && (
                <View style={styles.tagsRow}>
                  {task.tags.map(tag => <TagChip key={tag} tag={tag} small />)}
                </View>
              )}

              {(task.due_date || childCount > 0) && (
                <View style={styles.meta}>
                  {task.due_date && (() => {
                    const { label, overdue } = formatDate(task.due_date);
                    if (hideDateIfToday && label === 'Сегодня') return null;
                    return (
                      <View style={[styles.metaBadge, { backgroundColor: overdue ? theme.danger + '22' : theme.border + '80' }]}>
                        <Ionicons name="calendar-outline" size={10} color={overdue ? theme.danger : theme.textSecondary} />
                        <ThemedText style={[styles.metaText, { color: overdue ? theme.danger : theme.textSecondary }]}>{label}</ThemedText>
                      </View>
                    );
                  })()}
                  {childCount > 0 && (
                    <View style={styles.metaItem}>
                      <Ionicons name="list-outline" size={11} color={theme.textSecondary} />
                      <ThemedText variant="secondary" style={styles.metaText}>{childDone}/{childCount}</ThemedText>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

          </View>
        </Animated.View>
      </Swipeable>

      {/* Модалка напоминания (долгое нажатие) */}
      <Modal visible={showReminder} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowReminder(false)}>
          <Pressable
            style={[styles.reminderSheet, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {}}
          >
            {/* Шапка */}
            <View style={styles.reminderHeader}>
              <View style={[styles.reminderHandle, { backgroundColor: theme.border }]} />
            </View>
            <View style={styles.reminderTitleRow}>
              <Ionicons name="notifications-outline" size={20} color={theme.primary} />
              <ThemedText style={styles.reminderTitle}>Напоминание</ThemedText>
              <TouchableOpacity onPress={() => setShowReminder(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ThemedText variant="secondary" style={styles.taskNameHint} numberOfLines={1}>
              {task.title}
            </ThemedText>

            {/* Активное напоминание */}
            {task.notification_id && task.reminder_at && (
              <View style={[styles.activeRow, { backgroundColor: '#22C55E' + '15', borderColor: '#22C55E' + '30' }]}>
                <Ionicons name="notifications" size={16} color="#22C55E" />
                <ThemedText style={[styles.activeText, { color: '#22C55E' }]}>
                  {new Date(task.reminder_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
                <TouchableOpacity onPress={handleCancelReminder} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Выбор даты */}
            <TouchableOpacity
              style={[styles.datePickerRow, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setDatePickerOpen(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.primary} />
              <ThemedText style={{ flex: 1, color: reminderDate ? theme.text : theme.textSecondary, fontSize: 15 }}>
                {reminderDate
                  ? reminderDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Выбрать дату'}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Выбор времени */}
            {reminderDate && (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={18} color={theme.primary} />
                <View style={styles.spinner}>
                  <TouchableOpacity onPress={() => setReminderHour(h => (h + 1) % 24)} hitSlop={10}>
                    <Ionicons name="chevron-up" size={18} color={theme.primary} />
                  </TouchableOpacity>
                  <ThemedText style={styles.spinnerVal}>{String(reminderHour).padStart(2, '0')}</ThemedText>
                  <TouchableOpacity onPress={() => setReminderHour(h => (h - 1 + 24) % 24)} hitSlop={10}>
                    <Ionicons name="chevron-down" size={18} color={theme.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText style={styles.colon}>:</ThemedText>
                <View style={styles.spinner}>
                  <TouchableOpacity onPress={() => setReminderMinute(m => (m + 5) % 60)} hitSlop={10}>
                    <Ionicons name="chevron-up" size={18} color={theme.primary} />
                  </TouchableOpacity>
                  <ThemedText style={styles.spinnerVal}>{String(reminderMinute).padStart(2, '0')}</ThemedText>
                  <TouchableOpacity onPress={() => setReminderMinute(m => (m - 5 + 60) % 60)} hitSlop={10}>
                    <Ionicons name="chevron-down" size={18} color={theme.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleSetReminder}
                  style={[styles.setBtn, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="notifications-outline" size={16} color="#fff" />
                  <ThemedText style={styles.setBtnText}>Установить</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <DatePickerModal
        visible={datePickerOpen}
        value={reminderDate}
        onSelect={(d) => { setReminderDate(d); setDatePickerOpen(false); }}
        onClose={() => setDatePickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 18,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12 },
      android: { elevation: 5 },
    }),
  },
  cardInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 28, paddingRight: 14, paddingVertical: 14,
    minHeight: 72, borderRadius: 18, overflow: 'hidden', gap: 12,
  },
  priorityAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  priorityAccentLabel: {
    fontSize: 7, fontWeight: '800', color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5, transform: [{ rotate: '-90deg' }], width: 36, textAlign: 'center',
  },
  checkbox: { padding: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 15, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  deleteAction: {
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    width: 72, borderRadius: 18, marginBottom: 10, marginLeft: 8,
  },

  // Reminder modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  reminderSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, paddingHorizontal: 20, paddingBottom: 32, gap: 14,
  },
  reminderHeader: { alignItems: 'center', paddingTop: 10 },
  reminderHandle: { width: 40, height: 4, borderRadius: 2 },
  reminderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  taskNameHint: { fontSize: 13, marginTop: -6 },
  activeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  activeText: { flex: 1, fontSize: 14, fontWeight: '600' },
  datePickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { alignItems: 'center', gap: 2 },
  spinnerVal: { fontSize: 22, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  colon: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  setBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
  },
  setBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
