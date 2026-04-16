import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoteItem } from '../../components/notes/NoteItem';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore } from '../../store/notesStore';
import { useTabStore } from '../../store/tabStore';
import type { Note } from '../../types';

export default function NotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { notes, fetchNotes, addNote, removeNote } = useNotesStore();
  const { activeTab } = useTabStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  // Обновление при переключении на таб "Заметки"
  useEffect(() => {
    if (activeTab === 2) fetchNotes();
  }, [activeTab]);

  // Обновление при возврате со Stack-экрана (note/[id])
  useFocusEffect(useCallback(() => {
    fetchNotes();
  }, []));

  const handleNew = async () => {
    const id = await addNote('', '');
    router.push(`/note/${id}`);
  };

  const handleOpen = (note: Note) => {
    router.push(`/note/${note.id}`);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Удалить заметку?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeNote(id) },
    ]);
  };

  const q = search.trim().toLowerCase();
  const filtered = notes.filter(n =>
    !q ||
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    (n.tags ?? []).some(tag => tag.includes(q))
  );

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Заметки</ThemedText>
            <ThemedText variant="secondary" style={styles.subtitle}>
              {notes.length} заметок
            </ThemedText>
          </View>
          <TouchableOpacity onPress={handleNew} style={[styles.fab, { backgroundColor: theme.primary }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Поиск заметок..."
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

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title={q ? 'Ничего не найдено' : 'Заметок пока нет'}
              subtitle={q ? '' : 'Нажми + чтобы записать мысль, идею или что угодно'}
            />
          ) : (
            filtered.map((note, index) => (
              <NoteItem key={note.id} note={note} cardIndex={index} onPress={handleOpen} onDelete={handleDelete} />
            ))
          )}
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
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  fab: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  list: { flex: 1, paddingHorizontal: 20 },
});
