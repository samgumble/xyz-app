import React from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps {
  children?: React.ReactNode;
  /** Optional page heading rendered above the content. */
  title?: string;
  subtitle?: string;
  /** Wraps content in a ScrollView. Off for screens that manage their own list. */
  scroll?: boolean;
  /** Removes the default horizontal padding, for edge-to-edge maps and grids. */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The frame every route renders into: theme background, safe-area insets, and
 * a consistent heading. Nothing here hard-codes a colour or a size.
 */
export function Screen({
  children,
  title,
  subtitle,
  scroll = true,
  bleed = false,
  style,
  contentContainerStyle,
  testID,
}: ScreenProps): React.JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const padding = bleed ? 0 : theme.space.lg;
  const content = (
    <>
      {title ? (
        <View style={{ marginBottom: subtitle ? theme.space.xs : theme.space.lg }}>
          <Text
            accessibilityRole="header"
            style={[theme.type.h1, { color: theme.colors.text }]}
          >
            {title}
          </Text>
        </View>
      ) : null}
      {subtitle ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginBottom: theme.space.lg }]}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </>
  );

  if (!scroll) {
    return (
      <View
        testID={testID}
        style={[
          styles.fill,
          {
            backgroundColor: theme.colors.bg,
            paddingHorizontal: padding,
            paddingTop: insets.top + theme.space.md,
            paddingBottom: insets.bottom,
          },
          style,
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      style={[styles.fill, { backgroundColor: theme.colors.bg }, style]}
      contentContainerStyle={[
        {
          paddingHorizontal: padding,
          paddingTop: insets.top + theme.space.md,
          paddingBottom: insets.bottom + theme.space.xxl,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
