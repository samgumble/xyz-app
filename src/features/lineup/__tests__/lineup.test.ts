import { getArtists } from '@/data/repository';

import { shouldUseFallback } from '../ArtistImage';
import { isPerformer, PROGRAM_TAG } from '../model';

/**
 * The client will be looking at the Lineup screen, so a broken image is not
 * acceptable and the fallback rule is tested rather than assumed.
 *
 * This exercises the decision function directly. Rendering the component and
 * firing its `onError` would be the fuller test, but rendering *any* React
 * Native element currently throws in this repo's jest setup — even
 * `render(<Text>hello</Text>)` — which is a shared-config problem, not one of
 * this feature's. The rendered behaviour was verified in the web build
 * instead: see the build report.
 */
describe('shouldUseFallback', () => {
  it('uses initials when the artist has no photo at all', () => {
    const withoutPhoto = getArtists().filter((a) => a.photo === undefined);
    expect(withoutPhoto.length).toBeGreaterThan(0);
    for (const artist of withoutPhoto) {
      expect(shouldUseFallback(artist.photo, false)).toBe(true);
    }
  });

  it('uses the photo for a real act whose URL is present', () => {
    const withPhoto = getArtists().filter((a) => isPerformer(a) && typeof a.photo === 'string');
    expect(withPhoto.length).toBeGreaterThan(0);
    for (const artist of withPhoto) {
      expect(shouldUseFallback(artist.photo, false)).toBe(false);
    }
  });

  it('switches to initials once a remote photo has failed to load', () => {
    const withPhoto = getArtists().find((a) => typeof a.photo === 'string');
    expect(shouldUseFallback(withPhoto?.photo, true)).toBe(true);
  });

  it('treats an empty or blank URL as no photo', () => {
    expect(shouldUseFallback('', false)).toBe(true);
    expect(shouldUseFallback('   ', false)).toBe(true);
    expect(shouldUseFallback(undefined, false)).toBe(true);
  });
});

describe('lineup membership', () => {
  it('keeps the programme placeholders out of the lineup but in the data', () => {
    const all = getArtists();
    const programme = all.filter((a) => !isPerformer(a));
    expect(programme.length).toBeGreaterThan(0);
    for (const entry of programme) {
      expect(entry.tags.map((t) => t.toLowerCase())).toContain(PROGRAM_TAG);
      // They have no photo, which is exactly why they must not reach a poster grid.
      expect(entry.photo).toBeUndefined();
    }
    expect(all.filter(isPerformer).length).toBe(all.length - programme.length);
  });
});
