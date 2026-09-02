import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen } from '@/components';

/** Placeholder. Owned by `src/features/announcements/` — see BUILD-BRIEF.md. */
export default function AnnouncementScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  return (
    <Screen
      title="Announcement"
      subtitle={`Placeholder screen for id "${id}". The announcements feature lands here.`}
      testID="screen-announcements-detail"
    />
  );
}
