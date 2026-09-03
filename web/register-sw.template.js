/* eslint-disable */
/**
 * Telluride Blues & Brews — service worker registration + install-prompt capture.
 *
 * `scripts/build-pwa.mjs` substitutes the sub-path placeholder and writes this to
 * `dist/register-sw.js`, then links it from every exported HTML file. It runs
 * before the Expo bundle, which matters: Chrome fires `beforeinstallprompt`
 * during the first paint, long before React mounts, so the event has to be
 * caught here and parked on `window` for `useInstallPrompt()` to pick up.
 *
 * This lives outside the React tree entirely so the native build never sees it.
 */
(function () {
  'use strict';

  var BASE = '__BASE__';

  // Published so the app can namespace its own browser storage to this deploy.
  // GitHub Pages serves every repo of an account from one origin, so a bare
  // localStorage key is shared with whatever else is deployed alongside it.
  window.__tbbBase = BASE;

  // ---------------------------------------------------------------------
  // Install prompt (Android / Chromium). iOS Safari never fires this.
  // ---------------------------------------------------------------------
  window.__tbbInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', function (event) {
    // Suppress Chrome's own mini-infobar so the app can offer install in the
    // More screen, where it sits next to an explanation of what it does.
    event.preventDefault();
    window.__tbbInstallPrompt = event;
    window.dispatchEvent(new Event('tbb:installavailable'));
  });

  window.addEventListener('appinstalled', function () {
    window.__tbbInstallPrompt = null;
    window.dispatchEvent(new Event('tbb:installed'));
  });

  // ---------------------------------------------------------------------
  // Service worker
  // ---------------------------------------------------------------------
  if (!('serviceWorker' in navigator)) return;

  // A worker only registers on a secure context; localhost counts as one.
  if (!window.isSecureContext) return;

  var RELOAD_KEY = 'tbb' + BASE + 'sw-reloaded-at';
  var RELOAD_COOLDOWN_MS = 10000;

  /**
   * True when this page load was already being served by a worker. On a first
   * ever visit it is false, and the `clients.claim()` in the worker's activate
   * handler still fires `controllerchange` — reloading there would bounce a
   * brand-new visitor for no reason.
   */
  var hadController = !!navigator.serviceWorker.controller;
  var reloading = false;

  function applyUpdate(worker) {
    // Tell the waiting worker to take over. The `controllerchange` handler
    // below then reloads once so the new deploy is what the client reviews —
    // a worker stuck in `waiting` forever is the failure mode that matters.
    worker.postMessage({ type: 'SKIP_WAITING' });
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading || !hadController) return;
    reloading = true;

    // A time-boxed guard rather than a one-shot flag: whatever goes wrong, the
    // worst case is one reload per ten seconds, never a reload loop.
    try {
      var last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch (error) {
      /* Storage disabled (private mode): reload once and accept the risk. */
    }

    window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker
      // `updateViaCache: 'none'` stops the browser's HTTP cache from serving a
      // stale sw.js, which would pin the client to an old build.
      .register(BASE + 'sw.js', { scope: BASE, updateViaCache: 'none' })
      .then(function (registration) {
        if (registration.waiting && navigator.serviceWorker.controller) {
          applyUpdate(registration.waiting);
        }

        registration.addEventListener('updatefound', function () {
          var installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', function () {
            // `controller` is null on the very first install — nothing to
            // replace, so let it activate quietly with no reload.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              applyUpdate(installing);
            }
          });
        });

        // Warm the bundled artist imagery once the app is up and the first
        // paint is well past, so airplane mode later in the weekend still has
        // photos. Best-effort inside the worker; nothing here waits on it.
        navigator.serviceWorker.ready
          .then(function (ready) {
            if (!ready.active) return;
            setTimeout(function () {
              ready.active.postMessage({ type: 'PREWARM' });
            }, 4000);
          })
          .catch(function () {
            /* no active worker yet — the next load will warm it */
          });

        // Coming back to the tab is the cheapest honest moment to look for a
        // new deploy; plan 05 §4 wants a schedule change visible within 5 min.
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') {
            registration.update().catch(function () {
              /* offline — try again next time */
            });
          }
        });
      })
      .catch(function (error) {
        // Registration failing must never take the app down with it.
        if (window.console && window.console.warn) {
          window.console.warn('[tbb] service worker registration failed', error);
        }
      });
  });
})();
