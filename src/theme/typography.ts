import type { TextStyle } from 'react-native';

/**
 * One type ramp shared by both themes. `fontWeight` is typed as
 * `TextStyle['fontWeight']` so styles compose without casting.
 */
export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
}

export interface TypeScale {
  display: TypeStyle;
  h1: TypeStyle;
  h2: TypeStyle;
  h3: TypeStyle;
  body: TypeStyle;
  bodySm: TypeStyle;
  label: TypeStyle;
  mono: TypeStyle;
}

export const typeScale: TypeScale = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  h1: { fontSize: 27, lineHeight: 33, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  mono: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
};

/** Multiplier applied when the user turns on the large-text setting. */
export const LARGE_TEXT_SCALE = 1.15;

export function scaleType(scale: TypeScale, factor: number): TypeScale {
  if (factor === 1) return scale;
  const one = (t: TypeStyle): TypeStyle => ({
    fontSize: Math.round(t.fontSize * factor),
    lineHeight: Math.round(t.lineHeight * factor),
    fontWeight: t.fontWeight,
  });
  return {
    display: one(scale.display),
    h1: one(scale.h1),
    h2: one(scale.h2),
    h3: one(scale.h3),
    body: one(scale.body),
    bodySm: one(scale.bodySm),
    label: one(scale.label),
    mono: one(scale.mono),
  };
}
