import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { AnnouncementDetailScreen } from '@/features/announcements';

/** Route shell only — the screen lives in `src/features/announcements/`. */
export default function AnnouncementRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ id: string }>();
  return <AnnouncementDetailScreen id={params.id ?? ''} />;
}
