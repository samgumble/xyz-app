import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { EmptyState } from '@/components';
import { formatTime, isLive } from '@/data/time';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Stage } from '@/types/content';

import { useContainerWidth, useEntryFavorite } from './hooks';
import { computeGridLayout, nowOffset, type GridBlock, type GridLayout } from './layout';
import type { ScheduleEntry } from './model';
import type { StagePalette } from './stagePalette';

/** Width of the pinned time gutter. Fits `12:30 PM` at label size. */
const GUTTER = 62;
/** Height of the stage header band above the grid body. */
const HEADER_HEIGHT = 46;
const MIN_COLUMN = 132;
const MAX_COLUMN = 260;

export interface StageGridProps {
  entries: ScheduleEntry[];
  stages: Stage[];
  palette: StagePalette;
  now: Date;
}

/**
 * The stage-column grid: time runs down, stages run across.
 *
 * Four stages run concurrently on a festival day and up to ten appear across a
 * whole day, so the columns scroll horizontally while the time gutter stays
 * pinned on the left. The header band is a second horizontal scroller driven
 * by the body's offset, which keeps the stage names visible however far down
 * the day you are — the alternative, one scroll view, loses them the moment
 * you scroll past noon.
 */
export function StageGrid({ entries, stages, palette, now }: StageGridProps): React.JSX.Element {
  const { theme } = useTheme();
  const { width, onLayout } = useContainerWidth();
  const headerRef = useRef<ScrollView | null>(null);
  const bodyRef = useRef<ScrollView | null>(null);

  const columnWidth = useMemo(() => {
    const available = Math.max(width - GUTTER, MIN_COLUMN);
    const even = stages.length > 0 ? available / stages.length : MIN_COLUMN;
    return Math.round(Math.min(MAX_COLUMN, Math.max(MIN_COLUMN, even)));
  }, [width, stages.length]);

  const layout = useMemo<GridLayout>(() => computeGridLayout(entries, stages), [entries, stages]);

  const onBodyScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    headerRef.current?.scrollTo({ x: event.nativeEvent.contentOffset.x, animated: false });
  }, []);

  // The axis starts at the hour before the first set, but a day can open with a
  // single 8:50 AM fun run and then do nothing until noon. Park the view on the
  // live moment if there is one, otherwise on the first thing happening, so the
  // grid never opens on an hour of empty columns.
  const nowTopForScroll = nowOffset(layout, now);
  const firstBlockTop = Math.min(
    ...layout.columns.flatMap((column) => column.blocks.map((block) => block.top)),
  );
  const parkAt = nowTopForScroll ?? (Number.isFinite(firstBlockTop) ? firstBlockTop : 0);
  const topPad = theme.space.md;
  useEffect(() => {
    bodyRef.current?.scrollTo({ y: Math.max(0, parkAt - topPad), animated: false });
  }, [parkAt, topPad]);

  if (layout.columns.length === 0 || layout.totalHeight === 0) {
    return (
      <View onLayout={onLayout}>
        <EmptyState
          title="Nothing on this day"
          message="Clear a filter or pick another day to see the grid."
        />
      </View>
    );
  }

  const nowTop = nowTopForScroll;
  const bodyWidth = columnWidth * layout.columns.length;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {/* Header band: corner spacer + stage names, scrolled by the body. */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: borderWidth.hairline,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.bg,
        }}
      >
        <View style={{ width: GUTTER, height: HEADER_HEIGHT, justifyContent: 'center' }}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Time</Text>
        </View>
        <ScrollView
          ref={headerRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={{ flexDirection: 'row', width: bodyWidth }}>
            {layout.columns.map(({ stage }) => (
              <View
                key={stage.id}
                style={{
                  width: columnWidth,
                  height: HEADER_HEIGHT,
                  paddingHorizontal: theme.space.xs,
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    backgroundColor: palette(stage.id),
                    borderRadius: theme.radius.sm,
                    paddingHorizontal: theme.space.sm,
                    paddingVertical: theme.space.xs,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[theme.type.label, { color: theme.colors.accentText }]}
                  >
                    {stage.shortName}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Body: vertical time scroll, with the gutter outside the horizontal one. */}
      <ScrollView ref={bodyRef} showsVerticalScrollIndicator={false}>
        <View
          style={{
            flexDirection: 'row',
            paddingTop: topPad,
            height: layout.totalHeight + topPad + theme.space.xxl,
          }}
        >
          <View style={{ width: GUTTER }}>
            {layout.ticks
              .filter((tick) => tick.major)
              .map((tick) => (
                <Text
                  key={tick.top}
                  style={[
                    theme.type.label,
                    {
                      position: 'absolute',
                      top: tick.top - theme.space.sm,
                      left: 0,
                      color: theme.colors.textMuted,
                    },
                  ]}
                >
                  {tick.label}
                </Text>
              ))}
            {nowTop === undefined ? null : (
              <Text
                accessibilityLabel={`Now, ${formatTime(now)}`}
                style={[
                  theme.type.label,
                  {
                    position: 'absolute',
                    top: nowTop - theme.space.sm,
                    left: 0,
                    color: theme.colors.accent,
                  },
                ]}
              >
                {formatTime(now)}
              </Text>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            <View style={{ width: bodyWidth, height: layout.totalHeight }}>
              {/* Hour and half-hour rules, drawn under the cards. */}
              {layout.ticks.map((tick) => (
                <View
                  key={`${tick.top}-rule`}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    position: 'absolute',
                    top: tick.top,
                    left: 0,
                    right: 0,
                    height: borderWidth.hairline,
                    backgroundColor: theme.colors.border,
                    opacity: tick.major ? 1 : opacity.disabled,
                  }}
                />
              ))}

              <View style={{ flexDirection: 'row' }}>
                {layout.columns.map((column) => (
                  <View
                    key={column.stage.id}
                    style={{
                      width: columnWidth,
                      height: layout.totalHeight,
                      paddingHorizontal: theme.space.xs,
                      borderRightWidth: borderWidth.hairline,
                      borderRightColor: theme.colors.border,
                    }}
                  >
                    {column.blocks.map((block) => (
                      <GridCard
                        key={block.entry.id}
                        block={block}
                        palette={palette}
                        columnWidth={columnWidth - theme.space.sm}
                        now={now}
                      />
                    ))}
                  </View>
                ))}
              </View>

              {nowTop === undefined ? null : (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    position: 'absolute',
                    top: nowTop,
                    left: 0,
                    width: bodyWidth,
                    height: borderWidth.thick,
                    backgroundColor: theme.colors.accent,
                  }}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

interface GridCardProps {
  block: GridBlock;
  palette: StagePalette;
  columnWidth: number;
  now: Date;
}

/**
 * One set in the grid, positioned against the time axis.
 *
 * Card content thins out as the slot gets shorter: a 15-minute set is 27pt tall
 * and only has room for a name, so the time moves to the accessibility label
 * rather than being clipped.
 */
function GridCard({ block, palette, columnWidth, now }: GridCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { entry, top, height, leftFraction, widthFraction } = block;
  const { saved, toggle } = useEntryFavorite(entry);
  const live = isLive(entry, now);
  const color = palette(entry.stage.id);

  const roomy = height >= 76;
  const medium = height >= 50;
  const showHeart = height >= minTouchTarget;

  return (
    <View
      style={{
        position: 'absolute',
        top,
        left: leftFraction * columnWidth + theme.space.xs,
        width: widthFraction * columnWidth - (widthFraction < 1 ? theme.space.xs : 0),
        height,
      }}
    >
      <Pressable
        onPress={() => router.push({ pathname: '/set/[id]', params: { id: entry.id } })}
        onLongPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${entry.title}, ${entry.stage.name}, ${formatTime(entry.start)} to ${formatTime(
          entry.end,
        )}${live ? ', playing now' : ''}${saved ? ', in My Weekend' : ''}`}
        accessibilityHint="Opens set details. Long press to add or remove from My Weekend."
        style={({ pressed }) => ({
          flex: 1,
          backgroundColor: theme.colors.surface,
          borderWidth: borderWidth.hairline,
          borderColor: live ? theme.colors.accent : theme.colors.border,
          borderLeftWidth: borderWidth.thick + borderWidth.hairline,
          borderLeftColor: live ? theme.colors.accent : color,
          borderRadius: theme.radius.sm,
          paddingLeft: theme.space.sm,
          paddingRight: showHeart ? theme.space.xxl : theme.space.sm,
          paddingVertical: medium ? theme.space.xs : theme.space.xs / 2,
          overflow: 'hidden',
          opacity: pressed ? opacity.pressed : 1,
        })}
      >
        {roomy ? (
          <Text style={[theme.type.label, { color: live ? theme.colors.accent : theme.colors.textMuted }]}>
            {live ? 'NOW' : formatTime(entry.start)}
          </Text>
        ) : null}
        <Text
          numberOfLines={roomy ? 3 : medium ? 2 : 1}
          style={[
            medium ? theme.type.bodySm : theme.type.label,
            { color: theme.colors.text, fontWeight: '600' },
          ]}
        >
          {entry.title}
        </Text>
        {roomy && entry.combined ? (
          <Text
            numberOfLines={1}
            style={[theme.type.label, { color: theme.colors.textMuted, fontWeight: '400' }]}
          >
            Combined bill
          </Text>
        ) : null}
      </Pressable>

      {/* Icon-only save control, kept off the card's own press area. */}
      {showHeart ? (
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={
            saved ? `Remove ${entry.title} from My Weekend` : `Add ${entry.title} to My Weekend`
          }
          hitSlop={theme.hitSlop}
          // A full 44pt box, not just the 16pt glyph: `hitSlop` is honoured on
          // native but ignored by react-native-web, so the target has to be
          // real for the web build to clear the minimum too.
          style={({ pressed }) => ({
            position: 'absolute',
            top: 0,
            right: 0,
            width: minTouchTarget,
            height: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? opacity.pressed : 1,
          })}
        >
          <Heart
            size={theme.space.lg}
            color={saved ? theme.colors.accent : theme.colors.textMuted}
            fill={saved ? theme.colors.accent : 'transparent'}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
