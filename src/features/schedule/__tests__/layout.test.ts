import { getSets } from '@/data/repository';

import { computeGridLayout, MIN_BLOCK_HEIGHT, nowOffset, PX_PER_MINUTE } from '../layout';
import { entriesForDay, getScheduleDays, stagesForEntries } from '../model';

/** The busiest published day — the one the grid has to survive. */
function busiestDay(): string {
  return [...getScheduleDays()].sort(
    (a, b) => entriesForDay(b).length - entriesForDay(a).length,
  )[0] as string;
}

describe('computeGridLayout', () => {
  it('gives every entry a block, on the right stage column', () => {
    const day = busiestDay();
    const entries = entriesForDay(day);
    const layout = computeGridLayout(entries, stagesForEntries(entries));

    const placed = layout.columns.flatMap((c) => c.blocks.map((b) => b.entry.id));
    expect(new Set(placed).size).toBe(entries.length);

    for (const column of layout.columns) {
      for (const block of column.blocks) {
        expect(block.entry.stage.id).toBe(column.stage.id);
      }
    }
  });

  it('positions blocks proportionally to the time axis', () => {
    const entries = entriesForDay(busiestDay());
    const layout = computeGridLayout(entries, stagesForEntries(entries));

    for (const column of layout.columns) {
      for (const block of column.blocks) {
        const expectedTop = ((block.entry.startMs - layout.startMs) / 60_000) * PX_PER_MINUTE;
        expect(block.top).toBeCloseTo(expectedTop, 5);
        expect(block.height).toBeGreaterThanOrEqual(MIN_BLOCK_HEIGHT);
      }
    }
  });

  it('lanes genuinely overlapping sets on one stage side by side', () => {
    const entries = entriesForDay(busiestDay());
    const layout = computeGridLayout(entries, stagesForEntries(entries));

    for (const column of layout.columns) {
      // Two blocks in the same column may only share horizontal space if their
      // times do not overlap.
      for (const a of column.blocks) {
        for (const b of column.blocks) {
          if (a.entry.id === b.entry.id) continue;
          const timeOverlap = a.entry.startMs < b.entry.endMs && b.entry.startMs < a.entry.endMs;
          const spaceOverlap =
            a.leftFraction < b.leftFraction + b.widthFraction &&
            b.leftFraction < a.leftFraction + a.widthFraction;
          expect(timeOverlap && spaceOverlap).toBe(false);
        }
      }
    }
  });

  it('splits the column when a real double bill shares a room', () => {
    // The published data has two Juke Joint acts booked into one venue at once.
    const doubled = getSets().filter(
      (s) =>
        s.type !== 'comedy' &&
        getSets().some(
          (other) =>
            other.id !== s.id &&
            other.stage === s.stage &&
            other.type !== 'comedy' &&
            Date.parse(other.start) < Date.parse(s.end) &&
            Date.parse(s.start) < Date.parse(other.end),
        ),
    );
    expect(doubled.length).toBeGreaterThan(0);

    const day = getScheduleDays().find((d) =>
      entriesForDay(d).some((e) => e.id === doubled[0]?.id),
    ) as string;
    const entries = entriesForDay(day);
    const layout = computeGridLayout(entries, stagesForEntries(entries));
    const lanes = layout.columns.flatMap((c) => c.blocks.map((b) => b.lanes));
    expect(Math.max(...lanes)).toBeGreaterThan(1);
  });

  it('runs its axis from the hour before the first set to the hour after the last', () => {
    const entries = entriesForDay(busiestDay());
    const layout = computeGridLayout(entries, stagesForEntries(entries));
    expect(layout.startMs).toBeLessThanOrEqual(Math.min(...entries.map((e) => e.startMs)));
    expect(layout.endMs).toBeGreaterThanOrEqual(Math.max(...entries.map((e) => e.endMs)));
    expect(layout.ticks[0]?.major).toBe(true);
    expect(layout.totalHeight).toBeGreaterThan(0);
  });

  it('degrades to an empty layout rather than dividing by zero', () => {
    const layout = computeGridLayout([], []);
    expect(layout.columns).toHaveLength(0);
    expect(layout.totalHeight).toBe(0);
    expect(nowOffset(layout, new Date())).toBeUndefined();
  });
});

describe('nowOffset', () => {
  it('is undefined off the grid and proportional on it', () => {
    const entries = entriesForDay(busiestDay());
    const layout = computeGridLayout(entries, stagesForEntries(entries));

    expect(nowOffset(layout, new Date(layout.startMs - 60_000))).toBeUndefined();
    expect(nowOffset(layout, new Date(layout.endMs + 60_000))).toBeUndefined();
    expect(nowOffset(layout, new Date(layout.startMs))).toBe(0);

    const middle = layout.startMs + (layout.endMs - layout.startMs) / 2;
    expect(nowOffset(layout, new Date(middle))).toBeCloseTo(layout.totalHeight / 2, 5);
  });
});
