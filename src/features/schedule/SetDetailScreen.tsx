import { Stack, useRouter } from 'expo-router';
import { ChevronRight, Clock, MapPin, TriangleAlert } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';

import { Badge, Button, Card, Divider, EmptyState, Screen, SectionHeader } from '@/components';
import { getArtist, getStages } from '@/data/repository';
import {
  durationMinutes,
  formatCountdown,
  formatDayLabel,
  formatTimeRange,
  isLive,
  minutesUntil,
} from '@/data/time';
import { useRequestPermissionOnSave } from '@/notifications';
import { useAppStore } from '@/store/useAppStore';
import { minTouchTarget, useTheme } from '@/theme';

import { conflictsForEntry } from './conflicts';
import { useEntryFavorite, useNow } from './hooks';
import { entryForSet, setTypeLabel } from './model';
import { SetReminderRow } from './SetReminderRow';
import { buildStagePalette } from './stagePalette';

/** Past this, a countdown stops being useful and the date says it better. */
const MINUTES_PER_DAY = 24 * 60;

export interface SetDetailScreenProps {
  setId: string;
}

/** Everything about one slot: when, where, who, the caveats, and what it clashes with. */
export function SetDetailScreen({ setId }: SetDetailScreenProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const now = useNow();
  const favorites = useAppStore((s) => s.favorites);

  const entry = useMemo(() => entryForSet(setId), [setId]);
  const palette = useMemo(() => buildStagePalette(theme, getStages()), [theme]);
  const clashes = useMemo(
    () => (entry ? conflictsForEntry(entry, favorites) : []),
    [entry, favorites],
  );

  if (!entry) {
    return (
      <Screen testID="screen-set-detail">
        <Stack.Screen options={{ title: 'Set' }} />
        <EmptyState
          title="That set is not in this schedule"
          message="It may have moved since the link was saved. Browse the schedule to find it."
          actionLabel="Open the schedule"
          onAction={() => router.push('/schedule')}
        />
      </Screen>
    );
  }

  const color = palette(entry.stage.id);
  const live = isLive(entry, now);
  const minutes = durationMinutes(entry);

  return (
    <Screen testID="screen-set-detail">
      <Stack.Screen options={{ title: entry.stage.shortName }} />

      <View style={{ gap: theme.space.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
          {live ? <Badge label="NOW" tone="accent" accessibilityLabel="Playing now" /> : null}
          <Badge label={entry.stage.shortName} tone="custom" color={color} />
          <Badge label={setTypeLabel(entry.type)} />
          {entry.combined ? <Badge label="Combined bill" /> : null}
        </View>

        <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text }]}>
          {entry.title}
        </Text>
      </View>

      <Card style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
        <DetailLine icon={<Clock size={theme.space.lg} color={theme.colors.textMuted} />}>
          {`${formatDayLabel(entry.start)}\n${formatTimeRange(entry)} · ${minutes} min`}
        </DetailLine>
        <Divider />
        <DetailLine icon={<MapPin size={theme.space.lg} color={color} />}>
          {entry.stage.name}
        </DetailLine>
        {/* A countdown is only news near the moment: `in 424h 20m` is not an
            answer to anything, and the day and time are already stated above. */}
        {live || Math.abs(minutesUntil(entry.start, now)) < MINUTES_PER_DAY ? (
          <>
            <Divider />
            <DetailLine icon={null}>
              {live ? 'Playing now.' : formatCountdown(entry.start, now)}
            </DetailLine>
          </>
        ) : null}
      </Card>

      <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
        <SaveButton entry={entry} />
        <SetReminderRow entry={entry} testID="set-reminder" />
      </View>

      {entry.notes.length > 0 ? (
        <>
          <SectionHeader title="Good to know" />
          <View style={{ gap: theme.space.sm }}>
            {entry.notes.map((note) => (
              <Card key={note} muted>
                <Text style={[theme.type.body, { color: theme.colors.text }]}>{note}</Text>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {clashes.length > 0 ? (
        <>
          <SectionHeader
            title={clashes.length === 1 ? 'Clashes with 1 saved set' : `Clashes with ${clashes.length} saved sets`}
          />
          <View style={{ gap: theme.space.sm }}>
            {clashes.map(({ other, overlapMinutes }) => (
              <Card
                key={other.id}
                accentColor={theme.colors.warning}
                onPress={() => router.push({ pathname: '/set/[id]', params: { id: other.id } })}
                accessibilityLabel={`${other.title} at ${other.stage.name}, overlaps by ${overlapMinutes} minutes`}
                accessibilityHint="Opens that set"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
                  <TriangleAlert size={theme.space.xl} color={theme.colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.type.h3, { color: theme.colors.text }]}>{other.title}</Text>
                    <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                      {`${other.stage.name} · ${formatTimeRange(other)}`}
                    </Text>
                    <Text style={[theme.type.bodySm, { color: theme.colors.warning }]}>
                      {`Overlaps by ${overlapMinutes} min`}
                    </Text>
                  </View>
                  <ChevronRight size={theme.space.lg} color={theme.colors.textMuted} />
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title={entry.combined ? 'On this bill' : 'Artist'} />
      <View style={{ gap: theme.space.sm }}>
        {entry.artistSlugs.map((slug) => {
          const artist = getArtist(slug);
          return (
            <Card
              key={slug}
              onPress={() => router.push({ pathname: '/artist/[slug]', params: { slug } })}
              accessibilityLabel={`${artist?.name ?? slug}, artist page`}
              accessibilityHint="Opens the artist page"
              style={{ minHeight: minTouchTarget }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[theme.type.h3, { color: theme.colors.text }]}>
                    {artist?.name ?? slug}
                  </Text>
                  {artist && artist.tags.length > 0 ? (
                    <Text numberOfLines={1} style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                      {artist.tags.join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={theme.space.lg} color={theme.colors.textMuted} />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function SaveButton({ entry }: { entry: NonNullable<ReturnType<typeof entryForSet>> }): React.JSX.Element {
  const { saved, toggle } = useEntryFavorite(entry);
  const askOnSave = useRequestPermissionOnSave();

  const onPress = useCallback(() => {
    toggle();
    // Plan 06 §4 and CLAUDE.md both put the notification prompt here: the
    // first time someone saves a set is when they have shown they want to be
    // told about one. Never on launch, and never before the save itself has
    // happened — the app does what they tapped for either way.
    askOnSave(!saved);
  }, [askOnSave, saved, toggle]);

  return (
    <Button
      label={saved ? 'Remove from My Weekend' : 'Add to My Weekend'}
      onPress={onPress}
      variant={saved ? 'secondary' : 'primary'}
      fullWidth
      accessibilityHint={
        saved
          ? 'Removes this set from your saved plan'
          : 'Saves this set to your plan, stored on this device'
      }
    />
  );
}

function DetailLine({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: string;
}): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md }}>
      {icon ? <View style={{ paddingTop: theme.space.xs }}>{icon}</View> : null}
      <Text style={[theme.type.body, { color: theme.colors.text, flex: 1 }]}>{children}</Text>
    </View>
  );
}
