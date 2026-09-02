import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingState } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { ThemeProvider, useTheme } from '@/theme';

/**
 * Root layout: safe-area context, theme, and a hydration gate so no screen
 * renders before the on-device favourites and settings have been read back.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootStack(): React.JSX.Element {
  const hydrated = useAppStore((s) => s.hydrated);
  const { theme, name } = useTheme();

  if (!hydrated) {
    return <LoadingState fullscreen label="Loading the festival" />;
  }

  return (
    <>
      <StatusBar style={name === 'night' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text },
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="weekend" options={{ title: 'My Weekend' }} />
        <Stack.Screen name="artist/[slug]" options={{ title: 'Artist' }} />
        <Stack.Screen name="set/[id]" options={{ title: 'Set' }} />
        <Stack.Screen name="announcement/[id]" options={{ title: 'Announcement' }} />
        <Stack.Screen name="info/[slug]" options={{ title: 'Info' }} />
      </Stack>
    </>
  );
}
