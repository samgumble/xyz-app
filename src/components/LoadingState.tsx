import React from 'react';
import { ActivityIndicator, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface LoadingStateProps {
  /** Also used as the accessibility label, so make it specific. */
  label?: string;
  /** Fills the available space instead of sitting inline. */
  fullscreen?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The one spinner. Kept brief — offline-first means this rarely shows. */
export function LoadingState({
  label = 'Loading',
  fullscreen = false,
  style,
  testID,
}: LoadingStateProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space.md,
          paddingVertical: theme.space.xxl,
          ...(fullscreen ? { flex: 1, backgroundColor: theme.colors.bg } : {}),
        },
        style,
      ]}
    >
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}
