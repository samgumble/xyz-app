import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

export interface StageLabelProps {
  name: string;
  color: string;
}

/** Stage identity: a colour chip plus the stage's own short name. */
export function StageLabel({ name, color }: StageLabelProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flexShrink: 1 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: theme.space.md,
          height: theme.space.md,
          borderRadius: theme.radius.pill,
          backgroundColor: color,
        }}
      />
      <Text numberOfLines={1} style={[theme.type.label, { color: theme.colors.textMuted, flexShrink: 1 }]}>
        {name.toUpperCase()}
      </Text>
    </View>
  );
}
