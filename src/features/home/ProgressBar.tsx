import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

export interface ProgressBarProps {
  /** 0..1. Clamped here so a stale clock cannot overdraw the track. */
  value: number;
  color: string;
  accessibilityLabel: string;
  testID?: string;
}

/** The bar under a live set. Announces its own percentage. */
export function ProgressBar({
  value,
  color,
  accessibilityLabel,
  testID,
}: ProgressBarProps): React.JSX.Element {
  const { theme } = useTheme();
  const clamped = Math.min(1, Math.max(0, value));
  const percent = Math.round(clamped * 100);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        height: theme.space.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          borderRadius: theme.radius.pill,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
