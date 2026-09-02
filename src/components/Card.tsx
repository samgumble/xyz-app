import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';

export interface CardProps {
  children: React.ReactNode;
  /** Makes the whole card a control. Requires `accessibilityLabel`. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  /** A stage colour or status colour drawn as a left rail. */
  accentColor?: string;
  /** Sunk background instead of raised — for nested or secondary cards. */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The standard content container: surface, hairline border, optional rail. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accentColor,
  muted = false,
  style,
  testID,
}: CardProps): React.JSX.Element {
  const { theme } = useTheme();

  const base: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: muted ? theme.colors.surfaceAlt : theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: borderWidth.hairline,
      borderRadius: theme.radius.md,
      padding: theme.space.lg,
      minHeight: onPress ? minTouchTarget : undefined,
    },
    accentColor
      ? { borderLeftWidth: borderWidth.thick + borderWidth.hairline, borderLeftColor: accentColor }
      : null,
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={base}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed ? { opacity: opacity.pressed } : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
});
