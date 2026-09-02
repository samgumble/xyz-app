import {
  getArtist,
  getFestivalDays,
  getSet,
  getSets,
  getSetsForDay,
  getStage,
  getStages,
} from '@/data/repository';
import { durationMinutes, toFestivalDay } from '@/data/time';
import type { ArtistSlug, FestivalSet, SetType, Stage, StageId } from '@/types/content';

/**
 * The unit the schedule screens actually render.
 *
 * It is *not* a `FestivalSet`. The published data emits one row per performer,
 * which is right for the content system and wrong for a grid: the four
 * comedians on a combined stand-up bill share a stage and a start time, so as
 * four rows they would stack into an unreadable pile. An entry is therefore
 * "one thing happening in one place at one time", and carries every set id it
 * was built from so favouriting stays honest.
 */
export interface ScheduleEntry {
  /** Route target — the first set id in the group, stable across launches. */
  id: string;
  /** Every set folded into this entry. One id for all but combined bills. */
  setIds: string[];
  artistSlugs: ArtistSlug[];
  /** `Samantha Fish`, or `Troy Walker, Baron Vaughn, Kiran Deol & Hannah Jones`. */
  title: string;
  stage: Stage;
  start: string;
  end: string;
  startMs: number;
  endMs: number;
  minutes: number;
  type: SetType;
  /** Deduplicated — a combined bill repeats the same caveat on every row. */
  notes: string[];
  /** True when more than one performer shares the slot. */
  combined: boolean;
}

/**
 * A stage id that appears in the schedule but not in `stages.json` still has to
 * render. Synthesising a stage beats dropping the set on the floor.
 */
function resolveStage(id: StageId): Stage {
  return getStage(id) ?? { id, name: id, shortName: id, kind: 'other' };
}

/** `A`, `A & B`, `A, B & C` — no Intl.ListFormat, Hermes may not ship it. */
function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] ?? '';
  const head = names.slice(0, -1).join(', ');
  return `${head} & ${names[names.length - 1] ?? ''}`;
}

function artistName(slug: ArtistSlug): string {
  return getArtist(slug)?.name ?? slug;
}

/**
 * Comedy is the only type the festival publishes as one row per performer, so
 * it is the only type collapsed. Everything else keys on its own set id, which
 * deliberately leaves genuine double-bills (two club acts at 10 PM in the same
 * room) as separate entries — they are separate shows, and the grid lanes them
 * side by side.
 */
function groupKey(set: FestivalSet): string {
  return set.type === 'comedy' ? `comedy|${set.stage}|${set.start}` : `set|${set.id}`;
}

function toEntry(group: FestivalSet[]): ScheduleEntry | undefined {
  const members = [...group].sort((a, b) => a.id.localeCompare(b.id));
  const first = members[0];
  if (!first) return undefined;

  const notes: string[] = [];
  for (const member of members) {
    if (member.note && !notes.includes(member.note)) notes.push(member.note);
  }

  return {
    id: first.id,
    setIds: members.map((m) => m.id),
    artistSlugs: members.map((m) => m.artist),
    title: joinNames(members.map((m) => artistName(m.artist))),
    stage: resolveStage(first.stage),
    start: first.start,
    end: first.end,
    startMs: Date.parse(first.start),
    endMs: Date.parse(first.end),
    minutes: durationMinutes(first),
    type: first.type,
    notes,
    combined: members.length > 1,
  };
}

/** Folds a list of sets into entries, earliest first, stage as tiebreak. */
export function buildEntries(sets: FestivalSet[]): ScheduleEntry[] {
  const groups = new Map<string, FestivalSet[]>();
  for (const set of sets) {
    const key = groupKey(set);
    const existing = groups.get(key);
    if (existing) existing.push(set);
    else groups.set(key, [set]);
  }
  const entries: ScheduleEntry[] = [];
  for (const group of groups.values()) {
    const entry = toEntry(group);
    if (entry) entries.push(entry);
  }
  return entries.sort(
    (a, b) => a.startMs - b.startMs || a.stage.id.localeCompare(b.stage.id) || a.id.localeCompare(b.id),
  );
}

export function entriesForDay(dayISO: string): ScheduleEntry[] {
  return buildEntries(getSetsForDay(dayISO));
}

/** The entry a single set belongs to, with its co-billed performers attached. */
export function entryForSet(setId: string): ScheduleEntry | undefined {
  const set = getSet(setId);
  if (!set) return undefined;
  const key = groupKey(set);
  const siblings = getSets().filter((s) => groupKey(s) === key);
  return toEntry(siblings);
}

/**
 * Every day that has something on it — the spine of the tab strip, never a
 * hard-coded date.
 *
 * `getFestivalDays()` already unions the advertised window with any day that
 * carries sets. The same union is kept here as a guard: the real data has
 * Thursday pre-festival shows outside the advertised Fri–Sun window, and no set
 * may become unreachable if that repository behaviour ever changes back.
 */
export function getScheduleDays(): string[] {
  const days = new Set(getFestivalDays());
  for (const set of getSets()) days.add(toFestivalDay(set.start));
  return [...days].sort();
}

/**
 * Which day the Schedule opens on.
 *
 * Today, when the festival is running. Otherwise the first day the main stages
 * are actually going — the Thursday pre-festival shows are two ticketed club
 * sets, and opening on them shows an almost empty grid instead of the festival.
 * The rule reads `Stage.kind`, so it needs no date and no stage id.
 */
export function defaultScheduleDay(): string {
  const days = getScheduleDays();
  const today = toFestivalDay(new Date());
  if (days.includes(today)) return today;

  const mainStages = new Set(getStages().filter((s) => s.kind === 'main').map((s) => s.id));
  const gatesOpen = days.find((day) =>
    getSetsForDay(day).some((set) => mainStages.has(set.stage)),
  );
  return gatesOpen ?? days[0] ?? '';
}

/** Stages with at least one entry on this day, in published stage order. */
export function stagesForEntries(entries: ScheduleEntry[]): Stage[] {
  const present = new Set(entries.map((e) => e.stage.id));
  const ordered = getStages().filter((s) => present.has(s.id));
  const known = new Set(ordered.map((s) => s.id));
  const extras = entries
    .filter((e) => !known.has(e.stage.id))
    .map((e) => e.stage)
    .filter((stage, index, all) => all.findIndex((s) => s.id === stage.id) === index);
  return [...ordered, ...extras];
}

/** Every `SetType` actually present in the schedule, in a stable order. */
export function scheduleSetTypes(): SetType[] {
  const order: SetType[] = ['main', 'club', 'showcase', 'comedy', 'yoga', 'kids', '5k'];
  const present = new Set(getSets().map((s) => s.type));
  const listed = order.filter((t) => present.has(t));
  const rest = [...present].filter((t) => !order.includes(t)).sort();
  return [...listed, ...rest];
}

/** Human label for a `SetType` chip. */
export function setTypeLabel(type: SetType): string {
  switch (type) {
    case 'main':
      return 'Main stages';
    case 'club':
      return 'Club show';
    case 'showcase':
      return 'Showcase';
    case 'comedy':
      return 'Comedy';
    case 'yoga':
      return 'Yoga';
    case 'kids':
      return 'Kids';
    case '5k':
      return '5K';
    default:
      return type;
  }
}

/** Lowercased artist-name and stage-name haystack, for the search box. */
export function searchHaystack(entry: ScheduleEntry): string {
  return [
    entry.title,
    ...entry.artistSlugs.map((slug) => artistName(slug)),
    entry.stage.name,
    entry.stage.shortName,
  ]
    .join(' ')
    .toLowerCase();
}

/** Distinct artist names behind a group of entries — used by the summary line. */
export function distinctArtistCount(entries: ScheduleEntry[]): number {
  const slugs = new Set<ArtistSlug>();
  for (const entry of entries) for (const slug of entry.artistSlugs) slugs.add(slug);
  return slugs.size;
}
