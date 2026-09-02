import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import { formatTime, formatTimeRange, isLive } from '@/data/time';
import { borderWidth, useTheme } from '@/theme';

import { FavoriteButton } from './FavoriteButton';
import type { ScheduleEntry } from './model';
import { setTypeLabel } from './model';
import type { StagePalette } from './stagePalette';

export interface SetRowProps {
  entry: ScheduleEntry;
  palette: StagePalette;
  now: Date;
  /** Hides the day-agnostic stage line where the surrounding group says it. */
  showStage?: boolean;
  testID?: string;
}

/**
 * One set in a chronological list — the schedule's list mode, My Weekend, and
 * the artist page all render this, so a set looks the same everywhere.
 */
export function SetRow({
  entry,
  palette,
  now,
  showStage = true,
  testID,
}: SetRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const color = palette(entry.stage.id);
  const live = isLive(entry, now);

  return (
    <Card
      testID={testID}
      accentColor={live ? theme.colors.accent : color}
      onPress={() => router.push({ pathname: '/set/[id]', params: { id: entry.id } })}
      accessibilityLabel={`${entry.title} at ${entry.stage.name}, ${formatTimeRange(entry)}`}
      accessibilityHint="Opens set details"
      style={{ padding: theme.space.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
        <View
          style={{
            // Wide enough for `10:00 AM` at the default ramp, and free to grow
            // when the large-text setting scales the type up.
            minWidth: theme.space.xxl * 2 + theme.space.sm,
            alignItems: 'flex-start',
          }}
        >
          <Text style={[theme.type.mono, { color: theme.colors.text }]}>{formatTime(entry.start)}</Text>
          <Text style={[theme.type.label, { color: theme.colors.textMuted, fontWeight: '400' }]}>
            {formatTime(entry.end)}
          </Text>
        </View>

        <View
          style={{
            width: borderWidth.thick,
            alignSelf: 'stretch',
            backgroundColor: color,
            borderRadius: theme.radius.sm,
          }}
        />

        <View style={{ flex: 1, gap: theme.space.xs }}>
          <Text
            numberOfLines={2}
            style={[theme.type.h3, { color: theme.colors.text }]}
          >
            {entry.title}
          </Text>
          {showStage ? (
            <Text numberOfLines={1} style={[theme.type.bodySm, { color }]}>
              {entry.stage.name}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs }}>
            {live ? <Badge label="NOW" tone="accent" accessibilityLabel="Playing now" /> : null}
            <Badge label={setTypeLabel(entry.type)} />
            {entry.combined ? <Badge label="Combined bill" /> : null}
          </View>
        </View>

        <FavoriteButton entry={entry} />
      </View>
    </Card>
  );
}
