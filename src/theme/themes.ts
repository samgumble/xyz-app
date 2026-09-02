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
export function stageColor(theme: Theme, stageId: string): string {
  switch (stageId) {
    case 'main':
      return theme.colors.stageMain;
    case 'blues':
      return theme.colors.stageBlues;
    case 'showcase':
      return theme.colors.stageShowcase;
    default:
      return theme.colors.stageClub;
  }
}
