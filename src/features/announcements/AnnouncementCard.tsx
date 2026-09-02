import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Badge, Card } from '@/components';
import { formatDayLabel, formatTime } from '@/data/time';
import { parseInfoBody, spansToText } from '@/features/info';
import { useTheme } from '@/theme';
import type { Announcement } from '@/types/content';

import { isExpired, isScheduled, priorityMeta } from './priority';

export interface AnnouncementCardProps {
  announcement: Announcement;
  at: Date;
  onPress: () => void;
  testID?: string;
}

/** Pulls the first real paragraph out of a body for the feed preview. */
function summarise(body: string): string {
  const first = parseInfoBody(body).find((b) => b.kind === 'paragraph');
  return first ? spansToText(first.spans).replace(/\n/g, ' ') : '';
}

/** One entry in the announcements feed. Expired entries are de-emphasised. */
export function AnnouncementCard({
  announcement,
  at,
  onPress,
  testID,
}: AnnouncementCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const meta = priorityMeta(theme, announcement.priority);
  const expired = isExpired(announcement, at);
  const scheduled = isScheduled(announcement, at);
  const summary = useMemo(() => summarise(announcement.body), [announcement.body]);

  const stamp = `${formatDayLabel(announcement.publishedAt)} · ${formatTime(announcement.publishedAt)}`;
  const state = expired ? 'Expired' : scheduled ? 'Scheduled' : undefined;

  return (
    <Card
      testID={testID}
      onPress={onPress}
      muted={expired}
      accentColor={expired ? theme.colors.border : meta.color}
      accessibilityLabel={`${meta.label}${state ? `, ${state}` : ''}: ${announcement.title}. Posted ${stamp}.`}
      accessibilityHint="Opens the full announcement"
      style={{ marginBottom: theme.space.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flexWrap: 'wrap' }}>
        <Badge
          label={meta.label}
          tone={expired ? 'neutral' : 'custom'}
          color={meta.color}
          accessibilityLabel={`Priority ${meta.label}`}
        />
        {state ? <Badge label={state} tone="neutral" /> : null}
        {announcement.audience !== 'all' ? (
          <Badge
            label={announcement.audience}
            tone="neutral"
            accessibilityLabel={`Audience: ${announcement.audience}`}
          />
        ) : null}
      </View>

      <Text
        style={[
          theme.type.h3,
          { color: expired ? theme.colors.textMuted : theme.colors.text, marginTop: theme.space.sm },
        ]}
      >
        {announcement.title}
      </Text>

      <Text style={[theme.type.label, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        {stamp}
      </Text>

      {summary ? (
        <Text
          numberOfLines={expired ? 2 : 3}
          style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.sm }]}
        >
          {summary}
        </Text>
      ) : null}
    </Card>
  );
}
