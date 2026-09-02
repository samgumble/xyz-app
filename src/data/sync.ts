import type { ContentSnapshot, SnapshotKey } from '@/types/content';

import { getSnapshot, setSnapshot, validateSnapshot } from './snapshot';

/**
 * Manifest / hash-diff sync engine (plans/02 §3).
 *
 * The rule that matters: this is best-effort. Any failure — no network, DNS
 * miss, 500, malformed JSON, a publish that fails validation — is swallowed,
 * and the snapshot already in memory stays authoritative. Nothing here may
 * block the UI, and no Tier 1 screen may depend on it having run.
 */

/**
 * PLACEHOLDER. `.invalid` is reserved by RFC 2606 and never resolves, so the
 * prototype provably cannot reach a live host. Production points this at
 * `https://app.tellurideblues.com/data/v1` — and nothing else, per CLAUDE.md.
 */
export const BASE_URL = 'https://tbb-content.invalid/data/v1';

/** Poll cadence: relaxed off-season, tighter during the festival itself. */
export const POLL_INTERVAL_MS = 10 * 60 * 1000;
export const FESTIVAL_WEEK_POLL_INTERVAL_MS = 3 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 8000;

export interface ManifestFile {
  path: string;
  hash: string;
  bytes?: number;
}

export interface Manifest {
  version: string;
  generatedAt: string;
  festival: string;
  files: Partial<Record<SnapshotKey, ManifestFile>>;
}

export type SyncStatus =
  /** Manifest differed and at least one file was replaced. */
  | 'updated'
  /** Reached the server; nothing to do (304, or every hash matched). */
  | 'unchanged'
  /** Could not reach the server, or the server said something unusable. */
  | 'offline'
  /** Server content was reachable but rejected — the old snapshot stands. */
  | 'rejected';

export interface SyncResult {
  status: SyncStatus;
  /** Snapshot keys that were replaced this run. */
  changedFiles: SnapshotKey[];
  /** Manifest version now in effect, when known. */
  version?: string;
  /** ISO timestamp of the last run that actually changed content. */
  lastUpdatedAt?: string;
  /** Human-readable reason for `offline` / `rejected`. Never shown modally. */
  reason?: string;
}

export interface SyncState {
  lastUpdatedAt: string | null;
  lastCheckedAt: string | null;
  version: string | null;
  etag: string | null;
  /** Hash of each file as of the last successful fetch. */
  hashes: Partial<Record<SnapshotKey, string>>;
  inFlight: boolean;
}

export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

interface SyncConfig {
  baseUrl: string;
  fetchImpl: FetchLike | null;
  now: () => Date;
}

const SNAPSHOT_KEYS: readonly SnapshotKey[] = [
  'festival',
  'stages',
  'artists',
  'schedule',
  'breweries',
  'beers',
  'sessions',
  'places',
  'vendors',
  'announcements',
  'info',
];

function defaultFetch(): FetchLike | null {
  const g = globalThis as { fetch?: unknown };
  return typeof g.fetch === 'function' ? (g.fetch as FetchLike) : null;
}

let config: SyncConfig = { baseUrl: BASE_URL, fetchImpl: null, now: () => new Date() };

let state: SyncState = {
  lastUpdatedAt: null,
  lastCheckedAt: null,
  version: null,
  etag: null,
  hashes: {},
  inFlight: false,
};

/** Overrides for tests and for pointing the engine at staging. */
export function configureSync(patch: Partial<SyncConfig>): void {
  config = { ...config, ...patch };
}

/** Wipes sync bookkeeping. Does not touch the snapshot itself. */
export function resetSync(): void {
  config = { baseUrl: BASE_URL, fetchImpl: null, now: () => new Date() };
  state = {
    lastUpdatedAt: null,
    lastCheckedAt: null,
    version: null,
    etag: null,
    hashes: {},
    inFlight: false,
  };
}

export function getSyncState(): SyncState {
  return { ...state, hashes: { ...state.hashes } };
}

/**
 * When content last actually changed, or null if it never has and the bundled
 * snapshot is all we have. Settings renders this as "last updated 3 min ago".
 */
export function getLastUpdatedAt(): Date | null {
  return state.lastUpdatedAt ? new Date(state.lastUpdatedAt) : null;
}

function isManifest(value: unknown): value is Manifest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Manifest>;
  return typeof candidate.version === 'string' && typeof candidate.files === 'object' && candidate.files !== null;
}

/** Keys whose published hash differs from what we last fetched. */
export function diffManifest(
  manifest: Manifest,
  knownHashes: Partial<Record<SnapshotKey, string>>,
): SnapshotKey[] {
  const changed: SnapshotKey[] = [];
  for (const key of SNAPSHOT_KEYS) {
    const entry = manifest.files[key];
    if (!entry || typeof entry.hash !== 'string') continue;
    if (knownHashes[key] !== entry.hash) changed.push(key);
  }
  return changed;
}

async function getJson(fetchImpl: FetchLike, url: string, headers: Record<string, string>) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    return await fetchImpl(url, controller ? { headers, signal: controller.signal } : { headers });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * One sync pass. Resolves — never rejects. Safe to call on app start, on
 * foreground, and on a timer; overlapping calls short-circuit.
 */
export async function syncNow(): Promise<SyncResult> {
  if (state.inFlight) {
    return { status: 'unchanged', changedFiles: [], reason: 'A sync is already running' };
  }

  const fetchImpl = config.fetchImpl ?? defaultFetch();
  if (!fetchImpl) {
    return { status: 'offline', changedFiles: [], reason: 'No fetch implementation available' };
  }

  state.inFlight = true;
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (state.etag) headers['if-none-match'] = state.etag;

    let manifestResponse;
    try {
      manifestResponse = await getJson(fetchImpl, `${config.baseUrl}/manifest.json`, headers);
    } catch (error) {
      return offline(error);
    }

    state.lastCheckedAt = config.now().toISOString();

    if (manifestResponse.status === 304) {
      return {
        status: 'unchanged',
        changedFiles: [],
        ...(state.version ? { version: state.version } : {}),
        ...(state.lastUpdatedAt ? { lastUpdatedAt: state.lastUpdatedAt } : {}),
      };
    }

    if (!manifestResponse.ok) {
      return { status: 'offline', changedFiles: [], reason: `manifest.json returned ${manifestResponse.status}` };
    }

    let manifestBody: unknown;
    try {
      manifestBody = await manifestResponse.json();
    } catch (error) {
      return offline(error);
    }

    if (!isManifest(manifestBody)) {
      return { status: 'rejected', changedFiles: [], reason: 'manifest.json is not a manifest' };
    }
    const manifest = manifestBody;

    const changed = diffManifest(manifest, state.hashes);
    const etag = manifestResponse.headers.get('etag');

    if (changed.length === 0) {
      state.etag = etag;
      state.version = manifest.version;
      return {
        status: 'unchanged',
        changedFiles: [],
        version: manifest.version,
        ...(state.lastUpdatedAt ? { lastUpdatedAt: state.lastUpdatedAt } : {}),
      };
    }

    // Build the candidate on a copy so a partial failure changes nothing.
    const next: ContentSnapshot = { ...getSnapshot() };
    const fetched: SnapshotKey[] = [];

    for (const key of changed) {
      const entry = manifest.files[key];
      if (!entry) continue;
      let fileResponse;
      try {
        fileResponse = await getJson(fetchImpl, `${config.baseUrl}/${entry.path}`, {
          accept: 'application/json',
        });
      } catch (error) {
        return offline(error);
      }
      if (!fileResponse.ok) {
        return { status: 'offline', changedFiles: [], reason: `${entry.path} returned ${fileResponse.status}` };
      }
      let body: unknown;
      try {
        body = await fileResponse.json();
      } catch (error) {
        return offline(error);
      }
      // Assigning through a typed record: validateSnapshot below is the gate.
      (next as Record<SnapshotKey, unknown>)[key] = body;
      fetched.push(key);
    }

    const issues = validateSnapshot(next);
    if (issues.length > 0) {
      return {
        status: 'rejected',
        changedFiles: [],
        version: manifest.version,
        reason: `Published content failed validation: ${issues[0] ?? 'unknown problem'}`,
      };
    }

    setSnapshot(next);

    const updatedAt = config.now().toISOString();
    const hashes = { ...state.hashes };
    for (const key of fetched) {
      const entry = manifest.files[key];
      if (entry) hashes[key] = entry.hash;
    }
    state = {
      ...state,
      hashes,
      etag,
      version: manifest.version,
      lastUpdatedAt: updatedAt,
      lastCheckedAt: updatedAt,
    };

    return {
      status: 'updated',
      changedFiles: fetched,
      version: manifest.version,
      lastUpdatedAt: updatedAt,
    };
  } finally {
    state.inFlight = false;
  }
}

function offline(error: unknown): SyncResult {
  const reason = error instanceof Error ? error.message : 'Network request failed';
  return { status: 'offline', changedFiles: [], reason };
}
