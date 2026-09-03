import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';

import { Screen, SectionHeader } from '@/components';
import { getFestival, getInfoPages } from '@/data/repository';
import { AnnouncementFeed } from '@/features/announcements';
import { useNow } from '@/features/home/useNow';
import { NavRow, RowGroup } from '@/features/info';
import {
  useAppStore,
  type ThemePreference,
} from '@/store/useAppStore';
import { borderWidth, useTheme } from '@/theme';

import { CreditsSection } from './CreditsSection';
import { ResetDataSection } from './ResetDataSection';
import { InstallSection } from './InstallSection';
import { RemindersSection } from './RemindersSection';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';
import { SwitchRow } from './SwitchRow';

const THEME_OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: 'daylight', label: 'Daylight' },
  { value: 'night', label: 'Night' },
  { value: 'system', label: 'System' },
];

export interface MoreScreenProps {
  /** Injectable clock, for tests. */
  at?: Date;
}

/**
 * The hub: every published info page, the announcements feed, settings, and
 * an honest account of where the content came from.
 */
export function MoreScreen({ at }: MoreScreenProps): React.JSX.Element {
  const { theme, name } = useTheme();
  const router = useRouter();
  const ticking = useNow();
  const now = at ?? ticking;

  const festival = getFestival();
  const pages = useMemo(() => getInfoPages(), []);

  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const setTheme = useCallback(
    (value: ThemePreference) => {
      updateSettings({ theme: value });
    },
    [updateSettings],
  );

  const setLargeText = useCallback(
    (value: boolean) => {
      updateSettings({ largeText: value });
    },
    [updateSettings],
  );

  return (
    <Screen testID="screen-more">
      <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text }]}>
        More
      </Text>
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        {festival.name} · {festival.edition}
      </Text>

      <SectionHeader title="Announcements" subtitle="Newest first. Expired notices stay readable." />
      <AnnouncementFeed at={now} testID="more-announcements" />

      <SectionHeader title="Festival info" subtitle="Everything the festival publishes, offline." />
      <RowGroup testID="more-info-pages">
        {pages.map((page, index) => (
          <NavRow
            key={page.slug}
            first={index === 0}
            label={page.title}
            onPress={() => {
              router.push({ pathname: '/info/[slug]', params: { slug: page.slug } });
            }}
          />
        ))}
      </RowGroup>

      <InstallSection testID="more-install" />

      <SectionHeader title="Settings" subtitle="Stored on this device only." />
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: borderWidth.hairline,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
        }}
      >
        <SegmentedControl
          label="Appearance"
          description={
            settings.theme === 'system'
              ? `Following the device. Currently showing ${name === 'night' ? 'night' : 'daylight'}.`
              : 'Daylight is built to be read in direct sun at 8,750 feet.'
          }
          options={THEME_OPTIONS}
          value={settings.theme}
          onChange={setTheme}
          testID="settings-theme"
        />

        <SwitchRow
          label="Larger text"
          description="Scales every text size in the app."
          value={settings.largeText}
          onValueChange={setLargeText}
          testID="settings-large-text"
        />
      </View>

      <SectionHeader title="Reminders" subtitle="Scheduled on this device. Nothing is sent anywhere." />
      <RemindersSection testID="more-reminders" />

      <SectionHeader title="Data" />
      <ResetDataSection testID="settings-reset" />

      <SectionHeader title="About this build" />
      <CreditsSection testID="more-credits" />
    </Screen>
  );
}
