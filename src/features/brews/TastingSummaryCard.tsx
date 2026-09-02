import { Star } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components';
import { useTheme } from '@/theme';

import type { TastingSummaryData } from './model';

export interface TastingSummaryCardProps {
  summary: TastingSummaryData;
  testID?: string;
}

/** The recap: how far through the bill you got, and how you scored it. */
export function TastingSummaryCard({ summary, testID }: TastingSummaryCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const average = summary.averageRating;

  return (
    <Card testID={testID} style={{ gap: theme.space.md }}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${summary.tried} of ${summary.total} logged. ${
          average === undefined ? 'No ratings yet.' : `Average rating ${average.toFixed(1)} out of 5.`
        }`}
        style={{ flexDirection: 'row', gap: theme.space.xl, flexWrap: 'wrap' }}
      >
        <View style={{ gap: theme.space.xs }}>
          <Text style={[theme.type.display, { color: theme.colors.text }]}>{summary.tried}</Text>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
            tried of {summary.total}
          </Text>
        </View>

        <View style={{ gap: theme.space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
            <Text style={[theme.type.display, { color: theme.colors.text }]}>
              {average === undefined ? '—' : average.toFixed(1)}
            </Text>
            {average === undefined ? null : (
              <Star size={theme.space.xl} color={theme.colors.primary} fill={theme.colors.primary} />
            )}
          </View>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
            {average === undefined
              ? 'no ratings yet'
              : `average of ${summary.rated} ${summary.rated === 1 ? 'rating' : 'ratings'}`}
          </Text>
        </View>
      </View>

      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
        {summary.breweriesTried} {summary.breweriesTried === 1 ? 'brewery' : 'breweries'} ·{' '}
        {summary.beersTried} named {summary.beersTried === 1 ? 'beer' : 'beers'}
      </Text>
    </Card>
  );
}
