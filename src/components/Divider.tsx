import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, useTheme } from '@/theme';

export interface DividerProps {
  /** Adds vertical breathing room above and below the rule. */
  spaced?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A hairline rule. Decorative, so it is hidden from assistive technology. */
export function Divider({ spaced = false, style }: DividerProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          height: borderWidth.hairline,
          backgroundColor: theme.colors.border,
          marginVertical: spaced ? theme.space.lg : 0,
        },
        style,
      ]}
    />
  );
}
