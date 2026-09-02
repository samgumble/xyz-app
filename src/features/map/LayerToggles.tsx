import React from 'react';
import { ScrollView } from 'react-native';

import { Chip } from '@/components';
import { useTheme } from '@/theme';

import {
  layerColor,
  MAP_LAYERS,
  type LayerId,
  type LayerState,
} from './layers';

export interface LayerTogglesProps {
  state: LayerState;
  counts: Record<LayerId, number>;
  onToggle: (id: LayerId) => void;
  onShowAll: () => void;
}

/**
 * Five toggles, not twelve. Each one carries the number of pins it controls so
 * turning something off is a visible trade rather than a guess, and a "Show
 * all" chip appears only when something is actually hidden.
 */
export function LayerToggles({
  state,
  counts,
  onToggle,
  onShowAll,
}: LayerTogglesProps): React.JSX.Element {
  const { theme } = useTheme();
  const anyHidden = MAP_LAYERS.some((layer) => !state[layer.id]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: theme.space.sm,
        paddingHorizontal: theme.space.lg,
        paddingVertical: theme.space.xs,
      }}
      accessibilityLabel="Map layers"
    >
      {MAP_LAYERS.map((layer) => (
        <Chip
          key={layer.id}
          label={`${layer.label} (${counts[layer.id]})`}
          selected={state[layer.id]}
          color={layerColor(theme, layer.id)}
          onPress={() => onToggle(layer.id)}
          testID={`map-layer-${layer.id}`}
        />
      ))}
      {anyHidden ? <Chip label="Show all" onPress={onShowAll} testID="map-layer-show-all" /> : null}
    </ScrollView>
  );
}
