import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Badge, Card, EmptyState, LoadingState, SectionHeader } from '@/components';
import { getBeersForBrewery, getBrewery } from '@/data/repository';
import { formatDayLabel } from '@/data/time';
import { useAppStore, type TastingEntry } from '@/store/useAppStore';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Brewery } from '@/types/content';

import { AgeGate } from './AgeGate';
import { BreweryDetailSheet } from './BreweryDetailSheet';
import { BreweryRow } from './BreweryRow';
import { BrewsSearchField } from './BrewsSearchField';
import { SessionCard } from './SessionCard';
import { TastingSummaryCard } from './TastingSummaryCard';
import {
  searchBreweries,
  sessionsByDay,
  sessionTicketFacts,
  showcasePlace,
  summariseTasting,
  triedSubjects,
  untriedSubjects,
  type TastingSubject,
} from './model';

type BrewsTab = 'sessions' | 'breweries' | 'log';

const TABS: { id: BrewsTab; label: string }[] = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'breweries', label: 'Breweries' },
  { id: 'log', label: 'My log' },
];

/**
 * The Brews tab: the Brewers Showcase, the brewery bill, and a tasting log.
 *
 * Behind a real 21+ gate. The log is driven by breweries rather than beers,
 * because the festival names 25 of the first and 2 of the second — a beer-only
 * log would be a feature you could finish in ten minutes and then never use.
 */
export function BrewsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const hydrated = useAppStore((s) => s.hydrated);
  const acknowledged = useAppStore((s) => s.settings.ageAcknowledged);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const tasting = useAppStore((s): Record<string, TastingEntry> => s.tasting);

  const [tab, setTab] = useState<BrewsTab>('sessions');
  const [query, setQuery] = useState('');
  const [openBreweryId, setOpenBreweryId] = useState<string | undefined>(undefined);

  const days = useMemo(() => sessionsByDay(), []);
  const facts = useMemo(() => sessionTicketFacts(), []);
  const where = useMemo(() => showcasePlace(), []);
  const breweries = useMemo(() => searchBreweries(query), [query]);
  const summary = useMemo(() => summariseTasting(tasting), [tasting]);
  const logged = useMemo(() => triedSubjects(tasting), [tasting]);
  const untried = useMemo(() => untriedSubjects(tasting), [tasting]);

  const openBrewery = useCallback((brewery: Brewery): void => setOpenBreweryId(brewery.id), []);
  const openSubject = useCallback((subject: TastingSubject): void => {
    setOpenBreweryId(subject.kind === 'brewery' ? subject.id : subject.breweryId);
  }, []);
  const closeSheet = useCallback((): void => setOpenBreweryId(undefined), []);

  const acknowledge = useCallback((): void => {
    updateSettings({ ageAcknowledged: true });
  }, [updateSettings]);

  const openBreweryRecord = openBreweryId === undefined ? undefined : getBrewery(openBreweryId);

  // An async storage backend has not answered yet: showing the gate now would
  // make someone who already confirmed do it again on every cold start.
  if (!hydrated) {
    return <LoadingState label="Loading your tasting log" fullscreen />;
  }

  if (!acknowledged) {
    return <AgeGate onAcknowledge={acknowledge} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, gap: theme.space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
          <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text, flex: 1 }]}>
            Brews
          </Text>
          <Badge label="21+" tone="accent" accessibilityLabel="Twenty-one and over" />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
          {TABS.map((entry) => {
            const active = entry.id === tab;
            return (
              <Pressable
                key={entry.id}
                onPress={() => setTab(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={entry.label}
                accessibilityState={{ selected: active }}
                testID={`brews-tab-${entry.id}`}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    minHeight: minTouchTarget,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: theme.space.md,
                    borderRadius: theme.radius.md,
                    borderWidth: borderWidth.hairline,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                    backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                  },
                  pressed ? { opacity: opacity.pressed } : null,
                ]}
              >
                <Text
                  style={[
                    theme.type.label,
                    { color: active ? theme.colors.accentText : theme.colors.text },
                  ]}
                >
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tab === 'sessions' ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.space.lg,
            paddingBottom: theme.space.xxl,
          }}
          testID="brews-sessions"
        >
          <Card muted style={{ gap: theme.space.sm, marginTop: theme.space.lg }}>
            <Text accessibilityRole="header" style={[theme.type.h3, { color: theme.colors.text }]}>
              What a tasting session is
            </Text>
            {facts.blurb ? (
              <Text style={[theme.type.body, { color: theme.colors.text }]}>{facts.blurb}</Text>
            ) : null}
            {facts.price ? (
              <Text style={[theme.type.bodySm, { color: theme.colors.text }]}>
                Tickets {facts.price}
                {facts.status ? ` · ${facts.status}` : ''}
              </Text>
            ) : null}
            {where ? (
              <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                Held at the {where.name}
                {where.note ? ` — ${where.note.replace(/\s*Home of.*$/i, '').trim()}` : ''}
              </Text>
            ) : null}
            {facts.page ? (
              <Pressable
                onPress={() => {
                  const page = facts.page;
                  if (page) router.push({ pathname: '/info/[slug]', params: { slug: page.slug } });
                }}
                accessibilityRole="link"
                accessibilityLabel={`Open ${facts.page.title}`}
                hitSlop={theme.hitSlop}
                style={({ pressed }) => [
                  { minHeight: theme.space.xl, justifyContent: 'center' },
                  pressed ? { opacity: opacity.pressed } : null,
                ]}
              >
                <Text style={[theme.type.label, { color: theme.colors.accent }]}>
                  Read {facts.page.title}
                </Text>
              </Pressable>
            ) : null}
          </Card>

          {days.map(({ day, sessions }) => (
            <View key={day}>
              <SectionHeader title={formatDayLabel(day)} />
              <View style={{ gap: theme.space.md }}>
                {sessions.map((session) => (
                  <SessionCard key={session.id} session={session} testID={`session-${session.id}`} />
                ))}
              </View>
            </View>
          ))}

          {days.length === 0 ? (
            <EmptyState
              title="No tasting sessions published"
              message="When the festival publishes the Brewers Showcase times they will appear here."
            />
          ) : null}
        </ScrollView>
      ) : null}

      {tab === 'breweries' ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, gap: theme.space.sm }}>
            <BrewsSearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Brewery, town or beer style"
              accessibilityLabel="Search the breweries by name, town or beer style"
              testID="brews-search"
            />
            <Text accessibilityLiveRegion="polite" style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
              {breweries.length === 1 ? '1 brewery' : `${breweries.length} breweries`} on the bill
            </Text>
          </View>

          {breweries.length === 0 ? (
            <EmptyState
              title="No brewery matches"
              message="Try part of a name, a town, or a style like IPA or cider."
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          ) : (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: theme.space.lg,
                paddingTop: theme.space.md,
                paddingBottom: theme.space.xxl,
              }}
              testID="brews-brewery-list"
            >
              <View
                style={{
                  borderRadius: theme.radius.md,
                  borderWidth: borderWidth.hairline,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  overflow: 'hidden',
                }}
              >
                {breweries.map((brewery, index) => (
                  <BreweryRow
                    key={brewery.id}
                    brewery={brewery}
                    beerCount={getBeersForBrewery(brewery.id).length}
                    onPress={openBrewery}
                    first={index === 0}
                  />
                ))}
              </View>
              <Text
                style={[
                  theme.type.label,
                  { color: theme.colors.textMuted, paddingTop: theme.space.md },
                ]}
              >
                Towns are inferred, not published by the festival. Two beers are named in advance;
                everything else is poured on the day.
              </Text>
            </ScrollView>
          )}
        </View>
      ) : null}

      {tab === 'log' ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.lg,
            paddingBottom: theme.space.xxl,
          }}
          testID="brews-log"
        >
          <TastingSummaryCard summary={summary} testID="brews-summary" />

          {logged.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              message="Open a brewery and mark it tried. You can rate it and leave a note without waiting for a beer name — the festival only publishes two of those."
              actionLabel="Browse breweries"
              onAction={() => setTab('breweries')}
              testID="brews-log-empty"
            />
          ) : (
            <>
              <SectionHeader title="Logged" subtitle={`${logged.length} tried so far`} />
              <View style={{ gap: theme.space.md }}>
                {logged.map((subject) => (
                  <LoggedRow key={subject.key} subject={subject} onPress={openSubject} />
                ))}
              </View>
            </>
          )}

          <SectionHeader
            title="Not yet tried"
            subtitle={`${untried.length} left on the bill`}
          />
          {untried.length === 0 ? (
            <EmptyState
              title="You got through all of it"
              message="Every published brewery and beer is in your log. Go and lie down."
            />
          ) : (
            <View
              style={{
                borderRadius: theme.radius.md,
                borderWidth: borderWidth.hairline,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                overflow: 'hidden',
              }}
            >
              {untried.map((subject, index) => (
                <Pressable
                  key={subject.key}
                  onPress={() => openSubject(subject)}
                  accessibilityRole="button"
                  accessibilityLabel={`${subject.name}. Not tried yet.`}
                  accessibilityHint="Opens the brewery so you can log it."
                  testID={`brews-untried-${subject.key}`}
                  style={({ pressed }) => [
                    {
                      minHeight: minTouchTarget,
                      justifyContent: 'center',
                      paddingVertical: theme.space.md,
                      paddingHorizontal: theme.space.lg,
                      borderTopWidth: index === 0 ? 0 : borderWidth.hairline,
                      borderTopColor: theme.colors.border,
                    },
                    pressed ? { opacity: opacity.pressed } : null,
                  ]}
                >
                  <Text style={[theme.type.body, { color: theme.colors.text }]}>{subject.name}</Text>
                  {subject.detail ? (
                    <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                      {subject.detail}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}

      <BreweryDetailSheet brewery={openBreweryRecord} onClose={closeSheet} />
    </View>
  );
}

interface LoggedRowProps {
  subject: TastingSubject;
  onPress: (subject: TastingSubject) => void;
}

/** One logged entry, with the rating and note you left on it. */
function LoggedRow({ subject, onPress }: LoggedRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const entry = useAppStore((s): TastingEntry | undefined => s.tasting[subject.key]);
  const rating = entry?.rating ?? 0;
  const note = entry?.note?.trim() ?? '';

  return (
    <Card
      onPress={() => onPress(subject)}
      accessibilityLabel={`${subject.name}. ${
        rating > 0 ? `Rated ${rating} out of 5.` : 'Tried, not rated.'
      }${note.length > 0 ? ` Your note: ${note}` : ''}`}
      accessibilityHint="Opens the brewery so you can edit this."
      testID={`brews-logged-${subject.key}`}
      style={{ gap: theme.space.xs }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
        <Text style={[theme.type.body, { color: theme.colors.text, flex: 1 }]}>{subject.name}</Text>
        <Badge
          label={rating > 0 ? `${rating}/5` : 'Tried'}
          tone={rating > 0 ? 'custom' : 'success'}
          color={theme.colors.primary}
        />
      </View>
      {subject.detail ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>{subject.detail}</Text>
      ) : null}
      {note.length > 0 ? (
        <Text style={[theme.type.bodySm, { color: theme.colors.text }]}>{note}</Text>
      ) : null}
    </Card>
  );
}
