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
 * The festival's real brand palette, read from tellurideblues.com's stylesheet
 * on 2026-09-01: a hot red (#FF3D48) and a gold (#CBA020) on white with a full
 * neutral grey ramp. No blues, no gradients.
 *
 * Two of those brand values cannot be used as text on a light ground and still
 * clear WCAG AA: #FF3D48 lands at 3.1:1 on white and #CBA020 at 2.1:1. So the
 * brand hues are kept intact for fills, bars, and the night theme, and darkened
 * variants (`redInk`, `goldInk`) carry anything that has to be *read* in
 * daylight. `src/theme/__tests__/contrast.test.ts` enforces this.
 */
export const palette = {
  // Brand, exactly as published — decorative fills and night-theme accents.
  brandRed: '#FF3D48',
  brandRedSoft: '#F65959',
  brandGold: '#CBA020',

  // Darkened brand hues that clear 4.5:1 on the light surfaces.
  redInk: '#C4202B',
  goldInk: '#7A5E0A',

  // Neutral ramp, matching the site.
  paper: '#F7F7F7',
  paperRaised: '#FFFFFF',
  paperSunk: '#EEEEEE',
  aspenLine: '#CCCCCC',
  ink: '#1A1A1A',
  inkMuted: '#5C5C5C',
  inkInverse: '#FFFFFF',

  // Night — the canyon after the headliner.
  canyon: '#121010',
  canyonRaised: '#1C1918',
  canyonSunk: '#262220',
  canyonLine: '#3B3532',
  moon: '#F6F0E6',
  moonMuted: '#AFA396',

  // Status.
  pine: '#1F5C42',
  pineLight: '#6FCB9F',
  amber: '#8A5A11',
  amberLight: '#E6B963',
  brick: '#8C1A14',
  brickLight: '#EE8478',

  // Stage identity — four distinguishable hues, each AA on both grounds.
  // Brand red is deliberately NOT used here; it means "actionable", not "stage".
  stageMainDay: '#1F3A5F',
  stageMainNight: '#8CB3DE',
  stageBluesDay: '#0F5B57',
  stageBluesNight: '#5FC9BF',
  stageShowcaseDay: '#7A5E0A',
  stageShowcaseNight: '#E8A33D',
  stageClubDay: '#5C2A62',
  stageClubNight: '#CB9BD4',

  overlayDay: 'rgba(26, 26, 26, 0.55)',
  overlayNight: 'rgba(0, 0, 0, 0.66)',
} as const;
