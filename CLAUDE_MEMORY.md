# SmartBook — память для Claude

Этот файл восстанавливает контекст проекта в новых разговорах.
При старте новой сессии скажи Claude: **"прочитай CLAUDE_MEMORY.md в проекте smart_book"**

---

## О проекте

**SmartBook** — мобильный планировщик на Expo/React Native.
**Путь:** `C:/Users/RobotComp.ru/Documents/smart_book`
**Тестирование:** Android-устройство через Expo Go (эмулятор не установлен)
**Сборка APK:** `eas build --platform android --profile preview --non-interactive`
**EAS аккаунт:** pvp86 / poster066@gmail.com

---

## Стек

- Expo ~54, expo-router ~4, expo-sqlite ~16
- Zustand ~5, TypeScript, React Native 0.81
- date-fns, react-native-gesture-handler, react-native-pager-view
- react-native-safe-area-context, expo-haptics, expo-notifications

---

## Архитектура файлов

```
app/
  _layout.tsx              — root layout: БД, GestureHandlerRootView, StatusBar, Stack, notifications
  (tabs)/
    _layout.tsx            — PagerView + кастомная нижняя панель (5 табов)
    index.tsx              — таб 0 "Сегодня": календарь полоса/месяц, прогресс, список задач
    tasks.tsx              — таб 1 "Задачи": фильтры, поиск, список, добавление
    notes.tsx              — таб 2 "Заметки": поиск, список
    projects.tsx           — таб 3 "Проекты": сетка 2 колонки, прогресс-кольца, модал создания
    stats.tsx              — таб 4 "Итоги": статистика, график 7 дней, топ проектов
  task/[id].tsx            — детали задачи: редакт. названия, дата, приоритет, повторение, теги, напоминание, подпункты
  note/[id].tsx            — редактор заметки: заголовок, текст, теги
  project/[id].tsx         — экран проекта: табы Задачи/Заметки, добавление
  settings.tsx             — настройки
  help.tsx                 — помощь
  coffee.tsx               — поддержать автора

components/
  tasks/TaskItem.tsx       — карточка задачи: приоритет-полоска, чекбокс, теги, дата, дочерние задачи, свайп-удаление
  tasks/SubtaskItem.tsx    — элемент подпункта со свайпом
  notes/NoteItem.tsx       — карточка заметки со свайпом
  ui/ThemedView.tsx
  ui/ThemedText.tsx
  ui/EmptyState.tsx
  ui/TagChip.tsx
  ui/DatePickerModal.tsx   — кастомный JS датапикер (работает в Expo Go)

store/
  tasksStore.ts            — tasks[], todayTasks[], fetchTasks, fetchTodayTasks, addTask, toggleTask, changePriority, removeTask, setNotificationId
  notesStore.ts            — notes[], fetchNotes, addNote, editNote, removeNote
  projectsStore.ts         — projects[], fetchProjects, addProject, removeProject
  subtasksStore.ts         — subtasks[], fetchSubtasks, addSubtask, toggleSubtask, removeSubtask, clear
  themeStore.ts            — scheme (light/dark), toggle, load
  tabStore.ts              — activeTab, setTab  ← используется для refresh при смене таба

db/
  database.ts              — SQLite инициализация, миграции
  queries.ts               — весь CRUD: tasks, notes, projects, subtasks, теги, уведомления, статистика

hooks/
  useTheme.ts              — возвращает Colors[scheme]
  useColorScheme.ts

constants/
  colors.ts                — Colors (light/dark), PriorityColors, ProjectColors (8 цветов)

types/index.ts             — Task, Subtask, Note, Project, Priority, TaskStatus, Recurrence
utils/notifications.ts     — scheduleTaskReminder, cancelTaskReminder, requestNotificationPermissions
```

---

## База данных (SQLite)

```sql
projects  — id, name, color, icon, created_at
tasks     — id, title, description, priority, status, project_id, due_date,
            parent_id, order_index, recurrence, notification_id, reminder_at,
            tags (JSON), created_at, updated_at
notes     — id, title, content, project_id, tags (JSON), created_at, updated_at
subtasks  — id, task_id, title, completed, order_index, created_at
```

---

## Всё что реализовано (полный список)

- [x] 5 табов со свайпом (PagerView): Сегодня / Задачи / Заметки / Проекты / Итоги
- [x] Кастомный навбар снизу с точкой активного таба
- [x] Свайп-календарь: полоса 94 дня + сетка месяца, переключатель
- [x] Прогресс-бар дня (компактный, одна строка)
- [x] Приветствие по времени суток
- [x] Задачи: добавление, чекбокс, приоритеты (low/medium/high), фильтры, поиск
- [x] Иерархия задач: parent_id, expandable дочерние (2 уровня) в TaskItem
- [x] Подпункты (subtasks) в деталях задачи /task/[id]
- [x] Редактирование названия задачи прямо в деталях (onBlur/onSubmit сохраняет)
- [x] Дата задачи — в деталях и при создании (DatePickerModal)
- [x] Приоритет — смена в деталях (чипы) и попап в списке (долгое нажатие)
- [x] Повторение задач (none/daily/weekly/monthly) — в деталях
- [x] Теги на задачах: добавление/удаление в /task/[id], отображение в карточке
- [x] Теги на заметках: добавление/удаление в /note/[id], поиск по тегам
- [x] Свайп влево для удаления на всех карточках (TaskItem, NoteItem, SubtaskItem)
- [x] Напоминания: локальные уведомления (expo-notifications), выбор даты+времени
- [x] Нажатие на название задачи → /task/[id]
- [x] Проекты: цвет + иконка, сетка 2 колонки, прогресс-кольцо, экран проекта
- [x] Экран проекта: табы Задачи/Заметки, добавление с датой
- [x] Статистика: сводка, прогресс-бар, график 7 дней, топ проектов
- [x] Ручное переключение темы (луна/солнце), сохранение в AsyncStorage
- [x] Светлая / тёмная палитра (фон #F0F2F5/#0F172A, акцент #6366F1/#818CF8)
- [x] Хептик обратная связь (expo-haptics)
- [x] **Чередование цветов карточек**: cardIndex % 2 — чётные theme.card, нечётные theme.primaryLight + рамка
- [x] **Клавиатура не перекрывает поле ввода**: KAV оборачивает ScrollView + Input вместе
- [x] **Обновление при смене таба**: useTabStore → activeTab, каждый таб слушает свой индекс
- [x] Ошибка notifications API исправлена: subscription.remove() вместо removeNotificationSubscription

---

## Важные паттерны

### Чередование цветов карточек
```tsx
// В TaskItem и NoteItem — проп cardIndex передаётся из списка
const isAlt = cardIndex % 2 === 1;
backgroundColor: isAlt ? theme.primaryLight : theme.card
borderColor: isAlt ? theme.primary + '30' : theme.border

// Везде где рендерятся карточки:
items.map((item, index) => <TaskItem cardIndex={index} ... />)
```

### Обновление данных при смене таба (все табы)
```tsx
// Используется вместо useFocusEffect (не работает с PagerView)
const { activeTab } = useTabStore();
useEffect(() => {
  if (activeTab === N) fetchData(); // N = 0,1,2,3,4
}, [activeTab]);
```

### KeyboardAvoidingView (правильная структура)
```tsx
// KAV ДОЛЖЕН оборачивать и ScrollView и поле ввода вместе:
<KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
  <ScrollView keyboardShouldPersistTaps="handled">...</ScrollView>
  <View style={inputRow}>...</View>  // поле ввода
</KeyboardAvoidingView>
// НЕ оборачивать только поле ввода — это не работает
```

### Сохранение тегов
```tsx
// Теги хранятся как JSON в SQLite
await updateTaskTags(taskId, newTagsArray);   // задачи
await updateNoteTags(noteId, newTagsArray);   // заметки
```

---

## Что НЕ работает в Expo Go
- react-native-reanimated 4.x + DraggableFlatList (требует development build)

## app.json (Android)
```json
"android": {
  "package": "com.smartbook.app",
  "versionCode": 1,
  "edgeToEdgeEnabled": true,
  "permissions": ["RECEIVE_BOOT_COMPLETED", "VIBRATE", "SCHEDULE_EXACT_ALARM"]
}
```

## eas.json профили
- `development` — APK с dev client
- `preview` — APK для тестирования (используем этот)
- `production` — AAB для Play Store

---

## Пожелания пользователя
- Объяснять простым языком, без терминов
- Двигаться пошагово, согласовывать план перед большими изменениями
- Перед сборкой APK: проверять TypeScript (`npx tsc --noEmit`) и все изменения
- Пользователь замечает визуальные детали — цвета, отступы, дизайн
- Перед выполнением описывать план подробно
