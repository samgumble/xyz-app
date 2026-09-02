import { Beer } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components';
import { borderWidth, useTheme } from '@/theme';

import { sessionTicketFacts } from './model';

export interface AgeGateProps {
  onAcknowledge: () => void;
}

/**
 * The 21+ gate.
 *
 * It is a gate, not a banner: nothing about the beer — not the brewery list,
 * not the session times, not the tasting log — renders behind it, and the only
 * way past is the affirmative button. Once taken, the answer is stored in
 * settings and the gate never appears again.
 *
 * The wording under the heading is the festival's own rule, read out of the
 * info pages rather than paraphrased here.
 */
export function AgeGate({ onAcknowledge }: AgeGateProps): React.JSX.Element {
  const { theme } = useTheme();
  const [declined, setDeclined] = useState(false);
  const facts = sessionTicketFacts();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        padding: theme.space.lg,
        gap: theme.space.lg,
        flexGrow: 1,
        justifyContent: 'center',
      }}
      testID="brews-age-gate"
    >
      <View
        style={{
          gap: theme.space.md,
          padding: theme.space.xl,
          borderRadius: theme.radius.lg,
          borderWidth: borderWidth.hairline,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Beer size={theme.space.xxl} color={theme.colors.accent} accessibilityLabel="Brews" />

        <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text }]}>
          This section is 21+
        </Text>

        <Text style={[theme.type.body, { color: theme.colors.text }]}>
          The Brewers Showcase is a beer festival inside a music festival. Confirm you are 21 or older
          to see the tasting sessions, the brewery list and your tasting log.
        </Text>

        {facts.blurb ? (
          <View
            style={{
              padding: theme.space.md,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surfaceAlt,
              gap: theme.space.xs,
            }}
          >
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
              The festival&rsquo;s rule
            </Text>
            <Text style={[theme.type.bodySm, { color: theme.colors.text }]}>{facts.blurb}</Text>
          </View>
        ) : null}

        {declined ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              padding: theme.space.md,
              borderRadius: theme.radius.md,
              borderWidth: borderWidth.hairline,
              borderColor: theme.colors.border,
              gap: theme.space.xs,
            }}
          >
            <Text style={[theme.type.body, { color: theme.colors.text }]}>
              No problem — this tab stays closed.
            </Text>
            <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
              Everything else in the app is open to everyone: the schedule, the lineup, the map, the
              Rainbow Kids Area and the free drinking water stations.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: theme.space.sm, marginTop: theme.space.sm }}>
          <Button
            label="I am 21 or older"
            onPress={onAcknowledge}
            fullWidth
            accessibilityHint="Unlocks the Brewers Showcase, brewery list and tasting log."
            testID="brews-age-confirm"
          />
          <Button
            label="I am not"
            variant="secondary"
            onPress={() => setDeclined(true)}
            fullWidth
            accessibilityHint="Keeps this tab closed."
            testID="brews-age-decline"
          />
        </View>

        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
          Your answer is stored on this device only. Nothing is sent anywhere, and it is not proof of
          age — the festival checks photo ID at the tasting sessions.
        </Text>
      </View>
    </ScrollView>
  );
}
