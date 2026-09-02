import { festivalDataNote } from '@/features/info';

/**
 * The bundled announcements are the one content type not taken from the
 * festival's site. Rather than restate that here, the exact wording is pulled
 * out of `festival._dataNote` so the disclosure and the data cannot drift.
 */
export function announcementsCaveat(): string | undefined {
  return festivalDataNote().caveats.find((c) => c.toLowerCase().includes('announcements.json'));
}
