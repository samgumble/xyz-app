import { Check, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAppStore, type TastingEntry } from '@/store/useAppStore';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';

import type { TastingSubject } from './model';

const RATINGS = [1, 2, 3, 4, 5] as const;

export interface TastingControlsProps {
  subject: TastingSubject;
  /** Compact hides the note field — used inside long lists. */
  compact?: boolean;
}

/**
 * Mark tried, rate it, write a line about it.
 *
 * Everything writes straight through `setTasting`, which is persisted, so a
 * phone that dies in the Beer Garden loses nothing. Rating something implies
 * you tried it; clearing wipes the whole entry rather than leaving a rated
 * beer marked untried.
 */
export function TastingControls({ subject, compact = false }: TastingControlsProps): React.JSX.Element {
  const { theme } = useTheme();
  const entry = useAppStore((s): TastingEntry | undefined => s.tasting[subject.key]);
  const setTasting = useAppStore((s) => s.setTasting);

  const tried = entry?.tried === true;
  const rating = entry?.rating ?? 0;
  const note = entry?.note ?? '';
  const hasEntry = tried || rating > 0 || note.length > 0;

  const kindWord = subject.kind === 'brewery' ? 'brewery' : 'beer';

  return (
    <View style={{ gap: theme.space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, flexWrap: 'wrap' }}>
        <Pressable
          onPress={() => setTasting(subject.key, { tried: !tried })}
          accessibilityRole="checkbox"
          accessibilityLabel={`Tried ${subject.name}`}
          accessibilityState={{ checked: tried }}
          testID={`tasting-tried-${subject.key}`}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.sm,
              minHeight: minTouchTarget,
              paddingHorizontal: theme.space.md,
              borderRadius: theme.radius.pill,
              borderWidth: borderWidth.hairline,
              borderColor: tried ? theme.colors.success : theme.colors.border,
              backgroundColor: tried ? theme.colors.success : theme.colors.surface,
            },
            pressed ? { opacity: opacity.pressed } : null,
          ]}
        >
          <Check
            size={theme.space.lg}
            color={tried ? theme.colors.accentText : theme.colors.textMuted}
          />
          <Text
            style={[
              theme.type.label,
              { color: tried ? theme.colors.accentText : theme.colors.text },
            ]}
          >
            {tried ? 'Tried' : 'Mark tried'}
          </Text>
        </Pressable>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`Rating for ${subject.name}, out of 5`}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {RATINGS.map((value) => {
            const active = rating >= value;
            return (
              <Pressable
                key={value}
                onPress={() =>
                  setTasting(subject.key, value === rating ? { rating: 0 } : { rating: value, tried: true })
                }
                accessibilityRole="radio"
                accessibilityLabel={`${value} out of 5`}
                accessibilityState={{ selected: rating === value }}
                testID={`tasting-rate-${subject.key}-${value}`}
                style={({ pressed }) => [
                  {
                    width: minTouchTarget,
                    height: minTouchTarget,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pressed ? { opacity: opacity.pressed } : null,
                ]}
              >
                <Star
                  size={theme.space.xl}
                  color={active ? theme.colors.primary : theme.colors.textMuted}
                  fill={active ? theme.colors.primary : 'none'}
                />
              </Pressable>
            );
          })}
        </View>

        {hasEntry ? (
          <Pressable
            onPress={() => setTasting(subject.key, { tried: false, rating: 0, note: '' })}
            accessibilityRole="button"
            accessibilityLabel={`Clear your notes on ${subject.name}`}
            hitSlop={theme.hitSlop}
            testID={`tasting-clear-${subject.key}`}
            style={({ pressed }) => [
              {
                width: minTouchTarget,
                height: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed ? { opacity: opacity.pressed } : null,
            ]}
          >
            <Trash2 size={theme.space.lg} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {compact ? null : (
        <View style={{ gap: theme.space.xs }}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
            Your note on this {kindWord}
          </Text>
          <TextInput
            value={note}
            onChangeText={(next) => setTasting(subject.key, { note: next })}
            placeholder="Hazy, grapefruit, would queue again"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={`Tasting note for ${subject.name}`}
            multiline
            testID={`tasting-note-${subject.key}`}
            style={[
              theme.type.body,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.md,
                borderWidth: borderWidth.hairline,
                borderColor: theme.colors.border,
                padding: theme.space.md,
                minHeight: minTouchTarget * 2,
                textAlignVertical: 'top',
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}
