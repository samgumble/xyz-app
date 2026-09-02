import { Search, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';

export interface BrewsSearchFieldProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  /** Announced instead of the placeholder; say what is being searched. */
  accessibilityLabel: string;
  testID?: string;
}

/** The brewery search box. Local to this feature so it owns its own styling. */
export function BrewsSearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  testID,
}: BrewsSearchFieldProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        minHeight: minTouchTarget,
        paddingHorizontal: theme.space.md,
        borderRadius: theme.radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Search size={theme.space.lg} color={theme.colors.textMuted} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[theme.type.body, { flex: 1, color: theme.colors.text, paddingVertical: theme.space.sm }]}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={theme.hitSlop}
          style={({ pressed }) => (pressed ? { opacity: opacity.pressed } : undefined)}
        >
          <X size={theme.space.lg} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
