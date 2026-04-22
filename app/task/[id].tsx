import { useEffect, useState, useCallback } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  Image, Modal, useWindowDimensions, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { useTheme } from '../../hooks/useTheme';
import { useTasksStore } from '../../store/tasksStore';
import { DatePickerModal } from '../../components/ui/DatePickerModal';
import {
  updateTask, getChildTasks, createTask, updateTaskStatus,
  getTaskById, updateTaskAttachments,
} from '../../db/queries';
import type { Task } from '../../types';
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
  const { width } = useWindowDimensions();

  const { tasks, todayTasks, fetchTasks, changePriority, removeTask } = useTasksStore();
  const [fetchedTask, setFetchedTask] = useState<Task | null>(null);

  const task = tasks.find(t => t.id === taskId) ?? todayTasks.find(t => t.id === taskId) ?? fetchedTask ?? undefined;

  useEffect(() => {
    getTaskById(taskId).then(t => { if (t) setFetchedTask(t); });
  }, [taskId]);

  const [titleEdit, setTitleEdit] = useState('');
  const [noteEdit, setNoteEdit] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [childInput, setChildInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [grandchildren, setGrandchildren] = useState<Record<number, Task[]>>({});
  const [grandInputs, setGrandInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    loadChildTasks();
  }, [taskId]);

  const loadChildTasks = async () => {
    const kids = await getChildTasks(taskId);
    setChildTasks(kids);
  };

  const handleAddChildTask = async () => {
    const title = childInput.trim();
    if (!title) return;
    setChildInput('');
    await createTask(title, 'medium', task?.project_id ?? undefined, task?.due_date ?? undefined, undefined, taskId);
    loadChildTasks();
  };

  const handleToggleChild = async (child: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = child.status === 'completed' ? 'pending' : 'completed';
    await updateTaskStatus(child.id, next as any);
    setChildTasks(prev => prev.map(c => c.id === child.id ? { ...c, status: next as any } : c));
  };

  const handleToggleExpand = async (childId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(childId)) { next.delete(childId); return next; }
      next.add(childId);
      return next;
    });
    if (!grandchildren[childId]) {
      const kids = await getChildTasks(childId);
      setGrandchildren(prev => ({ ...prev, [childId]: kids }));
    }
  };

  const handleToggleGrand = async (parentId: number, grand: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = grand.status === 'completed' ? 'pending' : 'completed';
    await updateTaskStatus(grand.id, next as any);
    setGrandchildren(prev => ({
      ...prev,
      [parentId]: (prev[parentId] ?? []).map(g => g.id === grand.id ? { ...g, status: next as any } : g),
    }));
  };

  const handleAddGrand = async (parentId: number) => {
    const title = (grandInputs[parentId] ?? '').trim();
    if (!title) return;
    setGrandInputs(prev => ({ ...prev, [parentId]: '' }));
    const parentTask = childTasks.find(c => c.id === parentId);
    await createTask(title, 'medium', task?.project_id ?? undefined, parentTask?.due_date ?? undefined, undefined, parentId);
    const kids = await getChildTasks(parentId);
    setGrandchildren(prev => ({ ...prev, [parentId]: kids }));
  };

  useEffect(() => {
    if (task) {
      setTitleEdit(task.title);
      setNoteEdit(task.description ?? '');
      setRecurrence((task.recurrence as Recurrence) ?? 'none');
      setAttachments(task.attachments ?? []);
      if (task.due_date) {
        setTaskDueDate(new Date(task.due_date + 'T00:00:00'));
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

  const handleNoteSave = async () => {
    if (noteEdit === (task?.description ?? '')) return;
    await updateTask(taskId, { description: noteEdit });
  };

  const handleSetDueDate = async (date: Date | null) => {
    setTaskDueDate(date);
    const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
    await updateTask(taskId, { due_date: dateStr });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      const next = [...attachments, ...uris];
      setAttachments(next);
      await updateTaskAttachments(taskId, next);
    }
  };

  const handleDeleteAttachment = useCallback((uri: string) => {
    Alert.alert('Удалить фото?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          const next = attachments.filter(a => a !== uri);
          setAttachments(next);
          await updateTaskAttachments(taskId, next);
        },
      },
    ]);
  }, [attachments, taskId]);

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

  const handleDeleteTask = () => {
    Alert.alert('Удалить задачу?', 'Все подзадачи тоже удалятся', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          await removeTask(task.id);
          router.back();
        },
      },
    ]);
  };

  const thumbSize = (width - 20 * 2 - 8 * 2) / 3;

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

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

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
                <Ionicons name="calendar-outline" size={18} color={taskDueDate ? theme.primary : theme.textSecondary} />
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
              <View style={styles.chipsRow}>
                {PRIORITIES.map(p => {
                  const active = task.priority === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); changePriority(task.id, p.value); }}
                      style={[
                        styles.chip,
                        { borderColor: PriorityColors[p.value] },
                        active && { backgroundColor: PriorityColors[p.value] },
                      ]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : PriorityColors[p.value] }]} />
                      <ThemedText style={[styles.chipText, { color: active ? '#fff' : PriorityColors[p.value] }]}>
                        {p.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Повторение */}
            <View style={styles.section}>
              <ThemedText variant="secondary" style={styles.sectionLabel}>ПОВТОРЕНИЕ</ThemedText>
              <View style={styles.chipsWrap}>
                {RECURRENCES.map(r => {
                  const active = recurrence === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => handleRecurrenceChange(r.value)}
                      style={[
                        styles.chip,
                        { borderColor: active ? theme.primary : theme.border },
                        active && { backgroundColor: theme.primary },
                      ]}
                    >
                      {r.value !== 'none' && (
                        <Ionicons name="repeat" size={11} color={active ? '#fff' : theme.textSecondary} />
                      )}
                      <ThemedText style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>
                        {r.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Заметка */}
            <View style={styles.section}>
              <ThemedText variant="secondary" style={styles.sectionLabel}>ЗАМЕТКА</ThemedText>
              <TextInput
                style={[styles.noteInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                value={noteEdit}
                onChangeText={setNoteEdit}
                onBlur={handleNoteSave}
                placeholder="Добавить заметку..."
                placeholderTextColor={theme.textSecondary}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Вложения */}
            <View style={styles.section}>
              <View style={styles.attachHeader}>
                <ThemedText variant="secondary" style={styles.sectionLabel}>ВЛОЖЕНИЯ</ThemedText>
                <TouchableOpacity onPress={handlePickImage} style={styles.addPhotoBtn} hitSlop={8}>
                  <Ionicons name="add" size={18} color={theme.primary} />
                  <ThemedText style={[styles.addPhotoText, { color: theme.primary }]}>Добавить фото</ThemedText>
                </TouchableOpacity>
              </View>
              {attachments.length > 0 && (
                <View style={styles.thumbGrid}>
                  {attachments.map((uri, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setViewerUri(uri)}
                      onLongPress={() => handleDeleteAttachment(uri)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri }}
                        style={[styles.thumb, { width: thumbSize, height: thumbSize }]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Подзадачи */}
            <View style={styles.section}>
              <View style={styles.subtaskHeader}>
                <ThemedText variant="secondary" style={styles.sectionLabel}>ПОДЗАДАЧИ</ThemedText>
                {childTasks.length > 0 && (
                  <ThemedText variant="secondary" style={styles.sectionLabel}>
                    {childTasks.filter(c => c.status === 'completed').length}/{childTasks.length}
                  </ThemedText>
                )}
              </View>
              <View style={[styles.subtaskList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {childTasks.map((child, i) => {
                  const childDone = child.status === 'completed';
                  const expanded = expandedIds.has(child.id);
                  const grands = grandchildren[child.id] ?? [];
                  return (
                    <View key={child.id}>
                      {/* Строка подзадачи */}
                      <View style={[styles.childTaskRow, { borderTopColor: i === 0 ? 'transparent' : theme.border }]}>
                        <TouchableOpacity onPress={() => handleToggleChild(child)} hitSlop={8}>
                          <View style={[
                            styles.childCheck,
                            { borderColor: childDone ? theme.primary : theme.border },
                            childDone && { backgroundColor: theme.primary },
                          ]}>
                            {childDone && <Ionicons name="checkmark" size={11} color="#fff" />}
                          </View>
                        </TouchableOpacity>
                        <ThemedText
                          style={[styles.childTaskTitle, childDone && { textDecorationLine: 'line-through', opacity: 0.4 }]}
                          numberOfLines={1}
                        >
                          {child.title}
                        </ThemedText>
                        <TouchableOpacity onPress={() => handleToggleExpand(child.id)} hitSlop={8}>
                          <Ionicons
                            name={expanded ? 'chevron-down' : 'chevron-forward'}
                            size={14}
                            color={theme.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Вложенные подзадачи (аккордеон) */}
                      {expanded && (
                        <View style={[styles.grandList, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
                          {grands.map((grand, gi) => {
                            const grandDone = grand.status === 'completed';
                            return (
                              <View
                                key={grand.id}
                                style={[styles.grandRow, { borderTopColor: gi === 0 ? 'transparent' : theme.border }]}
                              >
                                <TouchableOpacity onPress={() => handleToggleGrand(child.id, grand)} hitSlop={8}>
                                  <View style={[
                                    styles.grandCheck,
                                    { borderColor: grandDone ? theme.primary : theme.border },
                                    grandDone && { backgroundColor: theme.primary },
                                  ]}>
                                    {grandDone && <Ionicons name="checkmark" size={9} color="#fff" />}
                                  </View>
                                </TouchableOpacity>
                                <ThemedText
                                  style={[styles.grandTitle, grandDone && { textDecorationLine: 'line-through', opacity: 0.4 }]}
                                  numberOfLines={1}
                                >
                                  {grand.title}
                                </ThemedText>
                              </View>
                            );
                          })}
                          <View style={[styles.grandRow, { borderTopColor: grands.length > 0 ? theme.border : 'transparent' }]}>
                            <Ionicons name="add" size={16} color={theme.primary} />
                            <TextInput
                              style={[styles.grandInput, { color: theme.text }]}
                              placeholder="Добавить..."
                              placeholderTextColor={theme.textSecondary}
                              value={grandInputs[child.id] ?? ''}
                              onChangeText={t => setGrandInputs(prev => ({ ...prev, [child.id]: t }))}
                              onSubmitEditing={() => handleAddGrand(child.id)}
                              returnKeyType="done"
                              blurOnSubmit={false}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
                <View style={[styles.addSubtaskRow, { borderTopColor: childTasks.length > 0 ? theme.border : 'transparent' }]}>
                  <Ionicons name="add" size={20} color={theme.primary} />
                  <TextInput
                    style={[styles.subtaskInput, { color: theme.text }]}
                    placeholder="Добавить подзадачу..."
                    placeholderTextColor={theme.textSecondary}
                    value={childInput}
                    onChangeText={setChildInput}
                    onSubmitEditing={handleAddChildTask}
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                </View>
              </View>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DatePickerModal
        visible={dueDatePickerOpen}
        value={taskDueDate}
        onSelect={handleSetDueDate}
        onClose={() => setDueDatePickerOpen(false)}
      />

      {/* Просмотр фото на весь экран */}
      <Modal visible={viewerUri !== null} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setViewerUri(null)}>
          {viewerUri && (
            <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUri(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
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

  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
    lineHeight: 22,
  },

  attachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumb: {
    borderRadius: 10,
    backgroundColor: '#ccc',
  },

  chipsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipDot: { width: 8, height: 8, borderRadius: 4 },

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
  subtaskList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  childTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  childCheck: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  childTaskTitle: { flex: 1, fontSize: 15 },

  grandList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingLeft: 48,
  },
  grandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grandCheck: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  grandTitle: { flex: 1, fontSize: 14 },
  grandInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

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

  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
});
