import { useEffect, useState } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskItem } from '../../components/tasks/TaskItem';
import { NoteItem } from '../../components/notes/NoteItem';
import { useTheme } from '../../hooks/useTheme';
import { DatePickerModal } from '../../components/ui/DatePickerModal';
import { useProjectsStore } from '../../store/projectsStore';
import { useTasksStore } from '../../store/tasksStore';
import { useNotesStore } from '../../store/notesStore';
import { PriorityColors } from '../../constants/colors';
import type { Priority } from '../../types';

type Tab = 'tasks' | 'notes';

const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high'];
const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий',
};

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id);
  const router = useRouter();
  const theme = useTheme();

  const { projects } = useProjectsStore();
  const { tasks, fetchTasks, addTask, toggleTask, changePriority, removeTask } = useTasksStore();
  const { notes, fetchNotes, addNote, editNote, removeNote } = useNotesStore();

  const project = projects.find(p => p.id === projectId);

  const [tab, setTab] = useState<Tab>('tasks');
  const [taskInput, setTaskInput] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  useEffect(() => {
    fetchTasks(projectId);
    fetchNotes(projectId);
  }, [projectId]);

  if (!project) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <ThemedText style={{ color: theme.primary }}>Назад</ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleAddTask = async () => {
    const title = taskInput.trim();
    if (!title) return;
    setTaskInput('');
    const dateStr = dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined;
    setDueDate(null);
    await addTask(title, priority, projectId, dateStr);
  };

  const handleDeleteTask = (id: number) => {
    Alert.alert('Удалить задачу?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeTask(id) },
    ]);
  };

  const openNewNote = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteModal(true);
  };

  const openEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteModal(true);
  };

  const handleSaveNote = async () => {
    const t = noteTitle.trim();
    if (!t) return;
    if (editingNoteId) {
      await editNote(editingNoteId, t, noteContent);
      await fetchNotes(projectId);
    } else {
      await addNote(t, noteContent, projectId);
    }
    setNoteModal(false);
  };

  const handleDeleteNote = (id: number) => {
    Alert.alert('Удалить заметку?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeNote(id) },
    ]);
  };

  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Шапка */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <View style={[styles.projectIcon, { backgroundColor: project.color + '20' }]}>
            <Ionicons name={project.icon as any} size={20} color={project.color} />
          </View>
          <ThemedText style={styles.projectName} numberOfLines={1}>{project.name}</ThemedText>
        </View>

        {/* Табы */}
        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          {(['tasks', 'notes'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && { borderBottomColor: project.color, borderBottomWidth: 2 }]}
              onPress={() => { setTab(t); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons
                name={t === 'tasks' ? 'checkmark-circle-outline' : 'document-text-outline'}
                size={16}
                color={tab === t ? project.color : theme.textSecondary}
              />
              <ThemedText style={[styles.tabLabel, { color: tab === t ? project.color : theme.textSecondary }]}>
                {t === 'tasks' ? `Задачи (${tasks.length})` : `Заметки (${notes.length})`}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Задачи */}
        {tab === 'tasks' && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {pending.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  cardIndex={index}
                  onToggle={toggleTask}
                  onDelete={handleDeleteTask}
                  onChangePriority={changePriority}
                />
              ))}
              {completed.length > 0 && (
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
                      onDelete={handleDeleteTask}
                      onChangePriority={changePriority}
                    />
                  ))}
                </>
              )}
              {tasks.length === 0 && (
                <EmptyState
                  icon="checkmark-circle-outline"
                  title="Задач в проекте нет"
                  subtitle="Добавь первую задачу внизу"
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
                value={taskInput}
                onChangeText={setTaskInput}
                onSubmitEditing={handleAddTask}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setDatePickerOpen(true)} style={styles.dateBtn} hitSlop={6}>
                {dueDate ? (
                  <View style={[styles.dateBadge, { backgroundColor: project.color + '20' }]}>
                    <ThemedText style={[styles.dateBadgeText, { color: project.color }]}>
                      {format(dueDate, 'd MMM', { locale: ru })}
                    </ThemedText>
                    <TouchableOpacity onPress={() => setDueDate(null)} hitSlop={6}>
                      <Ionicons name="close" size={12} color={project.color} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddTask} style={[styles.addBtn, { backgroundColor: project.color }]}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Заметки */}
        {tab === 'notes' && (
          <>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notes.map((note, index) => (
                <NoteItem key={note.id} note={note} cardIndex={index} onPress={openEditNote} onDelete={handleDeleteNote} />
              ))}
              {notes.length === 0 && (
                <EmptyState
                  icon="document-text-outline"
                  title="Заметок в проекте нет"
                  subtitle="Нажми + чтобы добавить заметку"
                />
              )}
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.noteFabWrap}>
              <TouchableOpacity
                onPress={openNewNote}
                style={[styles.noteFab, { backgroundColor: project.color }]}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>

      <DatePickerModal
        visible={datePickerOpen}
        value={dueDate}
        onSelect={setDueDate}
        onClose={() => setDatePickerOpen(false)}
        accentColor={project?.color}
      />

      {/* Модалка заметки */}
      <Modal visible={noteModal} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setNoteModal(false)}>
                <ThemedText style={{ color: theme.primary }}>Отмена</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>
                {editingNoteId ? 'Редактировать' : 'Новая заметка'}
              </ThemedText>
              <TouchableOpacity onPress={handleSaveNote}>
                <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>Сохранить</ThemedText>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.noteTitleInput, { color: theme.text, borderBottomColor: theme.border }]}
              placeholder="Заголовок"
              placeholderTextColor={theme.textSecondary}
              value={noteTitle}
              onChangeText={setNoteTitle}
              maxLength={100}
            />
            <TextInput
              style={[styles.noteContentInput, { color: theme.text }]}
              placeholder="Напишите что-нибудь..."
              placeholderTextColor={theme.textSecondary}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              textAlignVertical="top"
            />
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, gap: 10,
  },
  backBtn: { padding: 2 },
  projectIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  projectName: { flex: 1, fontSize: 18, fontWeight: '700' },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: { fontSize: 13, marginTop: 8, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  priorityBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityHint: { fontSize: 12 },
  divider: { width: 1, height: 18 },
  input: { flex: 1, fontSize: 15, paddingVertical: 6 },
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dateBtn: { padding: 2 },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  dateBadgeText: { fontSize: 12, fontWeight: '600' },
  noteFabWrap: { alignItems: 'flex-end', padding: 20 },
  noteFab: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  noteTitleInput: {
    fontSize: 20, fontWeight: '600',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  noteContentInput: { flex: 1, fontSize: 16, lineHeight: 24, padding: 20 },
});
