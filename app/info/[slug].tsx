import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { InfoPageScreen } from '@/features/info';

/** Route shell only — the screen lives in `src/features/info/`. */
export default function InfoRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug: string }>();
  return <InfoPageScreen slug={params.slug ?? ''} />;
}
