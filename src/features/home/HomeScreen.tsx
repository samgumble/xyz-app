import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card, Screen, SectionHeader } from '@/components';
import { getArtists, getFestival, getInfoPages, getSets, getStage } from '@/data/repository';
import {
  formatCountdown,
  formatDayLabel,
  formatShortDayLabel,
  formatTime,
  toFestivalDay,
} from '@/data/time';
import { AnnouncementBanner } from '@/features/announcements';
import { NavRow, ProvenanceNote, RowGroup } from '@/features/info';
import { useTheme } from '@/theme';

import { CountdownHero } from './CountdownHero';
import { HeadlinerRow } from './HeadlinerRow';
import { ClubSetRow, NowPlayingCard, UpNextCard } from './SetCards';
import { WeekendPreview } from './WeekendPreview';
import {
  deviceIsAwayFromFestival,
  festivalDateRangeLabel,
  festivalPhase,
  getFestivalWindow,
} from './festivalPhase';
import { selectHomeSets } from './homeModel';
import { useNow } from './useNow';

/** How many info pages to promote on the pre-festival screen. */
const PREP_PAGE_COUNT = 4;

export interface HomeScreenProps {
  /** Injectable clock, for tests. Live rendering uses the ticking one. */
  at?: Date;
}

/**
 * Home answers "what is on now, what is next, where am I going" — but only
 * during the three days a year when that question has an answer. The rest of
 * the time it answers "when is it, who is playing, and what should I read
 * first", which is the state this build will be reviewed in.
 */
export function HomeScreen({ at }: HomeScreenProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const ticking = useNow();
  const now = at ?? ticking;

  const festival = getFestival();
  const festivalWindow = useMemo(() => getFestivalWindow(), []);
  const phase = festivalPhase(now, festivalWindow);

  const { live, upNext, soonest, clubs } = useMemo(() => selectHomeSets(now), [now]);

  const prepPages = useMemo(() => getInfoPages().slice(0, PREP_PAGE_COUNT), []);
  const today = toFestivalDay(now);
  const away = deviceIsAwayFromFestival(now);

  const contextLine = ((): string => {
    if (phase === 'during') return `${formatDayLabel(now)} · ${formatTime(now)} in Telluride`;
    if (phase === 'after') return `${festival.edition} · ${festivalDateRangeLabel()}`;
    return festivalDateRangeLabel();
  })();

  return (
    <Screen scroll={false} testID="screen-home">
      <AnnouncementBanner at={now} testID="home-announcement-banner" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.space.xxl }}
      >
        <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text }]}>
          {festival.name}
        </Text>
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
          {contextLine}
        </Text>
        {away ? (
          <Text style={[theme.type.label, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
            Your device is on a different clock — every time here is Telluride time.
          </Text>
        ) : null}

        {phase === 'during' ? (
          <>
            <SectionHeader title="Happening now" subtitle="One card per stage with something on." />
            <View accessibilityLiveRegion="polite" testID="home-happening-now">
              {live.length > 0 ? (
                live.map((set) => <NowPlayingCard key={set.id} set={set} at={now} />)
              ) : (
                <Card accessibilityRole="summary">
                  <Text style={[theme.type.h3, { color: theme.colors.text }]}>
                    Nothing on stage right now
                  </Text>
                  <Text style={[theme.type.body, { color: theme.colors.textMuted, marginTop: theme.space.sm }]}>
                    {soonest
                      ? `Music resumes ${formatCountdown(soonest.start, now)} — ${formatShortDayLabel(soonest.start)} at ${formatTime(soonest.start)}, ${getStage(soonest.stage)?.name ?? soonest.stage}.`
                      : 'The weekend’s scheduled sets are finished.'}
                  </Text>
                </Card>
              )}
            </View>

            {upNext.length > 0 ? (
              <>
                <SectionHeader title="Up next" subtitle="The following set on each stage." />
                <View accessibilityLiveRegion="polite" testID="home-up-next">
                  {upNext.map((set) => (
                    <UpNextCard key={set.id} set={set} at={now} />
                  ))}
                </View>
              </>
            ) : soonest && live.length > 0 ? (
              <>
                <SectionHeader title="Up next" />
                <UpNextCard set={soonest} at={now} showDay />
              </>
            ) : null}

            {clubs.length > 0 ? (
              <>
                <SectionHeader
                  title="Tonight at the clubs"
                  subtitle="Late-night shows in town, after the park closes."
                />
                <View testID="home-clubs-tonight">
                  {clubs.map((set, index) => (
                    <ClubSetRow key={set.id} set={set} at={now} first={index === 0} />
                  ))}
                </View>
                <ProvenanceNote
                  title="Late-night end times are placeholders"
                  lines={[
                    'The festival publishes start times for the club shows but not end times. Every late-night set in this build carries a 90-minute placeholder finish.',
                  ]}
                  style={{ marginTop: theme.space.md }}
                />
              </>
            ) : null}

            <SectionHeader title="The rest of the weekend" />
            <WeekendPreview highlightDay={today} />
          </>
        ) : null}

        {phase === 'before' ? (
          <>
            <View style={{ marginTop: theme.space.lg }}>
              <CountdownHero festivalWindow={festivalWindow} at={now} testID="home-countdown" />
            </View>

            <SectionHeader title="Headliners" subtitle="Who closes each night." />
            <HeadlinerRow testID="home-headliners" />

            <SectionHeader
              title="What the weekend holds"
              subtitle={`${getSets().length} sets · ${getArtists().length} artists on the bill.`}
            />
            <WeekendPreview testID="home-weekend-preview" />

            {prepPages.length > 0 ? (
              <>
                <SectionHeader title="Read this first" subtitle="The pages people ask about every year." />
                <RowGroup testID="home-prep-pages">
                  {prepPages.map((page, index) => (
                    <NavRow
                      key={page.slug}
                      first={index === 0}
                      label={page.title}
                      onPress={() => {
                        router.push({ pathname: '/info/[slug]', params: { slug: page.slug } });
                      }}
                    />
                  ))}
                </RowGroup>
              </>
            ) : null}
          </>
        ) : null}

        {phase === 'after' ? (
          <>
            <SectionHeader title="That’s a wrap" />
            <Card accessibilityRole="summary">
              <Text style={[theme.type.h2, { color: theme.colors.text }]}>
                {festival.edition} is over
              </Text>
              <Text style={[theme.type.body, { color: theme.colors.textMuted, marginTop: theme.space.sm }]}>
                {getSets().length} sets, {getArtists().length} artists, {festivalDateRangeLabel()} at{' '}
                {festival.venue.name}. The schedule and lineup stay in the app so you can look back at what
                you saw.
              </Text>
            </Card>

            <SectionHeader title="The weekend, day by day" />
            <WeekendPreview />
          </>
        ) : null}

        <SectionHeader title="Elsewhere in the app" />
        <RowGroup>
          <NavRow
            first
            label="My Weekend"
            description="Your saved sets and any clashes between them."
            onPress={() => {
              router.push('/weekend');
            }}
          />
          <NavRow
            label="Announcements, info and settings"
            description="Festival notices, the FAQ, tickets, camping and more."
            onPress={() => {
              router.push('/more');
            }}
          />
        </RowGroup>

        <ProvenanceNote
          title="Preview build"
          lines={[
            'Content is a snapshot of tellurideblues.com taken on 1 September 2026, bundled for offline use. There is no live weather, gondola status or push notification in this build.',
            'The full list of data caveats is in More → About this build.',
          ]}
          style={{ marginTop: theme.space.xl }}
        />
      </ScrollView>
    </Screen>
  );
}
