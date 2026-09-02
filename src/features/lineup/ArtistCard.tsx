import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '@/components';
import { borderWidth, opacity, useTheme } from '@/theme';
import type { Artist } from '@/types/content';

import { ArtistImage } from './ArtistImage';
import { setCountFor, tagLine } from './model';

export interface ArtistCardProps {
  artist: Artist;
  width: number;
  /** Headliners get a taller image and the display type — the poster effect. */
  featured?: boolean;
  testID?: string;
}

/** One poster tile in the lineup grid. */
export function ArtistCard({
  artist,
  width,
  featured = false,
  testID,
}: ArtistCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const imageHeight = featured ? Math.round(width * 0.52) : Math.round(width * 0.82);
  const sets = setCountFor(artist);
  const tags = tagLine(artist, featured ? 3 : 2);

  return (
    <Pressable
      testID={testID}
      onPress={() => router.push({ pathname: '/artist/[slug]', params: { slug: artist.slug } })}
      accessibilityRole="button"
      accessibilityLabel={`${artist.name}${artist.headliner ? ', headliner' : ''}${
        tags ? `, ${tags}` : ''
      }, ${sets === 1 ? '1 set' : `${sets} sets`}`}
      accessibilityHint="Opens the artist page"
      style={({ pressed }) => ({
        width,
        borderRadius: theme.radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: artist.headliner ? theme.colors.accent : theme.colors.border,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <ArtistImage
        uri={artist.photo}
        name={artist.name}
        height={imageHeight}
        radius={0}
        testID={testID ? `${testID}-image` : undefined}
      />
      <View style={{ padding: theme.space.md, gap: theme.space.xs }}>
        {artist.headliner ? <Badge label="HEADLINER" tone="accent" /> : null}
        {/* Two lines are reserved whether or not the name needs them, so tiles
            in a row line up instead of stepping. */}
        <Text
          numberOfLines={2}
          style={[
            featured ? theme.type.h2 : theme.type.h3,
            {
              color: theme.colors.text,
              minHeight: (featured ? theme.type.h2.lineHeight : theme.type.h3.lineHeight) * 2,
            },
          ]}
        >
          {artist.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            theme.type.bodySm,
            { color: theme.colors.textMuted, minHeight: theme.type.bodySm.lineHeight },
          ]}
        >
          {tags}
        </Text>
        <Text style={[theme.type.label, { color: theme.colors.textMuted, fontWeight: '400' }]}>
          {sets === 1 ? '1 set' : `${sets} sets`}
        </Text>
      </View>
    </Pressable>
  );
}
