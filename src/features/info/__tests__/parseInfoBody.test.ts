import { getInfoPages } from '@/data/repository';
import { parseDataNote } from '../dataNote';
import { parseInfoBody, parseInline, spansToText } from '../parseInfoBody';

describe('parseInline', () => {
  it('splits bold and italic runs out of a line', () => {
    const spans = parseInline('Tickets are sold **exclusively** through *Front Gate*.');
    expect(spans.map((s) => s.text)).toEqual([
      'Tickets are sold ',
      'exclusively',
      ' through ',
      'Front Gate',
      '.',
    ]);
    expect(spans[1]?.bold).toBe(true);
    expect(spans[3]?.italic).toBe(true);
  });

  it('leaves plain text alone and round-trips through spansToText', () => {
    const text = "One number = one person = one 10' x 10' tarp.";
    expect(spansToText(parseInline(text))).toBe(text);
  });
});

describe('parseInfoBody', () => {
  it('reads headings, bullets, ordered lists and paragraphs', () => {
    const blocks = parseInfoBody(
      ['# Title', '', 'A paragraph.', '', '## Hours', '- Gates 11:30 AM', '• Music noon', '', '1. First', '2. Second'].join('\n'),
    );
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'heading', 'list', 'list']);
    const bullets = blocks[3];
    expect(bullets?.kind === 'list' && bullets.ordered).toBe(false);
    expect(bullets?.kind === 'list' && bullets.items).toHaveLength(2);
    const ordered = blocks[4];
    expect(ordered?.kind === 'list' && ordered.ordered).toBe(true);
  });

  it('parses a pipe table and drops the separator row', () => {
    const blocks = parseInfoBody('| Ticket | Price |\n|---|---|\n| GA 3-Day Pass | $300 |');
    const table = blocks[0];
    expect(table?.kind).toBe('table');
    if (table?.kind !== 'table') throw new Error('expected a table');
    expect(table.header.map(spansToText)).toEqual(['Ticket', 'Price']);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.map(spansToText)).toEqual(['GA 3-Day Pass', '$300']);
  });

  it('renders every published info page without losing a block', () => {
    for (const page of getInfoPages()) {
      const blocks = parseInfoBody(page.body);
      expect(blocks.length).toBeGreaterThan(0);
      // Nothing may parse to an empty paragraph — that would be dropped content.
      for (const block of blocks) {
        if (block.kind === 'paragraph') expect(spansToText(block.spans).trim()).not.toBe('');
      }
    }
  });

  it('finds the ticket price table in the published tickets page', () => {
    const tickets = getInfoPages().find((p) => p.body.includes('|'));
    expect(tickets).toBeDefined();
    const tables = parseInfoBody(tickets?.body ?? '').filter((b) => b.kind === 'table');
    expect(tables.length).toBeGreaterThan(0);
  });
});

describe('parseDataNote', () => {
  it('splits the provenance sentence from the numbered caveats', () => {
    const note = parseDataNote('Sourced from the site. Known caveats: (1) one thing; (2) another thing.');
    expect(note.intro).toBe('Sourced from the site.');
    expect(note.caveats).toEqual(['one thing', 'another thing']);
  });

  it('treats a note with no caveat marker as all intro', () => {
    expect(parseDataNote('Just a sentence.')).toEqual({ intro: 'Just a sentence.', caveats: [] });
  });

  it('returns nothing for an absent note', () => {
    expect(parseDataNote(undefined)).toEqual({ intro: '', caveats: [] });
  });
});
