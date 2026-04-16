import { useState } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import {
  format, addMonths, isToday, isSameDay, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useTheme } from '../../hooks/useTheme';

const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getMonthGrid(base: Date): Date[] {
  const first = startOfMonth(base);
  const last = endOfMonth(base);
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

interface Props {
  visible: boolean;
  value: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
  accentColor?: string;
}

export function DatePickerModal({ visible, value, onSelect, onClose, accentColor }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, 300);
  const accent = accentColor ?? theme.primary;
  const [monthBase, setMonthBase] = useState(value ?? new Date());
  const grid = getMonthGrid(monthBase);
  const today = new Date();

  const handleDay = (day: Date) => {
    if (!isSameMonth(day, monthBase)) return;
    onSelect(day);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
          <ThemedView style={[styles.card, { borderColor: theme.border, width: cardWidth }]}>

            {/* Шапка месяца */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMonthBase(m => addMonths(m, -1))} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={theme.text} />
              </TouchableOpacity>
              <ThemedText style={styles.monthLabel}>
                {format(monthBase, 'LLLL yyyy', { locale: ru })}
              </ThemedText>
              <TouchableOpacity onPress={() => setMonthBase(m => addMonths(m, 1))} hitSlop={10}>
                <Ionicons name="chevron-forward" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Дни недели */}
            <View style={styles.dowRow}>
              {DOW.map(d => (
                <ThemedText key={d} style={[styles.dowLabel, { color: theme.textSecondary }]}>{d}</ThemedText>
              ))}
            </View>

            {/* Сетка */}
            <View style={styles.grid}>
              {grid.map((day, i) => {
                const inMonth = isSameMonth(day, monthBase);
                const isSelected = value ? isSameDay(day, value) : false;
                const isTodayDay = isToday(day);
                const isPast = day < today && !isToday(day);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => !isPast && handleDay(day)}
                    style={[
                      styles.cell,
                      isSelected && { backgroundColor: accent },
                      isTodayDay && !isSelected && { borderWidth: 1.5, borderColor: accent },
                    ]}
                    activeOpacity={inMonth && !isPast ? 0.7 : 1}
                  >
                    <ThemedText style={[
                      styles.cellText,
                      !inMonth && { opacity: 0.15 },
                      isPast && inMonth && { opacity: 0.3 },
                      isSelected && { color: '#fff', fontWeight: '700' },
                      isTodayDay && !isSelected && { color: accent, fontWeight: '700' },
                    ]}>
                      {format(day, 'd')}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Кнопка сегодня */}
            <TouchableOpacity
              onPress={() => { setMonthBase(new Date()); onSelect(new Date()); onClose(); }}
              style={[styles.todayBtn, { borderColor: accent }]}
            >
              <ThemedText style={[styles.todayBtnText, { color: accent }]}>Сегодня</ThemedText>
            </TouchableOpacity>

          </ThemedView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthLabel: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  dowRow: { flexDirection: 'row', marginBottom: 2 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 6,
  },
  cellText: { fontSize: 12 },
  todayBtn: {
    marginTop: 8, borderRadius: 8, borderWidth: 1.5,
    paddingVertical: 6, alignItems: 'center',
  },
  todayBtnText: { fontSize: 13, fontWeight: '600' },
});
