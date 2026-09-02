import React from 'react';
import { Switch, Text, View } from 'react-native';

import { borderWidth, minTouchTarget, useTheme } from '@/theme';

export interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  first?: boolean;
  testID?: string;
}

/** A labelled on/off setting. The switch itself carries the accessible name. */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  first = false,
  testID,
}: SwitchRowProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.lg,
        minHeight: minTouchTarget,
        paddingVertical: theme.space.md,
        paddingHorizontal: theme.space.lg,
        borderTopWidth: first ? 0 : borderWidth.hairline,
        borderTopColor: theme.colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[theme.type.body, { color: theme.colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={description}
        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
        thumbColor={theme.colors.surface}
        ios_backgroundColor={theme.colors.border}
      />
    </View>
  );
}
