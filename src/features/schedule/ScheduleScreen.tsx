import { useRouter } from 'expo-router';
import { CalendarHeart, Columns3, List, SlidersHorizontal } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Chip, EmptyState } from '@/components';
import { formatDayLabel, formatShortDayLabel, formatTime, toFestivalDay } from '@/data/time';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';

import { SearchField } from './SearchField';
import { SetRow } from './SetRow';
import { StageGrid } from './StageGrid';
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  toggleInList,
  type ScheduleFilters,
} from './filters';
import { useFavoriteIds, useNow } from './hooks';
import {
  defaultScheduleDay,
  distinctArtistCount,
  entriesForDay,
  getScheduleDays,
  scheduleSetTypes,
  setTypeLabel,
  stagesForEntries,
} from './model';
import { buildStagePalette } from './stagePalette';

type ViewMode = 'grid' | 'list';

/**
 * The Schedule tab.
 *
 * Day tabs come from the published festival run plus any day that actually has
 * sets on it; the two view modes are a stage-column grid and a chronological
 * list over the same filtered entries, so a filter you set in one is still
 * there when you switch.
 */
export function ScheduleScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const now = useNow();
  const favorites = useFavoriteIds();

  const days = useMemo(() => getScheduleDays(), []);
  const today = toFestivalDay(now);
  const [day, setDay] = useState<string>(defaultScheduleDay);
  const [mode, setMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<ScheduleFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const dayEntries = useMemo(() => (day ? entriesForDay(day) : []), [day]);
  const dayStages = useMemo(() => stagesForEntries(dayEntries), [dayEntries]);
  const palette = useMemo(() => buildStagePalette(theme, dayStages), [theme, dayStages]);
  const types = useMemo(() => scheduleSetTypes(), []);

  const visible = useMemo(
    () => applyFilters(dayEntries, filters, favorites),
    [dayEntries, filters, favorites],
  );
  const visibleStages = useMemo(() => stagesForEntries(visible), [visible]);

  const filterCount = activeFilterCount(filters);
  const artistCount = distinctArtistCount(visible);
  const summary = `${visible.length} of ${dayEntries.length} ${
    dayEntries.length === 1 ? 'set' : 'sets'
  } · ${artistCount} ${artistCount === 1 ? 'artist' : 'artists'}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* The tab navigator already titles this screen, so the header band here
          is controls only — the grid needs the vertical space more. */}
      <View style={{ paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, gap: theme.space.md }}>
        <DayTabs days={days} value={day} today={today} onChange={setDay} />

        <SearchField
          value={filters.query}
          onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
          placeholder="Artist or stage"
          accessibilityLabel="Search the schedule by artist or stage"
          testID="schedule-search"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
          <ModeToggle value={mode} onChange={setMode} />
          <Chip
            label={filterCount > 0 ? `Filters · ${filterCount}` : 'Filters'}
            selected={filtersOpen || filterCount > 0}
            onPress={() => setFiltersOpen((open) => !open)}
            icon={
              <SlidersHorizontal
                size={theme.space.lg}
                color={filtersOpen || filterCount > 0 ? theme.colors.accentText : theme.colors.text}
              />
            }
          />
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push('/weekend')}
            accessibilityRole="link"
            accessibilityLabel={`My Weekend, ${favorites.size} saved ${
              favorites.size === 1 ? 'set' : 'sets'
            }`}
            hitSlop={theme.hitSlop}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.xs,
              minHeight: minTouchTarget,
              paddingLeft: theme.space.sm,
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <CalendarHeart size={theme.space.xl} color={theme.colors.accent} />
            <Text style={[theme.type.label, { color: theme.colors.accent }]}>{favorites.size}</Text>
          </Pressable>
        </View>

        {filtersOpen ? (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            stages={dayStages}
            types={types}
            palette={palette}
          />
        ) : null}

        <Text
          accessibilityLiveRegion="polite"
          style={[theme.type.bodySm, { color: theme.colors.textMuted }]}
        >
          {day ? `${formatDayLabel(day)} · ${summary}` : summary}
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          marginTop: theme.space.sm,
          paddingLeft: mode === 'grid' ? theme.space.lg : 0,
        }}
      >
        {visible.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            message="No sets on this day match your search and filters."
            actionLabel={filterCount > 0 ? 'Clear filters' : undefined}
            onAction={filterCount > 0 ? () => setFilters(EMPTY_FILTERS) : undefined}
          />
        ) : mode === 'grid' ? (
          <StageGrid entries={visible} stages={visibleStages} palette={palette} now={now} />
        ) : (
          <ChronologicalList entries={visible} palette={palette} now={now} />
        )}
      </View>
    </View>
  );
}

interface DayTabsProps {
  days: string[];
  value: string;
  today: string;
  onChange: (day: string) => void;
}

function DayTabs({ days, value, today, onChange }: DayTabsProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.space.sm, paddingRight: theme.space.lg }}
    >
      {days.map((day) => (
        <Chip
          key={day}
          label={day === today ? `${formatShortDayLabel(day)} · Today` : formatShortDayLabel(day)}
          selected={day === value}
          onPress={() => onChange(day)}
        />
      ))}
    </ScrollView>
  );
}

interface ModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** Two-state segmented control. Both halves are labelled, not just iconic. */
function ModeToggle({ value, onChange }: ModeToggleProps): React.JSX.Element {
  const { theme } = useTheme();
  const options: { mode: ViewMode; label: string; Icon: typeof Columns3 }[] = [
    { mode: 'grid', label: 'Grid', Icon: Columns3 },
    { mode: 'list', label: 'List', Icon: List },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        borderRadius: theme.radius.pill,
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
      }}
    >
      {options.map(({ mode, label, Icon }) => {
        const active = mode === value;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} view`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.xs,
              minHeight: minTouchTarget,
              paddingHorizontal: theme.space.md,
              backgroundColor: active ? theme.colors.accent : 'transparent',
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <Icon
              size={theme.space.lg}
              color={active ? theme.colors.accentText : theme.colors.textMuted}
            />
            <Text
              style={[theme.type.label, { color: active ? theme.colors.accentText : theme.colors.text }]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface FilterPanelProps {
  filters: ScheduleFilters;
  setFilters: React.Dispatch<React.SetStateAction<ScheduleFilters>>;
  stages: { id: string; shortName: string; name: string }[];
  types: ReturnType<typeof scheduleSetTypes>;
  palette: ReturnType<typeof buildStagePalette>;
}

function FilterPanel({
  filters,
  setFilters,
  stages,
  types,
  palette,
}: FilterPanelProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={{
        gap: theme.space.md,
        padding: theme.space.md,
        borderRadius: theme.radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <FilterGroup label="Stage">
        {stages.map((stage) => (
          <Chip
            key={stage.id}
            label={stage.shortName}
            color={palette(stage.id)}
            selected={filters.stageIds.includes(stage.id)}
            onPress={() => setFilters((f) => ({ ...f, stageIds: toggleInList(f.stageIds, stage.id) }))}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Type">
        {types.map((type) => (
          <Chip
            key={type}
            label={setTypeLabel(type)}
            selected={filters.types.includes(type)}
            onPress={() => setFilters((f) => ({ ...f, types: toggleInList(f.types, type) }))}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Saved">
        <Chip
          label="My Weekend only"
          selected={filters.favoritesOnly}
          onPress={() => setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
        />
        <Chip label="Clear all" onPress={() => setFilters(EMPTY_FILTERS)} />
      </FilterGroup>
    </View>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.space.sm }}>
      <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>{children}</View>
    </View>
  );
}

interface ChronologicalListProps {
  entries: ReturnType<typeof entriesForDay>;
  palette: ReturnType<typeof buildStagePalette>;
  now: Date;
}

/**
 * The list mode: everything on the day in time order, with a heading whenever
 * the clock rolls over to a new start time.
 */
function ChronologicalList({ entries, palette, now }: ChronologicalListProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: theme.space.lg,
        paddingBottom: theme.space.xxl,
        gap: theme.space.sm,
      }}
    >
      {entries.map((entry, index) => {
        const previous = entries[index - 1];
        const newSlot = previous === undefined || previous.start !== entry.start;
        return (
          <View key={entry.id} style={{ gap: theme.space.sm }}>
            {newSlot ? (
              <Text
                accessibilityRole="header"
                style={[
                  theme.type.label,
                  { color: theme.colors.textMuted, marginTop: index === 0 ? 0 : theme.space.md },
                ]}
              >
                {formatTime(entry.start)}
              </Text>
            ) : null}
            <SetRow entry={entry} palette={palette} now={now} />
          </View>
        );
      })}
    </ScrollView>
  );
}
