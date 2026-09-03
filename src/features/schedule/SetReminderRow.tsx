import { Bell, BellOff, BellRing, Smartphone } from 'lucide-react-native';
import React from 'react';
import { Switch, Text, View } from 'react-native';

import { Card } from '@/components';
import { useSetReminder } from '@/notifications';
import { minTouchTarget, useTheme } from '@/theme';

import type { ScheduleEntry } from './model';

export interface SetReminderRowProps {
  entry: ScheduleEntry;
  testID?: string;
}

/**
 * The reminder control for one slot on the set detail screen.
 *
 * Two rules shape this more than anything visual:
 *
 * - Where reminders cannot work — the browser — there is no switch at all,
 *   just the sentence saying why. A switch that flips on and never fires is a
 *   worse experience than no switch, because it costs someone the set.
 * - The explanation line under the switch always states the *actual* outcome,
 *   not the intent: permission denied, starting too soon for the chosen lead
 *   time, or too far out to schedule yet. It is never blank and never
 *   optimistic.
 */
export function SetReminderRow({ entry, testID }: SetReminderRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const reminder = useSetReminder(entry.id, entry.setIds);

  if (!reminder.supported) {
    return (
      <Card muted testID={testID}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md }}>
          <Smartphone size={theme.space.xl} color={theme.colors.textMuted} />
          <View style={{ flex: 1, gap: theme.space.xs }}>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>
              Reminders need the app
            </Text>
            <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
              {reminder.supportMessage}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  const failing = reminder.on && (reminder.permission === 'denied' || reminder.skipReason !== null);
  const icon = !reminder.on ? (
    <BellOff size={theme.space.xl} color={theme.colors.textMuted} />
  ) : failing ? (
    <Bell size={theme.space.xl} color={theme.colors.warning} />
  ) : (
    <BellRing size={theme.space.xl} color={theme.colors.accent} />
  );

  const label = `Remind me ${reminder.leadMinutes} minutes before`;

  return (
    <Card testID={testID}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.md,
          minHeight: minTouchTarget,
        }}
      >
        {icon}
        <Text style={[theme.type.body, { color: theme.colors.text, flex: 1 }]}>{label}</Text>
        <Switch
          testID={testID ? `${testID}-switch` : undefined}
          value={reminder.on}
          onValueChange={reminder.toggle}
          disabled={reminder.disabled}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityHint={
            reminder.on
              ? 'Turns off the notification for this set'
              : 'Saves this set and notifies you before it starts'
          }
          trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
          thumbColor={theme.colors.surface}
          ios_backgroundColor={theme.colors.border}
        />
      </View>

      {/* Live so a screen reader hears the outcome change when the switch is
          flipped, rather than being left with a switch state and no reason. */}
      <Text
        accessibilityLiveRegion="polite"
        style={[
          theme.type.bodySm,
          {
            color: failing ? theme.colors.warning : theme.colors.textMuted,
            marginTop: theme.space.sm,
          },
        ]}
      >
        {reminder.explanation}
      </Text>
    </Card>
  );
}
