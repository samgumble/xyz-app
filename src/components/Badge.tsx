import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'custom';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Used when `tone` is `custom` — e.g. a stage colour. */
  color?: string;
  /** Read out instead of the label, for badges that are shorthand ("LIVE"). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A small status marker: LIVE, HEADLINER, 21+, URGENT. Not interactive. */
export function Badge({
  label,
  tone = 'neutral',
  color,
  accessibilityLabel,
  style,
  testID,
}: BadgeProps): React.JSX.Element {
  const { theme } = useTheme();

  const background = ((): string => {
    switch (tone) {
      case 'accent':
        return theme.colors.accent;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'custom':
        return color ?? theme.colors.accent;
      default:
        return theme.colors.surfaceAlt;
    }
  })();

  const foreground = tone === 'neutral' ? theme.colors.textMuted : theme.colors.accentText;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: theme.space.sm,
          paddingVertical: theme.space.xs / 2,
          borderRadius: theme.radius.sm,
          backgroundColor: background,
        },
        style,
      ]}
    >
      <Text style={[theme.type.label, { color: foreground }]}>{label}</Text>
    </View>
  );
}
