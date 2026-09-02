import { formatTime } from '@/data/time';
import type { Stage } from '@/types/content';

import type { ScheduleEntry } from './model';

/**
 * Geometry for the stage-column grid. Pure arithmetic — no React, no theme —
 * so it is testable and so the screen only has to position boxes.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** Vertical scale. A 60-minute set is ~108pt tall: two lines and a control. */
export const PX_PER_MINUTE = 1.8;

/** Nothing renders shorter than this, however brief the slot really is. */
export const MIN_BLOCK_HEIGHT = 34;

/** Gap between two sets sharing a lane, so cards never look welded together. */
export const BLOCK_GAP = 2;

export interface GridBlock {
  entry: ScheduleEntry;
  /** Offset from the top of the grid body, in points. */
  top: number;
  height: number;
  /** 0..1 across the column — >1 lane only when sets in one stage overlap. */
  leftFraction: number;
  widthFraction: number;
  /** How many sets share this stage at this moment. */
  lanes: number;
}

export interface GridTick {
  /** `9 AM`, `12:30 PM` — always festival time. */
  label: string;
  top: number;
  /** True on the hour; half-hours draw a lighter rule and no label. */
  major: boolean;
}

export interface GridColumn {
  stage: Stage;
  blocks: GridBlock[];
}

export interface GridLayout {
  columns: GridColumn[];
  ticks: GridTick[];
  /** Instant the grid body starts at, rounded down to the hour. */
  startMs: number;
  endMs: number;
  totalHeight: number;
  pxPerMinute: number;
}

function floorToHour(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS;
}

function ceilToHour(ms: number): number {
  return Math.ceil(ms / HOUR_MS) * HOUR_MS;
}

/**
 * Packs one stage's entries into lanes.
 *
 * Sets on a single stage usually run back to back, but the real data does have
 * genuine double-bills (two Juke Joint acts at 10 PM in the same room), so a
 * cluster of mutually overlapping sets is split across as many lanes as it
 * needs and each lane takes an equal share of the column.
 */
function packLanes(entries: ScheduleEntry[]): { entry: ScheduleEntry; lane: number; lanes: number }[] {
  const sorted = [...entries].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const packed: { entry: ScheduleEntry; lane: number; lanes: number }[] = [];

  let cluster: { entry: ScheduleEntry; lane: number }[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;
  let laneEnds: number[] = [];

  const flush = (): void => {
    const lanes = Math.max(1, laneEnds.length);
    for (const item of cluster) packed.push({ ...item, lanes });
    cluster = [];
    laneEnds = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  };

  for (const entry of sorted) {
    if (cluster.length > 0 && entry.startMs >= clusterEnd) flush();

    let lane = laneEnds.findIndex((end) => end <= entry.startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.endMs);
    } else {
      laneEnds[lane] = entry.endMs;
    }
    cluster.push({ entry, lane });
    clusterEnd = Math.max(clusterEnd, entry.endMs);
  }
  if (cluster.length > 0) flush();

  return packed;
}

export interface GridLayoutOptions {
  pxPerMinute?: number;
  /** Half-hour ticks by default; hour-only when the day is very long. */
  tickMinutes?: number;
}

/**
 * Lays a day out against a time axis running from the hour before the first
 * set to the hour after the last one. An empty day yields an empty layout
 * rather than a degenerate one.
 */
export function computeGridLayout(
  entries: ScheduleEntry[],
  stages: Stage[],
  options: GridLayoutOptions = {},
): GridLayout {
  const pxPerMinute = options.pxPerMinute ?? PX_PER_MINUTE;
  const tickMinutes = options.tickMinutes ?? 30;

  if (entries.length === 0 || stages.length === 0) {
    return {
      columns: stages.map((stage) => ({ stage, blocks: [] })),
      ticks: [],
      startMs: 0,
      endMs: 0,
      totalHeight: 0,
      pxPerMinute,
    };
  }

  const startMs = floorToHour(Math.min(...entries.map((e) => e.startMs)));
  const endMs = ceilToHour(Math.max(...entries.map((e) => e.endMs)));
  const totalHeight = ((endMs - startMs) / MINUTE_MS) * pxPerMinute;

  const columns: GridColumn[] = stages.map((stage) => {
    const forStage = entries.filter((e) => e.stage.id === stage.id);
    const blocks = packLanes(forStage).map(({ entry, lane, lanes }): GridBlock => {
      const top = ((entry.startMs - startMs) / MINUTE_MS) * pxPerMinute;
      const raw = ((entry.endMs - entry.startMs) / MINUTE_MS) * pxPerMinute;
      return {
        entry,
        top,
        height: Math.max(MIN_BLOCK_HEIGHT, raw - BLOCK_GAP),
        leftFraction: lane / lanes,
        widthFraction: 1 / lanes,
        lanes,
      };
    });
    return { stage, blocks };
  });

  const ticks: GridTick[] = [];
  const step = tickMinutes * MINUTE_MS;
  for (let t = startMs; t <= endMs; t += step) {
    const major = t % HOUR_MS === 0;
    ticks.push({
      // Hours read `9 AM`; half-hours keep their minutes for the odd 8:50 start.
      label: major ? formatTime(new Date(t)).replace(':00', '') : formatTime(new Date(t)),
      top: ((t - startMs) / MINUTE_MS) * pxPerMinute,
      major,
    });
  }

  return { columns, ticks, startMs, endMs, totalHeight, pxPerMinute };
}

/** Where "now" sits on the axis, or `undefined` when it is off the grid. */
export function nowOffset(layout: GridLayout, at: Date): number | undefined {
  const ms = at.getTime();
  if (layout.totalHeight === 0 || ms < layout.startMs || ms > layout.endMs) return undefined;
  return ((ms - layout.startMs) / MINUTE_MS) * layout.pxPerMinute;
}
