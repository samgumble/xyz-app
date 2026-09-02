import { getSets } from '@/data/repository';
import { toFestivalDay } from '@/data/time';

import { buildWeekendPlan, conflictsFor, formatDuration } from '../model';

describe('buildWeekendPlan', () => {
  it('is empty, not broken, with nothing saved', () => {
    const plan = buildWeekendPlan([]);
    expect(plan.days).toHaveLength(0);
    expect(plan.entries).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.totalMinutes).toBe(0);
  });

  it('ignores a saved id that is no longer in the schedule', () => {
    const real = getSets()[0];
    const plan = buildWeekendPlan([real?.id ?? '', 'a-set-that-was-cancelled']);
    expect(plan.entries).toHaveLength(1);
  });

  it('groups by festival day, in day and then time order', () => {
    const plan = buildWeekendPlan(getSets().map((s) => s.id));
    expect(plan.days.map((d) => d.day)).toEqual([...plan.days.map((d) => d.day)].sort());
    for (const day of plan.days) {
      for (const entry of day.entries) expect(toFestivalDay(entry.start)).toBe(day.day);
      const starts = day.entries.map((e) => e.startMs);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    }
  });

  it('reports one clash per pair of acts, not one per performer', () => {
    const plan = buildWeekendPlan(getSets().map((s) => s.id));
    const keys = plan.conflicts.map((c) => [c.a.id, c.b.id].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);

    // A combined comedy bill is several set ids behind one entry; it must never
    // be reported as clashing with itself.
    for (const conflict of plan.conflicts) {
      expect(conflict.a.id).not.toBe(conflict.b.id);
      expect(conflict.overlapMinutes).toBeGreaterThan(0);
    }
  });

  it('finds each entry its own clashes', () => {
    const plan = buildWeekendPlan(getSets().map((s) => s.id));
    const clashing = plan.conflicts[0];
    expect(clashing).toBeDefined();
    const found = conflictsFor(plan, clashing?.a.id ?? '');
    expect(found.length).toBeGreaterThan(0);
  });

  it('counts distinct artists and stages, not rows', () => {
    const plan = buildWeekendPlan(getSets().map((s) => s.id));
    expect(plan.stageCount).toBe(new Set(getSets().map((s) => s.stage)).size);
    expect(plan.artistCount).toBe(new Set(getSets().map((s) => s.artist)).size);
  });
});

describe('formatDuration', () => {
  it('reads the way a person would say it', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(270)).toBe('4h 30m');
  });
});
