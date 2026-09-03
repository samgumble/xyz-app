import { BellOff, BellRing, Smartphone, TriangleAlert } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components';
import { describeReminderStatus, useReminderSettings } from '@/notifications';
import type { ReminderPermission } from '@/notifications';
import type { ReminderLeadMinutes } from '@/store/useAppStore';
import { borderWidth, useTheme } from '@/theme';

import { SegmentedControl, type SegmentedOption } from './SegmentedControl';
import { SwitchRow } from './SwitchRow';

const LEAD_OPTIONS: SegmentedOption<ReminderLeadMinutes>[] = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

export interface RemindersSectionProps {
  testID?: string;
}

/**
 * The reminders block for the More screen: master switch, lead time, the real
 * permission state, and how many reminders are actually pending.
 *
 * Self-contained so it can be dropped into `MoreScreen` as a single element.
 * The lead-time control lives here rather than in the general settings group
 * because it is meaningless on its own — it is *how far ahead this feature
 * fires*, and reading it next to a master switch that might be off, or a
 * permission that was denied, is the only way it tells the truth.
 *
 * Note that it drives the same `settings.reminderLeadMinutes` the store
 * already owns. There is no second setting.
 */
export function RemindersSection({ testID }: RemindersSectionProps): React.JSX.Element {
  const { theme } = useTheme();
  const reminders = useReminderSettings();

  if (!reminders.supported) {
    return (
      <Card muted testID={testID}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md }}>
          <Smartphone size={theme.space.xl} color={theme.colors.textMuted} />
          <View style={{ flex: 1, gap: theme.space.xs }}>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Not available here</Text>
            <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
              {reminders.supportMessage}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <View testID={testID} style={{ gap: theme.space.md }}>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: borderWidth.hairline,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
        }}
      >
        <SwitchRow
          first
          label="Set reminders"
          description="A notification before each set you have saved. Scheduled on this device — nothing is sent anywhere."
          value={reminders.enabled}
          onValueChange={reminders.setEnabled}
          testID="settings-reminders-enabled"
        />

        <View style={{ height: borderWidth.hairline, backgroundColor: theme.colors.border }} />

        <SegmentedControl
          label="How much warning"
          description="Long enough to walk between stages."
          options={LEAD_OPTIONS}
          value={reminders.leadMinutes}
          onChange={reminders.setLeadMinutes}
          testID="settings-reminder-lead"
        />
      </View>

      <StatusLine
        enabled={reminders.enabled}
        permission={reminders.permission}
        scheduledCount={reminders.scheduledCount}
      />
    </View>
  );
}

function StatusLine({
  enabled,
  permission,
  scheduledCount,
}: {
  enabled: boolean;
  permission: ReminderPermission;
  scheduledCount: number;
}): React.JSX.Element {
  const { theme } = useTheme();
  const { icon, headline, detail, stuck } = describeReminderStatus({
    enabled,
    permission,
    scheduledCount,
  });

  return (
    <Card muted accentColor={stuck ? theme.colors.warning : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md }}>
        <View style={{ paddingTop: theme.space.xs }}>
          {icon === 'warning' ? (
            <TriangleAlert size={theme.space.xl} color={theme.colors.warning} />
          ) : icon === 'on' ? (
            <BellRing size={theme.space.xl} color={theme.colors.accent} />
          ) : (
            <BellOff size={theme.space.xl} color={theme.colors.textMuted} />
          )}
        </View>
        <View style={{ flex: 1, gap: theme.space.xs }}>
          <Text
            accessibilityLiveRegion="polite"
            style={[theme.type.body, { color: stuck ? theme.colors.warning : theme.colors.text }]}
          >
            {headline}
          </Text>
          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>{detail}</Text>
        </View>
      </View>
    </Card>
  );
}
