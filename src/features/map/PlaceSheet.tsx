import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Badge } from '@/components';
import { getVendorsForPlace } from '@/data/repository';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Place } from '@/types/content';

import { isApproximatePlace } from './geometry';
import { findLayer, kindLabel, layerColor, layerFor } from './layers';

export interface PlaceSheetProps {
  place: Place | undefined;
  onClose: () => void;
}

/**
 * What a pin actually is.
 *
 * The `note` is the point of this sheet — it is where the festival's own
 * wording lives (hours, prices, "charcoal prohibited", "this pin is
 * provisional") and it is shown in full rather than trimmed. A place whose note
 * admits the position is not published says so above the fold, in its own
 * callout, not in small print underneath.
 */
export function PlaceSheet({ place, onClose }: PlaceSheetProps): React.JSX.Element {
  const { theme } = useTheme();
  const layer = place ? findLayer(layerFor(place)) : undefined;
  const color = place ? layerColor(theme, layerFor(place)) : theme.colors.border;
  const approximate = place ? isApproximatePlace(place) : false;
  const vendors = place ? getVendorsForPlace(place.id) : [];

  return (
    <Modal
      visible={place !== undefined}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close place details"
          style={{ flex: 1 }}
        />
        <View
          style={{
            maxHeight: '75%',
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            borderTopWidth: borderWidth.thick,
            borderTopColor: color,
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.lg,
            paddingBottom: theme.space.xxl,
          }}
        >
          {place ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: theme.space.md,
                  marginBottom: theme.space.md,
                }}
              >
                <View style={{ flex: 1, gap: theme.space.sm }}>
                  <Text accessibilityRole="header" style={[theme.type.h2, { color: theme.colors.text }]}>
                    {place.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
                    <Badge label={kindLabel(place.kind)} tone="custom" color={color} />
                    {layer ? <Badge label={layer.label} /> : null}
                  </View>
                </View>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={theme.hitSlop}
                  style={({ pressed }) => [
                    {
                      minWidth: minTouchTarget,
                      minHeight: minTouchTarget,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    pressed ? { opacity: opacity.pressed } : null,
                  ]}
                >
                  <X size={theme.space.xl} color={theme.colors.textMuted} />
                </Pressable>
              </View>

              {approximate ? (
                <View
                  accessibilityRole="alert"
                  style={{
                    borderRadius: theme.radius.md,
                    borderWidth: borderWidth.hairline,
                    borderColor: theme.colors.warning,
                    backgroundColor: theme.colors.surfaceAlt,
                    padding: theme.space.md,
                    marginBottom: theme.space.md,
                  }}
                >
                  <Text style={[theme.type.label, { color: theme.colors.warning }]}>
                    Position not published
                  </Text>
                  <Text style={[theme.type.bodySm, { color: theme.colors.text, marginTop: theme.space.xs }]}>
                    The festival has not said where this is on the grounds. The pin is a guess — ask at
                    the Information Station or listen for the stage announcements.
                  </Text>
                </View>
              ) : null}

              <ScrollView contentContainerStyle={{ gap: theme.space.md }}>
                {place.note ? (
                  <Text style={[theme.type.body, { color: theme.colors.text }]}>{place.note}</Text>
                ) : (
                  <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
                    The festival publishes no further detail about this location.
                  </Text>
                )}

                {place.kind === 'food' ? (
                  <View style={{ gap: theme.space.xs }}>
                    <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Vendors here</Text>
                    {vendors.length > 0 ? (
                      vendors.map((vendor) => (
                        <Text key={vendor.id} style={[theme.type.body, { color: theme.colors.text }]}>
                          {vendor.name}
                        </Text>
                      ))
                    ) : (
                      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                        The festival does not publish a vendor list, so this app has no names to show.
                        Expect food and craft stalls here.
                      </Text>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
