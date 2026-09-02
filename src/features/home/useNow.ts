import { useEffect, useState } from 'react';

/** Half a minute: fine enough for a countdown in minutes, cheap enough to run always. */
export const DEFAULT_TICK_MS = 30_000;

/**
 * A clock that re-renders its consumer on a fixed interval.
 *
 * The first value is captured once so a static web render and the first client
 * render agree; the interval only starts after mount.
 */
export function useNow(intervalMs: number = DEFAULT_TICK_MS): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => {
      clearInterval(id);
    };
  }, [intervalMs]);

  return now;
}
