import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components';
import { formatTime } from '@/data/time';
import { useTheme } from '@/theme';

import { getDaySummaries } from './festivalPhase';

export interface WeekendPreviewProps {
  /** Highlights one day — the day being lived through, during the festival. */
  highlightDay?: string;
  testID?: string;
}

/** What each day of the weekend holds: who closes it, how much is on, where. */
export function WeekendPreview({ highlightDay, testID }: WeekendPreviewProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const router = useRouter();
  const days = useMemo(() => getDaySummaries(), []);

  if (days.length === 0) return null;

  return (
    <View testID={testID}>
      {days.map((day) => {
        const highlighted = day.day === highlightDay;
        const hours =
          day.firstStart && day.lastEnd
            ? `${formatTime(day.firstStart)} – ${formatTime(day.lastEnd)}`
            : undefined;
        const headline = day.headlineArtist?.name ?? day.headlineSet?.artist;

        const speech = [
          day.official ? day.label : `${day.label}, pre-festival`,
          headline ? `closing with ${headline}` : undefined,
          `${day.setCount} sets across ${day.stageNames.length} stages`,
          hours ? `from ${hours}` : undefined,
        ]
          .filter((part): part is string => part !== undefined)
          .join(', ');

        return (
          <Card
            key={day.day}
            onPress={() => {
              router.push('/schedule');
            }}
            accentColor={highlighted ? theme.colors.accent : undefined}
            accessibilityLabel={speech}
            accessibilityHint="Opens the schedule"
            style={{ marginBottom: theme.space.md }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: theme.space.sm,
              }}
            >
              <Text style={[theme.type.h3, { color: theme.colors.text, flexShrink: 1 }]}>{day.label}</Text>
              {highlighted ? (
                <Text style={[theme.type.label, { color: theme.colors.accent }]}>TODAY</Text>
              ) : day.official ? null : (
                <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>PRE-FESTIVAL</Text>
              )}
            </View>

            {headline ? (
              <Text style={[theme.type.body, { color: theme.colors.text, marginTop: theme.space.sm }]}>
                Closing set: {headline}
              </Text>
            ) : null}

            <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
              {day.setCount} sets · {day.stageNames.length} stages
              {hours ? ` · ${hours}` : ''}
            </Text>
            <Text
              numberOfLines={2}
              style={[theme.type.label, { color: theme.colors.textMuted, marginTop: theme.space.sm }]}
            >
              {day.stageNames.join(' · ')}
            </Text>
            {day.clubCount > 0 ? (
              <Text style={[theme.type.label, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
                Plus {day.clubCount} late-night club {day.clubCount === 1 ? 'show' : 'shows'} in town
              </Text>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
