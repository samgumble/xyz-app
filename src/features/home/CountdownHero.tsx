import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components';
import { getFestival } from '@/data/repository';
import { formatDayLabel, formatTime } from '@/data/time';
import { borderWidth, useTheme } from '@/theme';

import {
  countdownSpeech,
  countdownTo,
  festivalDateRangeLabel,
  type FestivalWindow,
} from './festivalPhase';

export interface CountdownHeroProps {
  festivalWindow: FestivalWindow;
  at: Date;
  testID?: string;
}

/**
 * The screen the client will see. Months out from the festival there is
 * nothing playing, so Home leads with the thing that is actually true: how
 * long until the music starts, when and where it is, and two ways in.
 */
export function CountdownHero({ festivalWindow, at, testID }: CountdownHeroProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const festival = getFestival();

  const target = festivalWindow.firstOfficialSet?.start ?? festivalWindow.opensISO;
  const countdown = target ? countdownTo(target, at) : undefined;

  const bigNumber = ((): { value: string; unit: string } => {
    if (!countdown) return { value: '—', unit: 'dates to be confirmed' };
    if (countdown.days > 0) {
      return { value: String(countdown.days), unit: countdown.days === 1 ? 'day to go' : 'days to go' };
    }
    if (countdown.hours > 0) {
      return { value: String(countdown.hours), unit: countdown.hours === 1 ? 'hour to go' : 'hours to go' };
    }
    return {
      value: String(countdown.minutes),
      unit: countdown.minutes === 1 ? 'minute to go' : 'minutes to go',
    };
  })();

  const detail = ((): string | undefined => {
    if (!countdown) return undefined;
    if (countdown.days > 0) {
      return `plus ${countdown.hours} hr ${countdown.minutes} min`;
    }
    if (countdown.hours > 0) return `plus ${countdown.minutes} min`;
    return undefined;
  })();

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={
        countdown
          ? `${countdownSpeech(countdown)} until the first set of ${festival.name}, ${festivalDateRangeLabel()}.`
          : `${festival.name}. Dates to be confirmed.`
      }
      style={{
        backgroundColor: theme.colors.surface,
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        borderLeftWidth: borderWidth.thick + borderWidth.hairline,
        borderLeftColor: theme.colors.accent,
        borderRadius: theme.radius.lg,
        padding: theme.space.xl,
      }}
    >
      <Text style={[theme.type.label, { color: theme.colors.accent }]}>{festival.edition.toUpperCase()}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.space.md, marginTop: theme.space.sm }}>
        <Text style={[theme.type.display, { color: theme.colors.text }]}>{bigNumber.value}</Text>
        <Text style={[theme.type.h3, { color: theme.colors.textMuted, flexShrink: 1 }]}>{bigNumber.unit}</Text>
      </View>
      {detail ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>{detail}</Text>
      ) : null}

      <Text style={[theme.type.body, { color: theme.colors.text, marginTop: theme.space.lg }]}>
        {festivalDateRangeLabel()}
      </Text>
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        {festival.venue.name}
      </Text>

      {festivalWindow.firstOfficialSet ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.sm }]}>
          First set of the weekend: {formatTime(festivalWindow.firstOfficialSet.start)} Telluride time.
        </Text>
      ) : null}

      {festivalWindow.preFestival.length > 0 && festivalWindow.opensISO ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
          {festivalWindow.preFestival.length} pre-festival {festivalWindow.preFestival.length === 1 ? 'event' : 'events'} start
          earlier, on {formatDayLabel(festivalWindow.opensISO)}.
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.xl, flexWrap: 'wrap' }}>
        <Button
          label="Full schedule"
          onPress={() => {
            router.push('/schedule');
          }}
          accessibilityHint="Every set time, by day"
        />
        <Button
          label="Lineup"
          variant="secondary"
          onPress={() => {
            router.push('/lineup');
          }}
          accessibilityHint="Every artist playing this year"
        />
      </View>
    </View>
  );
}
