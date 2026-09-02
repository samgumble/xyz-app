import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface AvatarProps {
  /** Full display name; initials are derived from it. */
  name: string;
  size?: number;
  /** Overrides the generated colour — pass a stage colour to group by stage. */
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Up to two initials, ignoring leading articles and one-letter words. */
export function initialsFor(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s&]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && w !== '&')
    .filter((w) => !['the', 'a', 'an', 'and', 'of'].includes(w.toLowerCase()));
  const source = words.length > 0 ? words : name.trim().split(/\s+/);
  const first = source[0]?.[0] ?? '?';
  const second = source.length > 1 ? source[source.length - 1]?.[0] : undefined;
  return (second ? `${first}${second}` : first).toUpperCase();
}

/** Stable per-name index so an artist keeps the same colour between launches. */
function hashIndex(name: string, buckets: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  }
  return hash % buckets;
}

/**
 * There are no artist photos in this build — rights are not cleared — so every
 * artist gets a generated initials avatar instead of a broken image.
 */
export function Avatar({ name, size, color, style, testID }: AvatarProps): React.JSX.Element {
  const { theme } = useTheme();
  const dimension = size ?? theme.space.xxl + theme.space.lg;
  const swatches = [
    theme.colors.stageMain,
    theme.colors.stageBlues,
    theme.colors.stageShowcase,
    theme.colors.stageClub,
    theme.colors.accent,
  ];
  const background = color ?? swatches[hashIndex(name, swatches.length)] ?? theme.colors.accent;

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          color: theme.colors.accentText,
          fontSize: Math.round(dimension * 0.38),
          lineHeight: Math.round(dimension * 0.46),
          fontWeight: '700',
        }}
      >
        {initialsFor(name)}
      </Text>
    </View>
  );
}
