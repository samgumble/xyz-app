/**
 * A very small block parser for the markdown-ish `body` strings the CMS
 * publishes on `InfoPage` and `Announcement`.
 *
 * This is deliberately NOT a markdown library. The published bodies use a
 * closed set of constructs — ATX headings, `-`/`•` bullets, `1.` ordered
 * lists, pipe tables, and `**bold**` / `*italic*` inline emphasis — and a
 * dependency that handles the other ninety percent of CommonMark would be a
 * dependency we cannot audit for a festival app that must work offline.
 * Anything it does not recognise falls through to a paragraph, so unknown
 * syntax degrades to readable text rather than disappearing.
 */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type InfoBlock =
  | { kind: 'heading'; level: number; spans: InlineSpan[] }
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'list'; ordered: boolean; items: InlineSpan[][] }
  | { kind: 'table'; header: InlineSpan[][]; rows: InlineSpan[][][] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^(?:[-*]|•)\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const SEPARATOR_CELL = /^:?-{2,}:?$/;
const EMPHASIS = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;

/** Splits `**bold**` / `*italic*` runs out of a line of text. */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let cursor = 0;
  EMPHASIS.lastIndex = 0;
  let match = EMPHASIS.exec(text);
  while (match !== null) {
    if (match.index > cursor) {
      spans.push({ text: text.slice(cursor, match.index) });
    }
    if (match[1] !== undefined) {
      spans.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      spans.push({ text: match[2], italic: true });
    }
    cursor = match.index + match[0].length;
    match = EMPHASIS.exec(text);
  }
  if (cursor < text.length) {
    spans.push({ text: text.slice(cursor) });
  }
  return spans.length > 0 ? spans : [{ text }];
}

/** Flattens spans back to plain text — used to build accessibility labels. */
export function spansToText(spans: InlineSpan[]): string {
  return spans.map((s) => s.text).join('');
}

function splitRow(line: string): string[] {
  const cells = line.split('|');
  // A well-formed row is fenced by pipes, so the first and last splits are empty.
  if (cells.length > 0 && cells[0]?.trim() === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1]?.trim() === '') cells.pop();
  return cells.map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => SEPARATOR_CELL.test(c));
}

/** Parses a whole body into an ordered list of renderable blocks. */
export function parseInfoBody(body: string): InfoBlock[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: InfoBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const line = raw.trim();

    if (line === '') {
      i += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const hashes = heading[1] ?? '#';
      blocks.push({ kind: 'heading', level: hashes.length, spans: parseInline(heading[2] ?? '') });
      i += 1;
      continue;
    }

    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        rows.push(splitRow((lines[i] ?? '').trim()));
        i += 1;
      }
      const headerCells = rows.shift() ?? [];
      if (rows.length > 0 && isSeparatorRow(rows[0] ?? [])) rows.shift();
      blocks.push({
        kind: 'table',
        header: headerCells.map(parseInline),
        rows: rows.map((r) => r.map(parseInline)),
      });
      continue;
    }

    if (BULLET.test(line)) {
      const items: InlineSpan[][] = [];
      while (i < lines.length) {
        const candidate = BULLET.exec((lines[i] ?? '').trim());
        if (!candidate) break;
        items.push(parseInline(candidate[1] ?? ''));
        i += 1;
      }
      blocks.push({ kind: 'list', ordered: false, items });
      continue;
    }

    if (ORDERED.test(line)) {
      const items: InlineSpan[][] = [];
      while (i < lines.length) {
        const candidate = ORDERED.exec((lines[i] ?? '').trim());
        if (!candidate) break;
        items.push(parseInline(candidate[1] ?? ''));
        i += 1;
      }
      blocks.push({ kind: 'list', ordered: true, items });
      continue;
    }

    // Consecutive plain lines belong to one paragraph; the line breaks are
    // meaningful in addresses and hour lists, so they are kept.
    const paragraph: string[] = [];
    while (i < lines.length) {
      const next = (lines[i] ?? '').trim();
      if (
        next === '' ||
        next.startsWith('|') ||
        HEADING.test(next) ||
        BULLET.test(next) ||
        ORDERED.test(next)
      ) {
        break;
      }
      paragraph.push(next);
      i += 1;
    }
    blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join('\n')) });
  }

  return blocks;
}
