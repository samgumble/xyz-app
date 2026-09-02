import { DEFAULT_SETTINGS, useAppStore } from '../useAppStore';

beforeEach(() => {
  useAppStore.getState().resetAll();
});

describe('useAppStore', () => {
  it('reports itself hydrated once persistence has been read', () => {
    expect(useAppStore.getState().hydrated).toBe(true);
  });

  it('starts from the documented defaults', () => {
    const state = useAppStore.getState();
    expect(state.favorites).toEqual([]);
    expect(state.tasting).toEqual({});
    expect(state.dismissedAnnouncements).toEqual([]);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('toggles a favourite on and off', () => {
    const { toggleFavorite, isFavorite } = useAppStore.getState();
    toggleFavorite('fri-main-2120');
    expect(useAppStore.getState().isFavorite('fri-main-2120')).toBe(true);
    expect(useAppStore.getState().favorites).toEqual(['fri-main-2120']);
    toggleFavorite('fri-main-2120');
    expect(useAppStore.getState().isFavorite('fri-main-2120')).toBe(false);
    expect(isFavorite('nothing')).toBe(false);
  });

  it('merges tasting notes rather than replacing them', () => {
    useAppStore.getState().setTasting('wildcat-basin-15', { tried: true });
    useAppStore.getState().setTasting('wildcat-basin-15', { rating: 4 });
    expect(useAppStore.getState().tasting['wildcat-basin-15']).toEqual({ tried: true, rating: 4 });
  });

  it('dismisses an announcement exactly once', () => {
    useAppStore.getState().dismissAnnouncement('2026-08-31-campground-wristbands');
    useAppStore.getState().dismissAnnouncement('2026-08-31-campground-wristbands');
    expect(useAppStore.getState().dismissedAnnouncements).toEqual(['2026-08-31-campground-wristbands']);
  });

  it('patches settings without dropping the rest', () => {
    useAppStore.getState().updateSettings({ theme: 'night' });
    useAppStore.getState().updateSettings({ reminderLeadMinutes: 30 });
    expect(useAppStore.getState().settings).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'night',
      reminderLeadMinutes: 30,
    });
  });

  it('resets everything back to defaults', () => {
    useAppStore.getState().toggleFavorite('fri-main-2120');
    useAppStore.getState().updateSettings({ largeText: true });
    useAppStore.getState().resetAll();
    expect(useAppStore.getState().favorites).toEqual([]);
    expect(useAppStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });
});
