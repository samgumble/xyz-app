import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Screen } from '@/components';

/** Placeholder. Owned by `src/features/schedule/` — see BUILD-BRIEF.md. */
export default function SetScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  return (
    <Screen
      title="Set"
      subtitle={`Placeholder screen for id "${id}". The schedule feature lands here.`}
      testID="screen-schedule-detail"
    />
  );
}
