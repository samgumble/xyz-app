/**
 * Keys for the tasting log.
 *
 * The store slice is documented as "keyed by `Beer.id`", and the 2026 snapshot
 * names exactly two beers — the only two the festival publishes — against 25
 * breweries. A log that can only record those two beers is useless at a
 * festival where you walk between 25 pouring tables, so a brewery can be logged
 * as well.
 *
 * Beer entries therefore keep the raw `Beer.id`, so anything else reading the
 * slice against a beer id still finds what it expects. Brewery entries carry a
 * `brewery:` prefix, which no beer id can produce, so the two namespaces can
 * never collide even if a future snapshot gives a beer and a brewery the same
 * id.
 */

export const BREWERY_KEY_PREFIX = 'brewery:';

export type TastingKind = 'beer' | 'brewery';

export interface TastingSubjectId {
  kind: TastingKind;
  /** The `Beer.id` or `Brewery.id` — never the storage key. */
  id: string;
}

export function beerTastingKey(beerId: string): string {
  return beerId;
}

export function breweryTastingKey(breweryId: string): string {
  return `${BREWERY_KEY_PREFIX}${breweryId}`;
}

export function tastingKeyFor(subject: TastingSubjectId): string {
  return subject.kind === 'brewery' ? breweryTastingKey(subject.id) : beerTastingKey(subject.id);
}

export function parseTastingKey(key: string): TastingSubjectId {
  return key.startsWith(BREWERY_KEY_PREFIX)
    ? { kind: 'brewery', id: key.slice(BREWERY_KEY_PREFIX.length) }
    : { kind: 'beer', id: key };
}

export function isBreweryKey(key: string): boolean {
  return key.startsWith(BREWERY_KEY_PREFIX);
}
