import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components';
import { getAllAnnouncements } from '@/data/repository';
import { ProvenanceNote } from '@/features/info';
import { useTheme } from '@/theme';
import type { Announcement } from '@/types/content';

import { AnnouncementCard } from './AnnouncementCard';
import { announcementsCaveat } from './caveat';
import { isExpired, isScheduled } from './priority';

export interface AnnouncementFeedProps {
  at: Date;
  testID?: string;
}

function FeedGroupHeader({ label }: { label: string }): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[
        theme.type.label,
        { color: theme.colors.textMuted, marginBottom: theme.space.md },
      ]}
    >
      {label}
    </Text>
  );
}

/**
 * Every announcement in the snapshot, newest first, in three groups.
 *
 * Live posts come first. Then anything whose publish date has not arrived yet:
 * the bundled notices carry their real 2026 festival-week dates, so for most of
 * the year they sit in the future — hiding them outright would leave this
 * screen looking broken in exactly the state the client is reviewing it in, so
 * they are shown and plainly labelled instead. Expired posts come last,
 * de-emphasised but still readable, because people look back for box-office
 * hours after they have lapsed.
 *
 * The Home banner is stricter: it only ever surfaces genuinely active posts.
 */
export function AnnouncementFeed({ at, testID }: AnnouncementFeedProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const groups = useMemo(() => {
    const all = getAllAnnouncements();
    return [
      {
        key: 'current',
        label: 'SHOWING NOW',
        items: all.filter((a) => !isScheduled(a, at) && !isExpired(a, at)),
      },
      {
        key: 'scheduled',
        label: 'NOT PUBLISHED YET',
        items: all.filter((a) => isScheduled(a, at)),
      },
      {
        key: 'past',
        label: 'NO LONGER CURRENT',
        items: all.filter((a) => !isScheduled(a, at) && isExpired(a, at)),
      },
    ].filter((group) => group.items.length > 0);
  }, [at]);

  const open = useCallback(
    (announcement: Announcement) => {
      router.push({ pathname: '/announcement/[id]', params: { id: announcement.id } });
    },
    [router],
  );

  const caveat = announcementsCaveat();

  if (groups.length === 0) {
    return (
      <EmptyState
        testID={testID}
        title="Nothing has been posted yet"
        message="Festival notices — schedule changes, weather calls, box-office hours — will appear here."
      />
    );
  }

  return (
    <View testID={testID}>
      {caveat ? (
        <ProvenanceNote
          title="These announcements are illustrative"
          lines={[
            caveat,
            'Each carries its real festival-week publish and expiry date, so outside that week most of them sit in the future or have already lapsed. They are grouped here by where they fall against the clock. Only genuinely live notices reach the Home banner.',
          ]}
          style={{ marginBottom: theme.space.lg }}
        />
      ) : null}

      {groups.map((group, index) => (
        <View key={group.key} style={{ marginTop: index === 0 ? 0 : theme.space.md }}>
          <FeedGroupHeader label={group.label} />
          {group.items.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              at={at}
              onPress={() => {
                open(announcement);
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
