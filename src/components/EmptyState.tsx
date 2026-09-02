import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  /** Say what to do next, not just that there is nothing here. */
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Shown wherever a list can legitimately be empty. */
export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityRole="summary"
      style={[
        {
          alignItems: 'center',
          gap: theme.space.md,
          paddingVertical: theme.space.xxl,
          paddingHorizontal: theme.space.lg,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[theme.type.h3, { color: theme.colors.text, textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text style={[theme.type.body, { color: theme.colors.textMuted, textAlign: 'center' }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}
