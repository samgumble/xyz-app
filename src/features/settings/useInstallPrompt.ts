import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { storage } from '@/store/storage';

/**
 * The event Chromium fires when a site meets the install criteria. It is not in
 * lib.dom, so it is declared here rather than reached for with a cast.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface InstallPromptState {
  /** False on iOS and Android builds; everything below is then inert. */
  isWeb: boolean;
  /** Already launched from the home screen, so there is nothing to offer. */
  isInstalled: boolean;
  /** Chromium has a deferred prompt waiting; show an Install button. */
  canPrompt: boolean;
  /** iOS Safari, not installed, and the coach mark has not been dismissed. */
  showIosCoachMark: boolean;
  /** Resolved once persisted state has been read, so nothing flashes. */
  ready: boolean;
  promptInstall(): Promise<InstallOutcome>;
  dismissIosCoachMark(): void;
}

/**
 * Namespaced per deploy path. `__tbbBase` is published by the injected
 * `register-sw.js`; the fallback covers a dev server at the origin root.
 */
function dismissalKey(): string {
  const candidate: unknown = (globalThis as { __tbbBase?: unknown }).__tbbBase;
  const base = typeof candidate === 'string' && candidate.length > 0 ? candidate : '/';
  return `tbb-app.v1${base}a2hs-dismissed`;
}

/** Reads the prompt `register-sw.js` parked on `window` before React mounted. */
function parkedPrompt(): BeforeInstallPromptEvent | null {
  const candidate: unknown = (globalThis as { __tbbInstallPrompt?: unknown }).__tbbInstallPrompt;
  if (candidate === null || typeof candidate !== 'object') return null;
  if (typeof (candidate as { prompt?: unknown }).prompt !== 'function') return null;
  return candidate as BeforeInstallPromptEvent;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    // matchMedia is missing in some embedded webviews.
  }
  // iOS predates `display-mode` and reports installs on `navigator` instead.
  const legacy: unknown = (navigator as { standalone?: unknown }).standalone;
  return legacy === true;
}

/**
 * iOS Safari specifically.
 *
 * Every iOS browser is WebKit underneath, but "Add to Home Screen" lives in
 * Safari's own share sheet, and the coach mark describes Safari's UI — showing
 * it inside Chrome or Firefox for iOS would be instructions for a menu that is
 * not there. Chromium never gets here anyway: it has a real install prompt.
 *
 * Exported as a pure function so the user-agent matching, which is the part
 * that quietly rots, is unit-testable without a browser.
 */
export function isIosSafariUserAgent(userAgent: string, maxTouchPoints: number): boolean {
  const iPhoneOrIPad = /iPad|iPhone|iPod/.test(userAgent);
  // iPadOS 13+ reports a desktop Macintosh UA; touch points give it away.
  const iPadDesktopMode = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  if (!iPhoneOrIPad && !iPadDesktopMode) return false;

  // The in-app browsers and the third-party iOS browsers, all of which append
  // their own token to an otherwise Safari-shaped user agent.
  return !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|FBAN|FBAV|Instagram|Line\//.test(userAgent);
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIosSafariUserAgent(navigator.userAgent, navigator.maxTouchPoints);
}

/**
 * Install affordances for the web build, per plan 05 §3.
 *
 * Android and desktop Chromium get a real install prompt, captured before
 * React mounts and replayed on demand. iOS Safari has no such API, so it gets
 * a one-time dismissible coach mark instead. On the native builds every field
 * is inert and no listener is attached.
 */
export function useInstallPrompt(): InstallPromptState {
  const isWeb = Platform.OS === 'web';

  const [installed, setInstalled] = useState<boolean>(() => (isWeb ? isStandalone() : false));
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => (isWeb ? parkedPrompt() !== null : false));
  const [coachDismissed, setCoachDismissed] = useState(true);
  const [ready, setReady] = useState(!isWeb);

  const iosSafari = useMemo(() => (isWeb ? isIosSafari() : false), [isWeb]);

  // Read the persisted dismissal. Starting dismissed and revealing after the
  // read means the coach mark never flashes up and disappear again.
  useEffect(() => {
    if (!isWeb) return;
    let cancelled = false;

    void (async () => {
      const stored = await Promise.resolve(storage.getItem(dismissalKey()));
      if (cancelled) return;
      setCoachDismissed(stored === '1');
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    // `register-sw.js` owns the native listeners and re-broadcasts, so a prompt
    // that fired during first paint is not lost to React's mount timing.
    const onAvailable = (): void => setHasPrompt(parkedPrompt() !== null);
    const onInstalled = (): void => {
      setHasPrompt(false);
      setInstalled(true);
    };

    window.addEventListener('tbb:installavailable', onAvailable);
    window.addEventListener('tbb:installed', onInstalled);

    let media: MediaQueryList | null = null;
    const onDisplayModeChange = (): void => setInstalled(isStandalone());
    try {
      media = window.matchMedia('(display-mode: standalone)');
      media.addEventListener('change', onDisplayModeChange);
    } catch {
      media = null;
    }

    return () => {
      window.removeEventListener('tbb:installavailable', onAvailable);
      window.removeEventListener('tbb:installed', onInstalled);
      if (media) media.removeEventListener('change', onDisplayModeChange);
    };
  }, [isWeb]);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const deferred = parkedPrompt();
    if (!deferred) return 'unavailable';

    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // A deferred prompt is single-use, whatever the answer.
      (globalThis as { __tbbInstallPrompt?: unknown }).__tbbInstallPrompt = null;
      setHasPrompt(false);
      if (choice.outcome === 'accepted') setInstalled(true);
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  const dismissIosCoachMark = useCallback((): void => {
    setCoachDismissed(true);
    void Promise.resolve(storage.setItem(dismissalKey(), '1'));
  }, []);

  return {
    isWeb,
    isInstalled: installed,
    canPrompt: isWeb && !installed && hasPrompt,
    showIosCoachMark: isWeb && ready && iosSafari && !installed && !coachDismissed,
    ready,
    promptInstall,
    dismissIosCoachMark,
  };
}
