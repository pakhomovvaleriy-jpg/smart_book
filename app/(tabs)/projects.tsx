import { useEffect, useState } from 'react';
import { useTasksStore } from '../../store/tasksStore';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, Text, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { useRouter } from 'expo-router';
import { useProjectsStore } from '../../store/projectsStore';
import { useTabStore } from '../../store/tabStore';
import { getProjectStats } from '../../db/queries';
import { ProjectColors } from '../../constants/colors';
import type { Project } from '../../types';

const ICONS = ['folder', 'briefcase', 'home', 'heart', 'star', 'rocket', 'book', 'code-slash'];

interface Stats { total: number; completed: number; }

function ProgressRing({ progress, color, size = 48 }: { progress: number; color: string; size?: number }) {
  const pct = Math.round(progress * 100);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 3,
      borderColor: pct > 0 ? color : color + '30',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: color + '12',
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color }}>
        {pct}%
      </Text>
    </View>
  );
}

function ProjectCard({ project, stats, onDelete, onPress, theme, isAlt }: {
  project: Project;
  stats: Stats;
  onDelete: (id: number, name: string) => void;
  onPress: (id: number) => void;
  theme: any;
  isAlt: boolean;
}) {
  const progress = stats.total > 0 ? stats.completed / stats.total : 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isAlt ? theme.primaryLight : theme.card, borderColor: isAlt ? theme.primary + '30' : theme.border }]}
      activeOpacity={0.75}
      onPress={() => onPress(project.id)}
      onLongPress={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete(project.id, project.name);
      }}
    >
      {/* Иконка */}
      <View style={[styles.cardIcon, { backgroundColor: project.color + '20' }]}>
        <Ionicons name={project.icon as any} size={22} color={project.color} />
      </View>

      {/* Название + задачи */}
      <ThemedText style={styles.cardName} numberOfLines={2}>{project.name}</ThemedText>

      <View style={styles.cardBottom}>
        <View style={[styles.taskBadge, { backgroundColor: project.color + '18' }]}>
          <ThemedText style={[styles.taskBadgeText, { color: project.color }]}>
            {stats.total} задач
          </ThemedText>
        </View>
        <ProgressRing progress={progress} color={project.color} size={44} />
      </View>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { projects, fetchProjects, addProject, removeProject } = useProjectsStore();
  const tasks = useTasksStore(s => s.tasks);
  const { activeTab } = useTabStore();
  const [statsMap, setStatsMap] = useState<Record<number, Stats>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(ProjectColors[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  useEffect(() => {
    fetchProjects();
    loadStats();
  }, []);

  // Обновляем статистику при любом изменении задач
  useEffect(() => {
    loadStats();
  }, [tasks.length]);

  // Обновляем при переключении на таб "Проекты"
  useEffect(() => {
    if (activeTab === 3) {
      fetchProjects();
      loadStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    const rows = await getProjectStats();
    const map: Record<number, Stats> = {};
    rows.forEach(r => { map[r.project_id] = { total: r.total, completed: r.completed }; });
    setStatsMap(map);
  };

  const handleCreate = async () => {
    const n = name.trim();
    if (!n) return;
    await addProject(n, selectedColor, selectedIcon);
    setName('');
    setModalVisible(false);
    loadStats();
  };

  const handleDelete = (id: number, projectName: string) => {
    Alert.alert(`Удалить "${projectName}"?`, 'Задачи и заметки проекта не удалятся', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeProject(id) },
    ]);
  };

  // Итоговая статистика
  const totalTasks = Object.values(statsMap).reduce((s, v) => s + v.total, 0);
  const totalDone = Object.values(statsMap).reduce((s, v) => s + v.completed, 0);
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => {
        const st = statsMap[p.id];
        return s + (st && st.total > 0 ? st.completed / st.total : 0);
      }, 0) / projects.length * 100)
    : 0;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Проекты</ThemedText>
            <ThemedText variant="secondary" style={styles.subtitle}>
              {projects.length} проектов
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.fab, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Сетка 2 колонки */}
          {projects.length > 0 && (
            <View style={styles.grid}>
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  stats={statsMap[project.id] ?? { total: 0, completed: 0 }}
                  onDelete={handleDelete}
                  onPress={(id) => router.push(`/project/${id}`)}
                  theme={theme}
                  isAlt={index % 2 === 1}
                />
              ))}
            </View>
          )}

          {projects.length === 0 && (
            <EmptyState
              icon="folder-open-outline"
              title="Проектов пока нет"
              subtitle="Создай проект чтобы группировать задачи по темам"
            />
          )}

          {/* Строка статистики */}
          {projects.length > 0 && (
            <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: theme.primary }]}>{projects.length}</ThemedText>
                <ThemedText variant="secondary" style={styles.statLabel}>Проектов</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: theme.primary }]}>{totalTasks}</ThemedText>
                <ThemedText variant="secondary" style={styles.statLabel}>Задач</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: theme.primary }]}>{avgProgress}%</ThemedText>
                <ThemedText variant="secondary" style={styles.statLabel}>Прогресс</ThemedText>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Модальное окно создания */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="formSheet">
        <ThemedView style={styles.modal}>
          <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ThemedText style={{ color: theme.primary }}>Отмена</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Новый проект</ThemedText>
              <TouchableOpacity onPress={handleCreate}>
                <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>Создать</ThemedText>
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Превью */}
                <View style={[styles.preview, { backgroundColor: selectedColor + '15', borderColor: selectedColor + '40' }]}>
                  <View style={[styles.previewIcon, { backgroundColor: selectedColor + '25' }]}>
                    <Ionicons name={selectedIcon as any} size={28} color={selectedColor} />
                  </View>
                  <ThemedText style={[styles.previewName, { color: selectedColor }]}>
                    {name.trim() || 'Название проекта'}
                  </ThemedText>
                </View>

                <TextInput
                  style={[styles.nameInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  placeholder="Название проекта"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />

                <ThemedText style={styles.sectionLabel}>Цвет</ThemedText>
                <View style={styles.colorRow}>
                  {ProjectColors.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[styles.colorDot, { backgroundColor: color }, selectedColor === color && styles.colorDotSelected]}
                    >
                      {selectedColor === color && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.sectionLabel}>Иконка</ThemedText>
                <View style={styles.iconRow}>
                  {ICONS.map(icon => (
                    <TouchableOpacity
                      key={icon}
                      onPress={() => setSelectedIcon(icon)}
                      style={[styles.iconBtn, { borderColor: theme.border },
                        selectedIcon === icon && { backgroundColor: selectedColor, borderColor: selectedColor }]}
                    >
                      <Ionicons name={icon as any} size={20} color={selectedIcon === icon ? '#fff' : theme.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  fab: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16 },

  // Сетка
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47.5%',
    borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 10,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  taskBadgeText: { fontSize: 11, fontWeight: '600' },

  // Статистика
  statsRow: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1,
    marginTop: 16, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1 },

  // Модальное
  modal: { flex: 1 },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalContent: { padding: 20, gap: 16 },
  preview: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, alignItems: 'center', gap: 10,
  },
  previewIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  previewName: { fontSize: 16, fontWeight: '600' },
  nameInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', opacity: 0.6 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
});
