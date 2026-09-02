import { Tabs } from 'expo-router';
import { Beer, CalendarDays, Home, Map, Music, Menu } from 'lucide-react-native';
import React from 'react';

import { useTheme } from '@/theme';

const ICON_SIZE = 22;

/**
 * Bottom tabs. Every tab carries an explicit accessibility label because the
 * icon alone is not a label, and the bar is the primary one-handed control.
 */
export default function TabsLayout(): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: theme.type.label.fontSize,
          fontWeight: theme.type.label.fontWeight,
        },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home. What is playing now and next.',
          tabBarIcon: ({ color }) => <Home color={color} size={ICON_SIZE} accessibilityLabel="Home" />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarAccessibilityLabel: 'Schedule. All set times by day.',
          tabBarIcon: ({ color }) => (
            <CalendarDays color={color} size={ICON_SIZE} accessibilityLabel="Schedule" />
          ),
        }}
      />
      <Tabs.Screen
        name="lineup"
        options={{
          title: 'Lineup',
          tabBarAccessibilityLabel: 'Lineup. Every artist playing this year.',
          tabBarIcon: ({ color }) => <Music color={color} size={ICON_SIZE} accessibilityLabel="Lineup" />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarAccessibilityLabel: 'Map. Town Park and the venues.',
          tabBarIcon: ({ color }) => <Map color={color} size={ICON_SIZE} accessibilityLabel="Map" />,
        }}
      />
      <Tabs.Screen
        name="brews"
        options={{
          title: 'Brews',
          tabBarAccessibilityLabel: 'Brews. Brewers Showcase and your tasting log.',
          tabBarIcon: ({ color }) => <Beer color={color} size={ICON_SIZE} accessibilityLabel="Brews" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarAccessibilityLabel: 'More. Info, announcements and settings.',
          tabBarIcon: ({ color }) => <Menu color={color} size={ICON_SIZE} accessibilityLabel="More" />,
        }}
      />
    </Tabs>
  );
}
