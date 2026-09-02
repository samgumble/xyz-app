import { Heart } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { minTouchTarget, opacity, useTheme } from '@/theme';

import { useEntryFavorite } from './hooks';
import type { ScheduleEntry } from './model';

export interface FavoriteButtonProps {
  entry: ScheduleEntry;
  /** Smaller variant for the dense grid cards. */
  compact?: boolean;
  testID?: string;
}

/**
 * The one add/remove-from-My-Weekend control. Icon only, so it carries a label
 * that names the act; the fill state is also announced via `selected`.
 */
export function FavoriteButton({ entry, compact = false, testID }: FavoriteButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const { saved, toggle } = useEntryFavorite(entry);

  const size = compact ? theme.space.lg : theme.space.xl;
  const box = compact ? theme.space.xl : minTouchTarget;

  return (
    <Pressable
      testID={testID}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={
        saved ? `Remove ${entry.title} from My Weekend` : `Add ${entry.title} to My Weekend`
      }
      // Expands the touch area past the drawn box so even the compact grid
      // control clears the 44pt minimum.
      hitSlop={compact ? theme.hitSlop : theme.hitSlop / 2}
      style={({ pressed }) => (pressed ? { opacity: opacity.pressed } : undefined)}
    >
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
        <Heart
          size={size}
          color={saved ? theme.colors.accent : theme.colors.textMuted}
          fill={saved ? theme.colors.accent : 'transparent'}
        />
      </View>
    </Pressable>
  );
}
