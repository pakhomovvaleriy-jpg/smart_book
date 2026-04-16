import { useRef, useState } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated, Modal, Pressable, TextInput, Platform, useWindowDimensions } from 'react-native';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ThemedText } from '../ui/ThemedText';
import { TagChip } from '../ui/TagChip';
import { useTheme } from '../../hooks/useTheme';
import { PriorityColors } from '../../constants/colors';
import { getChildTasks, createTask, updateTaskStatus, deleteTask } from '../../db/queries';
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

const PRIORITIES: { label: string; value: Priority }[] = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
];

// ── Уровень 2→3: строка дочерней задачи с раскрываемыми внуками ──────────────
interface ChildRowProps {
  child: Task;
  onToggle: (child: Task) => void;
  onDelete: (id: number) => void;
}

function ChildRow({ child, onToggle, onDelete }: ChildRowProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [grandChildren, setGrandChildren] = useState<Task[]>([]);
  const [grandInput, setGrandInput] = useState('');
  const done = child.status === 'completed';

  const handleExpand = async () => {
    if (!expanded) {
      const kids = await getChildTasks(child.id);
      setGrandChildren(kids);
    }
    setExpanded(p => !p);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddGrand = async () => {
    const title = grandInput.trim();
    if (!title) return;
    setGrandInput('');
    await createTask(title, 'medium', child.project_id ?? undefined, child.due_date ?? undefined, undefined, child.id);
    setGrandChildren(await getChildTasks(child.id));
  };

  const handleToggleGrand = async (grand: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = grand.status === 'completed' ? 'pending' : 'completed';
    await updateTaskStatus(grand.id, next);
    setGrandChildren(prev => prev.map(g => g.id === grand.id ? { ...g, status: next as any } : g));
  };

  const handleDeleteGrand = async (grandId: number) => {
    await deleteTask(grandId);
    setGrandChildren(prev => prev.filter(g => g.id !== grandId));
  };

  return (
    <>
      {/* Строка уровня 2 */}
      <View style={[styles.childRow, { borderBottomColor: theme.border }]}>
        <View style={[styles.indentLine, { backgroundColor: theme.primary + '40' }]} />
        <TouchableOpacity onPress={() => onToggle(child)} style={styles.checkbox}>
          <View style={[
            styles.checkCircleSmall,
            { borderColor: done ? theme.primary : theme.border },
            done && { backgroundColor: theme.primary },
          ]}>
            {done && <Ionicons name="checkmark" size={9} color="#fff" />}
          </View>
        </TouchableOpacity>
        <ThemedText
          style={[styles.childTitle, done && { textDecorationLine: 'line-through', opacity: 0.4 }]}
          numberOfLines={1}
        >
          {child.title}
        </ThemedText>
        <TouchableOpacity onPress={handleExpand} hitSlop={8}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={expanded ? theme.primary : theme.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(child.id)} hitSlop={8}>
          <Ionicons name="close" size={15} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Строки уровня 3 */}
      {expanded && (
        <>
          {grandChildren.map(grand => {
            const grandDone = grand.status === 'completed';
            return (
              <View key={grand.id} style={[styles.grandRow, { borderBottomColor: theme.border }]}>
                <View style={styles.grandIndentSpacer} />
                <View style={[styles.indentLine, { backgroundColor: theme.primary + '25' }]} />
                <TouchableOpacity onPress={() => handleToggleGrand(grand)} style={styles.checkbox}>
                  <View style={[
                    styles.checkCircleSmall,
                    { borderColor: grandDone ? theme.primary : theme.border },
                    grandDone && { backgroundColor: theme.primary },
                  ]}>
                    {grandDone && <Ionicons name="checkmark" size={9} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <ThemedText
                  style={[styles.childTitle, grandDone && { textDecorationLine: 'line-through', opacity: 0.4 }]}
                  numberOfLines={1}
                >
                  {grand.title}
                </ThemedText>
                <TouchableOpacity onPress={() => handleDeleteGrand(grand.id)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
          {/* Поле добавления внука */}
          <View style={[styles.grandRow, { borderBottomColor: theme.border }]}>
            <View style={styles.grandIndentSpacer} />
            <View style={[styles.indentLine, { backgroundColor: theme.primary + '25' }]} />
            <Ionicons name="add" size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
            <TextInput
              style={[styles.childInput, { color: theme.text }]}
              placeholder="Добавить подзадачу..."
              placeholderTextColor={theme.textSecondary}
              value={grandInput}
              onChangeText={setGrandInput}
              onSubmitEditing={handleAddGrand}
              returnKeyType="done"
            />
          </View>
        </>
      )}
    </>
  );
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

export function TaskItem({ task, onToggle, onDelete, onChangePriority, hideDateIfToday, noBorder, cardIndex = 0 }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isAlt = cardIndex % 2 === 1;
  const router = useRouter();
  const swipeRef = useRef<Swipeable>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showPriority, setShowPriority] = useState(false);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<Task[]>([]);
  const [childInput, setChildInput] = useState('');
  const [localChildCount, setLocalChildCount] = useState(task.child_count ?? 0);
  const [localChildDone, setLocalChildDone] = useState(task.child_completed_count ?? 0);
  const done = task.status === 'completed';

  const hasSubtasks = (task.subtask_count ?? 0) > 0;
  const subtaskProgress = hasSubtasks
    ? `${task.subtask_completed_count ?? 0}/${task.subtask_count}`
    : null;

  const handleExpand = async () => {
    if (!expanded) {
      const kids = await getChildTasks(task.id);
      setChildren(kids);
      setLocalChildCount(kids.length);
      setLocalChildDone(kids.filter(c => c.status === 'completed').length);
    }
    setExpanded(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddChild = async () => {
    const title = childInput.trim();
    if (!title) return;
    setChildInput('');
    await createTask(title, 'medium', task.project_id ?? undefined, task.due_date ?? undefined, undefined, task.id);
    const kids = await getChildTasks(task.id);
    setChildren(kids);
    setLocalChildCount(kids.length);
    setLocalChildDone(kids.filter(c => c.status === 'completed').length);
  };

  const handleToggleChild = async (child: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = child.status === 'completed' ? 'pending' : 'completed';
    await updateTaskStatus(child.id, next);
    setChildren(prev => prev.map(c => c.id === child.id ? { ...c, status: next } : c));
    setLocalChildDone(prev => next === 'completed' ? prev + 1 : prev - 1);
  };

  const handleDeleteChild = async (childId: number) => {
    const child = children.find(c => c.id === childId);
    await deleteTask(childId);
    setChildren(prev => prev.filter(c => c.id !== childId));
    setLocalChildCount(prev => prev - 1);
    if (child?.status === 'completed') setLocalChildDone(prev => prev - 1);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(task.id, task.status);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRef.current?.close();
    onDelete(task.id);
  };

  const handlePriorityChange = (priority: Priority) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangePriority?.(task.id, priority);
    setShowPriority(false);
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
    <>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
      >
        {/* Внешний слой — тень (не clipped) */}
        <Animated.View style={[
          styles.cardOuter,
          done && { opacity: 0.6 },
          expanded && styles.cardOuterExpanded,
          { transform: [{ scale: scaleAnim }] },
        ]}>
          {/* Внутренний слой — overflow:hidden, полоска обрезается по скруглению */}
          <View style={[
            styles.cardInner,
            {
              backgroundColor: done ? theme.card : isAlt ? theme.primaryLight : theme.card,
              borderWidth: 1,
              borderColor: isAlt && !done ? theme.primary + '30' : theme.border,
            },
            expanded && styles.cardInnerExpanded,
          ]}
            onTouchStart={handlePressIn}
            onTouchEnd={handlePressOut}
            onTouchCancel={handlePressOut}
          >
          {/* Полоска приоритета с меткой */}
          <View style={[styles.priorityAccent, { backgroundColor: PriorityColors[task.priority] }]}>
            <ThemedText style={styles.priorityAccentLabel}>
              {task.priority === 'low' ? 'НИЗ' : task.priority === 'medium' ? 'СРД' : 'ВЫС'}
            </ThemedText>
          </View>

          <TouchableOpacity onPress={handleToggle} style={styles.checkbox}>
            <View style={[
              styles.checkCircle,
              { borderColor: done ? theme.primary : theme.border },
              done && { backgroundColor: theme.primary },
            ]}>
              {done && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.content}
            onPress={() => router.push(`/task/${task.id}`)}
            onLongPress={() => {
              if (!done && onChangePriority) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowPriority(true);
              }
            }}
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
                <View style={[styles.notifBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="repeat" size={12} color={theme.primary} />
                </View>
              )}
              {task.notification_id && (
                <View style={[styles.notifBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="notifications" size={12} color={theme.primary} />
                  {task.reminder_at && (
                    <ThemedText style={[styles.notifDate, { color: theme.primary }]}>
                      {formatReminderAt(task.reminder_at)}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
            {task.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {task.tags.map(tag => (
                  <TagChip key={tag} tag={tag} small />
                ))}
              </View>
            )}
            {(task.due_date || subtaskProgress || localChildCount > 0) && (
              <View style={styles.meta}>
                {task.due_date && (() => {
                  const { label, overdue } = formatDate(task.due_date);
                  if (hideDateIfToday && label === 'Сегодня') return null;
                  return (
                    <View style={[styles.dateBadge, { backgroundColor: overdue ? theme.danger + '22' : theme.border + '80' }]}>
                      <Ionicons name="calendar-outline" size={10} color={overdue ? theme.danger : theme.textSecondary} />
                      <ThemedText style={[styles.date, { color: overdue ? theme.danger : theme.textSecondary }]}>
                        {label}
                      </ThemedText>
                    </View>
                  );
                })()}
                {subtaskProgress && (
                  <View style={styles.progressBadge}>
                    <Ionicons name="list-outline" size={11} color={theme.textSecondary} />
                    <ThemedText variant="secondary" style={styles.progressText}>
                      {subtaskProgress}
                    </ThemedText>
                  </View>
                )}
                {localChildCount > 0 && (
                  <View style={styles.progressBadge}>
                    <Ionicons name="git-branch-outline" size={11} color={theme.textSecondary} />
                    <ThemedText variant="secondary" style={styles.progressText}>
                      {localChildDone}/{localChildCount}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Кнопка раскрытия подзадач */}
          <TouchableOpacity onPress={handleExpand} style={styles.expandBtn} hitSlop={6}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={expanded ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>

          </View>
        </Animated.View>

        {/* Дочерние задачи */}
        {expanded && (
          <View style={[styles.childrenWrap, { backgroundColor: done ? theme.card : isAlt ? theme.primaryLight : theme.card }]}>
            {children.map(child => (
              <ChildRow
                key={child.id}
                child={child}
                onToggle={handleToggleChild}
                onDelete={handleDeleteChild}
              />
            ))}

            {/* Поле добавления дочерней задачи */}
            <View style={styles.childInputRow}>
              <View style={[styles.indentLine, { backgroundColor: theme.primary + '40' }]} />
              <Ionicons name="add" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.childInput, { color: theme.text }]}
                placeholder="Добавить подзадачу..."
                placeholderTextColor={theme.textSecondary}
                value={childInput}
                onChangeText={setChildInput}
                onSubmitEditing={handleAddChild}
                returnKeyType="done"
              />
            </View>
          </View>
        )}
      </Swipeable>

      {/* Попап смены приоритета */}
      <Modal visible={showPriority} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowPriority(false)}>
          <View style={[styles.priorityMenu, { backgroundColor: theme.card, borderColor: theme.border, width: Math.min(width * 0.8, 260) }]}>
            <ThemedText variant="secondary" style={styles.menuTitle}>Приоритет задачи</ThemedText>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.menuItem,
                  task.priority === p.value && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => handlePriorityChange(p.value)}
              >
                <View style={[styles.menuDot, { backgroundColor: PriorityColors[p.value] }]} />
                <ThemedText style={styles.menuLabel}>{p.label}</ThemedText>
                {task.priority === p.value && (
                  <Ionicons name="checkmark" size={16} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Внешний слой — только тень, без overflow clip
  cardOuter: {
    borderRadius: 18,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12 },
      android: { elevation: 5 },
    }),
  },
  cardOuterExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  // Внутренний слой — контент + overflow:hidden для обрезки полоски по углам
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
    paddingRight: 14,
    paddingVertical: 14,
    minHeight: 72,
    borderRadius: 18,
    overflow: 'hidden',
    gap: 12,
  },
  cardInnerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  priorityAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityAccentLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
    transform: [{ rotate: '-90deg' }],
    width: 36,
    textAlign: 'center',
  },
  checkbox: { padding: 2 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8,
  },
  notifDate: { fontSize: 11, fontWeight: '600' },
  title: { flex: 1, fontSize: 15, fontWeight: '500' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  date: { fontSize: 11 },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  progressText: { fontSize: 12 },
  expandBtn: { padding: 4 },

  childrenWrap: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  indentLine: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: 8,
  },
  checkCircleSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childTitle: {
    flex: 1,
    fontSize: 14,
  },
  childInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingVertical: 10,
    gap: 0,
  },
  grandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  grandIndentSpacer: {
    width: 16,
  },
  childInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: 18,
    marginBottom: 10,
    marginLeft: 8,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityMenu: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    gap: 2,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  menuDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  menuLabel: {
    fontSize: 15,
    flex: 1,
  },
});
