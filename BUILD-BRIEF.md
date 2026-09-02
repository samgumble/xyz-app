# BUILD-BRIEF.md — shared contract for the tbb-app prototype

Every agent working on this repo MUST follow this file exactly. It exists so parallel
agents produce code that composes. Do not invent alternative names, paths, or shapes.
Read `../tellurideblues-app/CLAUDE.md` and `../tellurideblues-app/plans/02-mobile-app-core.md`
for the non-negotiables (offline-first, no server, no accounts, theme tokens only, festival timezone).

## Scope of THIS prototype

Tier 1 screens, running on web (`npm run web`) and native-ready, fully offline against a
BUNDLED MOCK SNAPSHOT. No network calls in this pass — the sync engine is written and unit
tested but points at a stub base URL and degrades silently to the snapshot.

Out of scope for now: FCM push, poster generator, widgets, Live Activity, Decap CMS, EAS config.

## Stack (fixed)

Expo SDK 54 · expo-router v6 (typed routes) · React Native 0.81 · TypeScript strict (`"strict": true`,
`noImplicitAny`, NO `any`, no `@ts-ignore`) · Zustand v5 with a persist middleware behind a
storage adapter · react-native-svg · lucide-react-native · date-fns + @date-fns/tz.
StyleSheet only — no NativeWind, no CSS-in-JS runtime. Jest + jest-expo for tests.

Dependency licenses must be MIT / Apache-2.0 / BSD / ISC.

## Directory layout (fixed)

```
app/                          Expo Router routes ONLY — no business logic, no data access
  _layout.tsx                 ThemeProvider + Stack, boots the store
  (tabs)/_layout.tsx          bottom tabs: index, schedule, lineup, map, brews, more
  (tabs)/index.tsx            Home (Now/Next)
  (tabs)/schedule.tsx
  (tabs)/lineup.tsx
  (tabs)/map.tsx
  (tabs)/brews.tsx
  (tabs)/more.tsx
  artist/[slug].tsx
  set/[id].tsx
  announcement/[id].tsx
  weekend.tsx                 My Weekend
  info/[slug].tsx
src/
  types/content.ts            hand-written for the prototype; mirrors tbb-content/schema
  data/
    snapshot.ts               imports assets/snapshot/*.json, validates, exposes typed data
    repository.ts             ALL content queries live here (pure functions over the snapshot)
    sync.ts                   manifest/hash diff engine (stubbed base URL, offline-safe)
    time.ts                   festival-timezone parsing + formatting helpers
  store/
    useAppStore.ts            Zustand: favorites, tastingLog, settings, dismissedAnnouncements
    storage.ts                platform storage adapter (localStorage web / MMKV-shaped native)
  theme/
    tokens.ts                 raw scale values
    themes.ts                 daylight + night theme objects
    ThemeProvider.tsx         context + useTheme()
    typography.ts
  components/                 shared UI (Screen, Card, Chip, Badge, EmptyState, SectionHeader…)
  features/<name>/            one folder per feature; components + logic used by routes
    home/ schedule/ lineup/ weekend/ map/ brews/ announcements/ info/ settings/
  assets/snapshot/            *.json mock content
scripts/
```

## Type contract — `src/types/content.ts`

Mirror `../tellurideblues-app/plans/01-backend-content-system.md` §2 exactly. Required exports:

```ts
export type StageId = string;      // 'main' | 'blues' | 'showcase' | club venue ids
export type ArtistSlug = string;
export type SetType = 'main' | 'club' | 'showcase' | 'yoga' | 'kids' | '5k' | 'comedy';
export type Priority = 'info' | 'important' | 'urgent';

export interface Festival { id, name, edition, dates: {start: string; end: string},
  timezone: string, venue: {name, lat, lng}, theme: {primary, accent}, links: Record<string,string> }
export interface Stage { id: StageId; name: string; shortName: string; kind: 'main'|'club'|'tent'|'other';
  lat?: number; lng?: number }
export interface Artist { slug, name, bio, photo?, photoCredit?, links: Partial<Record<
  'spotify'|'apple'|'instagram'|'website', string>>, tags: string[], headliner?: boolean }
export interface FestivalSet { id, artist: ArtistSlug, stage: StageId,
  start: string /* ISO w/ offset */, end: string, type: SetType, note?: string }
export interface Brewery { id, name, city, state?, logo? }
export interface Beer { id, brewery: string /* Brewery.id */, name, style, abv: number, sessions: string[] }
export interface ShowcaseSession { id, name, day: string, start: string, end: string }
export interface Place { id, name, kind: 'gate'|'water'|'medical'|'atm'|'restroom'|'shuttle'|'gondola'
  |'food'|'stage'|'camp'|'info', x: number, y: number /* SVG map coords, 0..1000 */,
  lat?: number, lng?: number, note?: string }
export interface Vendor { id, name, kind: 'food'|'craft', place: string /* Place.id */ }
export interface Announcement { id, publishedAt, title, body, priority: Priority,
  push: boolean, audience: string, expiresAt?: string }
export interface InfoPage { slug, title, body /* markdown-ish plain text */, order: number }
export interface ContentSnapshot { festival, stages, artists, schedule, breweries, beers,
  sessions, places, vendors, announcements, info }
```

## Repository contract — `src/data/repository.ts`

Routes and features call ONLY these. Pure, synchronous, no React.

```ts
getFestival(): Festival
getStages(): Stage[]
getStage(id: StageId): Stage | undefined
getArtists(): Artist[]
getArtist(slug: ArtistSlug): Artist | undefined
getSets(): FestivalSet[]
getSet(id: string): FestivalSet | undefined
getSetsForDay(dayISO: string): FestivalSet[]        // festival-local calendar day
getSetsForArtist(slug: ArtistSlug): FestivalSet[]
getSetsForStage(id: StageId): FestivalSet[]
getFestivalDays(): string[]                          // ['2026-09-18', ...]
getNowNext(at: Date): { stageId: StageId; now?: FestivalSet; next?: FestivalSet }[]
searchSets(q: string): FestivalSet[]
getBreweries(): Brewery[]
getBeers(): Beer[]
getBeersForBrewery(id: string): Beer[]
getSessions(): ShowcaseSession[]
getPlaces(): Place[]
getVendors(): Vendor[]
getActiveAnnouncements(at: Date): Announcement[]
getAnnouncement(id: string): Announcement | undefined
getInfoPages(): InfoPage[]
getInfoPage(slug: string): InfoPage | undefined
findConflicts(setIds: string[]): { a: string; b: string; overlapMinutes: number }[]
```

## Store contract — `src/store/useAppStore.ts`

```ts
interface AppState {
  favorites: string[];                                  // FestivalSet ids
  tasting: Record<string, { tried: boolean; rating?: number; note?: string }>;  // keyed by Beer.id
  dismissedAnnouncements: string[];
  settings: { theme: 'daylight' | 'night' | 'system'; reminderLeadMinutes: 5|10|15|30;
              largeText: boolean; ageAcknowledged: boolean };
  hydrated: boolean;
  toggleFavorite(setId: string): void;
  isFavorite(setId: string): boolean;
  setTasting(beerId: string, patch: Partial<{tried: boolean; rating: number; note: string}>): void;
  dismissAnnouncement(id: string): void;
  updateSettings(patch: Partial<AppState['settings']>): void;
  resetAll(): void;
}
```
Persist `favorites`, `tasting`, `dismissedAnnouncements`, `settings` only. Set `hydrated` on rehydrate.

## Theme contract — `src/theme/`

`useTheme()` returns `{ theme: Theme, name: 'daylight'|'night', toggle(): void }`.

```ts
interface Theme {
  colors: { bg, surface, surfaceAlt, border, text, textMuted, textInverse,
            accent, accentText, primary, success, warning, danger,
            stageMain, stageBlues, stageShowcase, stageClub, overlay };
  space: { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32 };
  radius: { sm:6, md:10, lg:16, pill:999 };
  type: { display, h1, h2, h3, body, bodySm, label, mono };   // {fontSize, lineHeight, fontWeight}
  hitSlop: number;   // ensures >=44pt targets
}
```
NO hard-coded color, font size, or spacing literals anywhere outside `src/theme/`.
Daylight must hit WCAG AA (4.5:1) for body text — it is read in direct sun at 8,750 ft.

## Time rules — `src/data/time.ts`

Festival timezone is `America/Denver`, read from `festival.timezone` — never hard-code it at
call sites. Every display of a time renders in FESTIVAL time regardless of device zone.
Export at minimum: `festivalNow()`, `toFestivalDay(iso)`, `formatTime(iso)`, `formatDayLabel(iso)`,
`isLive(set, at)`, `minutesUntil(iso, at)`, `overlapMinutes(a, b)`.
Unit tests must cover a device in a non-Denver zone (set `TZ=Australia/Sydney` in a test).

## Accessibility (enforced in review)

`accessibilityLabel` on every icon-only control. `accessibilityRole` on pressables.
Respect font scaling. Tap targets >= 44pt. Announce live-region changes on the Home screen.

## Mock snapshot rules

Artists, breweries, and beers are FICTIONAL placeholders — the real 2026 lineup is not known
and licensed assets are not cleared. Every artist gets `photo: undefined` and a generated
initials avatar. Put a `_placeholder: true` flag in `festival.json` so it is obvious in the UI
footer that this is not real festival data.

## Definition of done for any agent

- `npx tsc --noEmit` passes with zero errors
- `npm test` passes
- No `any`, no `@ts-ignore`, no hard-coded theme values
- Every file you create is listed in your final report
