import { Stack, useRouter } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Badge, Chip, EmptyState, Screen, SectionHeader } from '@/components';
import { getArtist, getSetsForArtist, getStages } from '@/data/repository';
import { formatDayLabel, toFestivalDay } from '@/data/time';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import { buildEntries, buildStagePalette, SetRow, useContainerWidth, useNow } from '@/features/schedule';

import { ArtistImage } from './ArtistImage';

export interface ArtistScreenProps {
  slug: string;
}

/** Turns a link key into something readable: `appleMusic` → `Apple Music`. */
function linkLabel(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Artist detail: hero photo, bio, tags, outbound links, and every set they play. */
export function ArtistScreen({ slug }: ArtistScreenProps): React.JSX.Element {
  const { theme } = useTheme();
  const { width, onLayout } = useContainerWidth();
  const router = useRouter();
  const now = useNow();

  const artist = useMemo(() => getArtist(slug), [slug]);
  const entries = useMemo(() => buildEntries(getSetsForArtist(slug)), [slug]);
  const palette = useMemo(() => buildStagePalette(theme, getStages()), [theme]);

  const open = useCallback((url: string) => {
    // Fire and forget: a device with no handler for the scheme must not crash
    // the screen, and there is nothing useful to say if the browser refuses.
    void Linking.openURL(url).catch(() => undefined);
  }, []);

  if (!artist) {
    return (
      <Screen testID="screen-artist">
        <Stack.Screen options={{ title: 'Artist' }} />
        <EmptyState
          title="No such artist"
          message="This link points at someone who is not on this year's bill."
          actionLabel="Open the lineup"
          onAction={() => router.push('/lineup')}
        />
      </Screen>
    );
  }

  const links: { key: string; url: string }[] = [
    ...Object.entries(artist.links),
    ...Object.entries(artist.linksExtra ?? {}),
  ]
    .filter((pair): pair is [string, string] => typeof pair[1] === 'string' && pair[1].length > 0)
    .map(([key, url]) => ({ key, url }));

  const heroWidth = Math.max(0, width - theme.space.lg * 2);
  const days = [...new Set(entries.map((e) => toFestivalDay(e.start)))].sort();

  return (
    <Screen testID="screen-artist">
      <Stack.Screen options={{ title: artist.name }} />

      {/* `Screen` owns the padding, so the content width is measured from a
          zero-height probe inside it rather than from the window. */}
      <View onLayout={onLayout} style={{ height: 0 }} />

      {heroWidth > 0 ? (
        <ArtistImage
          uri={artist.photoHero ?? artist.photo}
          name={artist.name}
          height={Math.round(heroWidth * 0.62)}
          testID="artist-hero"
        />
      ) : null}
      {artist.photoCredit ? (
        <Text style={[theme.type.label, { color: theme.colors.textMuted, marginTop: theme.space.xs, fontWeight: '400' }]}>
          {`Photo: ${artist.photoCredit}`}
        </Text>
      ) : null}

      <View style={{ marginTop: theme.space.lg, gap: theme.space.sm }}>
        {artist.headliner ? <Badge label="HEADLINER" tone="accent" /> : null}
        <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text }]}>
          {artist.name}
        </Text>
        {artist.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
            {artist.tags.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </View>
        ) : null}
      </View>

      {artist.bio ? (
        <Text style={[theme.type.body, { color: theme.colors.text, marginTop: theme.space.lg }]}>
          {artist.bio}
        </Text>
      ) : null}

      {links.length > 0 ? (
        <>
          <SectionHeader title="Listen and follow" subtitle="Opens outside the app" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
            {links.map(({ key, url }) => (
              <Pressable
                key={key}
                onPress={() => open(url)}
                accessibilityRole="link"
                accessibilityLabel={`${artist.name} on ${linkLabel(key)}`}
                accessibilityHint="Opens in your browser"
                hitSlop={theme.hitSlop}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space.xs,
                  minHeight: minTouchTarget,
                  paddingHorizontal: theme.space.md,
                  borderRadius: theme.radius.pill,
                  borderWidth: borderWidth.hairline,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? opacity.pressed : 1,
                })}
              >
                <ExternalLink size={theme.space.lg} color={theme.colors.accent} />
                <Text style={[theme.type.label, { color: theme.colors.text }]}>{linkLabel(key)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader
        title={entries.length === 1 ? '1 set' : `${entries.length} sets`}
        subtitle={days.length > 1 ? `Across ${days.length} days` : undefined}
      />
      {entries.length === 0 ? (
        <EmptyState title="No set times yet" message="Times are published closer to the festival." />
      ) : (
        <View style={{ gap: theme.space.sm }}>
          {entries.map((entry, index) => {
            const previousDay = index === 0 ? undefined : toFestivalDay(entries[index - 1]?.start ?? '');
            const thisDay = toFestivalDay(entry.start);
            return (
              <View key={entry.id} style={{ gap: theme.space.sm }}>
                {thisDay !== previousDay ? (
                  <Text
                    accessibilityRole="header"
                    style={[
                      theme.type.label,
                      { color: theme.colors.textMuted, marginTop: index === 0 ? 0 : theme.space.md },
                    ]}
                  >
                    {formatDayLabel(thisDay)}
                  </Text>
                ) : null}
                <SetRow entry={entry} palette={palette} now={now} />
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
