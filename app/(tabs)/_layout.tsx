import { useRef, useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useTabStore } from '../../store/tabStore';

import TodayScreen from './index';
import TasksScreen from './tasks';
import NotesScreen from './notes';
import ProjectsScreen from './projects';
import StatsScreen from './stats';

const TABS = [
  { name: 'Сегодня', icon: 'today', iconOutline: 'today-outline' },
  { name: 'Задачи',  icon: 'checkmark-circle', iconOutline: 'checkmark-circle-outline' },
  { name: 'Заметки', icon: 'document-text', iconOutline: 'document-text-outline' },
  { name: 'Проекты', icon: 'folder', iconOutline: 'folder-outline' },
  { name: 'Итоги',   icon: 'bar-chart', iconOutline: 'bar-chart-outline' },
] as const;

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);
  const { activeTab: storeTab, setTab } = useTabStore();
  const currentPageRef = useRef(0);

  useEffect(() => {
    if (storeTab !== currentPageRef.current) {
      currentPageRef.current = storeTab;
      pagerRef.current?.setPage(storeTab);
      setActiveTab(storeTab);
    }
  }, [storeTab]);

  const onTabPress = useCallback((index: number) => {
    currentPageRef.current = index;
    pagerRef.current?.setPage(index);
    setActiveTab(index);
    setTab(index);
  }, [setTab]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={e => { const pos = e.nativeEvent.position; currentPageRef.current = pos; setActiveTab(pos); setTab(pos); }}
      >
        <View key="0" style={{ flex: 1 }}><TodayScreen /></View>
        <View key="1" style={{ flex: 1 }}><TasksScreen /></View>
        <View key="2" style={{ flex: 1 }}><NotesScreen /></View>
        <View key="3" style={{ flex: 1 }}><ProjectsScreen /></View>
        <View key="4" style={{ flex: 1 }}><StatsScreen /></View>
      </PagerView>

      <View style={[styles.tabBar, {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          height: 56 + (insets.bottom > 0 ? insets.bottom : 16),
        }]}>
        {TABS.map((tab, index) => {
          const focused = activeTab === index;
          const iconName = focused ? tab.icon : tab.iconOutline;
          const color = focused ? theme.tabBarActive : theme.tabBarInactive;
          return (
            <TouchableOpacity
              key={index}
              style={styles.tabItem}
              onPress={() => onTabPress(index)}
              activeOpacity={0.7}
            >
              <Ionicons name={iconName as any} size={22} color={color} />
              {focused && (
                <View style={[styles.dot, { backgroundColor: theme.tabBarActive }]} />
              )}
              <Text style={[styles.label, { color }]}>{tab.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
