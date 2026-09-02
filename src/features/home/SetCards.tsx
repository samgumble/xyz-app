import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import { getArtist, getStage } from '@/data/repository';
import {
  durationMinutes,
  formatCountdown,
  formatShortDayLabel,
  formatTime,
  formatTimeRange,
  minutesUntil,
  progress,
} from '@/data/time';
import { stageColor, useTheme } from '@/theme';
import type { FestivalSet } from '@/types/content';

import { ProgressBar } from './ProgressBar';
import { StageLabel } from './StageLabel';

function artistName(set: FestivalSet): string {
  return getArtist(set.artist)?.name ?? set.artist;
}

function stageName(set: FestivalSet): string {
  return getStage(set.stage)?.shortName ?? set.stage;
}

function useOpenSet(): (set: FestivalSet) => void {
  const router = useRouter();
  return useCallback(
    (set: FestivalSet) => {
      router.push({ pathname: '/set/[id]', params: { id: set.id } });
    },
    [router],
  );
}

export interface NowPlayingCardProps {
  set: FestivalSet;
  at: Date;
  testID?: string;
}

/** A set that is on stage right now: how far in it is, and how long is left. */
export function NowPlayingCard({ set, at, testID }: NowPlayingCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const open = useOpenSet();

  const color = stageColor(theme, set.stage);
  const done = progress(set, at);
  const remaining = Math.max(0, minutesUntil(set.end, at));
  const total = durationMinutes(set);
  const remainingLabel = remaining <= 0 ? 'Wrapping up' : `${remaining} min left`;

  return (
    <Card
      testID={testID}
      onPress={() => {
        open(set);
      }}
      accentColor={color}
      accessibilityLabel={`Playing now on ${stageName(set)}: ${artistName(set)}, ${formatTimeRange(set)}, ${remainingLabel.toLowerCase()}.`}
      accessibilityHint="Opens the set"
      style={{ marginBottom: theme.space.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space.sm }}>
        <StageLabel name={stageName(set)} color={color} />
        <Badge label="LIVE" tone="custom" color={color} accessibilityLabel="On stage now" />
      </View>

      <Text style={[theme.type.h2, { color: theme.colors.text, marginTop: theme.space.sm }]}>
        {artistName(set)}
      </Text>
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        {formatTimeRange(set)}
        {total > 0 ? ` · ${total} min set` : ''}
      </Text>

      <View style={{ marginTop: theme.space.md, gap: theme.space.sm }}>
        <ProgressBar
          value={done}
          color={color}
          accessibilityLabel={`${artistName(set)} set progress`}
        />
        <Text style={[theme.type.label, { color: theme.colors.text }]}>{remainingLabel}</Text>
      </View>
    </Card>
  );
}

export interface UpNextCardProps {
  set: FestivalSet;
  at: Date;
  /** Adds the day when the set is not today — used overnight and off-season. */
  showDay?: boolean;
  testID?: string;
}

/** The set following on a stage, with a plain-language countdown. */
export function UpNextCard({ set, at, showDay = false, testID }: UpNextCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const open = useOpenSet();
  const color = stageColor(theme, set.stage);
  const countdown = formatCountdown(set.start, at);
  const minutes = minutesUntil(set.start, at);
  const imminent = minutes >= 0 && minutes <= 15;

  return (
    <Card
      testID={testID}
      onPress={() => {
        open(set);
      }}
      accentColor={color}
      accessibilityLabel={`Up next on ${stageName(set)}: ${artistName(set)}, ${countdown}, at ${formatTime(set.start)}.`}
      accessibilityHint="Opens the set"
      style={{ marginBottom: theme.space.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space.sm }}>
        <StageLabel name={stageName(set)} color={color} />
        <Badge
          label={countdown}
          tone={imminent ? 'accent' : 'neutral'}
          accessibilityLabel={`Starts ${countdown}`}
        />
      </View>

      <Text style={[theme.type.h3, { color: theme.colors.text, marginTop: theme.space.sm }]}>
        {artistName(set)}
      </Text>
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        {showDay ? `${formatShortDayLabel(set.start)} · ` : ''}
        {formatTimeRange(set)}
      </Text>
    </Card>
  );
}

export interface ClubSetRowProps {
  set: FestivalSet;
  at: Date;
  first?: boolean;
  testID?: string;
}

/** A late-night club show. The published end times are placeholders, and say so. */
export function ClubSetRow({ set, at, first = false, testID }: ClubSetRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const open = useOpenSet();
  const color = stageColor(theme, set.stage);
  const venue = getStage(set.stage)?.name ?? set.stage;
  const countdown = formatCountdown(set.start, at);

  return (
    <Card
      testID={testID}
      onPress={() => {
        open(set);
      }}
      muted
      accentColor={color}
      accessibilityLabel={`${artistName(set)} at ${venue}, doors listed for ${formatTime(set.start)}, ${countdown}.`}
      accessibilityHint="Opens the set"
      style={{ marginTop: first ? 0 : theme.space.md }}
    >
      <Text style={[theme.type.h3, { color: theme.colors.text }]}>{artistName(set)}</Text>
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        {venue}
      </Text>
      <Text style={[theme.type.label, { color: theme.colors.text, marginTop: theme.space.sm }]}>
        {formatTime(set.start)} · {countdown}
      </Text>
    </Card>
  );
}
