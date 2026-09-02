import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, type LayoutChangeEvent } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

import type { ScheduleEntry } from './model';

/** Default heartbeat for anything that has to know whether a set is live. */
const TICK_MS = 30_000;

/**
 * A clock that re-renders on a slow tick.
 *
 * Every "is this live", "NOW" line and countdown reads from here rather than
 * calling `new Date()` inline, so a screen updates on its own without a set of
 * independently drifting timers.
 */
export function useNow(intervalMs: number = TICK_MS): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface MeasuredWidth {
  /** 0 until the first layout pass. Callers should not lay out until it is > 0. */
  width: number;
  onLayout: (event: LayoutChangeEvent) => void;
}

/**
 * The width a container was actually given.
 *
 * `useWindowDimensions()` is the obvious choice and is wrong here: in the
 * static web export it reports 0 on the pre-rendered pass and never corrects
 * itself, because nothing fires a resize afterwards — which silently collapses
 * every width computed from it. Measuring the container is accurate on both
 * platforms anyway, and it accounts for padding and split-view windows that
 * the window size does not.
 */
export function useContainerWidth(): MeasuredWidth {
  const [width, setWidth] = useState<number>(() => Dimensions.get('window').width);
  const latest = useRef(width);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    // Sub-pixel jitter would otherwise re-render the grid on every scroll.
    if (next > 0 && Math.round(next) !== Math.round(latest.current)) {
      latest.current = next;
      setWidth(next);
    }
  }, []);

  return { width, onLayout };
}

/** Saved set ids as a Set, so membership checks in a list stay O(1). */
export function useFavoriteIds(): ReadonlySet<string> {
  const favorites = useAppStore((s) => s.favorites);
  return useMemo(() => new Set(favorites), [favorites]);
}

export interface EntryFavorite {
  saved: boolean;
  /** Some but not all of a combined bill saved — only reachable via deep links. */
  partial: boolean;
  toggle: () => void;
}

/**
 * Favouriting an *entry*, not a set.
 *
 * A combined comedy bill is four set ids behind one card; saving it has to save
 * all four, or My Weekend would show one comedian from a four-hander. Saved
 * means "any member saved" so a set favourited from an artist page still lights
 * the schedule card up.
 */
export function useEntryFavorite(entry: ScheduleEntry): EntryFavorite {
  const favorites = useFavoriteIds();
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const savedCount = entry.setIds.filter((id) => favorites.has(id)).length;
  const saved = savedCount > 0;

  const toggle = useCallback(() => {
    // Removing clears every member; adding fills in whatever is missing.
    for (const id of entry.setIds) {
      const isSaved = favorites.has(id);
      if (saved && isSaved) toggleFavorite(id);
      else if (!saved && !isSaved) toggleFavorite(id);
    }
  }, [entry.setIds, favorites, saved, toggleFavorite]);

  return { saved, partial: savedCount > 0 && savedCount < entry.setIds.length, toggle };
}
