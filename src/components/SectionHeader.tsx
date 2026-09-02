import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { opacity, useTheme } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional trailing control, e.g. "See all". */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** A titled divider between groups of content. The title is a heading. */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
  testID,
}: SectionHeaderProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: theme.space.md,
          marginTop: theme.space.xl,
          marginBottom: theme.space.md,
        },
        style,
      ]}
    >
      <View style={{ flexShrink: 1 }}>
        <Text accessibilityRole="header" style={[theme.type.h2, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="link"
          accessibilityLabel={actionLabel}
          hitSlop={theme.hitSlop}
          style={({ pressed }) => (pressed ? { opacity: opacity.pressed } : undefined)}
        >
          <Text style={[theme.type.label, { color: theme.colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
