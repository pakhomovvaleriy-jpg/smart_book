import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '../db/database';
import { requestNotificationPermissions } from '../utils/notifications';
import { useThemeStore } from '../store/themeStore';
import { Colors } from '../constants/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme, load } = useThemeStore();
  const [ready, setReady] = useState(false);
  const theme = Colors[scheme];
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    Promise.all([initDatabase(), load(), requestNotificationPermissions()])
      .catch(console.error)
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync();
      });
  }, []);

  // Обработка нажатия на уведомление
  useEffect(() => {
    if (!ready) return;

    // Приложение было закрыто — открыли через уведомление
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        const taskId = response?.notification.request.content.data?.taskId;
        if (taskId) router.push(`/task/${taskId}`);
      })
      .catch(() => {});

    // Приложение свёрнуто или открыто — нажали на уведомление
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const taskId = response.notification.request.content.data?.taskId;
      if (taskId) router.push(`/task/${taskId}`);
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F8' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        style={scheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.statusBar}
        translucent={false}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="task/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="project/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="note/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="help"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="coffee"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
