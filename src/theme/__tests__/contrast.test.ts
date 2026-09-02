import { daylight, night, stageColor, themes } from '../themes';
import type { Theme } from '../themes';
import { scaleType, typeScale } from '../typography';

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const BACKGROUNDS = ['bg', 'surface', 'surfaceAlt'] as const;
const FOREGROUNDS = [
  'text',
  'textMuted',
  'accent',
  'primary',
  'success',
  'warning',
  'danger',
  'stageMain',
  'stageBlues',
  'stageShowcase',
  'stageClub',
] as const;

describe.each([
  ['daylight', daylight],
  ['night', night],
])('%s theme contrast', (name, theme: Theme) => {
  it.each(FOREGROUNDS)('%s clears WCAG AA on every surface', (fg) => {
    for (const bg of BACKGROUNDS) {
      const ratio = contrast(theme.colors[fg], theme.colors[bg]);
      expect({ name, fg, bg, ratio: Number(ratio.toFixed(2)) }).toMatchObject({
        ratio: expect.any(Number),
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps button labels legible on the accent fill', () => {
    expect(contrast(theme.colors.accentText, theme.colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps inverse text legible on the opposite ground', () => {
    expect(contrast(theme.colors.textInverse, theme.colors.text)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('theme shape', () => {
  it('exposes both named themes', () => {
    expect(Object.keys(themes)).toEqual(['daylight', 'night']);
  });

  it('gives every stage its own colour', () => {
    const day = ['main', 'blues', 'showcase', 'opera-house'].map((id) => stageColor(daylight, id));
    expect(new Set(day).size).toBe(4);
    expect(stageColor(daylight, 'fly-me-to-the-moon')).toBe(daylight.colors.stageClub);
  });

  it('uses a 4pt spacing scale and a 44pt-safe hit slop', () => {
    expect(daylight.space).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });
    expect(daylight.radius).toEqual({ sm: 6, md: 10, lg: 16, pill: 999 });
    expect(daylight.hitSlop).toBeGreaterThan(0);
  });

  it('scales the whole ramp for the large-text setting', () => {
    const bigger = scaleType(typeScale, 1.15);
    expect(bigger.body.fontSize).toBeGreaterThan(typeScale.body.fontSize);
    expect(bigger.body.fontWeight).toBe(typeScale.body.fontWeight);
    expect(scaleType(typeScale, 1)).toBe(typeScale);
  });
});
