import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { SetDetailScreen } from '@/features/schedule';

/** Route only. Everything lives in `src/features/schedule/`. */
export default function SetRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ id: string }>();
  return <SetDetailScreen setId={params.id ?? ''} />;
}
