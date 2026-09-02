import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Card } from '@/components';
import { getHeadliners, getSetsForArtist, getStage } from '@/data/repository';
import { formatShortDayLabel, formatTime } from '@/data/time';
import { stageColor, useTheme } from '@/theme';
import type { Artist, FestivalSet } from '@/types/content';

interface HeadlinerEntry {
  artist: Artist;
  set?: FestivalSet;
}

export interface HeadlinerRowProps {
  testID?: string;
}

/**
 * Who is closing each night. The set shown is the artist's main-programme
 * appearance, found by lookup rather than by naming a slug or a stage.
 */
export function HeadlinerRow({ testID }: HeadlinerRowProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const router = useRouter();

  const entries = useMemo<HeadlinerEntry[]>(
    () =>
      getHeadliners()
        .map((artist) => {
          const sets = getSetsForArtist(artist.slug);
          const main = sets.find((s) => s.type === 'main') ?? sets[0];
          const entry: HeadlinerEntry = { artist };
          if (main) entry.set = main;
          return entry;
        })
        .sort((a, b) => {
          if (!a.set) return 1;
          if (!b.set) return -1;
          return Date.parse(a.set.start) - Date.parse(b.set.start);
        }),
    [],
  );

  if (entries.length === 0) return null;

  return (
    <View testID={testID}>
      {entries.map(({ artist, set }) => {
        const color = set ? stageColor(theme, set.stage) : theme.colors.accent;
        const venue = set ? (getStage(set.stage)?.name ?? set.stage) : undefined;
        const when = set ? `${formatShortDayLabel(set.start)} · ${formatTime(set.start)}` : 'Time to be announced';

        return (
          <Card
            key={artist.slug}
            onPress={() => {
              router.push({ pathname: '/artist/[slug]', params: { slug: artist.slug } });
            }}
            accentColor={color}
            accessibilityLabel={`Headliner ${artist.name}. ${when}${venue ? `, ${venue}` : ''}.`}
            accessibilityHint="Opens the artist"
            style={{ marginBottom: theme.space.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.lg }}>
              <Avatar name={artist.name} color={color} />
              <View style={{ flex: 1 }}>
                <Text style={[theme.type.h3, { color: theme.colors.text }]}>{artist.name}</Text>
                <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
                  {when}
                  {venue ? ` · ${venue}` : ''}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
