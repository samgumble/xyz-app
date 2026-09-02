import React from 'react';
import { View } from 'react-native';

import { borderWidth, useTheme } from '@/theme';

import { RichText } from './RichText';
import { spansToText, type InlineSpan } from './parseInfoBody';

export interface InfoTableProps {
  header: InlineSpan[][];
  rows: InlineSpan[][][];
}

/**
 * The published ticket price table, rendered as a real grid rather than a
 * horizontally scrolling block: on a phone the label column wraps and the
 * numeric columns stay put, which keeps every price reachable one-handed.
 * Each row is a single accessibility node so a screen reader reads
 * "GA 3-Day Pass, Price, $300, Status, On sale" instead of stray cells.
 */
export function InfoTable({ header, rows }: InfoTableProps): React.JSX.Element {
  const { theme } = useTheme();
  const columns = Math.max(header.length, ...rows.map((r) => r.length), 1);

  // The first column carries the long label; the rest are short values.
  const weightFor = (index: number): number => (index === 0 ? 2 : 1);

  const rowLabel = (cells: InlineSpan[][]): string =>
    cells
      .map((cell, index) => {
        const heading = header[index];
        const value = spansToText(cell);
        return heading ? `${spansToText(heading)}: ${value}` : value;
      })
      .join('. ');

  return (
    <View
      style={{
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        marginBottom: theme.space.lg,
      }}
    >
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={header.map(spansToText).join(', ')}
        style={{
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceAlt,
          paddingHorizontal: theme.space.md,
          paddingVertical: theme.space.sm,
          gap: theme.space.sm,
        }}
      >
        {header.map((cell, index) => (
          <View key={spansToText(cell) + String(index)} style={{ flex: weightFor(index) }}>
            <RichText spans={cell} textStyle={theme.type.label} color={theme.colors.textMuted} />
          </View>
        ))}
      </View>

      {rows.map((cells, rowIndex) => (
        <View
          key={rowLabel(cells) + String(rowIndex)}
          accessible
          accessibilityLabel={rowLabel(cells)}
          style={{
            flexDirection: 'row',
            gap: theme.space.sm,
            paddingHorizontal: theme.space.md,
            paddingVertical: theme.space.md,
            backgroundColor: rowIndex % 2 === 1 ? theme.colors.surfaceAlt : theme.colors.surface,
            borderTopWidth: borderWidth.hairline,
            borderTopColor: theme.colors.border,
          }}
        >
          {Array.from({ length: columns }, (_unused, columnIndex) => {
            const cell = cells[columnIndex] ?? [{ text: '' }];
            return (
              <View key={columnIndex} style={{ flex: weightFor(columnIndex) }}>
                <RichText
                  spans={cell}
                  textStyle={theme.type.bodySm}
                  color={columnIndex === 0 ? theme.colors.text : theme.colors.textMuted}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
