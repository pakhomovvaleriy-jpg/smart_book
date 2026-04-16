import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ui/ThemedView';
import { ThemedText } from '../components/ui/ThemedText';
import { useTheme } from '../hooks/useTheme';

interface Section {
  icon: string;
  color: string;
  title: string;
  items: { icon: string; text: string }[];
}

const SECTIONS: Section[] = [
  {
    icon: 'today-outline',
    color: '#6366F1',
    title: 'Сегодня',
    items: [
      { icon: 'calendar-outline',         text: 'Листай дни в полоске дат или переключись в вид месяца кнопкой в правом углу' },
      { icon: 'bar-chart-outline',        text: 'Прогресс-бар показывает сколько задач выполнено за выбранный день' },
      { icon: 'add-circle-outline',       text: 'Внизу: введи название задачи, выбери приоритет (цветная точка), нажми Enter — задача добавится на выбранный день' },
      { icon: 'open-outline',             text: 'Нажми на карточку задачи → открывается подробный экран' },
      { icon: 'ellipsis-horizontal',      text: 'Долгое нажатие на карточку → быстрая смена приоритета' },
      { icon: 'trash-outline',            text: 'Свайп карточки влево → удалить задачу' },
      { icon: 'chevron-down-outline',     text: 'Стрелка на карточке → раскрыть подзадачи первого уровня' },
      { icon: 'moon-outline',             text: 'Кнопка луны/солнца в шапке → переключить тёмную тему' },
    ],
  },
  {
    icon: 'checkmark-circle-outline',
    color: '#22C55E',
    title: 'Задачи',
    items: [
      { icon: 'list-outline',             text: 'Все задачи без привязки к дате. Фильтры: Все / Сегодня / Просроченные / Срочные' },
      { icon: 'search-outline',           text: 'Строка поиска фильтрует задачи по названию в реальном времени' },
      { icon: 'calendar-outline',         text: 'При добавлении можно указать дату — иконка календаря справа от поля' },
      { icon: 'flag-outline',             text: 'Цветная точка слева от поля — смена приоритета по кругу: Низкий → Средний → Высокий' },
      { icon: 'checkmark-done-outline',   text: 'Выполненные задачи собираются в разделе «Выполнено» внизу списка' },
    ],
  },
  {
    icon: 'document-text-outline',
    color: '#EC4899',
    title: 'Заметки',
    items: [
      { icon: 'add-circle-outline',       text: 'Нажми + → открывается пустая заметка. Начни писать — она сохранится автоматически' },
      { icon: 'save-outline',             text: 'Автосохранение: заметка сохраняется при нажатии «Назад»' },
      { icon: 'trash-outline',            text: 'Если заголовок пустой при выходе — заметка удаляется автоматически' },
      { icon: 'pricetag-outline',         text: 'Теги: вводи в поле # и нажми Enter. Тег появится как чип — нажми × чтобы удалить' },
      { icon: 'search-outline',           text: 'Поиск работает по заголовку, содержимому и тегам' },
      { icon: 'trash-outline',            text: 'Свайп карточки влево → удалить заметку' },
    ],
  },
  {
    icon: 'folder-outline',
    color: '#F59E0B',
    title: 'Проекты',
    items: [
      { icon: 'add-circle-outline',       text: 'Нажми + → создай проект: выбери название, цвет и иконку' },
      { icon: 'open-outline',             text: 'Нажми на проект → открывается экран с двумя вкладками: Задачи и Заметки' },
      { icon: 'checkmark-circle-outline', text: 'Задачи проекта работают так же, как на общем экране. Можно выбрать дату и приоритет' },
      { icon: 'document-text-outline',    text: 'Заметки проекта редактируются в модальном окне прямо на экране проекта' },
      { icon: 'trash-outline',            text: 'Долгое нажатие на карточку проекта → удалить проект' },
    ],
  },
  {
    icon: 'bar-chart-outline',
    color: '#14B8A6',
    title: 'Итоги',
    items: [
      { icon: 'stats-chart-outline',      text: 'Карточки со сводкой: всего задач, выполнено, активных, заметок и проектов' },
      { icon: 'trending-up-outline',      text: 'Общий прогресс-бар — процент выполненных задач от всех' },
      { icon: 'calendar-outline',         text: 'Столбчатая диаграмма — выполнено задач за каждый из 7 дней' },
      { icon: 'folder-outline',           text: 'Раздел «Проекты» — прогресс каждого проекта в виде полосы' },
      { icon: 'refresh-outline',          text: 'Данные обновляются автоматически при каждом переходе на этот экран' },
    ],
  },
  {
    icon: 'open-outline',
    color: '#8B5CF6',
    title: 'Детали задачи',
    items: [
      { icon: 'create-outline',           text: 'Название задачи можно редактировать прямо в шапке — нажми и измени' },
      { icon: 'calendar-outline',         text: 'Дата: выбери из всплывающего календаря, или сбрось крестиком' },
      { icon: 'flag-outline',             text: 'Приоритет: три кнопки — Низкий / Средний / Высокий. Активная подсвечивается цветом' },
      { icon: 'repeat-outline',           text: 'Повторение: Нет / Каждый день / Каждую неделю / Каждый месяц. При выполнении задача создаётся заново на следующую дату' },
      { icon: 'pricetag-outline',         text: 'Теги: вводи и нажми Enter, удаляй нажатием на × у чипа' },
      { icon: 'notifications-outline',    text: 'Напоминание: выбери дату и время, нажми «Установить». Уведомление придёт даже если приложение закрыто' },
      { icon: 'list-outline',             text: 'Подпункты: добавляй отдельные шаги, отмечай каждый галочкой, удаляй свайпом' },
    ],
  },
  {
    icon: 'git-branch-outline',
    color: '#F97316',
    title: 'Иерархия подзадач',
    items: [
      { icon: 'chevron-down-outline',     text: 'Стрелка на карточке → раскрыть подзадачи 1-го уровня (дочерние)' },
      { icon: 'chevron-down-outline',     text: 'Стрелка у каждой дочерней задачи → раскрыть подзадачи 2-го уровня (внуки)' },
      { icon: 'add-outline',              text: 'В каждом раскрытом уровне есть поле «Добавить подзадачу» — вводи и нажми Enter' },
      { icon: 'close-outline',            text: 'Кнопка × у каждой подзадачи удаляет её' },
      { icon: 'checkmark-circle-outline', text: 'Кружок слева — отмечает выполнение. Счётчик выполненных/всего отображается на карточке' },
    ],
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <ThemedText style={[styles.backText, { color: theme.primary }]}>Назад</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.title}>Как пользоваться</ThemedText>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          <ThemedText variant="secondary" style={styles.intro}>
            SmartBook — твой личный планировщик. Здесь всё об экранах и функциях.
          </ThemedText>

          {SECTIONS.map(section => (
            <View key={section.title} style={styles.section}>
              {/* Заголовок раздела */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: section.color + '20' }]}>
                  <Ionicons name={section.icon as any} size={20} color={section.color} />
                </View>
                <ThemedText style={[styles.sectionTitle, { color: section.color }]}>
                  {section.title}
                </ThemedText>
              </View>

              {/* Пункты */}
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {section.items.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.item,
                      idx < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: section.color + '15' }]}>
                      <Ionicons name={item.icon as any} size={14} color={section.color} />
                    </View>
                    <ThemedText style={styles.itemText}>{item.text}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  backText: { fontSize: 16 },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 20, textAlign: 'center' },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  itemIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
