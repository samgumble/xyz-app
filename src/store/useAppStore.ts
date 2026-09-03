import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_IS_SYNCHRONOUS, STORAGE_KEY, storage } from './storage';

export type ThemePreference = 'daylight' | 'night' | 'system';
export type ReminderLeadMinutes = 5 | 10 | 15 | 30;

export interface TastingEntry {
  tried: boolean;
  rating?: number;
  note?: string;
}

export interface AppSettings {
  theme: ThemePreference;
  reminderLeadMinutes: ReminderLeadMinutes;
  largeText: boolean;
}

export interface AppState {
  /** `FestivalSet` ids. */
  favorites: string[];
  /** Keyed by `Beer.id`. */
  tasting: Record<string, TastingEntry>;
  dismissedAnnouncements: string[];
  settings: AppSettings;
  /** False until the persisted slice has been read back off disk. */
  hydrated: boolean;

  toggleFavorite(setId: string): void;
  isFavorite(setId: string): boolean;
  setTasting(beerId: string, patch: Partial<TastingEntry>): void;
  dismissAnnouncement(id: string): void;
  updateSettings(patch: Partial<AppSettings>): void;
  resetAll(): void;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'daylight',
  reminderLeadMinutes: 15,
  largeText: false,
};

type PersistedState = Pick<AppState, 'favorites' | 'tasting' | 'dismissedAnnouncements' | 'settings'>;

const initialPersisted: PersistedState = {
  favorites: [],
  tasting: {},
  dismissedAnnouncements: [],
  settings: DEFAULT_SETTINGS,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialPersisted,
      // A synchronous backend (localStorage on web) has already been read by
      // the time anything renders, so the gate would only ever flash. It also
      // keeps the static web export rendering real content: Zustand feeds
      // React's server snapshot from this initial state.
      hydrated: STORAGE_IS_SYNCHRONOUS,

      toggleFavorite(setId) {
        const { favorites } = get();
        set({
          favorites: favorites.includes(setId)
            ? favorites.filter((id) => id !== setId)
            : [...favorites, setId],
        });
      },

      isFavorite(setId) {
        return get().favorites.includes(setId);
      },

      setTasting(beerId, patch) {
        const current = get().tasting[beerId] ?? { tried: false };
        set({ tasting: { ...get().tasting, [beerId]: { ...current, ...patch } } });
      },

      dismissAnnouncement(id) {
        const { dismissedAnnouncements } = get();
        if (dismissedAnnouncements.includes(id)) return;
        set({ dismissedAnnouncements: [...dismissedAnnouncements, id] });
      },

      updateSettings(patch) {
        set({ settings: { ...get().settings, ...patch } });
      },

      resetAll() {
        set({ ...initialPersisted, settings: { ...DEFAULT_SETTINGS } });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (state): PersistedState => ({
        favorites: state.favorites,
        tasting: state.tasting,
        dismissedAnnouncements: state.dismissedAnnouncements,
        settings: state.settings,
      }),
      merge: (persisted, current): AppState => {
        const slice = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...slice,
          settings: { ...DEFAULT_SETTINGS, ...(slice.settings ?? {}) },
        };
      },
    },
  ),
);

/**
 * Flip `hydrated` once persistence has been read back.
 *
 * This lives outside `create()` on purpose: with a synchronous backend
 * (localStorage on web) Zustand hydrates *during* `create()`, so an
 * `onRehydrateStorage` callback that referenced `useAppStore` would hit the
 * const's temporal dead zone. Doing it here works for both sync and async
 * backends, and `hydrated` is left true even when nothing was stored.
 */
function markHydrated(): void {
  useAppStore.setState({ hydrated: true });
}

if (useAppStore.persist.hasHydrated()) {
  markHydrated();
} else {
  const unsubscribe = useAppStore.persist.onFinishHydration(() => {
    markHydrated();
    unsubscribe();
  });
}
