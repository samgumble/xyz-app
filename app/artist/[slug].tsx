import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { ArtistScreen } from '@/features/lineup';

/** Route only. Everything lives in `src/features/lineup/`. */
export default function ArtistRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug: string }>();
  return <ArtistScreen slug={params.slug ?? ''} />;
}
