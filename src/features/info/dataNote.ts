import { getFestival } from '@/data/repository';

export interface DataNote {
  /** The provenance sentence(s) before the numbered caveats. */
  intro: string;
  /** One entry per `(n) …` caveat, numbering stripped. */
  caveats: string[];
}

const CAVEAT_MARKER = /Known caveats:/i;
const CAVEAT_SPLIT = /(?=\(\d+\)\s)/;

/**
 * `festival._dataNote` is one long string listing where the bundled content
 * came from and what in it is not yet trustworthy. It is split here rather
 * than retyped anywhere so the credits screen can never drift from the data.
 */
export function parseDataNote(note: string | undefined): DataNote {
  if (!note || note.trim() === '') return { intro: '', caveats: [] };

  const marker = CAVEAT_MARKER.exec(note);
  if (!marker) return { intro: note.trim(), caveats: [] };

  const intro = note.slice(0, marker.index).trim();
  const rest = note.slice(marker.index + marker[0].length).trim();

  const caveats = rest
    .split(CAVEAT_SPLIT)
    .map((part) => part.replace(/^\(\d+\)\s*/, '').trim())
    .map((part) => part.replace(/[;.]$/, '').trim())
    .filter((part) => part.length > 0);

  return { intro, caveats };
}

/** The parsed note for the currently loaded snapshot. */
export function festivalDataNote(): DataNote {
  return parseDataNote(getFestival()._dataNote);
}
