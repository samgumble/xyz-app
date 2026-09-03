/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run images:fetch` (scripts/fetch-images.ts) from whatever
 * is actually on disk, so it cannot drift from the mirrored files.
 *
 * React Native resolves static assets at build time, so every path here has
 * to be a literal `require()` — a computed path would bundle nothing.
 */

import type { ImageSourcePropType } from 'react-native';

export interface BrandImages {
  /**
   * The festival's only published mark. The site serves one raster PNG and
   * nothing else — no SVG, no mono, no reversed, no icon-only, no stacked
   * lockup. Anything else has to come from SBG's brand kit.
   */
  readonly logo: ImageSourcePropType;
}

export const brandImages: BrandImages = {
  logo: require('./logo.png'),
};
