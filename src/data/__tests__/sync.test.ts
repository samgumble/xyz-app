import type { Announcement } from '@/types/content';

import { getSnapshot, resetSnapshot } from '../snapshot';
import {
  BASE_URL,
  configureSync,
  diffManifest,
  getLastUpdatedAt,
  getSyncState,
  resetSync,
  syncNow,
  type FetchLike,
  type Manifest,
} from '../sync';

const TEST_BASE = 'https://tbb-test.invalid/data/v1';

interface Route {
  status?: number;
  body?: unknown;
  etag?: string;
  /** Throws instead of responding — the "no network" case. */
  fail?: string;
  /** Returns a body that is not JSON. */
  badJson?: boolean;
}

function makeFetch(routes: Record<string, Route>): { fetchImpl: FetchLike; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl: FetchLike = async (input) => {
    calls.push(input);
    const route = routes[input];
    if (!route) throw new TypeError(`Network request failed: no route for ${input}`);
    if (route.fail) throw new TypeError(route.fail);
    return {
      ok: (route.status ?? 200) >= 200 && (route.status ?? 200) < 300,
      status: route.status ?? 200,
      headers: { get: (name: string) => (name.toLowerCase() === 'etag' ? (route.etag ?? null) : null) },
      json: async () => {
        if (route.badJson) throw new SyntaxError('Unexpected token < in JSON');
        return route.body;
      },
    };
  };
  return { fetchImpl, calls };
}

function manifest(overrides: Partial<Manifest['files']> = {}, version = '2026.09.05-1412'): Manifest {
  return {
    version,
    generatedAt: '2026-09-05T14:12:00-06:00',
    festival: 'tbb-2026',
    files: {
      announcements: { path: 'announcements.json', hash: 'ann-1', bytes: 100 },
      schedule: { path: 'schedule.json', hash: 'sched-1', bytes: 200 },
      ...overrides,
    },
  };
}

const freshAnnouncements: Announcement[] = [
  {
    id: '2026-09-19-weather-hold',
    publishedAt: '2026-09-19T15:10:00-06:00',
    title: 'Weather hold — Main Stage',
    body: 'Lightning within 8 miles. Please clear the field and shelter in place.',
    priority: 'urgent',
    push: true,
    audience: 'all',
    expiresAt: '2026-09-19T18:00:00-06:00',
  },
];

beforeEach(() => {
  resetSnapshot();
  resetSync();
});

afterAll(() => {
  resetSnapshot();
  resetSync();
});

describe('configuration', () => {
  it('ships pointing at a placeholder host that cannot resolve', () => {
    // RFC 2606 reserves `.invalid`, so the prototype provably cannot reach a
    // live server. Production swaps this for app.tellurideblues.com.
    expect(BASE_URL).toContain('.invalid');
    expect(BASE_URL).not.toContain('tellurideblues.com');
  });
});

describe('diffManifest', () => {
  it('reports every file on a first run, when nothing is known yet', () => {
    expect(diffManifest(manifest(), {})).toEqual(['schedule', 'announcements']);
  });

  it('reports only the files whose hash moved', () => {
    expect(diffManifest(manifest(), { schedule: 'sched-1', announcements: 'ann-0' })).toEqual([
      'announcements',
    ]);
  });

  it('reports nothing when every hash matches', () => {
    expect(diffManifest(manifest(), { schedule: 'sched-1', announcements: 'ann-1' })).toEqual([]);
  });
});

describe('offline safety', () => {
  it('swallows a network failure and keeps the bundled snapshot', async () => {
    const before = getSnapshot().announcements;
    const { fetchImpl } = makeFetch({
      [`${TEST_BASE}/manifest.json`]: { fail: 'Network request failed' },
    });
    configureSync({ fetchImpl, baseUrl: TEST_BASE });

    const result = await syncNow();

    expect(result.status).toBe('offline');
    expect(result.changedFiles).toEqual([]);
    expect(result.reason).toMatch(/Network request failed/);
    expect(getSnapshot().announcements).toBe(before);
    expect(getLastUpdatedAt()).toBeNull();
  });

  it('treats a 500 as offline rather than throwing', async () => {
    const { fetchImpl } = makeFetch({ [`${TEST_BASE}/manifest.json`]: { status: 500 } });
    configureSync({ fetchImpl, baseUrl: TEST_BASE });

    await expect(syncNow()).resolves.toMatchObject({ status: 'offline' });
  });

  it('treats unparseable JSON as offline', async () => {
    const { fetchImpl } = makeFetch({ [`${TEST_BASE}/manifest.json`]: { badJson: true } });
    configureSync({ fetchImpl, baseUrl: TEST_BASE });

    await expect(syncNow()).resolves.toMatchObject({ status: 'offline' });
  });

  it('degrades gracefully when the platform has no fetch at all', async () => {
    configureSync({ fetchImpl: null, baseUrl: TEST_BASE });
    const original = (globalThis as { fetch?: unknown }).fetch;
    delete (globalThis as { fetch?: unknown }).fetch;
    try {
      await expect(syncNow()).resolves.toMatchObject({ status: 'offline' });
    } finally {
      if (original) (globalThis as { fetch?: unknown }).fetch = original;
    }
  });

  it('keeps the snapshot when a file fetch fails halfway through', async () => {
    const before = getSnapshot().announcements;
    const { fetchImpl } = makeFetch({
      [`${TEST_BASE}/manifest.json`]: { body: manifest() },
      [`${TEST_BASE}/schedule.json`]: { fail: 'Connection reset' },
    });
    configureSync({ fetchImpl, baseUrl: TEST_BASE });

    const result = await syncNow();

    expect(result.status).toBe('offline');
    expect(getSnapshot().announcements).toBe(before);
    expect(getSyncState().hashes).toEqual({});
  });
});

describe('hash diff', () => {
  it('fetches only the files whose hash changed and swaps them in', async () => {
    const { fetchImpl, calls } = makeFetch({
      [`${TEST_BASE}/manifest.json`]: {
        body: manifest({ schedule: undefined }),
        etag: 'W/"v1"',
      },
      [`${TEST_BASE}/announcements.json`]: { body: freshAnnouncements },
    });
    configureSync({ fetchImpl, baseUrl: TEST_BASE, now: () => new Date('2026-09-19T15:11:00-06:00') });

    const result = await syncNow();

    expect(result.status).toBe('updated');
    expect(result.changedFiles).toEqual(['announcements']);
    expect(result.version).toBe('2026.09.05-1412');
    expect(calls).toEqual([`${TEST_BASE}/manifest.json`, `${TEST_BASE}/announcements.json`]);
    expect(getSnapshot().announcements).toEqual(freshAnnouncements);
    // Untouched files are still the bundled ones.
    expect(getSnapshot().schedule.length).toBeGreaterThan(50);
    expect(getLastUpdatedAt()?.toISOString()).toBe('2026-09-19T21:11:00.000Z');
  });

  it('does nothing on a second pass when the hashes have not moved', async () => {
    const routes = {
      [`${TEST_BASE}/manifest.json`]: { body: manifest({ schedule: undefined }), etag: 'W/"v1"' },
      [`${TEST_BASE}/announcements.json`]: { body: freshAnnouncements },
    };
    const first = makeFetch(routes);
    configureSync({ fetchImpl: first.fetchImpl, baseUrl: TEST_BASE });
    await syncNow();

    const second = makeFetch(routes);
    configureSync({ fetchImpl: second.fetchImpl, baseUrl: TEST_BASE });
    const result = await syncNow();

    expect(result.status).toBe('unchanged');
    expect(result.changedFiles).toEqual([]);
    expect(second.calls).toEqual([`${TEST_BASE}/manifest.json`]);
  });

  it('sends If-None-Match once it has an ETag and honours a 304', async () => {
    const seenHeaders: (Record<string, string> | undefined)[] = [];
    const routes: Record<string, Route> = {
      [`${TEST_BASE}/manifest.json`]: { body: manifest({ schedule: undefined }), etag: 'W/"v1"' },
      [`${TEST_BASE}/announcements.json`]: { body: freshAnnouncements },
    };
    const base = makeFetch(routes);
    const spyFetch: FetchLike = (input, init) => {
      seenHeaders.push(init?.headers);
      return base.fetchImpl(input, init);
    };
    configureSync({ fetchImpl: spyFetch, baseUrl: TEST_BASE });
    await syncNow();

    routes[`${TEST_BASE}/manifest.json`] = { status: 304, etag: 'W/"v1"' };
    const result = await syncNow();

    expect(result.status).toBe('unchanged');
    expect(seenHeaders[0]?.['if-none-match']).toBeUndefined();
    expect(seenHeaders[seenHeaders.length - 1]?.['if-none-match']).toBe('W/"v1"');
  });
});

describe('bad publishes', () => {
  it('rejects content that fails validation and keeps the old snapshot', async () => {
    const before = getSnapshot().schedule;
    const { fetchImpl } = makeFetch({
      [`${TEST_BASE}/manifest.json`]: { body: manifest({ announcements: undefined }) },
      [`${TEST_BASE}/schedule.json`]: {
        body: [
          {
            id: 'fri-main-1200',
            artist: 'an-artist-who-does-not-exist',
            stage: 'main',
            start: '2026-09-18T12:00:00-06:00',
            end: '2026-09-18T13:00:00-06:00',
            type: 'main',
          },
        ],
      },
    });
    configureSync({ fetchImpl, baseUrl: TEST_BASE });

    const result = await syncNow();

    expect(result.status).toBe('rejected');
    expect(result.reason).toMatch(/unknown artist/);
    expect(getSnapshot().schedule).toBe(before);
    expect(getSyncState().hashes).toEqual({});
  });

  it('rejects a manifest that is not a manifest', async () => {
    const { fetchImpl } = makeFetch({
      [`${TEST_BASE}/manifest.json`]: { body: { hello: 'world' } },
    });
    configureSync({ fetchImpl, baseUrl: TEST_BASE });

    await expect(syncNow()).resolves.toMatchObject({ status: 'rejected' });
  });
});
