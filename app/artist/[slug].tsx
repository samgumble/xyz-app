import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen } from '@/components';

/** Placeholder. Owned by `src/features/lineup/` — see BUILD-BRIEF.md. */
export default function ArtistScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug ?? '';
  return (
    <Screen
      title="Artist"
      subtitle={`Placeholder screen for slug "${slug}". The lineup feature lands here.`}
      testID="screen-lineup-detail"
    />
  );
}
