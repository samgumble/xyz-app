import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components';
import { useReminderPrefs } from '@/notifications';
import { useAppStore } from '@/store/useAppStore';
import { borderWidth, useTheme } from '@/theme';

export interface ResetDataSectionProps {
  testID?: string;
}

/**
 * "Reset all data" behind an explicit confirmation.
 *
 * The confirmation is rendered inline rather than through `Alert.alert`: the
 * web build is a first-class target here and React Native Web has no Alert, so
 * a native-only dialog would silently do nothing — the worst possible outcome
 * for a destructive control.
 */
export function ResetDataSection({ testID }: ResetDataSectionProps): React.JSX.Element {
  const { theme } = useTheme();
  const resetAll = useAppStore((s) => s.resetAll);
  const resetPrefs = useReminderPrefs((s) => s.resetPrefs);
  const favourites = useAppStore((s) => s.favorites.length);
  const dismissedCount = useAppStore((s) => s.dismissedAnnouncements.length);

  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const start = useCallback(() => {
    setDone(false);
    setConfirming(true);
  }, []);

  const cancel = useCallback(() => {
    setConfirming(false);
  }, []);

  const confirm = useCallback(() => {
    resetAll();
    // Reminder opt-outs live in their own slice, so resetAll() cannot see them.
    resetPrefs();
    setConfirming(false);
    setDone(true);
  }, [resetAll, resetPrefs]);

  const summary = `${favourites} saved ${favourites === 1 ? 'set' : 'sets'} and ${dismissedCount} dismissed ${dismissedCount === 1 ? 'announcement' : 'announcements'}`;

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: theme.space.lg,
        gap: theme.space.md,
      }}
    >
      <Text style={[theme.type.body, { color: theme.colors.text }]}>Reset all data</Text>
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
        Clears everything this app has stored on the device: {summary}, plus your settings. Festival
        content is bundled with the app and is not affected.
      </Text>

      {confirming ? (
        <View
          accessibilityLiveRegion="assertive"
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: borderWidth.hairline,
            borderColor: theme.colors.danger,
            borderRadius: theme.radius.md,
            padding: theme.space.lg,
            gap: theme.space.md,
          }}
        >
          <Text style={[theme.type.body, { color: theme.colors.text }]}>
            Reset everything? This cannot be undone.
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.space.md, flexWrap: 'wrap' }}>
            <Button
              label="Yes, reset everything"
              variant="danger"
              onPress={confirm}
              accessibilityHint="Deletes your saved sets, reminders and settings"
              testID="reset-confirm"
            />
            <Button label="Cancel" variant="secondary" onPress={cancel} testID="reset-cancel" />
          </View>
        </View>
      ) : (
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            label="Reset all data"
            variant="danger"
            onPress={start}
            accessibilityHint="Asks you to confirm before deleting anything"
            testID="reset-start"
          />
        </View>
      )}

      {done ? (
        <Text accessibilityLiveRegion="polite" style={[theme.type.bodySm, { color: theme.colors.success }]}>
          Everything stored on this device has been cleared.
        </Text>
      ) : null}
    </View>
  );
}
