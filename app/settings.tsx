import { View, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ui/ThemedView';
import { ThemedText } from '../components/ui/ThemedText';
import { useTheme } from '../hooks/useTheme';
import { useThemeStore } from '../store/themeStore';

const APP_VERSION = '1.0.0';

function SectionLabel({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
      {label}
    </ThemedText>
  );
}

interface RowProps {
  icon: string;
  iconColor: string;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}
function Row({ icon, iconColor, label, right, onPress, last }: RowProps) {
  const theme = useTheme();
  const inner = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <View style={styles.rowRight}>{right ?? <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />}</View>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>;
  }
  return inner;
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { scheme, toggle } = useThemeStore();


  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* Шапка */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <ThemedText style={[styles.backText, { color: theme.primary }]}>Назад</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.title}>Настройки</ThemedText>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Внешний вид */}
          <SectionLabel label="ВНЕШНИЙ ВИД" />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Row
              icon={scheme === 'dark' ? 'moon' : 'sunny-outline'}
              iconColor={scheme === 'dark' ? '#8B5CF6' : '#F59E0B'}
              label="Тёмная тема"
              last
              right={
                <Switch
                  value={scheme === 'dark'}
                  onValueChange={toggle}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#fff"
                />
              }
            />
          </View>

          {/* Помощь */}
          <SectionLabel label="ПОМОЩЬ" />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Row
              icon="help-circle-outline"
              iconColor="#6366F1"
              label="Как пользоваться"
              last
              onPress={() => router.push('/help')}
            />
          </View>

          {/* Поддержать */}
          <SectionLabel label="ПОДДЕРЖАТЬ РАЗРАБОТЧИКА" />
          <TouchableOpacity
            onPress={() => router.push('/coffee')}
            activeOpacity={0.88}
            style={[styles.coffeeCard, { backgroundColor: theme.card, borderColor: '#FF6B35', borderWidth: 1.5 }]}
          >
            <View style={[styles.coffeeIconWrap, { backgroundColor: '#FF6B35' }]}>
              <ThemedText style={styles.coffeeEmoji}>☕</ThemedText>
            </View>
            <View style={styles.coffeeBody}>
              <ThemedText style={styles.coffeeTitle}>Купить кофе</ThemedText>
              <ThemedText variant="secondary" style={styles.coffeeSub}>
                Оплата через ЮKassa · выбери угощение
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FF6B35" />
          </TouchableOpacity>

          <ThemedText variant="secondary" style={styles.coffeeHint}>
            Поддержка помогает развивать приложение. Спасибо! 🙏
          </ThemedText>

          {/* О приложении */}
          <SectionLabel label="О ПРИЛОЖЕНИИ" />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Row
              icon="phone-portrait-outline"
              iconColor="#6366F1"
              label="SmartBook"
              last
              right={<ThemedText variant="secondary" style={styles.rowValue}>v{APP_VERSION}</ThemedText>}
            />
          </View>

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

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 0 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15 },
  rowRight: { alignItems: 'center', justifyContent: 'center' },
  rowValue: { fontSize: 14 },

  coffeeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  coffeeIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  coffeeEmoji: { fontSize: 22 },
  coffeeBody: { flex: 1 },
  coffeeTitle: { fontSize: 15, fontWeight: '600' },
  coffeeSub: { fontSize: 12, marginTop: 2 },
  coffeeHint: {
    fontSize: 12, textAlign: 'center',
    marginTop: 8, lineHeight: 18,
  },
});
