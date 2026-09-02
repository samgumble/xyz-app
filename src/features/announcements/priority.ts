import type { Announcement, Priority } from '@/types/content';
import type { Theme } from '@/theme';

export interface PriorityMeta {
  label: string;
  /** The rail / fill colour for this priority. */
  color: string;
  /** True when the announcement should take over a banner rather than sit in the feed. */
  banner: boolean;
  rank: number;
}

/** Priority styling, resolved against the active theme. Never a raw colour. */
export function priorityMeta(theme: Theme, priority: Priority): PriorityMeta {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', color: theme.colors.danger, banner: true, rank: 3 };
    case 'important':
      return { label: 'Important', color: theme.colors.warning, banner: true, rank: 2 };
    default:
      return { label: 'Info', color: theme.colors.primary, banner: false, rank: 1 };
  }
}

/** True once `expiresAt` has passed. Undated announcements never expire. */
export function isExpired(announcement: Announcement, at: Date): boolean {
  if (!announcement.expiresAt) return false;
  const expires = Date.parse(announcement.expiresAt);
  return !Number.isNaN(expires) && expires <= at.getTime();
}

/** True before `publishedAt` — a scheduled post that has not gone out yet. */
export function isScheduled(announcement: Announcement, at: Date): boolean {
  const published = Date.parse(announcement.publishedAt);
  return !Number.isNaN(published) && published > at.getTime();
}
