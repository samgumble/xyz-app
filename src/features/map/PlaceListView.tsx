import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Badge, EmptyState, SectionHeader } from '@/components';
import { getVendors } from '@/data/repository';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Place } from '@/types/content';

import { isApproximatePlace } from './geometry';
import { kindLabel, layerColor, layerFor, MAP_LAYERS, type LayerState } from './layers';

export interface PlaceListViewProps {
  places: readonly Place[];
  layers: LayerState;
  onSelectPlace: (place: Place) => void;
}

/**
 * The non-visual path through the same data.
 *
 * A pin on an SVG is a poor target for a screen reader and a poor target for
 * anyone whose hands are full of a beer and a camp chair, so every place is
 * also a plain row here, grouped by the same five layers and filtered by the
 * same toggles. It is a peer of the map, not a fallback.
 */
export function PlaceListView({
  places,
  layers,
  onSelectPlace,
}: PlaceListViewProps): React.JSX.Element {
  const { theme } = useTheme();
  const vendors = getVendors();

  const visible = MAP_LAYERS.filter((layer) => layers[layer.id]);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: theme.space.lg,
        paddingBottom: theme.space.xxl,
      }}
      testID="map-list"
    >
      {visible.length === 0 ? (
        <EmptyState
          title="Every layer is switched off"
          message="Turn a layer back on above to see the places on it."
        />
      ) : null}

      {visible.map((layer) => {
        const rows = places.filter((place) => layerFor(place) === layer.id);
        if (rows.length === 0) return null;
        const color = layerColor(theme, layer.id);

        return (
          <View key={layer.id}>
            <SectionHeader title={layer.label} subtitle={layer.description} />
            <View
              style={{
                borderRadius: theme.radius.md,
                borderWidth: borderWidth.hairline,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                overflow: 'hidden',
              }}
            >
              {rows.map((place, index) => {
                const approximate = isApproximatePlace(place);
                return (
                  <Pressable
                    key={place.id}
                    onPress={() => onSelectPlace(place)}
                    accessibilityRole="button"
                    accessibilityLabel={`${place.name}. ${kindLabel(place.kind)}.${
                      approximate ? ' Position not published.' : ''
                    }`}
                    accessibilityHint="Opens the details for this place."
                    testID={`map-list-row-${place.id}`}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.space.md,
                        minHeight: minTouchTarget,
                        paddingVertical: theme.space.md,
                        paddingHorizontal: theme.space.lg,
                        borderTopWidth: index === 0 ? 0 : borderWidth.hairline,
                        borderTopColor: theme.colors.border,
                      },
                      pressed ? { opacity: opacity.pressed } : null,
                    ]}
                  >
                    <View
                      style={{
                        width: theme.space.md,
                        height: theme.space.md,
                        borderRadius: theme.radius.pill,
                        backgroundColor: color,
                      }}
                    />
                    <View style={{ flex: 1, gap: theme.space.xs }}>
                      <Text style={[theme.type.body, { color: theme.colors.text }]}>{place.name}</Text>
                      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                        {kindLabel(place.kind)}
                      </Text>
                    </View>
                    {approximate ? <Badge label="Approx." tone="warning" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <SectionHeader
        title="Food & craft vendors"
        subtitle="Who is trading on the grounds this year"
      />
      {vendors.length === 0 ? (
        <EmptyState
          title="No vendor list is published"
          message="The festival names its breweries but not its food and craft vendors, so there is nothing here to list. The vendor area itself is pinned on the map under Beer and food."
          testID="map-vendors-empty"
        />
      ) : (
        <View style={{ gap: theme.space.sm }}>
          {vendors.map((vendor) => (
            <Text key={vendor.id} style={[theme.type.body, { color: theme.colors.text }]}>
              {vendor.name}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
