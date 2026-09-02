import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components';
import { SearchField, useContainerWidth } from '@/features/schedule';
import { useTheme } from '@/theme';

import { ArtistCard } from './ArtistCard';
import { searchLineup } from './model';

/** Narrowest a poster tile may get before the grid drops a column. */
const MIN_TILE = 156;
const MAX_COLUMNS = 4;

/**
 * The Lineup tab: a poster wall of every act playing.
 *
 * The three flagged headliners run full width at the top, everything else fills
 * a responsive grid — two columns on a phone, up to four on a wide web window.
 * The five programme placeholders in `artists.json` are filtered out here; they
 * are events, not bands, and they stay reachable through the Schedule.
 */
export function LineupScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { width, onLayout } = useContainerWidth();
  const [query, setQuery] = useState('');

  const artists = useMemo(() => searchLineup(query), [query]);
  const headliners = artists.filter((a) => a.headliner === true);
  const rest = artists.filter((a) => a.headliner !== true);

  const available = Math.max(0, width - theme.space.lg * 2);
  const columns = Math.max(2, Math.min(MAX_COLUMNS, Math.floor(available / MIN_TILE)));
  const tileWidth = Math.floor((available - theme.space.md * (columns - 1)) / columns);
  const featuredWidth = columns >= 3 ? Math.floor((available - theme.space.md) / 2) : available;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }} onLayout={onLayout}>
      {/* The tab navigator titles this screen; no second heading here. */}
      <View style={{ paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, gap: theme.space.md }}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Name or genre"
          accessibilityLabel="Search the lineup by artist name or genre"
          testID="lineup-search"
        />
        <Text
          accessibilityLiveRegion="polite"
          style={[theme.type.bodySm, { color: theme.colors.textMuted }]}
        >
          {artists.length === 1 ? '1 artist' : `${artists.length} artists`}
        </Text>
      </View>

      {available <= 0 ? (
        // First frame before the container has been measured. Nothing to draw
        // yet, and drawing at a guessed width would make the grid jump.
        <View style={{ flex: 1 }} />
      ) : artists.length === 0 ? (
        <EmptyState
          title="No artists match"
          message="Try part of a name, or a genre like blues, soul or Americana."
          actionLabel="Clear search"
          onAction={() => setQuery('')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.md,
            paddingBottom: theme.space.xxl,
            gap: theme.space.md,
          }}
        >
          {headliners.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md }}>
              {headliners.map((artist) => (
                <ArtistCard
                  key={artist.slug}
                  artist={artist}
                  width={featuredWidth}
                  featured
                  testID={`lineup-card-${artist.slug}`}
                />
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md }}>
            {rest.map((artist) => (
              <ArtistCard
                key={artist.slug}
                artist={artist}
                width={tileWidth}
                testID={`lineup-card-${artist.slug}`}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
