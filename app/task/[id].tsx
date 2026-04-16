import { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { TagChip } from '../../components/ui/TagChip';
import { SubtaskItem } from '../../components/tasks/SubtaskItem';
import { useTheme } from '../../hooks/useTheme';
import { useTasksStore } from '../../store/tasksStore';
import { useSubtasksStore } from '../../store/subtasksStore';
import { DatePickerModal } from '../../components/ui/DatePickerModal';
import { updateTaskTags, updateTaskNotificationId, updateTask } from '../../db/queries';
import { scheduleTaskReminder, cancelTaskReminder } from '../../utils/notifications';
import { PriorityColors } from '../../constants/colors';
import type { Priority, Recurrence } from '../../types';

const PRIORITIES: { label: string; value: Priority }[] = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
];

const RECURRENCES: { label: string; value: Recurrence }[] = [
  { label: 'Нет', value: 'none' },
  { label: 'Каждый день', value: 'daily' },
  { label: 'Каждую неделю', value: 'weekly' },
  { label: 'Каждый месяц', value: 'monthly' },
];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);
  const router = useRouter();
  const theme = useTheme();

  const { tasks, todayTasks, fetchTasks, changePriority, removeTask, setNotificationId } = useTasksStore();
  const { subtasks, fetchSubtasks, addSubtask, toggleSubtask, removeSubtask, clear } = useSubtasksStore();

  const task = tasks.find(t => t.id === taskId) ?? todayTasks.find(t => t.id === taskId);

  useEffect(() => {
    if (!task) fetchTasks();
  }, []);
  const [titleEdit, setTitleEdit] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notifId, setNotifId] = useState<string | null>(null);
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [reminderPickerOpen, setReminderPickerOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderHour, setReminderHour] = useState(9);
  const [reminderMinute, setReminderMinute] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchSubtasks(taskId);
    return () => clear();
  }, [taskId]);

  useEffect(() => {
    if (task) {
      setTitleEdit(task.title);
      setTags(task.tags ?? []);
      setRecurrence((task.recurrence as Recurrence) ?? 'none');
      setNotifId(task.notification_id ?? null);
      if (task.due_date) {
        const d = new Date(task.due_date + 'T00:00:00');
        setTaskDueDate(d);
        if (!task.reminder_at) setReminderDate(d);
      }
      // Восстанавливаем дату и время напоминания из БД
      if (task.reminder_at) {
        const rd = new Date(task.reminder_at);
        setReminderDate(rd);
        setReminderHour(rd.getHours());
        setReminderMinute(rd.getMinutes());
      }
    }
  }, [task?.id]);

  const handleRecurrenceChange = async (value: Recurrence) => {
    setRecurrence(value);
    await updateTask(taskId, { recurrence: value });
  };

  const handleTitleSave = async () => {
    const newTitle = titleEdit.trim();
    if (!newTitle || newTitle === task?.title) return;
    await updateTask(taskId, { title: newTitle });
    await fetchTasks();
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
    if (!tag || tags.includes(tag)) { setTagInput(''); return; }
    const newTags = [...tags, tag];
    setTags(newTags);
    setTagInput('');
    await updateTaskTags(taskId, newTags);
  };

  const handleRemoveTag = async (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    await updateTaskTags(taskId, newTags);
  };

  const handleSetDueDate = async (date: Date | null) => {
    setTaskDueDate(date);
    setReminderDate(date);
    const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
    await updateTask(taskId, { due_date: dateStr });
  };

  const handleSetReminder = async () => {
    if (!reminderDate) return;
    if (notifId) await cancelTaskReminder(notifId);
    const fireDate = new Date(reminderDate);
    fireDate.setHours(reminderHour, reminderMinute, 0, 0);
    if (fireDate <= new Date()) {
      Alert.alert('Выбери время в будущем');
      return;
    }
    const id = await scheduleTaskReminder(task!.title, fireDate, taskId);
    if (id) {
      const reminderAt = fireDate.toISOString();
      setNotifId(id);
      await updateTaskNotificationId(taskId, id, reminderAt);
      setNotificationId(taskId, id, reminderAt);
    }
  };

  const handleCancelReminder = async () => {
    if (!notifId) return;
    await cancelTaskReminder(notifId);
    setNotifId(null);
    setReminderDate(taskDueDate); // возвращаем к дате задачи (или null)
    await updateTaskNotificationId(taskId, null, null);
    setNotificationId(taskId, null, null);
  };


  if (!task) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <ThemedText style={[styles.backText, { color: theme.primary }]}>Назад</ThemedText>
          </TouchableOpacity>
          <ThemedText variant="secondary" style={{ textAlign: 'center', marginTop: 40 }}>
            Задача не найдена
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleAddSubtask = async () => {
    const title = subtaskInput.trim();
    if (!title) return;
    setSubtaskInput('');
    await addSubtask(taskId, title);
  };

  const handleDeleteTask = () => {
    Alert.alert('Удалить задачу?', 'Все подпункты тоже удалятся', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          await removeTask(task.id);
          router.back();
        },
      },
    ]);
  };

  const completedCount = subtasks.filter(s => s.completed === 1).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* Шапка */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <ThemedText style={[styles.backText, { color: theme.primary }]}>Назад</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteTask} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Название задачи */}
          <View style={styles.titleSection}>
            <View style={[styles.priorityBar, { backgroundColor: PriorityColors[task.priority] }]} />
            <TextInput
              style={[styles.taskTitle, { color: theme.text }]}
              value={titleEdit}
              onChangeText={setTitleEdit}
              onBlur={handleTitleSave}
              onSubmitEditing={handleTitleSave}
              multiline
              returnKeyType="done"
              blurOnSubmit
            />
          </View>

          {/* Дата */}
          <View style={styles.section}>
            <ThemedText variant="secondary" style={styles.sectionLabel}>ДАТА</ThemedText>
            <TouchableOpacity
              style={[styles.dateRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setDueDatePickerOpen(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={taskDueDate ? theme.primary : theme.textSecondary}
              />
              <ThemedText style={[styles.dateRowText, { color: taskDueDate ? theme.text : theme.textSecondary }]}>
                {taskDueDate
                  ? taskDueDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
                  : 'Добавить дату'}
              </ThemedText>
              {taskDueDate && (
                <TouchableOpacity onPress={() => handleSetDueDate(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Приоритет */}
          <View style={styles.section}>
            <ThemedText variant="secondary" style={styles.sectionLabel}>ПРИОРИТЕТ</ThemedText>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    changePriority(task.id, p.value);
                  }}
                  style={[
                    styles.priorityChip,
                    { borderColor: PriorityColors[p.value] },
                    task.priority === p.value && { backgroundColor: PriorityColors[p.value] },
                  ]}
                >
                  <ThemedText style={[
                    styles.priorityChipText,
                    { color: task.priority === p.value ? '#fff' : PriorityColors[p.value] },
                  ]}>
                    {p.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Повторение */}
          <View style={styles.section}>
            <ThemedText variant="secondary" style={styles.sectionLabel}>ПОВТОРЕНИЕ</ThemedText>
            <View style={styles.recurrenceRow}>
              {RECURRENCES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => handleRecurrenceChange(r.value)}
                  style={[
                    styles.recurrenceChip,
                    { borderColor: theme.border },
                    recurrence === r.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  {r.value !== 'none' && (
                    <Ionicons
                      name="repeat"
                      size={12}
                      color={recurrence === r.value ? '#fff' : theme.textSecondary}
                    />
                  )}
                  <ThemedText style={[
                    styles.recurrenceChipText,
                    { color: recurrence === r.value ? '#fff' : theme.text },
                  ]}>
                    {r.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Теги */}
          <View style={styles.section}>
            <ThemedText variant="secondary" style={styles.sectionLabel}>ТЕГИ</ThemedText>
            <View style={styles.tagsWrap}>
              {tags.map(tag => (
                <TagChip key={tag} tag={tag} onRemove={() => handleRemoveTag(tag)} />
              ))}
              <View style={[styles.tagInputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ThemedText style={[styles.tagHash, { color: theme.textSecondary }]}>#</ThemedText>
                <TextInput
                  style={[styles.tagInput, { color: theme.text }]}
                  placeholder="новый тег"
                  placeholderTextColor={theme.textSecondary}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Напоминание */}
          <View style={styles.section}>
            <ThemedText variant="secondary" style={styles.sectionLabel}>НАПОМИНАНИЕ</ThemedText>
            <View style={[styles.reminderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Выбор даты */}
              <TouchableOpacity
                style={styles.reminderDateRow}
                onPress={() => setReminderPickerOpen(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                <ThemedText style={[styles.reminderDateText, { color: theme.primary }]}>
                  {reminderDate
                    ? reminderDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Выбрать дату'}
                </ThemedText>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Выбор времени */}
              {reminderDate && !notifId && (
                <>
                  <View style={[styles.timeDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.timePickerRow}>
                    <Ionicons name="time-outline" size={18} color={theme.primary} />
                    {/* Часы */}
                    <View style={styles.timeSpinner}>
                      <TouchableOpacity onPress={() => setReminderHour(h => (h + 1) % 24)} hitSlop={8}>
                        <Ionicons name="chevron-up" size={18} color={theme.primary} />
                      </TouchableOpacity>
                      <ThemedText style={styles.timeSpinnerVal}>
                        {String(reminderHour).padStart(2, '0')}
                      </ThemedText>
                      <TouchableOpacity onPress={() => setReminderHour(h => (h - 1 + 24) % 24)} hitSlop={8}>
                        <Ionicons name="chevron-down" size={18} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                    <ThemedText style={styles.timeColon}>:</ThemedText>
                    {/* Минуты */}
                    <View style={styles.timeSpinner}>
                      <TouchableOpacity onPress={() => setReminderMinute(m => (m + 5) % 60)} hitSlop={8}>
                        <Ionicons name="chevron-up" size={18} color={theme.primary} />
                      </TouchableOpacity>
                      <ThemedText style={styles.timeSpinnerVal}>
                        {String(reminderMinute).padStart(2, '0')}
                      </ThemedText>
                      <TouchableOpacity onPress={() => setReminderMinute(m => (m - 5 + 60) % 60)} hitSlop={8}>
                        <Ionicons name="chevron-down" size={18} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={handleSetReminder}
                      style={[styles.setReminderBtn, { backgroundColor: theme.primary }]}
                    >
                      <Ionicons name="notifications-outline" size={16} color="#fff" />
                      <ThemedText style={styles.setReminderBtnText}>Установить</ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Активное напоминание */}
              {notifId && reminderDate && (
                <>
                  <View style={[styles.timeDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.activeReminderRow}>
                    <Ionicons name="notifications" size={18} color="#22C55E" />
                    <ThemedText style={[styles.activeReminderText, { color: '#22C55E' }]}>
                      {reminderDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      {' в '}
                      {String(reminderHour).padStart(2, '0')}:{String(reminderMinute).padStart(2, '0')}
                    </ThemedText>
                    <TouchableOpacity onPress={handleCancelReminder} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Подпункты */}
          <View style={styles.section}>
            <View style={styles.subtaskHeader}>
              <ThemedText variant="secondary" style={styles.sectionLabel}>
                ПОДПУНКТЫ
              </ThemedText>
              {totalCount > 0 && (
                <ThemedText variant="secondary" style={styles.sectionLabel}>
                  {completedCount}/{totalCount}
                </ThemedText>
              )}
            </View>

            {/* Прогресс-бар подпунктов */}
            {totalCount > 0 && (
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View style={[
                  styles.progressBarFill,
                  { width: `${progress * 100}%`, backgroundColor: theme.primary },
                ]} />
              </View>
            )}

            {/* Список подпунктов */}
            <View style={[styles.subtaskList, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {subtasks.map(st => (
                <SubtaskItem
                  key={st.id}
                  subtask={st}
                  priority={task.priority}
                  onToggle={toggleSubtask}
                  onDelete={removeSubtask}
                />
              ))}

              {/* Поле добавления подпункта */}
              <View style={[styles.addSubtaskRow, { borderTopColor: subtasks.length > 0 ? theme.border : 'transparent' }]}>
                <Ionicons name="add" size={20} color={theme.primary} />
                <TextInput
                  ref={inputRef}
                  style={[styles.subtaskInput, { color: theme.text }]}
                  placeholder="Добавить подпункт..."
                  placeholderTextColor={theme.textSecondary}
                  value={subtaskInput}
                  onChangeText={setSubtaskInput}
                  onSubmitEditing={handleAddSubtask}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <DatePickerModal
        visible={dueDatePickerOpen}
        value={taskDueDate}
        onSelect={handleSetDueDate}
        onClose={() => setDueDatePickerOpen(false)}
      />
      <DatePickerModal
        visible={reminderPickerOpen}
        value={reminderDate}
        onSelect={(date) => { setReminderDate(date); setNotifId(null); }}
        onClose={() => setReminderPickerOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
  },
  deleteBtn: {
    padding: 4,
  },

  scroll: { flex: 1 },

  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  priorityBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 28,
    marginTop: 3,
  },
  taskTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    padding: 0,
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dateRowText: { flex: 1, fontSize: 15 },

  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  recurrenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recurrenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  recurrenceChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4, gap: 2,
  },
  tagHash: { fontSize: 13, fontWeight: '600' },
  tagInput: { fontSize: 13, minWidth: 80, paddingVertical: 0 },

  reminderCard: {
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  reminderDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  reminderDateText: { flex: 1, fontSize: 14, fontWeight: '600' },
  timeDivider: { height: 1 },
  timePickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  timeSpinner: { alignItems: 'center', gap: 2 },
  timeSpinnerVal: { fontSize: 22, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  timeColon: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  setReminderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  setReminderBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  activeReminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  activeReminderText: { flex: 1, fontSize: 14, fontWeight: '600' },

  subtaskList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
