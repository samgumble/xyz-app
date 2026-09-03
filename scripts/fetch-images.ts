/**
 * Mirror the festival's published imagery into the repo so the app works with
 * the radio off.
 *
 * `src/assets/snapshot/artists.json` carries remote Squarespace URLs. Those are
 * kept — they are the provenance record and the runtime fallback — but they are
 * useless in airplane mode, and their cache-busting path segments (the
 * `1768433216417-L45YMEUG2Z65XR40FE0M` in the middle) rotate whenever the
 * festival re-uploads a photo. So this script downloads every one of them,
 * downsizes it, and writes a generated `require()` map that Metro can bundle.
 *
 * Run it with `npm run images:fetch` (add `-- --force` to re-download).
 *
 * Deliberately dependency-free: `fetch` is built into Node and `sips` is built
 * into macOS, so mirroring 68 photos costs the project zero new packages.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SNAPSHOT = join(ROOT, 'src', 'assets', 'snapshot', 'artists.json');
const ARTIST_DIR = join(ROOT, 'src', 'assets', 'artists');
const BRAND_DIR = join(ROOT, 'src', 'assets', 'brand');

/**
 * Sizing budget, tuned by measuring the real 34-artist set rather than picked
 * for looks.
 *
 * A grid tile is drawn at ~170pt and a featured headliner tile at full width
 * (~360pt), so 600px covers both. `ArtistScreen` draws its hero at the same
 * ~360pt content width, which is why the hero is 1000px and not the 1200px the
 * brief suggested: the extra 200px is invisible at any phone DPR and cost
 * ~1.3 MB across 34 artists.
 *
 * Quality is 64 rather than ~80 for the same reason — at 80 the mirror came to
 * 10.2 MB, over the ~8 MB ceiling. See the report.
 */
const CARD = { width: 600, quality: 64 } as const;
const HERO = { width: 1000, quality: 64 } as const;
const LOGO = { width: 900 } as const;

/** Squarespace only renders these widths; anything else is ignored. */
const SQUARESPACE_WIDTHS = [100, 300, 500, 750, 1000, 1500, 2500] as const;
const SQUARESPACE_HOST = 'images.squarespace-cdn.com';

/**
 * The festival logo. Section 9 of the research dossier is explicit that this is
 * the only variant the public site serves: one raster PNG, no SVG anywhere, no
 * mono / reversed / icon-only / stacked lockup. Those would have to come from
 * SBG's brand kit.
 */
const LOGO_URL =
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1545422460809-AOUEFR9OODIWJVGFG8YO/General.png';

/** How many downloads run at once. Politeness, not throughput. */
const CONCURRENCY = 5;

interface SnapshotArtist {
  readonly slug: string;
  readonly name: string;
  readonly photo?: string;
  readonly photoHero?: string;
}

type Kind = 'card' | 'hero' | 'logo';

interface Job {
  readonly kind: Kind;
  /** Slug for artists, or the asset stem for brand files. */
  readonly key: string;
  readonly label: string;
  readonly url: string;
  readonly file: string;
  readonly width: number;
  /** JPEG quality 0-100, or `null` to keep the source format (PNG, alpha). */
  readonly quality: number | null;
}

type Outcome =
  | { readonly status: 'fetched'; readonly job: Job; readonly bytes: number }
  | { readonly status: 'skipped'; readonly job: Job; readonly bytes: number }
  | { readonly status: 'failed'; readonly job: Job; readonly reason: string };

async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  requireSips();
  mkdirSync(ARTIST_DIR, { recursive: true });
  mkdirSync(BRAND_DIR, { recursive: true });

  const artists = readArtists();
  const jobs = [...artistJobs(artists), logoJob()];

  console.log(
    `Mirroring ${jobs.length} assets from ${artists.length} snapshot artists` +
      `${force ? ' (--force: re-downloading everything)' : ''}\n`,
  );

  const outcomes = await runPool(jobs, force);

  // The map is regenerated from what is actually on disk on every run, even a
  // fully-skipped one, so it can never describe files that are not there.
  const generated = writeMappingModules(artists);

  report(outcomes, generated);

  if (outcomes.some((o) => o.status === 'failed')) {
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

function readArtists(): SnapshotArtist[] {
  const raw: unknown = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`${SNAPSHOT} is not a JSON array`);
  }
  return raw.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`artists.json[${index}] is not an object`);
    }
    const record = entry as Record<string, unknown>;
    const slug = record['slug'];
    const name = record['name'];
    if (typeof slug !== 'string' || typeof name !== 'string') {
      throw new Error(`artists.json[${index}] is missing a string slug/name`);
    }
    return {
      slug,
      name,
      ...(typeof record['photo'] === 'string' ? { photo: record['photo'] } : {}),
      ...(typeof record['photoHero'] === 'string' ? { photoHero: record['photoHero'] } : {}),
    };
  });
}

function artistJobs(artists: readonly SnapshotArtist[]): Job[] {
  const jobs: Job[] = [];
  for (const artist of artists) {
    const card = trimmed(artist.photo);
    const hero = trimmed(artist.photoHero);
    if (card !== undefined) {
      jobs.push({
        kind: 'card',
        key: artist.slug,
        label: `${artist.name} (card)`,
        url: card,
        file: join(ARTIST_DIR, `${artist.slug}.jpg`),
        width: CARD.width,
        quality: CARD.quality,
      });
    }
    // Only a *distinct* hero earns a second file; a hero that repeats the card
    // URL would just be the same bytes under a second name.
    if (hero !== undefined && hero !== card) {
      jobs.push({
        kind: 'hero',
        key: artist.slug,
        label: `${artist.name} (hero)`,
        url: hero,
        file: join(ARTIST_DIR, `${artist.slug}@hero.jpg`),
        width: HERO.width,
        quality: HERO.quality,
      });
    }
  }
  return jobs;
}

function logoJob(): Job {
  return {
    kind: 'logo',
    key: 'logo',
    label: 'Festival logo',
    url: LOGO_URL,
    file: join(BRAND_DIR, 'logo.png'),
    width: LOGO.width,
    // Kept as PNG: the mark is line art on transparency and JPEG would both
    // flatten the alpha and ring the edges.
    quality: null,
  };
}

function trimmed(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  return clean.length > 0 ? clean : undefined;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function runPool(jobs: readonly Job[], force: boolean): Promise<Outcome[]> {
  const outcomes: Outcome[] = new Array<Outcome>(jobs.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      const job = jobs[index];
      if (job === undefined) return;
      outcomes[index] = await runJob(job, force);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  return outcomes.filter((o): o is Outcome => o !== undefined);
}

async function runJob(job: Job, force: boolean): Promise<Outcome> {
  if (!force && existsSync(job.file)) {
    const bytes = statSync(job.file).size;
    console.log(`  skip   ${job.label} — already mirrored (${kb(bytes)})`);
    return { status: 'skipped', job, bytes };
  }

  const download = `${job.file}.download`;
  const staged = `${job.file}.staged`;
  try {
    const body = await download_(job);
    // Nothing touches the committed path until the bytes are complete and the
    // magic number proves they are really an image: a truncated download must
    // never be able to masquerade as a mirrored asset on the next run.
    writeFileSync(download, body);
    transcode(job, download, staged);
    // Staged in the same directory so the swap into place is a single atomic
    // rename: a crash mid-run leaves the old file, never half a new one.
    renameSync(staged, job.file);
    const bytes = statSync(job.file).size;
    console.log(`  ok     ${job.label} — ${kb(bytes)}`);
    return { status: 'fetched', job, bytes };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`  FAIL   ${job.label} — ${reason}`);
    return { status: 'failed', job, reason };
  } finally {
    rmSync(download, { force: true });
    rmSync(staged, { force: true });
  }
}

async function download_(job: Job): Promise<Buffer> {
  // Squarespace will render a smaller copy on its own CDN if asked, so pull
  // roughly the size we want instead of a 2500px original we throw away.
  const candidates = [sizedUrl(job.url, job.width), job.url].filter(
    (url, index, all) => all.indexOf(url) === index,
  );

  let lastError = 'no attempt made';
  for (const url of candidates) {
    try {
      return await fetchImage(url, job.quality === null);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}

async function fetchImage(url: string, preferPng: boolean): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      // Without this the CDN content-negotiates to WebP, which `sips` on older
      // macOS cannot open and which Metro does not treat as a native asset.
      Accept: preferPng ? 'image/png,image/*;q=0.8' : 'image/jpeg,image/*;q=0.8',
      'User-Agent': 'tbb-app image mirror (npm run images:fetch)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }

  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) {
    throw new Error(`expected an image, got content-type "${type}" for ${url}`);
  }

  const body = Buffer.from(await response.arrayBuffer());

  // A silently truncated body is the failure mode this whole dance exists to
  // prevent, so compare against the declared length when the server gives one.
  const declared = response.headers.get('content-length');
  if (declared !== null && Number(declared) !== body.byteLength) {
    throw new Error(`truncated download: got ${body.byteLength} of ${declared} bytes`);
  }
  if (body.byteLength === 0) {
    throw new Error('empty response body');
  }
  if (!looksLikeImage(body)) {
    throw new Error(`response is not a JPEG/PNG/WebP (first bytes ${body.subarray(0, 4).toString('hex')})`);
  }
  return body;
}

function looksLikeImage(body: Buffer): boolean {
  const jpeg = body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  const png = body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47;
  const webp = body.subarray(0, 4).toString('ascii') === 'RIFF';
  return jpeg || png || webp;
}

function sizedUrl(url: string, width: number): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== SQUARESPACE_HOST) return url;
  const bucket = SQUARESPACE_WIDTHS.find((w) => w >= width) ?? SQUARESPACE_WIDTHS.at(-1);
  if (bucket === undefined) return url;
  parsed.searchParams.set('format', `${bucket}w`);
  return parsed.toString();
}

// ---------------------------------------------------------------------------
// Resizing (macOS `sips`, no npm dependency)
// ---------------------------------------------------------------------------

function requireSips(): void {
  const probe = spawnSync('sips', ['--version'], { encoding: 'utf8' });
  if (probe.status !== 0) {
    throw new Error('`sips` is not available — this mirror script needs macOS (or swap in sharp)');
  }
}

function transcode(job: Job, source: string, target: string): void {
  const args = [source, '--out', target];
  if (sourceWidth(source) > job.width) {
    args.push('--resampleWidth', String(job.width));
  }
  if (job.quality !== null) {
    args.push('--setProperty', 'format', 'jpeg', '--setProperty', 'formatOptions', String(job.quality));
  } else {
    args.push('--setProperty', 'format', 'png');
  }

  const run = spawnSync('sips', args, { encoding: 'utf8' });
  if (run.status !== 0) {
    throw new Error(`sips failed: ${(run.stderr || run.stdout || '').trim()}`);
  }
  if (!existsSync(target) || statSync(target).size === 0) {
    throw new Error('sips produced an empty file');
  }
}

function sourceWidth(file: string): number {
  const run = spawnSync('sips', ['-g', 'pixelWidth', file], { encoding: 'utf8' });
  const match = /pixelWidth:\s*(\d+)/.exec(run.stdout ?? '');
  // Unknown width means "do not upscale and do not crash" — resize anyway.
  return match?.[1] === undefined ? Number.POSITIVE_INFINITY : Number(match[1]);
}

// ---------------------------------------------------------------------------
// Generated mapping modules
// ---------------------------------------------------------------------------

interface GeneratedSummary {
  readonly slugs: number;
  readonly heroes: number;
  readonly logo: boolean;
}

function writeMappingModules(artists: readonly SnapshotArtist[]): GeneratedSummary {
  const onDisk = new Set(readdirSync(ARTIST_DIR).filter((f) => f.endsWith('.jpg')));
  const rows = artists
    .map((artist) => ({
      artist,
      card: onDisk.has(`${artist.slug}.jpg`) ? `${artist.slug}.jpg` : undefined,
      hero: onDisk.has(`${artist.slug}@hero.jpg`) ? `${artist.slug}@hero.jpg` : undefined,
    }))
    .filter((row): row is { artist: SnapshotArtist; card: string; hero: string | undefined } =>
      row.card !== undefined,
    );

  const hasLogo = existsSync(join(BRAND_DIR, 'logo.png'));

  writeFileSync(join(BRAND_DIR, 'index.ts'), brandModule(hasLogo), 'utf8');
  writeFileSync(join(ARTIST_DIR, 'index.ts'), artistModule(rows), 'utf8');

  return {
    slugs: rows.length,
    heroes: rows.filter((r) => r.hero !== undefined).length,
    logo: hasLogo,
  };
}

const BANNER = [
  '/**',
  ' * GENERATED FILE — do not edit by hand.',
  ' *',
  ' * Written by `npm run images:fetch` (scripts/fetch-images.ts) from whatever',
  ' * is actually on disk, so it cannot drift from the mirrored files.',
  ' *',
  ' * React Native resolves static assets at build time, so every path here has',
  ' * to be a literal `require()` — a computed path would bundle nothing.',
  ' */',
].join('\n');

function brandModule(hasLogo: boolean): string {
  const body = hasLogo
    ? [
        'export interface BrandImages {',
        '  /**',
        "   * The festival's only published mark. The site serves one raster PNG and",
        '   * nothing else — no SVG, no mono, no reversed, no icon-only, no stacked',
        "   * lockup. Anything else has to come from SBG's brand kit.",
        '   */',
        '  readonly logo: ImageSourcePropType;',
        '}',
        '',
        'export const brandImages: BrandImages = {',
        "  logo: require('./logo.png'),",
        '};',
      ]
    : [
        'export interface BrandImages {',
        '  readonly logo?: ImageSourcePropType;',
        '}',
        '',
        '/** No logo mirrored yet — run `npm run images:fetch`. */',
        'export const brandImages: BrandImages = {};',
      ];

  return [BANNER, '', "import type { ImageSourcePropType } from 'react-native';", '', ...body, ''].join('\n');
}

function artistModule(
  rows: readonly { artist: SnapshotArtist; card: string; hero: string | undefined }[],
): string {
  const sets = rows.map((row) => {
    const lines = [`  ${quote(row.artist.slug)}: {`, `    card: require('./${row.card}'),`];
    if (row.hero !== undefined) lines.push(`    hero: require('./${row.hero}'),`);
    lines.push('  },');
    return lines.join('\n');
  });

  const byUrl: string[] = [];
  for (const row of rows) {
    const card = trimmed(row.artist.photo);
    const hero = trimmed(row.artist.photoHero);
    if (card !== undefined) byUrl.push(`  ${quote(card)}: require('./${row.card}'),`);
    if (hero !== undefined && hero !== card) {
      byUrl.push(`  ${quote(hero)}: require('./${row.hero ?? row.card}'),`);
    }
  }

  return [
    BANNER,
    '',
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    "export { brandImages } from '../brand';",
    "export type { BrandImages } from '../brand';",
    '',
    '/** The bundled copies of one artist\'s photos. */',
    'export interface ArtistImageSet {',
    '  /** Lineup-grid crop, ~' + String(CARD.width) + 'px wide. */',
    '  readonly card: ImageSourcePropType;',
    '  /** Detail-screen crop, ~' + String(HERO.width) + 'px wide, when the festival published a distinct one. */',
    '  readonly hero?: ImageSourcePropType;',
    '}',
    '',
    '/** Slug → bundled photos. */',
    'export const artistImages: Readonly<Record<string, ArtistImageSet>> = {',
    ...sets,
    '};',
    '',
    '/**',
    ' * Remote URL → the bundled copy of that exact image.',
    ' *',
    ' * The snapshot keeps its Squarespace URLs as provenance, and the card and',
    ' * hero components pass those URLs down, so this lets a mirrored file be',
    ' * found without every call site having to learn about slugs.',
    ' */',
    'export const artistImagesByRemoteUrl: Readonly<Record<string, ImageSourcePropType>> = {',
    ...byUrl,
    '};',
    '',
  ].join('\n');
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(outcomes: readonly Outcome[], generated: GeneratedSummary): void {
  const fetched = outcomes.filter((o) => o.status === 'fetched');
  const skipped = outcomes.filter((o) => o.status === 'skipped');
  const failed = outcomes.filter((o) => o.status === 'failed');

  const artistBytes = dirBytes(ARTIST_DIR, ['.jpg']);
  const brandBytes = dirBytes(BRAND_DIR, ['.png']);

  console.log('\n--- summary -------------------------------------------------');
  console.log(`  fetched            ${fetched.length}`);
  console.log(`  skipped (present)  ${skipped.length}`);
  console.log(`  failed             ${failed.length}`);
  for (const outcome of failed) {
    if (outcome.status === 'failed') console.log(`      - ${outcome.job.label}: ${outcome.reason}`);
  }
  console.log(`  artists mapped     ${generated.slugs} (${generated.heroes} with a distinct hero)`);
  console.log(`  brand logo         ${generated.logo ? 'mirrored' : 'MISSING'}`);
  console.log(`  committed size     ${kb(artistBytes + brandBytes)} total`);
  console.log(`                     ${kb(artistBytes)} artists · ${kb(brandBytes)} brand`);
  console.log('-------------------------------------------------------------');
}

function dirBytes(dir: string, extensions: readonly string[]): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir)
    .filter((file) => extensions.some((ext) => file.endsWith(ext)))
    .reduce((total, file) => total + statSync(join(dir, file)).size, 0);
}

function kb(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

await main();
