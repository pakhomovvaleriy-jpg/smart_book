import { useEffect, useRef, useState, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { TagChip } from '../../components/ui/TagChip';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore } from '../../store/notesStore';
import { updateNote, updateNoteTags, deleteNote } from '../../db/queries';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Number(id);
  const router = useRouter();
  const theme = useTheme();
  const { notes, fetchNotes, removeNote } = useNotesStore();

  const note = notes.find(n => n.id === noteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const dirty = useRef(false);

  useEffect(() => {
    if (!note && notes.length === 0) fetchNotes();
  }, []);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags ?? []);
    }
  }, [note?.id]);

  const save = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    const t = title.trim();
    if (!t) {
      await deleteNote(noteId);
    } else {
      await updateNote(noteId, t, content);
    }
    await fetchNotes();
  }, [title, content, noteId]);

  const handleBack = async () => {
    await save();
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Удалить заметку?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          await removeNote(noteId);
          router.back();
        },
      },
    ]);
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
    if (!tag || tags.includes(tag)) { setTagInput(''); return; }
    const newTags = [...tags, tag];
    setTags(newTags);
    setTagInput('');
    await updateNoteTags(noteId, newTags);
    await fetchNotes();
  };

  const handleRemoveTag = async (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    await updateNoteTags(noteId, newTags);
    await fetchNotes();
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <ThemedText style={[styles.backText, { color: theme.primary }]}>Назад</ThemedText>
          </TouchableOpacity>
          {note && (
            <ThemedText variant="secondary" style={styles.dateText}>
              {format(new Date(note.updated_at), 'd MMM, HH:mm', { locale: ru })}
            </ThemedText>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            value={title}
            onChangeText={t => { setTitle(t); dirty.current = true; }}
            placeholder="Заголовок"
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          <TextInput
            style={[styles.contentInput, { color: theme.text }]}
            value={content}
            onChangeText={t => { setContent(t); dirty.current = true; }}
            placeholder="Начни писать..."
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
          />

          <View style={[styles.tagsSection, { borderTopColor: theme.border }]}>
            <View style={styles.tagsWrap}>
              {tags.map(tag => (
                <TagChip key={tag} tag={tag} onRemove={() => handleRemoveTag(tag)} />
              ))}
              <View style={[styles.tagInputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ThemedText style={[styles.tagHash, { color: theme.textSecondary }]}>#</ThemedText>
                <TextInput
                  style={[styles.tagInput, { color: theme.text }]}
                  placeholder="тег"
                  placeholderTextColor={theme.textSecondary}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <View style={{ height: 60 }} />
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 16 },
  dateText: { fontSize: 12 },
  deleteBtn: { padding: 4 },
  scroll: { flex: 1 },
  titleInput: {
    fontSize: 22, fontWeight: '700', lineHeight: 30,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    padding: 0,
  },
  contentInput: {
    fontSize: 16, lineHeight: 26,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20,
    minHeight: 300,
  },
  tagsSection: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4, gap: 2,
  },
  tagHash: { fontSize: 13, fontWeight: '600' },
  tagInput: { fontSize: 13, minWidth: 60, paddingVertical: 0 },
});
