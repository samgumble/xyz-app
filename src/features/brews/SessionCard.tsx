import React from 'react';
import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import { formatTimeRange } from '@/data/time';
import { useTheme } from '@/theme';
import type { ShowcaseSession } from '@/types/content';

import { beersForSession, isRareSession } from './model';

export interface SessionCardProps {
  session: ShowcaseSession;
  testID?: string;
}

/**
 * One of the four Brewers Showcase tasting sessions.
 *
 * The rare-and-barrel-aged flag is read off the session name, not its id. The
 * pour list is short because the festival only ever names two beers — the card
 * says so rather than leaving an empty-looking section.
 */
export function SessionCard({ session, testID }: SessionCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const rare = isRareSession(session);
  const pours = beersForSession(session.id);

  return (
    <Card
      accentColor={rare ? theme.colors.primary : theme.colors.stageShowcase}
      testID={testID}
      style={{ gap: theme.space.sm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flexWrap: 'wrap' }}>
        <Text style={[theme.type.mono, { color: theme.colors.text }]}>
          {formatTimeRange(session)}
        </Text>
        {rare ? <Badge label="Rare & barrel-aged" tone="custom" color={theme.colors.primary} /> : null}
      </View>

      <Text accessibilityRole="header" style={[theme.type.h3, { color: theme.colors.text }]}>
        {session.name}
      </Text>

      {rare ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.text }]}>
          The one session built around rare and barrel-aged pours. If you are only doing one, this is the
          one people queue for.
        </Text>
      ) : null}

      <View style={{ gap: theme.space.xs, marginTop: theme.space.xs }}>
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Named pours</Text>
        {pours.length > 0 ? (
          pours.map((beer) => (
            <Text key={beer.id} style={[theme.type.bodySm, { color: theme.colors.text }]}>
              {beer.name} · {beer.style} · {beer.abv}% ABV
            </Text>
          ))
        ) : (
          <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
            No specific pours are published for this session.
          </Text>
        )}
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
          The festival names only these beers in advance. The rest of the pour list is announced at the
          tables — log it against the brewery.
        </Text>
      </View>
    </Card>
  );
}
