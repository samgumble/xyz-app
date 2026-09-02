import { Platform } from 'react-native';

/**
 * Minimal key/value contract shared by every platform backend. It matches the
 * shape of both `localStorage` (sync) and AsyncStorage / MMKV (async), and is
 * what Zustand's `createJSONStorage` expects.
 */
export interface KeyValueStorage {
  getItem(name: string): string | null | Promise<string | null>;
  setItem(name: string, value: string): void | Promise<void>;
  removeItem(name: string): void | Promise<void>;
}

/** Namespaced so a future second festival in the same app cannot collide. */
export const STORAGE_KEY = 'tbb-app.v1';

function hasLocalStorage(): boolean {
  try {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
  } catch {
    // Some privacy modes throw on property access rather than returning undefined.
    return false;
  }
}

/** Web backend. Every call is wrapped because Safari private mode throws on write. */
const webStorage: KeyValueStorage = {
  getItem(name) {
    if (!hasLocalStorage()) return null;
    try {
      return globalThis.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    if (!hasLocalStorage()) return;
    try {
      globalThis.localStorage.setItem(name, value);
    } catch {
      // Quota or private-mode failure: the app keeps working, it just forgets.
    }
  },
  removeItem(name) {
    if (!hasLocalStorage()) return;
    try {
      globalThis.localStorage.removeItem(name);
    } catch {
      // Ignore.
    }
  },
};

/**
 * Native backend for the prototype: an AsyncStorage-shaped in-memory map.
 *
 * The production app swaps this single object for MMKV (or AsyncStorage) —
 * nothing else in the codebase touches persistence, so that change is local
 * to this file. Kept dependency-free here so the prototype installs and tests
 * without a native module.
 */
const memory = new Map<string, string>();

const nativeStorage: KeyValueStorage = {
  async getItem(name) {
    return memory.get(name) ?? null;
  },
  async setItem(name, value) {
    memory.set(name, value);
  },
  async removeItem(name) {
    memory.delete(name);
  },
};

export const storage: KeyValueStorage = Platform.OS === 'web' ? webStorage : nativeStorage;

/**
 * True when reads resolve without awaiting, which is what lets the web build
 * render real content on the very first pass instead of a spinner. The native
 * backend is promise-based, so there the store genuinely starts un-hydrated.
 */
export const STORAGE_IS_SYNCHRONOUS = Platform.OS === 'web';

/** Test/reset helper for the native in-memory backend. */
export function clearMemoryStorage(): void {
  memory.clear();
}
