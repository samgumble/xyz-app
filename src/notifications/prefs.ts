/**
 * Reminder-local preferences: the master switch and per-slot opt-outs.
 *
 * These deliberately do *not* live in `useAppStore`. That store is a shared
 * contract in BUILD-BRIEF.md that other agents are building against, and it
 * already owns the one setting reminders need from it —
 * `settings.reminderLeadMinutes`, which is read, never duplicated. What is
 * here is state only this feature has an opinion about, kept in its own
 * persisted slice behind the same storage adapter so nothing about the
 * offline-first, on-device rules changes.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_IS_SYNCHRONOUS, storage } from '@/store/storage';

/** Namespaced alongside `tbb-app.v1`, versioned separately. */
export const REMINDER_PREFS_KEY = 'tbb-app.reminders.v1';

export interface ReminderPrefsState {
  /**
   * The master switch. On by default so that saving a set is all it takes —
   * but nothing is ever scheduled until the OS permission is *also* granted,
   * and that is only ever asked for in response to a tap. Defaulting this to
   * true does not cause a prompt.
   */
  enabled: boolean;
  /** Reminder keys the user switched off one at a time. */
  muted: string[];
  hydrated: boolean;

  setEnabled(value: boolean): void;
  setMuted(key: string, muted: boolean): void;
  isMuted(key: string): boolean;
  /**
   * Forget opt-outs for slots that are no longer saved. Unsaving and re-saving
   * a set brings its reminder back, which is what "remove it from my schedule"
   * should mean — and it stops the list growing without bound.
   */
  pruneMuted(liveKeys: readonly string[]): void;
  /**
   * Back to defaults. The app store's `resetAll()` cannot reach this slice, so
   * the "reset all data" control calls both — otherwise a reset would leave
   * stale opt-outs behind and "reset everything" would quietly be a lie.
   */
  resetPrefs(): void;
}

type Persisted = Pick<ReminderPrefsState, 'enabled' | 'muted'>;

const initial: Persisted = { enabled: true, muted: [] };

export const useReminderPrefs = create<ReminderPrefsState>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: STORAGE_IS_SYNCHRONOUS,

      setEnabled(value) {
        set({ enabled: value });
      },

      setMuted(key, muted) {
        const current = get().muted;
        if (muted) {
          if (current.includes(key)) return;
          set({ muted: [...current, key] });
        } else {
          if (!current.includes(key)) return;
          set({ muted: current.filter((id) => id !== key) });
        }
      },

      isMuted(key) {
        return get().muted.includes(key);
      },

      resetPrefs() {

        set({ enabled: initial.enabled, muted: [...initial.muted] });

      },


      pruneMuted(liveKeys) {
        const live = new Set(liveKeys);
        const current = get().muted;
        const next = current.filter((key) => live.has(key));
        if (next.length !== current.length) set({ muted: next });
      },
    }),
    {
      name: REMINDER_PREFS_KEY,
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (state): Persisted => ({ enabled: state.enabled, muted: state.muted }),
      merge: (persisted, current): ReminderPrefsState => {
        const slice = (persisted ?? {}) as Partial<Persisted>;
        return {
          ...current,
          enabled: slice.enabled ?? initial.enabled,
          muted: slice.muted ?? [],
        };
      },
    },
  ),
);

// Mirrors `useAppStore`: flipping `hydrated` outside `create()` keeps it
// correct for both the synchronous web backend (which rehydrates *during*
// `create`, before the const exists) and the async native one.
function markHydrated(): void {
  useReminderPrefs.setState({ hydrated: true });
}

if (useReminderPrefs.persist.hasHydrated()) {
  markHydrated();
} else {
  const unsubscribe = useReminderPrefs.persist.onFinishHydration(() => {
    markHydrated();
    unsubscribe();
  });
}
