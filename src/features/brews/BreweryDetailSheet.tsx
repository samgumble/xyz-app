import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Badge, Divider } from '@/components';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Brewery } from '@/types/content';

import { TastingControls } from './TastingControls';
import { beerSubjectsForBrewery, breweryLocation, subjectForBrewery } from './model';

export interface BreweryDetailSheetProps {
  brewery: Brewery | undefined;
  onClose: () => void;
}

/**
 * A brewery and everything you can record about it.
 *
 * The location line carries its own caveat: the festival does not publish where
 * its breweries are from, so every city in the snapshot is inferred. Saying so
 * once, here, is better than printing it as though it were checked.
 */
export function BreweryDetailSheet({
  brewery,
  onClose,
}: BreweryDetailSheetProps): React.JSX.Element {
  const { theme } = useTheme();
  const location = brewery ? breweryLocation(brewery) : undefined;
  const beers = brewery ? beerSubjectsForBrewery(brewery.id) : [];

  return (
    <Modal
      visible={brewery !== undefined}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close brewery details"
          style={{ flex: 1 }}
        />
        <View
          style={{
            maxHeight: '85%',
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            borderTopWidth: borderWidth.thick,
            borderTopColor: theme.colors.accent,
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.lg,
            paddingBottom: theme.space.xxl,
          }}
        >
          {brewery ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md }}>
                <View style={{ flex: 1, gap: theme.space.xs }}>
                  <Text accessibilityRole="header" style={[theme.type.h2, { color: theme.colors.text }]}>
                    {brewery.name}
                  </Text>
                  <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                    {location ?? 'Location not published'}
                  </Text>
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

              <ScrollView contentContainerStyle={{ gap: theme.space.lg, paddingTop: theme.space.md }}>
                {location ? (
                  <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
                    The festival does not publish brewery locations — this one is inferred and
                    unverified.
                  </Text>
                ) : null}

                <TastingControls subject={subjectForBrewery(brewery)} />

                <Divider />

                <View style={{ gap: theme.space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
                    <Text accessibilityRole="header" style={[theme.type.h3, { color: theme.colors.text }]}>
                      Named beers
                    </Text>
                    <Badge label={`${beers.length}`} />
                  </View>

                  {beers.length === 0 ? (
                    <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                      This brewery&rsquo;s pour list is not published in advance. Rate the brewery above,
                      and put what you actually drank in the note.
                    </Text>
                  ) : (
                    beers.map((beer) => (
                      <View
                        key={beer.key}
                        style={{
                          gap: theme.space.sm,
                          padding: theme.space.md,
                          borderRadius: theme.radius.md,
                          borderWidth: borderWidth.hairline,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surfaceAlt,
                        }}
                      >
                        <Text style={[theme.type.body, { color: theme.colors.text }]}>{beer.name}</Text>
                        {beer.detail ? (
                          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                            {beer.detail}
                          </Text>
                        ) : null}
                        <TastingControls subject={beer} compact />
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
