import React, { useEffect, useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';

import { Avatar } from '@/components';
import { useTheme } from '@/theme';

export interface ArtistImageProps {
  /** Remote photo. Missing, empty, or failing all land on the initials avatar. */
  uri?: string | undefined;
  /** Used for the initials and for the accessibility label. */
  name: string;
  /** Rendered height. Width always fills the parent. */
  height: number;
  /** Corner radius; defaults to the theme's medium radius. */
  radius?: number;
  testID?: string;
}

/**
 * Whether to draw initials instead of the photo.
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
 * An artist photo that cannot break.
 *
 * The real snapshot carries remote Squarespace URLs for the bands and nothing
 * at all for the five programme placeholders, and any of those URLs can 404 or
 * time out on festival wifi. So the component holds a single piece of state:
 * once the network says no, it renders the shared `Avatar` initials instead,
 * in a box the same size, so the grid never reflows and the client never sees
 * a grey broken-image rectangle.
 */
export function ArtistImage({
  uri,
  name,
  height,
  radius,
  testID,
}: ArtistImageProps): React.JSX.Element {
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);

  // A different artist (or a re-synced photo URL) deserves a fresh attempt.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const corner = radius ?? theme.radius.md;
  const usable = !shouldUseFallback(uri, failed);

  // The placeholder tint lives on this wrapper, never on the `Image` itself:
  // react-native-web renders the photo as a `z-index: -1` background layer, so
  // a background colour on the image element paints straight over it and you
  // get a silent grey rectangle instead of the photo.
  return (
    <View
      testID={usable ? undefined : testID ? `${testID}-fallback` : undefined}
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
      {usable ? (
        <Image
          testID={testID}
          source={{ uri }}
          onError={() => setFailed(true)}
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
