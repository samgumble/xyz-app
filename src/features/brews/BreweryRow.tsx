import { Check, Star } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppStore, type TastingEntry } from '@/store/useAppStore';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Brewery } from '@/types/content';

import { breweryLocation } from './model';
import { breweryTastingKey } from './tastingKeys';

export interface BreweryRowProps {
  brewery: Brewery;
  beerCount: number;
  onPress: (brewery: Brewery) => void;
  first?: boolean;
}

/** One brewery in the list, with whatever you have already logged about it. */
export function BreweryRow({
  brewery,
  beerCount,
  onPress,
  first = false,
}: BreweryRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const key = breweryTastingKey(brewery.id);
  const entry = useAppStore((s): TastingEntry | undefined => s.tasting[key]);

  const location = breweryLocation(brewery);
  const tried = entry?.tried === true;
  const rating = entry?.rating ?? 0;

  const state = tried
    ? rating > 0
      ? `Tried, rated ${rating} out of 5.`
      : 'Tried.'
    : 'Not logged yet.';

  return (
    <Pressable
      onPress={() => onPress(brewery)}
      accessibilityRole="button"
      accessibilityLabel={`${brewery.name}. ${location ?? 'Location not published'}. ${state}`}
      accessibilityHint="Opens the brewery, its beers and your tasting notes."
      testID={`brewery-row-${brewery.id}`}
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
      <View style={{ flex: 1, gap: theme.space.xs }}>
        <Text style={[theme.type.body, { color: theme.colors.text }]}>{brewery.name}</Text>
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
          {location ?? 'Location not published'}
          {beerCount > 0 ? ` · ${beerCount} named ${beerCount === 1 ? 'beer' : 'beers'}` : ''}
        </Text>
      </View>

      {tried ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
          {rating > 0 ? (
            <>
              <Text style={[theme.type.label, { color: theme.colors.text }]}>{rating}</Text>
              <Star size={theme.space.lg} color={theme.colors.primary} fill={theme.colors.primary} />
            </>
          ) : (
            <Check size={theme.space.lg} color={theme.colors.success} />
          )}
        </View>
      ) : null}
    </Pressable>
  );
}
