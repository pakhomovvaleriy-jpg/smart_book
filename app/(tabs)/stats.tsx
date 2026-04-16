import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { useTheme } from '../../hooks/useTheme';
import { useTabStore } from '../../store/tabStore';
import { getWeeklyStats, getOverallStats, getTopProjects } from '../../db/queries';

const DAYS = 7;

function getLast7Days(): string[] {
  return Array.from({ length: DAYS }, (_, i) =>
    format(subDays(new Date(), DAYS - 1 - i), 'yyyy-MM-dd')
  );
}

interface DayStat { date: string; completed: number; created: number; }
interface Overall { total: number; completed: number; pending: number; total_notes: number; total_projects: number; }
interface ProjectStat { project_id: number; name: string; color: string; total: number; completed: number; }

export default function StatsScreen() {
  const theme = useTheme();
  const { activeTab } = useTabStore();
  const [week, setWeek] = useState<DayStat[]>([]);
  const [overall, setOverall] = useState<Overall>({ total: 0, completed: 0, pending: 0, total_notes: 0, total_projects: 0 });
  const [projects, setProjects] = useState<ProjectStat[]>([]);

  const load = async () => {
    const days = getLast7Days();
    const [w, o, p] = await Promise.all([
      getWeeklyStats(days),
      getOverallStats(),
      getTopProjects(),
    ]);
    setWeek(w);
    setOverall(o);
    setProjects(p);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTab === 4) load();
  }, [activeTab]);

  const maxCompleted = Math.max(...week.map(d => d.completed), 1);
  const completionRate = overall.total > 0 ? Math.round(overall.completed / overall.total * 100) : 0;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        <View style={styles.header}>
          <ThemedText style={styles.title}>Статистика</ThemedText>
          <ThemedText variant="secondary" style={styles.subtitle}>Последние 7 дней</ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Сводка */}
          <View style={styles.summaryRow}>
            <StatCard
              value={String(overall.total)}
              label="Всего задач"
              icon="list-outline"
              color={theme.primary}
              theme={theme}
            />
            <StatCard
              value={String(overall.completed)}
              label="Выполнено"
              icon="checkmark-circle-outline"
              color="#22C55E"
              theme={theme}
            />
            <StatCard
              value={`${completionRate}%`}
              label="Прогресс"
              icon="trending-up-outline"
              color="#F59E0B"
              theme={theme}
            />
          </View>

          <View style={styles.summaryRow}>
            <StatCard
              value={String(overall.pending)}
              label="Активных"
              icon="time-outline"
              color="#6366F1"
              theme={theme}
            />
            <StatCard
              value={String(overall.total_notes)}
              label="Заметок"
              icon="document-text-outline"
              color="#EC4899"
              theme={theme}
            />
            <StatCard
              value={String(overall.total_projects)}
              label="Проектов"
              icon="folder-outline"
              color="#14B8A6"
              theme={theme}
            />
          </View>

          {/* Общий прогресс-бар */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>Общий прогресс</ThemedText>
              <ThemedText style={[styles.cardValue, { color: theme.primary }]}>{completionRate}%</ThemedText>
            </View>
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: `${completionRate}%`, backgroundColor: theme.primary }]} />
            </View>
            <View style={styles.progressLabels}>
              <ThemedText variant="secondary" style={styles.progressLabel}>
                {overall.completed} выполнено
              </ThemedText>
              <ThemedText variant="secondary" style={styles.progressLabel}>
                {overall.pending} осталось
              </ThemedText>
            </View>
          </View>

          {/* График за 7 дней */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText style={styles.cardTitle}>Выполнено за неделю</ThemedText>
            <View style={styles.chart}>
              {week.map((day, i) => {
                const barH = maxCompleted > 0 ? (day.completed / maxCompleted) * 80 : 0;
                const isToday = i === DAYS - 1;
                const dayLabel = format(new Date(day.date + 'T00:00:00'), 'EEE', { locale: ru }).replace('.', '');
                return (
                  <View key={day.date} style={styles.barCol}>
                    {day.completed > 0 && (
                      <ThemedText style={styles.barCount}>{day.completed}</ThemedText>
                    )}
                    <View style={styles.barWrap}>
                      <View style={[
                        styles.bar,
                        {
                          height: Math.max(barH, day.completed > 0 ? 6 : 2),
                          backgroundColor: isToday ? theme.primary : theme.primary + '60',
                        },
                      ]} />
                    </View>
                    <ThemedText style={[
                      styles.barLabel,
                      { color: isToday ? theme.primary : theme.textSecondary, fontWeight: isToday ? '700' : '400' },
                    ]}>
                      {dayLabel}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Топ проектов */}
          {projects.filter(p => p.total > 0).length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>Проекты</ThemedText>
              {projects.filter(p => p.total > 0).map(p => {
                const pct = p.total > 0 ? p.completed / p.total : 0;
                return (
                  <View key={p.project_id} style={styles.projectRow}>
                    <View style={[styles.projectDot, { backgroundColor: p.color }]} />
                    <View style={styles.projectInfo}>
                      <View style={styles.projectLabelRow}>
                        <ThemedText style={styles.projectName} numberOfLines={1}>{p.name}</ThemedText>
                        <ThemedText variant="secondary" style={styles.projectCount}>
                          {p.completed}/{p.total}
                        </ThemedText>
                      </View>
                      <View style={[styles.progressBg, { backgroundColor: theme.border, marginTop: 4 }]}>
                        <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: p.color }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatCard({ value, label, icon, color, theme }: {
  value: string; label: string; icon: string; color: string; theme: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText variant="secondary" style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  scroll: { paddingHorizontal: 16 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 6,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, textAlign: 'center' },

  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardValue: { fontSize: 18, fontWeight: '700' },

  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontSize: 12 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barCount: { fontSize: 11, fontWeight: '700' },
  barWrap: { height: 80, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 10 },

  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  projectDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  projectInfo: { flex: 1 },
  projectLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectName: { fontSize: 13, fontWeight: '600', flex: 1 },
  projectCount: { fontSize: 12 },
});
