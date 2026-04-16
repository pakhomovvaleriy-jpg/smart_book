import { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ui/ThemedView';
import { ThemedText } from '../components/ui/ThemedText';
import { useTheme } from '../hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  ВНИМАНИЕ: secret_key встроен в клиентский код — не делай так в
//     публичных приложениях. Для личного проекта приемлемо, но ключ
//     технически можно извлечь из APK.
// ─────────────────────────────────────────────────────────────────────────────
const SHOP_ID = '1290673';
const SECRET_KEY = 'live_6kEms6Yek2_72WRHDgAe7v7WmaGIvZ0IJ1N8_ApN6rU';

// После успешной оплаты ЮKassa перенаправит на эту страницу
const RETURN_URL = 'https://yookassa.ru';

interface Tier {
  id:        string;
  icon:      string;       // один символ для цветного круга
  label:     string;       // эмодзи-состав для дорожки
  title:     string;
  subtitle:  string;
  amount:    string;       // '99.00'
  price:     string;       // '99 ₽'
  color:     string;
  highlight: boolean;
}

const TIERS: Tier[] = [
  {
    id:        'coffee',
    icon:      '☕',
    label:     '☕',
    title:     'Кофе',
    subtitle:  'Чёрный, крепкий, без всего — но уже тепло',
    amount:    '99.00',
    price:     '99 ₽',
    color:     '#6F4E37',
    highlight: false,
  },
  {
    id:        'coffee_milk',
    icon:      '🥛',
    label:     '☕ + 🥛',
    title:     'Кофе с молоком',
    subtitle:  'Нежнее, мягче и чуть светлее',
    amount:    '199.00',
    price:     '199 ₽',
    color:     '#C19A6B',
    highlight: false,
  },
  {
    id:        'coffee_sugar',
    icon:      '🍬',
    label:     '☕ + 🥛 + 🍬',
    title:     'Кофе с молоком и сахаром',
    subtitle:  'Сладко, бодро и с хорошим настроением',
    amount:    '349.00',
    price:     '349 ₽',
    color:     '#F59E0B',
    highlight: false,
  },
  {
    id:        'coffee_bun',
    icon:      '🥐',
    label:     '☕ + 🥛 + 🍬 + 🥐',
    title:     'Кофе с булочкой',
    subtitle:  'Настоящий завтрак разработчика. Ты невероятен!',
    amount:    '599.00',
    price:     '599 ₽',
    color:     '#FF6B35',
    highlight: true,
  },
];

async function createPayment(amount: string, description: string): Promise<string> {
  const credentials = btoa(`${SHOP_ID}:${SECRET_KEY}`);
  const idempotenceKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization:       `Basic ${credentials}`,
      'Idempotence-Key':   idempotenceKey,
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      amount: { value: amount, currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: RETURN_URL },
      description,
      capture: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.description ?? `Ошибка ${response.status}`);
  }

  const url: string | undefined = data.confirmation?.confirmation_url;
  if (!url) throw new Error('Не получена ссылка на оплату');
  return url;
}

export default function CoffeeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleTier = async (tier: Tier) => {
    if (loadingId) return;
    setLoadingId(tier.id);
    try {
      const url = await createPayment(
        tier.amount,
        `${tier.title} для разработчика SmartBook`
      );
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Не удалось создать платёж', e.message ?? 'Попробуй чуть позже.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* Шапка */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <ThemedText style={[styles.backText, { color: theme.primary }]}>Назад</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Угости ☕</ThemedText>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Герой */}
          <View style={styles.hero}>
            <ThemedText style={styles.heroEmoji}>☕</ThemedText>
            <ThemedText style={styles.heroTitle}>Угости разработчика</ThemedText>
            <ThemedText variant="secondary" style={styles.heroSub}>
              SmartBook сделан без рекламы и с душой.{'\n'}
              Если приложение помогает — можешь поблагодарить!
            </ThemedText>
          </View>

          {/* Карточки уровней */}
          {TIERS.map((tier, idx) => {
            const isLoading = loadingId === tier.id;
            const disabled = !!loadingId && !isLoading;
            return (
              <TouchableOpacity
                key={tier.id}
                onPress={() => handleTier(tier)}
                activeOpacity={disabled ? 1 : 0.8}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor:     tier.highlight ? tier.color : theme.border,
                    borderWidth:     tier.highlight ? 2 : 1,
                    opacity:         disabled ? 0.55 : 1,
                  },
                ]}
              >
                {/* Бейдж «Топ выбор» */}
                {tier.highlight && (
                  <View style={[styles.topBadge, { backgroundColor: tier.color }]}>
                    <ThemedText style={styles.topBadgeText}>🔥 Самый вкусный</ThemedText>
                  </View>
                )}

                <View style={styles.cardBody}>
                  {/* Цветная иконка */}
                  <View style={[styles.iconCircle, { backgroundColor: tier.color + '22' }]}>
                    <ThemedText style={styles.iconEmoji}>{tier.icon}</ThemedText>
                  </View>

                  {/* Текст */}
                  <View style={styles.cardText}>
                    <ThemedText style={styles.cardTitle}>{tier.title}</ThemedText>
                    {/* Состав в виде дорожки */}
                    <ThemedText style={[styles.cardCompose, { color: tier.color }]}>
                      {tier.label}
                    </ThemedText>
                    <ThemedText variant="secondary" style={styles.cardSub} numberOfLines={2}>
                      {tier.subtitle}
                    </ThemedText>
                  </View>

                  {/* Цена / лоадер */}
                  {isLoading ? (
                    <ActivityIndicator size="small" color={tier.color} style={styles.loader} />
                  ) : (
                    <View style={[styles.priceChip, { backgroundColor: tier.color }]}>
                      <ThemedText style={styles.priceText}>{tier.price}</ThemedText>
                    </View>
                  )}
                </View>

                {/* Разделитель снизу (кроме последнего без highlight) */}
                {!tier.highlight && idx < TIERS.length - 2 && (
                  <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Подпись */}
          <View style={[styles.footer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.textSecondary} />
            <ThemedText variant="secondary" style={styles.footerText}>
              Безопасная оплата через ЮKassa.{'\n'}
              Карты Visa, Mastercard, МИР · СБП · ЮMoney
            </ThemedText>
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
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  backText:    { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  /* Герой */
  hero: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  heroEmoji: { fontSize: 56 },
  heroTitle:  { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  heroSub:    { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 16 },

  /* Карточки */
  card: {
    borderRadius: 18, marginBottom: 12, overflow: 'hidden',
  },
  topBadge: {
    paddingHorizontal: 14, paddingVertical: 7,
  },
  topBadgeText: {
    color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center',
  },
  cardBody: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconEmoji: { fontSize: 26 },
  cardText:   { flex: 1, gap: 2 },
  cardTitle:  { fontSize: 15, fontWeight: '700' },
  cardCompose:{ fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  cardSub:    { fontSize: 13, lineHeight: 18 },
  loader:     { width: 68, alignItems: 'center' },
  priceChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', minWidth: 68,
  },
  priceText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  cardDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

  /* Футер */
  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 4,
  },
  footerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
