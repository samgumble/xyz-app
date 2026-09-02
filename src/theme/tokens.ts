/**
 * Raw scale values. Nothing in the app may hard-code a colour, font size, or
 * spacing literal — everything comes from here by way of `themes.ts` and the
 * `Theme` object handed out by `useTheme()`.
 */

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/**
 * Extra touch area added around small controls so every target clears 44pt,
 * which is the iOS HIG minimum and roughly Android's 48dp.
 */
export const hitSlop = 12;

/** Minimum rendered height for anything tappable. */
export const minTouchTarget = 44;

export const borderWidth = {
  hairline: 1,
  thick: 2,
} as const;

export const opacity = {
  pressed: 0.72,
  disabled: 0.45,
} as const;

/**
 * Warm mountain-fall palette. Daylight is the default because the festival is
 * read outdoors in direct sun at 8,750 ft; night exists for the club shows.
 */
export const palette = {
  // Warm neutrals — paper, aspen, granite.
  paper: '#FBF7F0',
  paperRaised: '#FFFFFF',
  paperSunk: '#F1E9DC',
  aspenLine: '#D9CDBB',
  ink: '#191512',
  inkMuted: '#574F45',
  inkInverse: '#FDFAF5',

  // Night — canyon dark.
  canyon: '#121010',
  canyonRaised: '#1C1918',
  canyonSunk: '#262220',
  canyonLine: '#3B3532',
  moon: '#F6F0E6',
  moonMuted: '#AFA396',

  // Accents.
  rust: '#A8461F',
  rustLight: '#C4693F',
  gold: '#E8A33D',
  goldDeep: '#8A5D0B',
  denim: '#1F3A5F',
  denimLight: '#8CB3DE',

  // Status.
  pine: '#1F5C42',
  pineLight: '#6FCB9F',
  amber: '#8A5A11',
  amberLight: '#E6B963',
  brick: '#9C2A20',
  brickLight: '#EE8478',

  // Stage identity.
  stageMainDay: '#1F3A5F',
  stageMainNight: '#8CB3DE',
  stageBluesDay: '#0F5B57',
  stageBluesNight: '#5FC9BF',
  stageShowcaseDay: '#8A5D0B',
  stageShowcaseNight: '#E8A33D',
  stageClubDay: '#5C2A62',
  stageClubNight: '#CB9BD4',

  overlayDay: 'rgba(25, 21, 18, 0.55)',
  overlayNight: 'rgba(0, 0, 0, 0.66)',
} as const;
