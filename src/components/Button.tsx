import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  disabled?: boolean;
  busy?: boolean;
  /** Defaults to `label`; set it when the label is an abbreviation. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The one button. Saturated fill is reserved for the primary action. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  busy = false,
  accessibilityLabel,
  accessibilityHint,
  fullWidth = false,
  style,
  testID,
}: ButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const inactive = disabled || busy;

  const { background, border, foreground } = ((): {
    background: string;
    border: string;
    foreground: string;
  } => {
    switch (variant) {
      case 'secondary':
        return {
          background: theme.colors.surface,
          border: theme.colors.border,
          foreground: theme.colors.text,
        };
      case 'ghost':
        return { background: 'transparent', border: 'transparent', foreground: theme.colors.accent };
      case 'danger':
        return {
          background: theme.colors.danger,
          border: theme.colors.danger,
          foreground: theme.colors.accentText,
        };
      default:
        return {
          background: theme.colors.accent,
          border: theme.colors.accent,
          foreground: theme.colors.accentText,
        };
    }
  })();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      hitSlop={theme.hitSlop}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space.sm,
          minHeight: minTouchTarget,
          paddingHorizontal: theme.space.lg,
          paddingVertical: theme.space.md,
          borderRadius: theme.radius.md,
          borderWidth: borderWidth.hairline,
          borderColor: border,
          backgroundColor: background,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: inactive ? opacity.disabled : pressed ? opacity.pressed : 1,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={foreground} /> : icon ? <View>{icon}</View> : null}
      <Text style={[theme.type.body, { color: foreground, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}
