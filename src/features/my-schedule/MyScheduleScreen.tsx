import { useRouter } from 'expo-router';
import { CalendarHeart, TriangleAlert } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Badge, Card, Screen, SectionHeader } from '@/components';
import { EmptyState } from '@/components';
import { getStages } from '@/data/repository';
import { formatDayLabel, formatTimeRange } from '@/data/time';
import { buildStagePalette, SetRow, useNow } from '@/features/schedule';
import { useReminderSync } from '@/notifications';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme';

import { buildMySchedule, conflictsFor, formatDuration } from './model';

/**
 * My Schedule: everything saved, grouped by festival day in time order, with
 * clashes called out at the top and again on the sets involved.
 */
export function MyScheduleScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const now = useNow();
  const favorites = useAppStore((s) => s.favorites);

  // My Schedule is the screen where a stale reminder would be most obvious, so
  // it is one of the places that keeps the schedule converged: mounting it
  // runs a reconciliation pass, and any change made from here triggers another.
  useReminderSync();

  const plan = useMemo(() => buildMySchedule(favorites), [favorites]);
  const palette = useMemo(() => buildStagePalette(theme, getStages()), [theme]);

  if (plan.entries.length === 0) {
    return (
      <Screen testID="screen-my-schedule">
        <EmptyState
          icon={<CalendarHeart size={theme.space.xxl} color={theme.colors.accent} />}
          title="Nothing saved yet"
          message="Tap the heart on any set and it lands here — grouped by day, with clashes flagged. It all stays on this device."
          actionLabel="Browse the schedule"
          onAction={() => router.push('/schedule')}
        />
      </Screen>
    );
  }

  const dayWord = plan.days.length === 1 ? 'day' : 'days';
  const summary = `${plan.entries.length} ${plan.entries.length === 1 ? 'set' : 'sets'} · ${
    plan.artistCount
  } ${plan.artistCount === 1 ? 'artist' : 'artists'} · ${plan.stageCount} ${
    plan.stageCount === 1 ? 'stage' : 'stages'
  } · ${plan.days.length} ${dayWord} · ${formatDuration(plan.totalMinutes)} of music`;

  return (
    <Screen testID="screen-my-schedule">
      {/* The tab header already says "My Schedule"; this is the summary line. */}
      <Text
        accessibilityLiveRegion="polite"
        style={[theme.type.body, { color: theme.colors.textMuted }]}
      >
        {summary}
      </Text>

      {plan.conflicts.length > 0 ? (
        <Card
          accentColor={theme.colors.warning}
          style={{ marginTop: theme.space.lg, gap: theme.space.md }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
            <TriangleAlert size={theme.space.xl} color={theme.colors.warning} />
            <Text style={[theme.type.h3, { color: theme.colors.text, flex: 1 }]}>
              {plan.conflicts.length === 1
                ? '1 clash in your plan'
                : `${plan.conflicts.length} clashes in your plan`}
            </Text>
          </View>
          {plan.conflicts.map((conflict) => (
            <View key={`${conflict.a.id}|${conflict.b.id}`} style={{ gap: theme.space.xs }}>
              <Text style={[theme.type.body, { color: theme.colors.text }]}>
                {`${conflict.a.title} (${conflict.a.stage.shortName}) and ${conflict.b.title} (${conflict.b.stage.shortName})`}
              </Text>
              <Text style={[theme.type.bodySm, { color: theme.colors.warning }]}>
                {`Overlap ${conflict.overlapMinutes} min · ${formatTimeRange(conflict.a)} and ${formatTimeRange(
                  conflict.b,
                )}`}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {plan.days.map((day) => (
        <View key={day.day}>
          <SectionHeader
            title={formatDayLabel(day.day)}
            subtitle={`${day.entries.length} ${day.entries.length === 1 ? 'set' : 'sets'}`}
          />
          <View style={{ gap: theme.space.sm }}>
            {day.entries.map((entry) => {
              const clashes = conflictsFor(plan, entry.id);
              return (
                <View key={entry.id} style={{ gap: theme.space.xs }}>
                  <SetRow entry={entry} palette={palette} now={now} />
                  {clashes.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs, paddingLeft: theme.space.md }}>
                      {clashes.map((clash) => {
                        const other = clash.a.id === entry.id ? clash.b : clash.a;
                        return (
                          <Badge
                            key={other.id}
                            tone="warning"
                            label={`Clashes with ${other.title} · ${clash.overlapMinutes} min`}
                            style={{ maxWidth: '100%' }}
                          />
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
