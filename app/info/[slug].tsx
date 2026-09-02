import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen } from '@/components';

/** Placeholder. Owned by `src/features/info/` — see BUILD-BRIEF.md. */
export default function InfoPageScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug ?? '';
  return (
    <Screen
      title="Info"
      subtitle={`Placeholder screen for slug "${slug}". The info feature lands here.`}
      testID="screen-info-detail"
    />
  );
}
