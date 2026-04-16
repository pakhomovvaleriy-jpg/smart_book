import { useEffect, useState } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Alert, Platform,
} from 'react-native';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskItem } from '../../components/tasks/TaskItem';
import { useTheme } from '../../hooks/useTheme';
import { useTasksStore } from '../../store/tasksStore';
import { useTabStore } from '../../store/tabStore';
import { DatePickerModal } from '../../components/ui/DatePickerModal';
import { PriorityColors } from '../../constants/colors';
import type { Priority, Task } from '../../types';

type Filter = 'all' | 'today' | 'overdue' | 'high';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'Все' },
  { key: 'today',   label: 'Сегодня' },
  { key: 'overdue', label: 'Просроч..' },
  { key: 'high',    label: 'Срочные' },
];

const TODAY = format(new Date(), 'yyyy-MM-dd');

function applyFilter(tasks: Task[], filter: Filter): Task[] {
  switch (filter) {
    case 'today':   return tasks.filter(t => t.due_date === TODAY);
    case 'overdue': return tasks.filter(t => t.due_date && t.due_date < TODAY);
    case 'high':    return tasks.filter(t => t.priority === 'high');
    default:        return tasks;
  }
}

const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high'];
const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий',
};

export default function TasksScreen() {
  const theme = useTheme();
  const { tasks, fetchTasks, addTask, toggleTask, changePriority, removeTask } = useTasksStore();
  const { activeTab } = useTabStore();
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (activeTab === 1) fetchTasks();
  }, [activeTab]);

  const handleAdd = async () => {
    const title = input.trim();
    if (!title) return;
    setInput('');
    const dateStr = dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined;
    setDueDate(null);
    await addTask(title, priority, undefined, dateStr);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Удалить задачу?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeTask(id) },
    ]);
  };

  const q = search.trim().toLowerCase();
  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');
  const filtered = applyFilter(pending, filter).filter(t =>
    !q || t.title.toLowerCase().includes(q)
  );

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        <View style={styles.header}>
          <ThemedText style={styles.title}>Задачи</ThemedText>
          <ThemedText variant="secondary" style={styles.subtitle}>
            {filtered.length} {filter === 'all' ? 'активных' : 'найдено'}
          </ThemedText>
        </View>

        <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Поиск задач..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            const isOverdue = f.key === 'overdue';
            const activeColor = isOverdue ? theme.danger : theme.primary;
            const count = f.key !== 'all' ? applyFilter(pending, f.key).length : 0;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  { borderColor: active ? activeColor : theme.border, backgroundColor: theme.card },
                  active && { backgroundColor: activeColor },
                ]}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.chipLabel, { color: active ? '#fff' : theme.text }]}>
                  {f.label}
                </ThemedText>
                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : activeColor + '22' }]}>
                    <ThemedText style={[styles.badgeText, { color: active ? '#fff' : activeColor }]}>
                      {count}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                cardIndex={index}
                onToggle={toggleTask}
                onDelete={handleDelete}
                onChangePriority={changePriority}
              />
            ))}

            {filter === 'all' && !q && completed.length > 0 && (
              <>
                <ThemedText variant="secondary" style={styles.sectionLabel}>
                  Выполнено ({completed.length})
                </ThemedText>
                {completed.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    cardIndex={index}
                    onToggle={toggleTask}
                    onDelete={handleDelete}
                    onChangePriority={changePriority}
                  />
                ))}
              </>
            )}

            {filtered.length === 0 && (
              <EmptyState
                icon="checkmark-circle-outline"
                title={
                  filter === 'today'   ? 'Задач на сегодня нет' :
                  filter === 'overdue' ? 'Поздних задач нет' :
                  filter === 'high'    ? 'Срочных задач нет' :
                  'Задач пока нет'
                }
                subtitle={filter === 'all' && !q ? 'Напиши задачу внизу и выбери приоритет' : ''}
              />
            )}
            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => setPriority(PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(priority) + 1) % 3])}
              style={styles.priorityBtn}
              hitSlop={8}
            >
              <View style={[styles.priorityDot, { backgroundColor: PriorityColors[priority] }]} />
              <ThemedText variant="secondary" style={styles.priorityHint}>
                {PRIORITY_LABELS[priority]}
              </ThemedText>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Новая задача..."
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => setDatePickerOpen(true)} style={styles.dateBtn} hitSlop={6}>
              {dueDate ? (
                <View style={[styles.dateBadge, { backgroundColor: theme.primary + '20' }]}>
                  <ThemedText style={[styles.dateBadgeText, { color: theme.primary }]}>
                    {format(dueDate, 'd MMM', { locale: ru })}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setDueDate(null)} hitSlop={6}>
                    <Ionicons name="close" size={12} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <DatePickerModal
        visible={datePickerOpen}
        value={dueDate}
        onSelect={setDueDate}
        onClose={() => setDatePickerOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, gap: 4,
  },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  badge: {
    minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, marginTop: 8, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  priorityBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, paddingVertical: 4, paddingHorizontal: 2,
  },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityHint: { fontSize: 12 },
  divider: { width: 1, height: 18 },
  input: { flex: 1, fontSize: 15, paddingVertical: 6 },
  dateBtn: { padding: 2 },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  dateBadgeText: { fontSize: 12, fontWeight: '600' },
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
