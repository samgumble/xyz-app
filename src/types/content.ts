/**
 * Content types for the Telluride Blues & Brews app.
 *
 * Hand-written for the prototype. Mirrors the data model in
 * `tellurideblues-app/plans/01-backend-content-system.md` §2, which is the
 * source of truth once `tbb-content/schema` exists and `scripts/gen-types.ts`
 * generates this file. Keep the two in sync by changing the schema first.
 *
 * Stable-ID rule: `FestivalSet.id` and `Artist.slug` never change once
 * published — favorites and reminders on devices key on them.
 */

/** `'main' | 'blues' | 'showcase'` plus one id per club venue. */
export type StageId = string;

/** URL-safe artist identifier, e.g. `'delta-vaudeville'`. */
export type ArtistSlug = string;

export type SetType = 'main' | 'club' | 'showcase' | 'yoga' | 'kids' | '5k' | 'comedy';

export type Priority = 'info' | 'important' | 'urgent';

export interface Festival {
  id: string;
  name: string;
  /** Descriptive edition label as the festival writes it, e.g. `32nd Annual`. */
  edition: string;
  dates: { start: string; end: string };
  /** IANA zone, e.g. `America/Denver`. Never hard-code this at a call site. */
  timezone: string;
  venue: { name: string; lat: number; lng: number };
  theme: { primary: string; accent: string };
  links: Record<string, string>;
  /** True when the bundled data is fictional placeholder content. */
  _placeholder?: boolean;
  /** Provenance and caveats for the bundled data. Surfaced in the app's credits. */
  _dataNote?: string;
}

export interface Stage {
  id: StageId;
  name: string;
  shortName: string;
  kind: 'main' | 'club' | 'tent' | 'other';
  lat?: number;
  lng?: number;
}

export type ArtistLinkKey = 'spotify' | 'apple' | 'instagram' | 'website';

export interface Artist {
  slug: ArtistSlug;
  name: string;
  bio: string;
  photo?: string;
  /** Larger native-aspect press photo, used on the artist detail screen. */
  photoHero?: string;
  photoCredit?: string;
  links: Partial<Record<ArtistLinkKey, string>>;
  /** Additional platforms beyond the four first-class ones (facebook, youtube, tiktok...). */
  linksExtra?: Record<string, string>;
  tags: string[];
  headliner?: boolean;
}

export interface FestivalSet {
  id: string;
  artist: ArtistSlug;
  stage: StageId;
  /** ISO 8601 with offset, e.g. `2026-09-18T18:30:00-06:00`. */
  start: string;
  /** ISO 8601 with offset. */
  end: string;
  type: SetType;
  note?: string;
}

export interface Brewery {
  id: string;
  name: string;
  /**
   * Optional: the festival does not publish brewery locations, so a real
   * snapshot legitimately carries breweries with no city. Render defensively.
   */
  city?: string;
  state?: string;
  logo?: string;
}

export interface Beer {
  id: string;
  /** `Brewery.id` */
  brewery: string;
  name: string;
  style: string;
  abv: number;
  /** `ShowcaseSession.id` values this beer is poured at. */
  sessions: string[];
}

export interface ShowcaseSession {
  id: string;
  name: string;
  /** Festival-local calendar day, `YYYY-MM-DD`. */
  day: string;
  start: string;
  end: string;
}

export type PlaceKind =
  | 'gate'
  | 'water'
  | 'medical'
  | 'atm'
  | 'restroom'
  | 'shuttle'
  | 'gondola'
  | 'food'
  | 'stage'
  | 'camp'
  | 'info';

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  /** SVG map coordinate, 0..1000. */
  x: number;
  /** SVG map coordinate, 0..1000. */
  y: number;
  lat?: number;
  lng?: number;
  note?: string;
}

export interface Vendor {
  id: string;
  name: string;
  kind: 'food' | 'craft';
  /** `Place.id` */
  place: string;
}

export interface Announcement {
  id: string;
  publishedAt: string;
  title: string;
  body: string;
  priority: Priority;
  push: boolean;
  /** `all` | `stage-<id>` | `artist-<slug>` */
  audience: string;
  expiresAt?: string;
}

export interface InfoPage {
  slug: string;
  title: string;
  /** Markdown-ish plain text. */
  body: string;
  order: number;
}

export interface ContentSnapshot {
  festival: Festival;
  stages: Stage[];
  artists: Artist[];
  schedule: FestivalSet[];
  breweries: Brewery[];
  beers: Beer[];
  sessions: ShowcaseSession[];
  places: Place[];
  vendors: Vendor[];
  announcements: Announcement[];
  info: InfoPage[];
}

/** Keys of the individual JSON files published by `tbb-content`. */
export type SnapshotKey = keyof ContentSnapshot;
