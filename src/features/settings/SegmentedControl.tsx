import React from 'react';
import { Text, View } from 'react-native';

import { Chip } from '@/components';
import { useTheme } from '@/theme';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string | number> {
  label: string;
  description?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/**
 * A labelled row of choices. Built on the shared `Chip`, which already carries
 * a 44pt target and a selected state, and wrapped in a radio group so a screen
 * reader reads it as one control rather than four loose buttons.
 */
export function SegmentedControl<T extends string | number>({
  label,
  description,
  options,
  value,
  onChange,
  testID,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View testID={testID} style={{ paddingVertical: theme.space.md, paddingHorizontal: theme.space.lg }}>
      <Text style={[theme.type.body, { color: theme.colors.text }]}>{label}</Text>
      {description ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
          {description}
        </Text>
      ) : null}

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.space.sm,
          marginTop: theme.space.md,
        }}
      >
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            selected={option.value === value}
            onPress={() => {
              onChange(option.value);
            }}
          />
        ))}
      </View>
    </View>
  );
}
