import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';

export interface ChipProps {
  label: string;
  /** Filled treatment; use for an active filter. */
  selected?: boolean;
  onPress?: () => void;
  /** Overrides the border/label colour — pass a stage colour here. */
  color?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A small filter or tag pill. Tappable chips carry a full 44pt target. */
export function Chip({
  label,
  selected = false,
  onPress,
  color,
  icon,
  style,
  testID,
}: ChipProps): React.JSX.Element {
  const { theme } = useTheme();
  const tint = color ?? theme.colors.accent;

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.xs,
          paddingHorizontal: theme.space.md,
          paddingVertical: theme.space.sm,
          borderRadius: theme.radius.pill,
          borderWidth: borderWidth.hairline,
          borderColor: selected ? tint : theme.colors.border,
          backgroundColor: selected ? tint : theme.colors.surface,
          minHeight: onPress ? minTouchTarget : undefined,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[theme.type.label, { color: selected ? theme.colors.accentText : theme.colors.text }]}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={theme.hitSlop}
      style={({ pressed }) => (pressed ? { opacity: opacity.pressed } : undefined)}
    >
      {body}
    </Pressable>
  );
}
