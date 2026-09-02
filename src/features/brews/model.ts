import {
  getBeers,
  getBeersForBrewery,
  getBeersForSession,
  getBreweries,
  getBrewery,
  getInfoPages,
  getPlaces,
  getSessions,
} from '@/data/repository';
import type { TastingEntry } from '@/store/useAppStore';
import type { Beer, Brewery, InfoPage, Place, ShowcaseSession } from '@/types/content';

import { beerTastingKey, breweryTastingKey, type TastingKind } from './tastingKeys';

/** Anything you can put a rating against: a named beer, or a brewery's table. */
export interface TastingSubject {
  key: string;
  kind: TastingKind;
  id: string;
  name: string;
  /** Brewery location for a brewery; style and ABV for a beer. */
  detail?: string;
  /** The brewery a beer belongs to, for grouping and for search. */
  breweryId?: string;
}

export function breweryLocation(brewery: Brewery): string | undefined {
  const city = brewery.city?.trim();
  const state = brewery.state?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || undefined;
}

export function beerDetail(beer: Beer): string {
  return `${beer.style} · ${beer.abv}% ABV`;
}

export function subjectForBrewery(brewery: Brewery): TastingSubject {
  const subject: TastingSubject = {
    key: breweryTastingKey(brewery.id),
    kind: 'brewery',
    id: brewery.id,
    name: brewery.name,
  };
  const location = breweryLocation(brewery);
  if (location) subject.detail = location;
  return subject;
}

export function subjectForBeer(beer: Beer): TastingSubject {
  return {
    key: beerTastingKey(beer.id),
    kind: 'beer',
    id: beer.id,
    name: beer.name,
    detail: beerDetail(beer),
    breweryId: beer.brewery,
  };
}

/**
 * Everything loggable, breweries first.
 *
 * The order is deliberate: the festival publishes 25 breweries and 2 beers, so
 * the brewery is the unit a festivalgoer actually works through and the beer
 * list is a bonus on top of it.
 */
export function allTastingSubjects(): TastingSubject[] {
  return [...getBreweries().map(subjectForBrewery), ...getBeers().map(subjectForBeer)];
}

export function beerSubjectsForBrewery(breweryId: string): TastingSubject[] {
  return getBeersForBrewery(breweryId).map(subjectForBeer);
}

/** Matches brewery name and location, plus the names and styles of its beers. */
export function searchBreweries(query: string): Brewery[] {
  const needle = query.trim().toLowerCase();
  const all = getBreweries();
  if (needle.length === 0) return all;

  return all.filter((brewery) => {
    const beers = getBeersForBrewery(brewery.id);
    const haystack = [
      brewery.name,
      breweryLocation(brewery) ?? '',
      ...beers.map((b) => `${b.name} ${b.style}`),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export interface TastingSummaryData {
  /** Loggable things in the snapshot right now. */
  total: number;
  tried: number;
  breweriesTried: number;
  beersTried: number;
  rated: number;
  /** Undefined until at least one rating exists — never render 0 stars. */
  averageRating?: number;
}

/**
 * Counts are taken over the subjects that exist in today's snapshot, so an
 * entry left behind by a brewery that dropped off the bill does not inflate
 * the total or drag the average.
 */
export function summariseTasting(tasting: Record<string, TastingEntry>): TastingSummaryData {
  const subjects = allTastingSubjects();
  let tried = 0;
  let breweriesTried = 0;
  let beersTried = 0;
  let ratingTotal = 0;
  let rated = 0;

  for (const subject of subjects) {
    const entry = tasting[subject.key];
    if (!entry?.tried) continue;
    tried += 1;
    if (subject.kind === 'brewery') breweriesTried += 1;
    else beersTried += 1;
    if (typeof entry.rating === 'number' && entry.rating > 0) {
      ratingTotal += entry.rating;
      rated += 1;
    }
  }

  const summary: TastingSummaryData = {
    total: subjects.length,
    tried,
    breweriesTried,
    beersTried,
    rated,
  };
  if (rated > 0) summary.averageRating = ratingTotal / rated;
  return summary;
}

export function hasEntry(tasting: Record<string, TastingEntry>, key: string): boolean {
  const entry = tasting[key];
  if (!entry) return false;
  return entry.tried || (entry.rating ?? 0) > 0 || (entry.note?.trim().length ?? 0) > 0;
}

export function untriedSubjects(tasting: Record<string, TastingEntry>): TastingSubject[] {
  return allTastingSubjects().filter((subject) => !tasting[subject.key]?.tried);
}

export function triedSubjects(tasting: Record<string, TastingEntry>): TastingSubject[] {
  return allTastingSubjects().filter((subject) => tasting[subject.key]?.tried === true);
}

export function breweryNameFor(id: string): string | undefined {
  return getBrewery(id)?.name;
}

/**
 * The Saturday late session is the rare and barrel-aged one. Read off the
 * session's own name rather than its id, so the flag follows the data if the
 * festival moves it to another slot.
 */
export function isRareSession(session: ShowcaseSession): boolean {
  return /\brare\b|barrel/i.test(session.name);
}

export function sessionsByDay(): { day: string; sessions: ShowcaseSession[] }[] {
  const days: { day: string; sessions: ShowcaseSession[] }[] = [];
  for (const session of getSessions()) {
    const bucket = days.find((d) => d.day === session.day);
    if (bucket) bucket.sessions.push(session);
    else days.push({ day: session.day, sessions: [session] });
  }
  return days;
}

export function beersForSession(sessionId: string): Beer[] {
  return getBeersForSession(sessionId);
}

/**
 * Where the tasting sessions happen, found by what the festival says about the
 * place rather than by its id.
 */
export function showcasePlace(): Place | undefined {
  return getPlaces().find(
    (place) => place.kind === 'food' && /showcase|tasting session/i.test(place.note ?? ''),
  );
}

function stripEmphasis(line: string): string {
  return line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim();
}

export interface SessionTicketFacts {
  /** The festival's own paragraph about tasting-session tickets. */
  blurb?: string;
  price?: string;
  status?: string;
  /** The info page the two came from, for a "read the full page" link. */
  page?: InfoPage;
}

/**
 * Pulls what the festival actually says about tasting sessions out of the info
 * pages — the 21+ and pass requirement, the price band, whether they are on
 * sale. Found by matching the copy, not by hard-coding a page slug, and every
 * field is optional so a rewritten info page degrades to showing less rather
 * than to showing something invented.
 */
export function sessionTicketFacts(): SessionTicketFacts {
  const facts: SessionTicketFacts = {};

  for (const page of getInfoPages()) {
    const lines = page.body.split('\n');

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';

      if (!facts.blurb && /^#{1,6}\s.*tasting session/i.test(line)) {
        const paragraph: string[] = [];
        for (let j = i + 1; j < lines.length; j += 1) {
          const next = lines[j] ?? '';
          if (/^#{1,6}\s/.test(next)) break;
          if (next.trim().length === 0) {
            if (paragraph.length > 0) break;
            continue;
          }
          paragraph.push(stripEmphasis(next));
        }
        if (paragraph.length > 0) {
          facts.blurb = paragraph.join(' ');
          facts.page = page;
        }
      }

      if (!facts.price && line.startsWith('|') && /tasting session/i.test(line)) {
        const cells = line
          .split('|')
          .map((cell) => stripEmphasis(cell))
          .filter((cell) => cell.length > 0);
        const [, price, status] = cells;
        if (price) facts.price = price;
        if (status) facts.status = status;
        if (!facts.page) facts.page = page;
      }
    }
  }

  return facts;
}
