import { Link } from 'expo-router';
import React from 'react';

import { EmptyState, Screen } from '@/components';
import { useTheme } from '@/theme';

/** Deep links survive schedule changes; a dead one should still land somewhere. */
export default function NotFoundScreen(): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <Screen title="Not found" testID="screen-not-found">
      <EmptyState
        title="That page has moved"
        message="The link you followed does not point at anything in this year's festival."
      />
      <Link href="/" style={{ color: theme.colors.accent, textAlign: 'center' }}>
        Back to Home
      </Link>
    </Screen>
  );
}
