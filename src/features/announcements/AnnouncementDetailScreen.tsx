import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Badge, EmptyState, Screen } from '@/components';
import { getAnnouncement } from '@/data/repository';
import { formatDayLabel, formatTime } from '@/data/time';
import { InfoBody, ProvenanceNote } from '@/features/info';
import { useTheme } from '@/theme';

import { announcementsCaveat } from './caveat';
import { isExpired, isScheduled, priorityMeta } from './priority';

export interface AnnouncementDetailScreenProps {
  id: string;
  /** Injectable for tests; defaults to the real clock. */
  at?: Date;
}

/** One announcement, in full, with its provenance stated plainly. */
export function AnnouncementDetailScreen({
  id,
  at,
}: AnnouncementDetailScreenProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const now = useMemo(() => at ?? new Date(), [at]);
  const announcement = useMemo(() => getAnnouncement(id), [id]);

  if (!announcement) {
    return (
      <Screen testID="screen-announcements-detail">
        <Stack.Screen options={{ title: 'Announcement' }} />
        <EmptyState
          title="That announcement is gone"
          message="It may have been pulled since this build was made. The current notices are in More."
          actionLabel="Go back"
          onAction={() => {
            router.back();
          }}
        />
      </Screen>
    );
  }

  const meta = priorityMeta(theme, announcement.priority);
  const expired = isExpired(announcement, now);
  const scheduled = isScheduled(announcement, now);
  const caveat = announcementsCaveat();

  return (
    <Screen testID="screen-announcements-detail">
      <Stack.Screen options={{ title: meta.label }} />

      <View style={{ flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap' }}>
        <Badge
          label={meta.label}
          tone="custom"
          color={meta.color}
          accessibilityLabel={`Priority ${meta.label}`}
        />
        {expired ? <Badge label="Expired" tone="neutral" /> : null}
        {scheduled ? <Badge label="Scheduled" tone="neutral" /> : null}
        {announcement.audience !== 'all' ? (
          <Badge
            label={announcement.audience}
            tone="neutral"
            accessibilityLabel={`Audience: ${announcement.audience}`}
          />
        ) : null}
      </View>

      <Text
        accessibilityRole="header"
        style={[theme.type.h1, { color: theme.colors.text, marginTop: theme.space.md }]}
      >
        {announcement.title}
      </Text>

      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.sm }]}>
        Posted {formatDayLabel(announcement.publishedAt)} at {formatTime(announcement.publishedAt)}
        {announcement.expiresAt
          ? ` · ${expired ? 'expired' : 'expires'} ${formatDayLabel(announcement.expiresAt)} at ${formatTime(announcement.expiresAt)}`
          : ''}
      </Text>
      <Text style={[theme.type.label, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        All times are Telluride time.
      </Text>

      <InfoBody body={announcement.body} style={{ marginTop: theme.space.lg }} testID="announcement-body" />

      {caveat ? (
        <ProvenanceNote
          title="About this notice"
          lines={[caveat]}
          style={{ marginTop: theme.space.xl }}
        />
      ) : null}
    </Screen>
  );
}
