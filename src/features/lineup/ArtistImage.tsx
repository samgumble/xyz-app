import React, { useEffect, useState } from 'react';
import {
  Image,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import { artistImages, artistImagesByRemoteUrl } from '@/assets/artists';
import { Avatar } from '@/components';
import { useTheme } from '@/theme';

/** Which mirrored crop a screen wants when it asks by slug. */
export type ArtistImageVariant = 'card' | 'hero';

export interface ArtistImageProps {
  /** Remote photo from the snapshot. Kept as provenance and as the fallback. */
  uri?: string | undefined;
  /**
   * Optional artist slug. The remote URL alone already resolves the mirrored
   * file, so this is only needed if the snapshot's URLs are re-synced and stop
   * matching what `npm run images:fetch` last wrote.
   */
  slug?: string | undefined;
  /** Which mirrored crop to prefer when resolving by slug. Defaults to card. */
  variant?: ArtistImageVariant;
  /** Used for the initials and for the accessibility label. */
  name: string;
  /** Rendered height. Width always fills the parent. */
  height: number;
  /** Corner radius; defaults to the theme's medium radius. */
  radius?: number;
  testID?: string;
}

/**
 * Whether a remote URL is unusable and the initials should be drawn instead.
 *
 * Split out so the decision is unit-testable on its own: rendering a React
 * Native tree is currently broken in this repo's jest setup (see the report),
 * and this rule is the part that must not regress.
 */
export function shouldUseFallback(uri: string | undefined, failed: boolean): boolean {
  if (failed) return true;
  return typeof uri !== 'string' || uri.trim().length === 0;
}

/**
 * The bundled copy of a photo, if `npm run images:fetch` mirrored it.
 *
 * Looked up by the remote URL first, because that is what the snapshot hands
 * the card and detail screens, then by slug. Both keys are written into the
 * generated map, so a Squarespace URL that rotates its cache-busting segment
 * only costs the URL hit — the slug still finds the file.
 */
export function localArtistImage(
  uri: string | undefined,
  slug?: string | undefined,
  variant: ArtistImageVariant = 'card',
): ImageSourcePropType | undefined {
  if (typeof uri === 'string') {
    const byUrl = artistImagesByRemoteUrl[uri.trim()];
    if (byUrl !== undefined) return byUrl;
  }
  if (typeof slug === 'string') {
    const set = artistImages[slug.trim()];
    if (set !== undefined) return variant === 'hero' ? (set.hero ?? set.card) : set.card;
  }
  return undefined;
}

/**
 * Every source worth trying, best first. An empty list means initials.
 *
 * Order is the whole point: the bundled asset is first because it is the only
 * one that works in airplane mode, the remote URL is second so a photo the
 * festival re-uploads after the last mirror still appears when there is signal,
 * and running off the end of the list lands on the `Avatar`.
 */
export function artistImageSources(
  uri: string | undefined,
  local: ImageSourcePropType | undefined,
): ImageSourcePropType[] {
  const sources: ImageSourcePropType[] = [];
  if (local !== undefined) sources.push(local);
  if (!shouldUseFallback(uri, false)) sources.push({ uri });
  return sources;
}

/**
 * An artist photo that cannot break.
 *
 * The snapshot carries remote Squarespace URLs for the bands and nothing at all
 * for the five programme placeholders, and any of those URLs can 404 or time
 * out on festival wifi — or simply be unreachable, since the client will test
 * this in airplane mode. So the component walks a short list of sources: the
 * mirrored file in `src/assets/artists`, then the remote URL, then the shared
 * `Avatar` initials, always in a box the same size, so the grid never reflows
 * and the client never sees a grey broken-image rectangle.
 */
export function ArtistImage({
  uri,
  slug,
  variant = 'card',
  name,
  height,
  radius,
  testID,
}: ArtistImageProps): React.JSX.Element {
  const { theme } = useTheme();
  const [failures, setFailures] = useState(0);

  // A different artist (or a re-synced photo URL) deserves a fresh attempt.
  useEffect(() => {
    setFailures(0);
  }, [uri, slug, variant]);

  const sources = artistImageSources(uri, localArtistImage(uri, slug, variant));
  const source = sources[failures];
  const corner = radius ?? theme.radius.md;

  // The placeholder tint lives on this wrapper, never on the `Image` itself:
  // react-native-web renders the photo as a `z-index: -1` background layer, so
  // a background colour on the image element paints straight over it and you
  // get a silent grey rectangle instead of the photo.
  return (
    <View
      testID={source !== undefined ? undefined : testID ? `${testID}-fallback` : undefined}
      style={{
        width: '100%',
        height,
        borderRadius: corner,
        backgroundColor: theme.colors.surfaceAlt,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {source !== undefined ? (
        <Image
          // Keyed on the attempt so falling back to the next source remounts
          // the element rather than leaving the failed one on screen.
          key={failures}
          testID={testID}
          source={source}
          onError={() => setFailures((n) => n + 1)}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          accessible={false}
          style={fill}
        />
      ) : (
        <Avatar name={name} size={Math.min(height * 0.5, theme.space.xxl * 2)} />
      )}
    </View>
  );
}

/** The image fills its wrapper; the wrapper owns the size and the corners. */
const fill: StyleProp<ImageStyle> = { width: '100%', height: '100%' };
