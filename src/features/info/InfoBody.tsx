import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { InfoTable } from './InfoTable';
import { RichText } from './RichText';
import { parseInfoBody, spansToText, type InfoBlock } from './parseInfoBody';

export interface InfoBodyProps {
  body: string;
  /**
   * Drops a leading `# Heading` that repeats the screen title, so the page
   * does not open with the same words twice.
   */
  omitLeadingTitle?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Renders a parsed CMS body. Everything comes off the theme. */
export function InfoBody({ body, omitLeadingTitle, style, testID }: InfoBodyProps): React.JSX.Element {
  const { theme } = useTheme();

  const blocks = useMemo<InfoBlock[]>(() => {
    const parsed = parseInfoBody(body);
    const first = parsed[0];
    if (
      omitLeadingTitle &&
      first &&
      first.kind === 'heading' &&
      spansToText(first.spans).trim().toLowerCase() === omitLeadingTitle.trim().toLowerCase()
    ) {
      return parsed.slice(1);
    }
    return parsed;
  }, [body, omitLeadingTitle]);

  const headingStyle = (level: number): { style: typeof theme.type.h2; marginTop: number } => {
    if (level <= 1) return { style: theme.type.h2, marginTop: theme.space.xl };
    if (level === 2) return { style: theme.type.h3, marginTop: theme.space.xl };
    return { style: theme.type.label, marginTop: theme.space.lg };
  };

  return (
    <View style={style} testID={testID}>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        if (block.kind === 'heading') {
          const { style: typeStyle, marginTop } = headingStyle(block.level);
          return (
            <View key={key} style={{ marginTop: index === 0 ? 0 : marginTop, marginBottom: theme.space.sm }}>
              <RichText
                spans={block.spans}
                textStyle={typeStyle}
                color={block.level <= 2 ? theme.colors.text : theme.colors.textMuted}
              />
            </View>
          );
        }

        if (block.kind === 'paragraph') {
          return (
            <View key={key} style={{ marginBottom: theme.space.md }}>
              <RichText spans={block.spans} textStyle={theme.type.body} color={theme.colors.text} />
            </View>
          );
        }

        if (block.kind === 'table') {
          return <InfoTable key={key} header={block.header} rows={block.rows} />;
        }

        return (
          <View
            key={key}
            accessibilityRole="list"
            style={{ marginBottom: theme.space.md, gap: theme.space.sm }}
          >
            {block.items.map((item, itemIndex) => (
              <View
                key={`${key}-${String(itemIndex)}`}
                style={{ flexDirection: 'row', gap: theme.space.sm, alignItems: 'flex-start' }}
              >
                <View style={{ minWidth: theme.space.lg }}>
                  <RichText
                    spans={[{ text: block.ordered ? `${String(itemIndex + 1)}.` : '•' }]}
                    textStyle={theme.type.body}
                    color={theme.colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <RichText spans={item} textStyle={theme.type.body} color={theme.colors.text} />
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
