import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

import type { InlineSpan } from './parseInfoBody';

export interface RichTextProps {
  spans: InlineSpan[];
  /** A `theme.type.*` entry. Colour is passed separately so callers can mute. */
  textStyle: StyleProp<TextStyle>;
  color: string;
  numberOfLines?: number;
}

/**
 * Renders parsed inline spans. Bold picks its weight off the type ramp rather
 * than inventing one, so the large-text setting and any future ramp change
 * carry through.
 */
export function RichText({ spans, textStyle, color, numberOfLines }: RichTextProps): React.JSX.Element {
  const { theme } = useTheme();
  const boldWeight = theme.type.h2.fontWeight;

  return (
    <Text style={[textStyle, { color }]} numberOfLines={numberOfLines}>
      {spans.map((span, index) => {
        if (!span.bold && !span.italic) {
          // eslint-disable-next-line react/no-array-index-key -- spans are positional
          return <Text key={index}>{span.text}</Text>;
        }
        return (
          <Text
            key={index}
            style={[
              span.bold ? { fontWeight: boldWeight } : null,
              span.italic ? { fontStyle: 'italic' } : null,
            ]}
          >
            {span.text}
          </Text>
        );
      })}
    </Text>
  );
}
