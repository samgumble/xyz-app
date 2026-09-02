import { getFestival } from '@/data/repository';
import type { Theme } from '@/theme';
import type { Place } from '@/types/content';

/**
 * The schematic geometry behind the grounds map.
 *
 * `places.json` gives 33 pins in a 0..1000 square. There is no official grounds
 * map to trace, so the shapes here are deliberately crude: labelled blocks for
 * the areas the festival describes in prose (the park, the town venues, the
 * campground, Warner Field, the Beer Garden between the two main stages, the
 * Shade Alley along the back perimeter) and nothing else. No paths, no
 * building footprints, no river — drawing those would imply a survey that does
 * not exist.
 */

/** The pin coordinate space: both axes run 0..1000. North is up. */
export const MAP_EXTENT = 1000;

export type ZoneTone = 'grounds' | 'town' | 'camp' | 'focus' | 'hint';

export interface MapZone {
  id: string;
  label: string;
  /** Used when the full label is wider than the zone at the current zoom. */
  short: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: ZoneTone;
}

/**
 * Blocks, not boundaries. Each one is placed to contain the pins the festival's
 * own copy puts inside it; the edges are drawn dashed everywhere so they never
 * read as a surveyed fence line.
 */
export const MAP_ZONES: readonly MapZone[] = [
  {
    id: 'town',
    label: 'Telluride — in town',
    short: 'In town',
    x: 0,
    y: 90,
    width: 200,
    height: 520,
    tone: 'town',
  },
  {
    id: 'mountain-village',
    label: 'Mountain Village — via gondola',
    short: 'Mtn Village',
    x: 0,
    y: 820,
    width: 150,
    height: 130,
    tone: 'town',
  },
  {
    id: 'park',
    label: 'Telluride Town Park — festival grounds',
    short: 'Town Park',
    x: 210,
    y: 45,
    width: 500,
    height: 760,
    tone: 'grounds',
  },
  {
    id: 'beer-garden',
    label: 'Beer Garden',
    short: 'Beer',
    x: 365,
    y: 425,
    width: 140,
    height: 95,
    tone: 'focus',
  },
  {
    id: 'shade-alley',
    label: 'Shade Alley — back perimeter',
    short: 'Shade Alley',
    x: 218,
    y: 735,
    width: 484,
    height: 62,
    tone: 'hint',
  },
  {
    id: 'campground',
    label: 'Town Park Campground',
    short: 'Campground',
    x: 740,
    y: 330,
    width: 245,
    height: 430,
    tone: 'camp',
  },
  {
    id: 'warner-field',
    label: 'Warner Field',
    short: 'Warner',
    x: 345,
    y: 818,
    width: 185,
    height: 112,
    tone: 'camp',
  },
] as const;

/** The zone the on-grounds pins sit in — used to decide what gets a stage block. */
export const GROUNDS_ZONE_ID = 'park';

/** The in-town block, where the five club venues sit within a few streets. */
export const TOWN_ZONE_ID = 'town';

export function findZone(id: string): MapZone | undefined {
  return MAP_ZONES.find((z) => z.id === id);
}

export function zoneContains(zone: MapZone, place: Place): boolean {
  return (
    place.x >= zone.x &&
    place.x <= zone.x + zone.width &&
    place.y >= zone.y &&
    place.y <= zone.y + zone.height
  );
}

/**
 * True when the festival itself says it has not published where this is.
 *
 * Matched against the note text rather than an id, so a second provisional pin
 * added to the snapshot later is flagged without touching this file. It has to
 * be a claim about *position* — plenty of notes say prices or vendor names are
 * unpublished, and those pins are placed perfectly well. The Truck Stage is the
 * one that trips it today: its position is genuinely unknown.
 */
const UNCERTAIN_NOTE =
  /\bpin is provisional\b|\b(position|location|placement|where it (is|sits))\b[^.]{0,80}?\b(not published|unpublished|unknown|not been surveyed)\b/i;

export function isApproximatePlace(place: Place): boolean {
  return place.note !== undefined && UNCERTAIN_NOTE.test(place.note);
}

/**
 * The festival's own disclosure about the map data, pulled out of
 * `festival._dataNote` so the caption and the data cannot drift apart. Returns
 * undefined when the note says nothing about the map, and the screen falls back
 * to its own standing caption — which is never conditional.
 */
export function groundsMapCaveat(): string | undefined {
  const note = getFestival()._dataNote;
  if (!note) return undefined;
  const start = note.indexOf('(1)');
  if (start < 0) return undefined;
  return note
    .slice(start)
    .split(/\s*;\s*(?=\(\d+\))/)
    .map((part) => part.replace(/^\(\d+\)\s*/, '').replace(/\.$/, '').trim())
    .find((part) => /grounds map|coordinates/i.test(part));
}

/** Pin geometry is derived from theme spacing so it tracks the type ramp. */
export function pinRadius(theme: Theme): number {
  return theme.space.sm + theme.space.xs / 2;
}

export function selectedPinRadius(theme: Theme): number {
  return theme.space.md + theme.space.xs / 2;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapViewport {
  scale: number;
  tx: number;
  ty: number;
}

/** Map coordinate → on-screen pixel, for the current viewport. */
export function project(point: Point, viewport: MapViewport): Point {
  return { x: point.x * viewport.scale + viewport.tx, y: point.y * viewport.scale + viewport.ty };
}

/** Scale at which the whole 0..1000 square fits the canvas. */
export function fitScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.min(width / MAP_EXTENT, height / MAP_EXTENT);
}

export function fitViewport(width: number, height: number): MapViewport {
  const scale = fitScale(width, height);
  return {
    scale,
    tx: (width - MAP_EXTENT * scale) / 2,
    ty: (height - MAP_EXTENT * scale) / 2,
  };
}
