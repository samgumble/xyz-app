import { getArtists, getSetsForArtist, searchArtists } from '@/data/repository';
import type { Artist } from '@/types/content';

/**
 * The tag the content system puts on the five non-performer rows in
 * `artists.json` — the Brewers Showcase, the 5K, yoga, Blues for Breakfast and
 * the Blues Challenge winner. They exist so every published schedule slot has
 * a resolvable artist reference, and they must keep working on the Schedule.
 *
 * They are not bands, so they are not in the Lineup. Matching on the tag rather
 * than on the five slugs means a sixth programme item next year is handled for
 * free — no slug is ever hard-coded.
 */
export const PROGRAM_TAG = 'festival program';

export function isPerformer(artist: Artist): boolean {
  return !artist.tags.some((tag) => tag.toLowerCase() === PROGRAM_TAG);
}

/** Every real act, headliners first, then alphabetical. */
export function getLineup(): Artist[] {
  return orderLineup(getArtists().filter(isPerformer));
}

/** Name- and tag-matched lineup for the search box. Empty query → everyone. */
export function searchLineup(query: string): Artist[] {
  return orderLineup(searchArtists(query).filter(isPerformer));
}

function orderLineup(artists: Artist[]): Artist[] {
  return [...artists].sort((a, b) => {
    const headline = Number(b.headliner === true) - Number(a.headliner === true);
    return headline !== 0 ? headline : a.name.localeCompare(b.name);
  });
}

/** How many slots an artist plays — shown on the card so multi-set acts read. */
export function setCountFor(artist: Artist): number {
  return getSetsForArtist(artist.slug).length;
}

/** `blues rock · soul` — the two most specific tags, for a card subtitle. */
export function tagLine(artist: Artist, limit = 2): string {
  return artist.tags.slice(0, limit).join(' · ');
}
