#!/usr/bin/env node
/**
 * Post-export PWA step.
 *
 *   npx expo export --platform web   # writes dist/
 *   node scripts/build-pwa.mjs       # makes dist/ installable and offline-capable
 *
 * An optional first argument points it at another export directory, which is
 * how you verify a build locally without racing whatever else writes dist/:
 *
 *   npx expo export --platform web --output-dir dist-check
 *   node scripts/build-pwa.mjs dist-check
 *
 * Emits into `dist/`:
 *   manifest.webmanifest   name/icons/display/start_url/scope for the sub-path
 *   icons/*.png            copied from web/icons (see scripts/gen-pwa-icons.sh)
 *   sw.js                  web/sw.template.js with a precache list generated
 *                          from the files that were actually exported
 *   register-sw.js         web/register-sw.template.js
 * and injects the manifest link, icon links, theme colour and the registration
 * script into every exported HTML file.
 *
 * Written in plain ESM JavaScript rather than TypeScript on purpose: the repo
 * has no `tsx`/`ts-node`, and adding one just to run a 250-line build step
 * would put a dependency into a project whose CLAUDE.md constrains them. It is
 * type-checked informally through JSDoc and validated by actually running.
 *
 * SUB-PATH RULE: this deploy is served from `https://<user>.github.io/xyz-app/`,
 * never from the origin root. Every URL this script writes is derived from
 * `expo.experiments.baseUrl` in app.json — the same value Expo used to rewrite
 * the bundle's own `<script src>` — so the two can never drift apart.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Defaults to dist/; an argument lets you point it at an alternate export. */
const DIST = path.resolve(ROOT, process.argv[2] ?? 'dist');
const WEB = path.join(ROOT, 'web');
const ICON_SRC = path.join(WEB, 'icons');

/** Marks HTML this script has already touched, so re-running is a no-op. */
const MARKER = '<!--tbb-pwa-->';

/** Never precached: the worker itself, its registration, and host metadata. */
const PRECACHE_EXCLUDE = new Set(['sw.js', 'register-sw.js', 'robots.txt', '.nojekyll']);

main();

function main() {
  if (!fs.existsSync(DIST)) {
    fail(`No export found at ${DIST}. Run \`npx expo export --platform web\` first.`);
  }

  const base = readBaseUrl();
  const colors = readBrandColors();

  const icons = copyIcons();
  writeManifest(base, colors, icons);
  writeRegistration(base);

  // HTML is rewritten before the precache is hashed, so the service worker's
  // version covers the bytes that will actually be served.
  const htmlFiles = injectIntoHtml(base, colors);

  const precache = collectPrecache(base);
  const version = writeServiceWorker(base, precache);

  console.log('--- pwa ---');
  console.log(`base            ${base}`);
  console.log(`theme colour    ${colors.theme}`);
  console.log(`icons           ${icons.length} (${icons.map((i) => i.name).join(', ')})`);
  console.log(`precache        ${precache.urls.length} files, ${kb(precache.bytes)} (blocking)`);
  console.log(`prewarm         ${precache.prewarmUrls.length} images, ${kb(precache.prewarmBytes)} (background)`);
  console.log(`sw version      ${version}`);
  console.log(`html injected   ${htmlFiles.length} (${htmlFiles.join(', ')})`);
  console.log(`start_url       ${base}`);
  console.log(`sw scope        ${base}`);
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * The one source of truth for the sub-path. Returns it normalised with leading
 * and trailing slashes, e.g. `/xyz-app/`; `/` when the app is root-hosted.
 *
 * @returns {string}
 */
function readBaseUrl() {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const raw = appJson?.expo?.experiments?.baseUrl ?? '';

  if (typeof raw !== 'string') fail('expo.experiments.baseUrl in app.json is not a string.');
  if (raw === '' || raw === '/') return '/';

  const trimmed = raw.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmed === '') return '/';
  return `/${trimmed}/`;
}

/**
 * Brand colours, read out of the theme tokens rather than restated here, so the
 * manifest cannot drift away from the app it is installing.
 *
 * @returns {{ theme: string, background: string }}
 */
function readBrandColors() {
  const tokens = fs.readFileSync(path.join(ROOT, 'src/theme/tokens.ts'), 'utf8');
  return {
    // The true published brand red. The theme keeps a darkened `redInk` for
    // anything that has to be *read*; a manifest theme colour is chrome, not
    // text, so it gets the real thing.
    theme: readToken(tokens, 'brandRed'),
    // Matches the daylight theme's `colors.bg`, which is what the splash and
    // the first paint actually show.
    background: readToken(tokens, 'paper'),
  };
}

/**
 * @param {string} source
 * @param {string} name
 * @returns {string}
 */
function readToken(source, name) {
  const match = new RegExp(`\\b${name}:\\s*'(#[0-9A-Fa-f]{3,8})'`).exec(source);
  if (!match || !match[1]) fail(`Could not read palette.${name} from src/theme/tokens.ts.`);
  return match[1];
}

// ---------------------------------------------------------------------------
// Icons + manifest
// ---------------------------------------------------------------------------

/**
 * @returns {{ name: string, size: number, maskable: boolean }[]}
 */
function copyIcons() {
  if (!fs.existsSync(ICON_SRC)) {
    fail('web/icons is missing. Run ./scripts/gen-pwa-icons.sh (macOS) to rebuild it.');
  }

  const destDir = path.join(DIST, 'icons');
  fs.mkdirSync(destDir, { recursive: true });

  const files = fs.readdirSync(ICON_SRC).filter((name) => name.endsWith('.png')).sort();
  if (files.length === 0) fail('web/icons contains no PNGs.');

  /** @type {{ name: string, size: number, maskable: boolean }[]} */
  const icons = [];
  for (const name of files) {
    fs.copyFileSync(path.join(ICON_SRC, name), path.join(destDir, name));
    const size = pngSize(path.join(ICON_SRC, name));
    icons.push({ name, size, maskable: name.includes('maskable') });
  }

  // An install prompt does not fire without a 192 and a 512, so say so loudly
  // rather than shipping a site that silently refuses to install.
  for (const required of [192, 512]) {
    if (!icons.some((icon) => icon.size === required && !icon.maskable)) {
      fail(`web/icons has no ${required}x${required} "any" icon; Chrome will not offer install.`);
    }
  }
  if (!icons.some((icon) => icon.maskable)) fail('web/icons has no maskable icon.');

  return icons;
}

/**
 * Reads width from a PNG's IHDR chunk. Enough to verify the icon set without
 * pulling in an image library.
 *
 * @param {string} file
 * @returns {number}
 */
function pngSize(file) {
  const header = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, header, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.readUInt32BE(0) !== 0x89504e47) fail(`${file} is not a PNG.`);
  return header.readUInt32BE(16);
}

/**
 * @param {string} base
 * @param {{ theme: string, background: string }} colors
 * @param {{ name: string, size: number, maskable: boolean }[]} icons
 */
function writeManifest(base, colors, icons) {
  const manifest = {
    // `id` pins the app identity to the sub-path. Without it the browser
    // derives identity from start_url, and two apps on the same Pages account
    // would fight over the same install slot.
    id: base,
    name: 'Telluride Blues & Brews',
    short_name: 'Blues & Brews',
    description:
      'Schedule, lineup, map and Brewers Showcase for the Telluride Blues & Brews Festival. Works with no signal.',
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: colors.theme,
    background_color: colors.background,
    lang: 'en-US',
    dir: 'ltr',
    categories: ['music', 'events', 'travel'],
    icons: icons.map((icon) => ({
      src: `${base}icons/${icon.name}`,
      sizes: `${icon.size}x${icon.size}`,
      type: 'image/png',
      purpose: icon.maskable ? 'maskable' : 'any',
    })),
  };

  fs.writeFileSync(
    path.join(DIST, 'manifest.webmanifest'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

// ---------------------------------------------------------------------------
// Service worker
// ---------------------------------------------------------------------------

/**
 * The precache list must be generated, never written by hand: Expo content-hashes
 * the bundle filename on every build, so a hardcoded list goes stale instantly.
 *
 * @param {string} base
 * @returns {{ urls: string[], prewarmUrls: string[], bytes: number, prewarmBytes: number, digest: string }}
 */
function collectPrecache(base) {
  const files = walk(DIST)
    .map((abs) => path.relative(DIST, abs).split(path.sep).join('/'))
    .filter((rel) => !PRECACHE_EXCLUDE.has(rel))
    .filter((rel) => !rel.split('/').some((segment) => segment.startsWith('.')))
    .sort();

  const keep = files.filter(
    (rel) =>
      // Skip Expo Router's placeholder HTML for dynamic (`[slug]`) and group
      // (`(tabs)`) routes. Nothing links to them — the app links to `/schedule`,
      // `/artist/samantha-fish` and so on — and their bracketed filenames have
      // to be percent-encoded in a Request URL, which is an easy way for a
      // single 404 to fail `cache.addAll` and leave the app with no worker at
      // all. Navigations to those paths fall back to the cached shell instead.
      (rel.endsWith('.html') && !rel.includes('[') && !rel.startsWith('(')) ||
      rel.startsWith('_expo/static/') ||
      rel.startsWith('icons/') ||
      // The framework's own chrome icons: a few KB, wanted for first paint.
      rel.startsWith('assets/node_modules/') ||
      rel === 'manifest.webmanifest' ||
      rel === 'favicon.ico',
  );

  // The app's own bundled imagery: several megabytes of artist photos. Real
  // offline content, but not worth blocking the very first load on, so the
  // worker fetches it in the background once the app is interactive.
  const prewarm = files.filter(
    (rel) => rel.startsWith('assets/') && !rel.startsWith('assets/node_modules/'),
  );

  if (!keep.includes('index.html')) fail('dist/index.html is missing; the export looks broken.');
  if (!keep.some((rel) => rel.startsWith('_expo/static/js/'))) {
    fail('No JS bundle found under dist/_expo/static/js; the export looks broken.');
  }

  const hash = createHash('sha256');
  let bytes = 0;
  for (const rel of keep) {
    const buffer = fs.readFileSync(path.join(DIST, rel));
    bytes += buffer.length;
    hash.update(rel).update(' ').update(createHash('sha256').update(buffer).digest('hex'));
  }

  let prewarmBytes = 0;
  for (const rel of prewarm) prewarmBytes += fs.statSync(path.join(DIST, rel)).size;

  return {
    // Absolute, base-prefixed URLs — exactly what the browser will request.
    urls: keep.map((rel) => `${base}${rel}`),
    prewarmUrls: prewarm.map((rel) => `${base}${rel}`),
    bytes,
    prewarmBytes,
    digest: hash.digest('hex').slice(0, 12),
  };
}

/**
 * @param {string} base
 * @param {{ urls: string[], prewarmUrls: string[], digest: string }} precache
 * @returns {string}
 */
function writeServiceWorker(base, precache) {
  const template = fs.readFileSync(path.join(WEB, 'sw.template.js'), 'utf8');

  for (const placeholder of ['__BASE__', '__VERSION__', '__PRECACHE__', '__PREWARM__']) {
    const occurrences = template.split(placeholder).length - 1;
    // Exactly one, always. Two would mean the comment above the declaration
    // mentions the token, and the substitution could land in the wrong place.
    if (occurrences !== 1) {
      fail(`sw.template.js has ${occurrences} occurrences of ${placeholder}; expected exactly 1.`);
    }
  }

  const source = template
    .replaceAll('__BASE__', base)
    .replaceAll('__VERSION__', precache.digest)
    .replaceAll('__PRECACHE__', JSON.stringify(precache.urls, null, 2))
    .replaceAll('__PREWARM__', JSON.stringify(precache.prewarmUrls, null, 2));

  if (/__[A-Z]+__/.test(source)) {
    fail('Placeholder substitution left tokens behind in sw.js.');
  }

  // The worker is served from inside the sub-path, which is what gives it a
  // default scope of the sub-path. Putting it at the origin root would either
  // be rejected or, worse, hijack every other project on this Pages account.
  fs.writeFileSync(path.join(DIST, 'sw.js'), source, 'utf8');
  return precache.digest;
}

/** @param {string} base */
function writeRegistration(base) {
  const template = fs.readFileSync(path.join(WEB, 'register-sw.template.js'), 'utf8');
  if (!template.includes('__BASE__')) fail('register-sw.template.js is missing __BASE__.');
  fs.writeFileSync(path.join(DIST, 'register-sw.js'), template.replaceAll('__BASE__', base), 'utf8');
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

/**
 * @param {string} base
 * @param {{ theme: string, background: string }} colors
 * @returns {string[]}
 */
function injectIntoHtml(base, colors) {
  const head = [
    MARKER,
    `<link rel="manifest" href="${base}manifest.webmanifest">`,
    `<meta name="theme-color" content="${colors.theme}">`,
    `<link rel="icon" type="image/png" sizes="192x192" href="${base}icons/icon-192.png">`,
    `<link rel="icon" type="image/png" sizes="512x512" href="${base}icons/icon-512.png">`,
    // iOS ignores the manifest for home-screen installs and reads these instead.
    `<link rel="apple-touch-icon" href="${base}icons/apple-touch-icon.png">`,
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '<meta name="apple-mobile-web-app-title" content="Blues &amp; Brews">',
    '<meta name="application-name" content="Blues &amp; Brews">',
    `<script src="${base}register-sw.js" defer></script>`,
  ].join('');

  /** @type {string[]} */
  const touched = [];

  for (const abs of walk(DIST)) {
    if (!abs.endsWith('.html')) continue;

    let html = fs.readFileSync(abs, 'utf8');
    if (html.includes(MARKER)) continue;
    if (!html.includes('</head>')) fail(`${abs} has no </head> to inject into.`);

    html = html.replace('</head>', `${head}</head>`);

    // Expo exports an empty <title>, which becomes the browser tab label and
    // the default share title. The manifest names the installed icon; this
    // names everything else.
    html = html.replace(
      /<title([^>]*)><\/title>/,
      '<title$1>Telluride Blues &amp; Brews</title>',
    );

    fs.writeFileSync(abs, html, 'utf8');
    touched.push(path.relative(DIST, abs).split(path.sep).join('/'));
  }

  return touched.sort();
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

/** @param {number} bytes */
function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`[build-pwa] ${message}`);
  process.exit(1);
}
