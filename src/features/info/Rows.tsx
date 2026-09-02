import { ChevronRight, ExternalLink } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';

/**
 * List-row primitives shared by the home / announcements / info / settings
 * features. They live in a feature folder rather than `src/components/`
 * because this workstream does not own the shared component library — see
 * BUILD-BRIEF.md "File ownership".
 */

export interface DecorativeIconProps {
  children: React.ReactNode;
}

/**
 * Hides an icon from assistive technology. Every icon in these features sits
 * next to text or inside a labelled control, so announcing it as well would
 * only make the row longer to listen to.
 */
export function DecorativeIcon({ children }: DecorativeIconProps): React.JSX.Element {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

export interface RowShellProps {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  first?: boolean;
  testID?: string;
}

function RowShell({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  first = false,
  testID,
}: RowShellProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.md,
          minHeight: minTouchTarget,
          paddingVertical: theme.space.md,
          paddingHorizontal: theme.space.lg,
          borderTopWidth: first ? 0 : borderWidth.hairline,
          borderTopColor: theme.colors.border,
        },
        pressed ? { opacity: opacity.pressed } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

export interface NavRowProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  accessibilityHint?: string;
  first?: boolean;
  testID?: string;
}

/** A row that pushes another screen in this app. */
export function NavRow({
  label,
  description,
  icon,
  onPress,
  accessibilityHint,
  first,
  testID,
}: NavRowProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <RowShell
      onPress={onPress}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      {...(first ? { first } : {})}
      {...(testID ? { testID } : {})}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[theme.type.body, { color: theme.colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <DecorativeIcon>
        <ChevronRight size={theme.type.body.fontSize} color={theme.colors.textMuted} />
      </DecorativeIcon>
    </RowShell>
  );
}

export interface ExternalLinkRowProps {
  label: string;
  url: string;
  description?: string;
  first?: boolean;
  testID?: string;
}

/** A row that leaves the app. Says so, in the label and with an icon. */
export function ExternalLinkRow({
  label,
  url,
  description,
  first,
  testID,
}: ExternalLinkRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const open = useCallback(() => {
    void Linking.openURL(url).catch(() => undefined);
  }, [url]);

  return (
    <RowShell
      onPress={open}
      accessibilityLabel={`${label}. Opens outside the app.`}
      accessibilityHint={description ?? url}
      {...(first ? { first } : {})}
      {...(testID ? { testID } : {})}
    >
      <View style={{ flex: 1 }}>
        <Text style={[theme.type.body, { color: theme.colors.accent }]}>{label}</Text>
        {description ? (
          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <DecorativeIcon>
        <ExternalLink size={theme.type.body.fontSize} color={theme.colors.textMuted} />
      </DecorativeIcon>
    </RowShell>
  );
}

export interface RowGroupProps {
  children: React.ReactNode;
  testID?: string;
}

/** Wraps rows in a bordered card so the hairlines read as one list. */
export function RowGroup({ children, testID }: RowGroupProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
