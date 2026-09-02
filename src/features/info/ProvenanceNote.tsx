import { Info } from 'lucide-react-native';
import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, useTheme } from '@/theme';

import { DecorativeIcon } from './Rows';

export interface ProvenanceNoteProps {
  title: string;
  /** Plain lines. Each renders as its own paragraph. */
  lines?: string[];
  /** Rendered as a numbered list beneath the lines. */
  items?: string[];
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The block this build uses to admit what the data is and is not. It reads as
 * an aside, not an error: the client is reviewing a preview and should be able
 * to see every seam without the app looking broken.
 */
export function ProvenanceNote({
  title,
  lines,
  items,
  children,
  style,
  testID,
}: ProvenanceNoteProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: borderWidth.hairline,
          borderColor: theme.colors.border,
          borderLeftWidth: borderWidth.thick + borderWidth.hairline,
          borderLeftColor: theme.colors.primary,
          borderRadius: theme.radius.md,
          padding: theme.space.lg,
          gap: theme.space.sm,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
        <DecorativeIcon>
          <Info size={theme.type.body.fontSize} color={theme.colors.primary} />
        </DecorativeIcon>
        <Text style={[theme.type.label, { color: theme.colors.text, flex: 1 }]}>{title}</Text>
      </View>

      {(lines ?? []).map((line) => (
        <Text key={line} style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
          {line}
        </Text>
      ))}

      {(items ?? []).map((item, index) => (
        <View key={item} style={{ flexDirection: 'row', gap: theme.space.sm }}>
          <Text style={[theme.type.bodySm, { color: theme.colors.primary, minWidth: theme.space.lg }]}>
            {index + 1}.
          </Text>
          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, flex: 1 }]}>{item}</Text>
        </View>
      ))}

      {children}
    </View>
  );
}
