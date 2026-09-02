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
  type ReminderLeadMinutes,
  type ThemePreference,
} from '@/store/useAppStore';
import { borderWidth, useTheme } from '@/theme';

import { CreditsSection } from './CreditsSection';
import { ResetDataSection } from './ResetDataSection';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';
import { SwitchRow } from './SwitchRow';

const THEME_OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: 'daylight', label: 'Daylight' },
  { value: 'night', label: 'Night' },
  { value: 'system', label: 'System' },
];

const REMINDER_OPTIONS: SegmentedOption<ReminderLeadMinutes>[] = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

export interface MoreScreenProps {
  /** Injectable clock, for tests. */
  at?: Date;
}

/**
 * The hub: every published info page, the announcements feed, My Weekend,
 * settings, and an honest account of where the content came from.
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

  const setReminder = useCallback(
    (value: ReminderLeadMinutes) => {
      updateSettings({ reminderLeadMinutes: value });
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

      <SectionHeader title="Your festival" />
      <RowGroup>
        <NavRow
          first
          label="My Weekend"
          description="Saved sets, grouped by day, with clashes flagged."
          onPress={() => {
            router.push('/weekend');
          }}
        />
      </RowGroup>

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

        <View style={{ height: borderWidth.hairline, backgroundColor: theme.colors.border }} />

        <SegmentedControl
          label="Remind me before a saved set"
          description="How much warning you want to walk between stages."
          options={REMINDER_OPTIONS}
          value={settings.reminderLeadMinutes}
          onChange={setReminder}
          testID="settings-reminder"
        />

        <SwitchRow
          label="Larger text"
          description="Scales every text size in the app."
          value={settings.largeText}
          onValueChange={setLargeText}
          testID="settings-large-text"
        />
      </View>

      <SectionHeader title="Data" />
      <ResetDataSection testID="settings-reset" />

      <SectionHeader title="About this build" />
      <CreditsSection testID="more-credits" />
    </Screen>
  );
}
