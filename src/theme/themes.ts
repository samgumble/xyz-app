import { hitSlop, palette, radius, space } from './tokens';
import { typeScale, type TypeScale } from './typography';

export type ThemeName = 'daylight' | 'night';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentText: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  stageMain: string;
  stageBlues: string;
  stageShowcase: string;
  stageCampground: string;
  stageTruck: string;
  stageClub: string;
  overlay: string;
}

export interface Theme {
  colors: ThemeColors;
  space: typeof space;
  radius: typeof radius;
  type: TypeScale;
  /** Extra touch area so every control clears the 44pt minimum. */
  hitSlop: number;
}

/**
 * Daylight is the default. It is read in direct sun at 8,750 ft, so body text
 * is near-black on a warm off-white and the saturated accent is reserved for
 * things you can act on. Every foreground/background pair used for text is
 * verified at 4.5:1 or better by `src/theme/__tests__/contrast.test.ts`.
 */
export const daylight: Theme = {
  colors: {
    bg: palette.paper,
    surface: palette.paperRaised,
    surfaceAlt: palette.paperSunk,
    border: palette.aspenLine,
    text: palette.ink,
    textMuted: palette.inkMuted,
    textInverse: palette.inkInverse,
    accent: palette.redInk,
    accentText: palette.inkInverse,
    primary: palette.goldInk,
    success: palette.pine,
    warning: palette.amber,
    danger: palette.brick,
    stageMain: palette.stageMainDay,
    stageBlues: palette.stageBluesDay,
    stageShowcase: palette.stageShowcaseDay,
    stageCampground: palette.stageCampgroundDay,
    stageTruck: palette.stageTruckDay,
    stageClub: palette.stageClubDay,
    overlay: palette.overlayDay,
  },
  space,
  radius,
  type: typeScale,
  hitSlop,
};

/** Night is for the club shows and for anyone still reading at 1:00 AM. */
export const night: Theme = {
  colors: {
    bg: palette.canyon,
    surface: palette.canyonRaised,
    surfaceAlt: palette.canyonSunk,
    border: palette.canyonLine,
    text: palette.moon,
    textMuted: palette.moonMuted,
    textInverse: palette.canyon,
    accent: palette.brandRed,
    accentText: palette.canyon,
    primary: palette.brandGold,
    success: palette.pineLight,
    warning: palette.amberLight,
    danger: palette.brickLight,
    stageMain: palette.stageMainNight,
    stageBlues: palette.stageBluesNight,
    stageShowcase: palette.stageShowcaseNight,
    stageCampground: palette.stageCampgroundNight,
    stageTruck: palette.stageTruckNight,
    stageClub: palette.stageClubNight,
    overlay: palette.overlayNight,
  },
  space,
  radius,
  type: typeScale,
  hitSlop,
};

export const themes: Record<ThemeName, Theme> = { daylight, night };

/** Maps a stage id onto its identity colour. Unknown stages fall back to main. */
/**
 * A stage's identity colour.
 *
 * The four grounds stages run CONCURRENTLY, so they must be told apart at a
 * glance in the schedule grid — giving two of them the same colour is a real
 * legibility bug, not a cosmetic one. The late-night club venues never overlap
 * with each other on screen, so they can safely share one colour.
 *
 * This is the one place in the app allowed to know stage ids. Screens must call
 * `stageColor()` rather than switching on ids themselves.
 */
const STAGE_COLOR_KEYS: Record<string, keyof ThemeColors> = {
  main: 'stageMain',
  blues: 'stageBlues',
  campground: 'stageCampground',
  truck: 'stageTruck',
  // The Brewers Showcase pours in the Beer Garden; `showcase` is kept as an
  // alias so older content that used it still resolves.
  'beer-garden': 'stageShowcase',
  showcase: 'stageShowcase',
};

export function stageColor(theme: Theme, stageId: string): string {
  const key = STAGE_COLOR_KEYS[stageId];
  return key ? theme.colors[key] : theme.colors.stageClub;
}
