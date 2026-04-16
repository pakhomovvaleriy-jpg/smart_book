import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  View, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  format, addDays, addMonths, isToday, isSameDay, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskItem } from '../../components/tasks/TaskItem';
import { useTheme } from '../../hooks/useTheme';
import { useTasksStore } from '../../store/tasksStore';
import { useThemeStore } from '../../store/themeStore';
import { useTabStore } from '../../store/tabStore';
import { PriorityColors } from '../../constants/colors';
import type { Priority } from '../../types';

const TODAY_INDEX = 3;
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getMonthGrid(base: Date): Date[] {
  const first = startOfMonth(base);
  const last = endOfMonth(base);
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export default function TodayScreen() {
  const theme = useTheme();
  const { todayTasks, fetchTodayTasks, addTask, toggleTask, changePriority, removeTask } = useTasksStore();
  const { scheme, toggle } = useThemeStore();
  const router = useRouter();
  const { activeTab } = useTabStore();
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calView, setCalView] = useState<'strip' | 'month'>('strip');
  const [monthBase, setMonthBase] = useState(new Date());
  const calendarRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Пересчитывается каждый день при монтировании компонента
  const STRIP_DAYS = useMemo(
    () => Array.from({ length: 94 }, (_, i) => addDays(new Date(), i - TODAY_INDEX)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [format(new Date(), 'yyyy-MM-dd')]
  );

  const selectedStr = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedToday = isToday(selectedDate);

  useEffect(() => {
    fetchTodayTasks(selectedStr);
  }, [selectedStr]);

  // Обновляем при каждом переключении на таб "Сегодня"
  useEffect(() => {
    if (activeTab === 0) fetchTodayTasks(selectedStr);
  }, [activeTab]);

  useEffect(() => {
    setTimeout(() => calendarRef.current?.scrollToIndex({ index: TODAY_INDEX, animated: false }), 100);
  }, []);

  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);
    if (calView === 'month') setMonthBase(day);
  };

  const handleAdd = async () => {
    const title = input.trim();
    if (!title) return;
    setInput('');
    await addTask(title, priority, undefined, selectedStr);
    fetchTodayTasks(selectedStr);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Удалить задачу?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeTask(id) },
    ]);
  };

  const switchToMonth = () => {
    setMonthBase(selectedDate);
    setCalView('month');
  };

  const switchToStrip = () => {
    setCalView('strip');
    setSelectedDate(new Date());
    setTimeout(() => {
      calendarRef.current?.scrollToIndex({ index: TODAY_INDEX, animated: true });
    }, 100);
  };

  const pending = todayTasks.filter(t => t.status === 'pending');
  const completed = todayTasks.filter(t => t.status === 'completed');
  const total = todayTasks.length;
  const progress = total > 0 ? completed.length / total : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 3)  return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    if (hour < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  };

  const headerTitle = isSelectedToday
    ? getGreeting()
    : format(selectedDate, 'd MMMM', { locale: ru });

  const headerSub = isSelectedToday
    ? format(new Date(), 'EEEE, d MMMM', { locale: ru })
    : format(selectedDate, 'EEEE, d MMMM', { locale: ru });

  const monthGrid = getMonthGrid(monthBase);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Заголовок */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <ThemedText variant="secondary" style={styles.dateText} numberOfLines={1}>
              {headerSub}
            </ThemedText>
            <ThemedText style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>
              {headerTitle}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggle}
              style={[styles.themeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Ionicons name={scheme === 'dark' ? 'sunny' : 'moon'} size={20} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.themeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Ionicons name="settings-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Шапка календаря: месяц + переключатель */}
        <View style={styles.calHeader}>
          {calView === 'month' ? (
            <View style={styles.calHeaderLeft}>
              <TouchableOpacity onPress={() => setMonthBase(m => addMonths(m, -1))} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={theme.text} />
              </TouchableOpacity>
              <ThemedText style={styles.monthLabel}>
                {format(monthBase, 'LLLL yyyy', { locale: ru })}
              </ThemedText>
              <TouchableOpacity onPress={() => setMonthBase(m => addMonths(m, 1))} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <ThemedText style={styles.monthLabel}>
              {format(selectedDate, 'LLLL yyyy', { locale: ru })}
            </ThemedText>
          )}

          <View style={[styles.viewToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              onPress={switchToStrip}
              style={[styles.toggleBtn, calView === 'strip' && { backgroundColor: theme.primary }]}
            >
              <Ionicons name="menu-outline" size={16} color={calView === 'strip' ? '#fff' : theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={switchToMonth}
              style={[styles.toggleBtn, calView === 'month' && { backgroundColor: theme.primary }]}
            >
              <Ionicons name="calendar-outline" size={16} color={calView === 'month' ? '#fff' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Полоса дней */}
        {calView === 'strip' && (
          <FlatList
            ref={calendarRef}
            data={STRIP_DAYS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.toISOString()}
            style={styles.stripList}
            contentContainerStyle={styles.stripContent}
            getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
            renderItem={({ item }) => {
              const isSelected = isSameDay(item, selectedDate);
              const isTodayDay = isToday(item);
              return (
                <TouchableOpacity
                  onPress={() => handleSelectDay(item)}
                  style={[styles.dayItem, isSelected && { backgroundColor: theme.primary }]}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.dayName, isSelected && { color: '#fff' }]}>
                    {format(item, 'EE', { locale: ru }).replace('.', '')}
                  </ThemedText>
                  <ThemedText style={[
                    styles.dayNum,
                    isSelected && { color: '#fff', fontWeight: '700' },
                    isTodayDay && !isSelected && { color: theme.primary, fontWeight: '700' },
                  ]}>
                    {format(item, 'd')}
                  </ThemedText>
                  {isTodayDay && !isSelected && (
                    <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Сетка месяца */}
        {calView === 'month' && (
          <View style={styles.monthWrap}>
            {/* Дни недели */}
            <View style={styles.dowRow}>
              {DOW.map(d => (
                <ThemedText key={d} style={[styles.dowLabel, { color: theme.textSecondary }]}>{d}</ThemedText>
              ))}
            </View>
            {/* Дни */}
            <View style={styles.monthGrid}>
              {monthGrid.map((day, i) => {
                const inMonth = isSameMonth(day, monthBase);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDay = isToday(day);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => inMonth && handleSelectDay(day)}
                    style={[
                      styles.monthCell,
                      isSelected && { backgroundColor: theme.primary },
                    ]}
                    activeOpacity={inMonth ? 0.7 : 1}
                  >
                    <ThemedText style={[
                      styles.monthCellText,
                      !inMonth && { opacity: 0.2 },
                      isSelected && { color: '#fff', fontWeight: '700' },
                      isTodayDay && !isSelected && { color: theme.primary, fontWeight: '700' },
                    ]}>
                      {format(day, 'd')}
                    </ThemedText>
                    {isTodayDay && !isSelected && (
                      <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Карточка прогресса */}
            <View style={[styles.progressCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '33' }]}>
              <View style={styles.progressTop}>
                <ThemedText style={styles.progressTitle}>Прогресс дня</ThemedText>
                <ThemedText variant="secondary" style={styles.progressSub}>
                  {completed.length} из {total}
                </ThemedText>
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
                </View>
                <ThemedText style={[styles.progressPercent, { color: theme.primary }]}>
                  {total > 0 ? Math.round(progress * 100) : 0}%
                </ThemedText>
              </View>
            </View>

            {pending.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Активные</ThemedText>
                {pending.map((task, index) => (
                  <TaskItem key={task.id} task={task} cardIndex={index} onToggle={toggleTask} onDelete={handleDelete} onChangePriority={changePriority} hideDateIfToday noBorder />
                ))}
              </View>
            )}

            {completed.length > 0 && (
              <View style={styles.section}>
                <ThemedText variant="secondary" style={styles.sectionTitleSecondary}>
                  Выполнено ({completed.length})
                </ThemedText>
                {completed.map((task, index) => (
                  <TaskItem key={task.id} task={task} cardIndex={index} onToggle={toggleTask} onDelete={handleDelete} onChangePriority={changePriority} hideDateIfToday noBorder />
                ))}
              </View>
            )}

            {total === 0 && (
              <EmptyState icon="calendar-outline" title="Задач на этот день нет" subtitle="Добавь задачу внизу" />
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Поле ввода */}
          <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                const order: Priority[] = ['low', 'medium', 'high'];
                setPriority(order[(order.indexOf(priority) + 1) % 3]);
              }}
              style={styles.priorityBtn}
              hitSlop={8}
            >
              <View style={[styles.priorityDot, { backgroundColor: PriorityColors[priority] }]} />
              <ThemedText variant="secondary" style={styles.priorityHint}>
                {priority === 'low' ? 'Низкий' : priority === 'medium' ? 'Средний' : 'Высокий'}
              </ThemedText>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.text }]}
              placeholder="Новая задача..."
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <View style={[styles.dateBadge, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="calendar-outline" size={12} color={theme.primary} />
              <ThemedText style={[styles.dateBadgeText, { color: theme.primary }]}>
                {isSelectedToday ? 'Сегодня' : format(selectedDate, 'd MMM', { locale: ru })}
              </ThemedText>
            </View>
            {input.length > 0 && (
              <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
                <Ionicons name="arrow-up" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  dateText: { fontSize: 13, textTransform: 'capitalize', marginBottom: 2 },
  greeting: { fontSize: 26, fontWeight: '700' },

  // Шапка календаря
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  calHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Полоса
  stripList: { height: 76, flexGrow: 0, flexShrink: 0 },
  stripContent: { paddingHorizontal: 14, alignItems: 'center', gap: 4 },
  dayItem: {
    width: 48, height: 64, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    gap: 2, marginHorizontal: 2,
  },
  dayName: { fontSize: 11, textTransform: 'capitalize', opacity: 0.6 },
  dayNum: { fontSize: 17 },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  // Сетка месяца
  monthWrap: { paddingHorizontal: 12, paddingBottom: 8 },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dowLabel: {
    flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600',
  },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  monthCellText: { fontSize: 14 },

  // Прогресс
  progressCard: {
    marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  progressTop: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  progressTitle: { fontSize: 13, fontWeight: '600' },
  progressSub: { fontSize: 12 },
  progressBarBg: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 5, borderRadius: 3 },
  progressPercent: { fontSize: 13, fontWeight: '700' },

  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  sectionTitleSecondary: { fontSize: 13, marginBottom: 10 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  priorityBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, paddingVertical: 4, paddingHorizontal: 2,
  },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityHint: { fontSize: 12 },
  divider: { width: 1, height: 18 },
  input: { flex: 1, fontSize: 15, paddingVertical: 4 },
  addBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  dateBadgeText: { fontSize: 12, fontWeight: '600' },
});
