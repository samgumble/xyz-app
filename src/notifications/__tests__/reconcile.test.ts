/**
 * Reconciliation against a fake OS.
 *
 * `FakeScheduler` keeps the same contract the real one does — a bag of pending
 * notifications keyed by an opaque identifier, each carrying its reminder key
 * and signature — so these tests exercise the real convergence path without
 * `expo-notifications` in the room. Every case here is a sequence of events a
 * real weekend produces: save, unsave, change the lead time, have a set move
 * under you, have a set cancelled, come back a day later.
 */

import { applyReminderPlan } from '../reconcile';
import { reminderSignature, type ReminderPlanInput } from '../plan';
import type {
  PlannedReminder,
  ReminderScheduler,
  ReminderSubject,
  ScheduledRecord,
} from '../types';

const NOW = Date.parse('2026-09-18T12:00:00-06:00');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

class FakeScheduler implements ReminderScheduler {
  readonly supported = true;
  private next = 1;
  private pending = new Map<string, ScheduledRecord>();

  /** Every identifier ever handed out, so a leak shows up as a stale entry. */
  scheduleCalls = 0;
  cancelCalls = 0;
  /** When set, `schedule` throws — the OS refusing a slot. */
  failOnKey: string | null = null;

  async getPermission() {
    return 'granted' as const;
  }
  async requestPermission() {
    return 'granted' as const;
  }
  async list(): Promise<ScheduledRecord[]> {
    return [...this.pending.values()];
  }
  async schedule(reminder: PlannedReminder): Promise<string> {
    this.scheduleCalls += 1;
    if (this.failOnKey === reminder.key) throw new Error('OS refused');
    const identifier = `n${this.next++}`;
    this.pending.set(identifier, {
      identifier,
      key: reminder.key,
      signature: reminder.signature,
    });
    return identifier;
  }
  async cancel(identifier: string): Promise<void> {
    this.cancelCalls += 1;
    this.pending.delete(identifier);
  }

  /** Test-only: plant a pending notification, e.g. one left by a previous run. */
  seed(key: string, signature: string): string {
    const identifier = `n${this.next++}`;
    this.pending.set(identifier, { identifier, key, signature });
    return identifier;
  }

  keys(): string[] {
    return [...this.pending.values()].map((r) => r.key).sort();
  }
  size(): number {
    return this.pending.size;
  }
}

function subject(key: string, startMs: number, extra: Partial<ReminderSubject> = {}): ReminderSubject {
  return {
    key,
    setIds: [key],
    title: key,
    stageName: 'Main Stage',
    timeLabel: '2:00 PM',
    start: new Date(startMs).toISOString(),
    startMs,
    ...extra,
  };
}

function input(overrides: Partial<ReminderPlanInput> = {}): ReminderPlanInput {
  return {
    subjects: [],
    leadMinutes: 15,
    nowMs: NOW,
    enabled: true,
    ...overrides,
  };
}

describe('applyReminderPlan', () => {
  it('schedules a reminder when a set is saved', async () => {
    const os = new FakeScheduler();
    const fish = subject('fish', NOW + 2 * HOUR);

    const outcome = await applyReminderPlan(os, input({ subjects: [fish] }));

    expect(outcome.created).toBe(1);
    expect(os.keys()).toEqual(['fish']);
  });

  it('cancels the reminder when the set is unsaved', async () => {
    const os = new FakeScheduler();
    const fish = subject('fish', NOW + 2 * HOUR);
    await applyReminderPlan(os, input({ subjects: [fish] }));

    const outcome = await applyReminderPlan(os, input({ subjects: [] }));

    expect(outcome.cancelled).toBe(1);
    expect(os.size()).toBe(0);
  });

  it('is idempotent — a second identical pass changes nothing', async () => {
    const os = new FakeScheduler();
    const subjects = [subject('a', NOW + 2 * HOUR), subject('b', NOW + 3 * HOUR)];

    await applyReminderPlan(os, input({ subjects }));
    const second = await applyReminderPlan(os, input({ subjects }));

    expect(second.created).toBe(0);
    expect(second.cancelled).toBe(0);
    expect(second.kept).toBe(2);
    expect(os.size()).toBe(2);
    expect(os.scheduleCalls).toBe(2);
  });

  it('stays at one reminder per set across ten repeat passes', async () => {
    const os = new FakeScheduler();
    const subjects = [subject('a', NOW + 2 * HOUR)];

    for (let i = 0; i < 10; i += 1) {
      await applyReminderPlan(os, input({ subjects }));
    }

    expect(os.size()).toBe(1);
    expect(os.scheduleCalls).toBe(1);
  });

  it('reschedules everything when the lead time changes', async () => {
    const os = new FakeScheduler();
    const subjects = [subject('a', NOW + 2 * HOUR), subject('b', NOW + 3 * HOUR)];
    await applyReminderPlan(os, input({ subjects, leadMinutes: 15 }));

    const outcome = await applyReminderPlan(os, input({ subjects, leadMinutes: 30 }));

    expect(outcome.cancelled).toBe(2);
    expect(outcome.created).toBe(2);
    expect(outcome.kept).toBe(0);
    expect(os.size()).toBe(2);
    expect(outcome.plan.scheduled.every((r) => r.leadMinutes === 30)).toBe(true);
    expect(outcome.plan.scheduled[0]?.fireAtMs).toBe(NOW + 2 * HOUR - 30 * MINUTE);
  });

  it('reschedules a set whose start time moved in a content update', async () => {
    const os = new FakeScheduler();
    const original = subject('a', NOW + 2 * HOUR);
    await applyReminderPlan(os, input({ subjects: [original] }));

    const moved = subject('a', NOW + 3 * HOUR, { timeLabel: '3:00 PM' });
    const outcome = await applyReminderPlan(os, input({ subjects: [moved] }));

    expect(outcome.cancelled).toBe(1);
    expect(outcome.created).toBe(1);
    expect(os.size()).toBe(1);
    expect(outcome.plan.scheduled[0]?.fireAtMs).toBe(NOW + 3 * HOUR - 15 * MINUTE);
  });

  it('reschedules a set that moved to a different stage, with the new text', async () => {
    const os = new FakeScheduler();
    await applyReminderPlan(os, input({ subjects: [subject('a', NOW + 2 * HOUR)] }));

    const moved = subject('a', NOW + 2 * HOUR, { stageName: 'Blues Stage' });
    const outcome = await applyReminderPlan(os, input({ subjects: [moved] }));

    expect(outcome.created).toBe(1);
    expect(outcome.plan.scheduled[0]?.body).toContain('Blues Stage');
  });

  it('cancels the reminder for a set that was cancelled in a content update', async () => {
    const os = new FakeScheduler();
    const keeping = subject('a', NOW + 2 * HOUR);
    const doomed = subject('b', NOW + 3 * HOUR);
    await applyReminderPlan(os, input({ subjects: [keeping, doomed] }));

    // A cancelled set stops resolving, so it stops producing a subject.
    const outcome = await applyReminderPlan(os, input({ subjects: [keeping] }));

    expect(outcome.cancelled).toBe(1);
    expect(os.keys()).toEqual(['a']);
  });

  it('never schedules a set that is already in the past', async () => {
    const os = new FakeScheduler();
    const outcome = await applyReminderPlan(
      os,
      input({ subjects: [subject('yesterday', NOW - DAY)] }),
    );

    expect(outcome.created).toBe(0);
    expect(os.size()).toBe(0);
    expect(outcome.plan.skipped).toEqual([{ key: 'yesterday', reason: 'past' }]);
  });

  it('cancels a reminder once its set has slipped into the past', async () => {
    const os = new FakeScheduler();
    const set = subject('a', NOW + 2 * HOUR);
    await applyReminderPlan(os, input({ subjects: [set] }));

    // Same saved set, but the clock has moved past it.
    const outcome = await applyReminderPlan(os, input({ subjects: [set], nowMs: NOW + 3 * HOUR }));

    expect(outcome.cancelled).toBe(1);
    expect(os.size()).toBe(0);
  });

  it('cancels everything when the master switch goes off, and restores it after', async () => {
    const os = new FakeScheduler();
    const subjects = [subject('a', NOW + 2 * HOUR), subject('b', NOW + 3 * HOUR)];
    await applyReminderPlan(os, input({ subjects }));

    const off = await applyReminderPlan(os, input({ subjects, enabled: false }));
    expect(off.cancelled).toBe(2);
    expect(os.size()).toBe(0);

    const on = await applyReminderPlan(os, input({ subjects }));
    expect(on.created).toBe(2);
    expect(os.size()).toBe(2);
  });

  it('cancels only the muted set when one is switched off individually', async () => {
    const os = new FakeScheduler();
    const subjects = [subject('a', NOW + 2 * HOUR), subject('b', NOW + 3 * HOUR)];
    await applyReminderPlan(os, input({ subjects }));

    const outcome = await applyReminderPlan(os, input({ subjects, mutedKeys: ['a'] }));

    expect(outcome.cancelled).toBe(1);
    expect(os.keys()).toEqual(['b']);
  });

  it('picks up a set that has come inside the horizon since the last pass', async () => {
    const os = new FakeScheduler();
    const far = subject('far', NOW + 9 * DAY);

    const first = await applyReminderPlan(os, input({ subjects: [far] }));
    expect(first.created).toBe(0);
    expect(first.plan.skipped).toEqual([{ key: 'far', reason: 'beyond-horizon' }]);

    const later = await applyReminderPlan(
      os,
      input({ subjects: [far], nowMs: NOW + 3 * DAY }),
    );
    expect(later.created).toBe(1);
    expect(os.keys()).toEqual(['far']);
  });

  it('adopts a matching notification left behind by a previous launch', async () => {
    const os = new FakeScheduler();
    const set = subject('a', NOW + 2 * HOUR);
    os.seed('a', reminderSignature(set, 15));

    const outcome = await applyReminderPlan(os, input({ subjects: [set] }));

    expect(outcome.created).toBe(0);
    expect(outcome.kept).toBe(1);
    expect(os.scheduleCalls).toBe(0);
  });

  it('cleans up duplicates left by an interrupted earlier run', async () => {
    const os = new FakeScheduler();
    const set = subject('a', NOW + 2 * HOUR);
    const signature = reminderSignature(set, 15);
    os.seed('a', signature);
    os.seed('a', signature);
    os.seed('a', signature);

    const outcome = await applyReminderPlan(os, input({ subjects: [set] }));

    expect(os.size()).toBe(1);
    expect(outcome.cancelled).toBe(2);
    expect(outcome.kept).toBe(1);
    expect(outcome.created).toBe(0);
  });

  it('cancels a stray reminder for a set that is no longer saved at all', async () => {
    const os = new FakeScheduler();
    os.seed('ghost', 'whatever');

    const outcome = await applyReminderPlan(os, input({ subjects: [] }));

    expect(outcome.cancelled).toBe(1);
    expect(os.size()).toBe(0);
  });

  it('counts an OS refusal instead of abandoning the rest of the pass', async () => {
    const os = new FakeScheduler();
    os.failOnKey = 'b';
    const subjects = [
      subject('a', NOW + 2 * HOUR),
      subject('b', NOW + 3 * HOUR),
      subject('c', NOW + 4 * HOUR),
    ];

    const outcome = await applyReminderPlan(os, input({ subjects }));

    expect(outcome.created).toBe(2);
    expect(outcome.failed).toBe(1);
    expect(os.keys()).toEqual(['a', 'c']);
  });

  it('retries the refused one on the next pass', async () => {
    const os = new FakeScheduler();
    os.failOnKey = 'b';
    const subjects = [subject('a', NOW + 2 * HOUR), subject('b', NOW + 3 * HOUR)];
    await applyReminderPlan(os, input({ subjects }));

    os.failOnKey = null;
    const outcome = await applyReminderPlan(os, input({ subjects }));

    expect(outcome.created).toBe(1);
    expect(os.keys()).toEqual(['a', 'b']);
  });

  it('reports the keys the OS is holding after the pass', async () => {
    const os = new FakeScheduler();
    const subjects = [
      subject('a', NOW + 2 * HOUR),
      subject('b', NOW + 3 * HOUR),
      subject('past', NOW - HOUR),
    ];

    const outcome = await applyReminderPlan(os, input({ subjects }));

    expect([...outcome.scheduledKeys].sort()).toEqual(['a', 'b']);
  });

  it('does nothing at all on a scheduler that cannot schedule', async () => {
    const unsupported: ReminderScheduler = {
      supported: false,
      async getPermission() {
        return 'undetermined';
      },
      async requestPermission() {
        return 'undetermined';
      },
      async list() {
        return [];
      },
      async schedule() {
        return null;
      },
      async cancel() {
        /* no-op */
      },
    };

    const outcome = await applyReminderPlan(
      unsupported,
      input({ subjects: [subject('a', NOW + 2 * HOUR)] }),
    );

    expect(outcome.created).toBe(0);
    expect(outcome.failed).toBe(1);
    expect(outcome.scheduledKeys).toEqual([]);
  });
});
