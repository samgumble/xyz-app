import { Redirect } from 'expo-router';
import React from 'react';

/**
 * "My Weekend" was promoted to a tab and renamed "My Schedule". Preview links
 * to the old URL are already in circulation, so keep it resolving rather than
 * dropping people on the not-found screen.
 */
export default function WeekendRedirectRoute(): React.JSX.Element {
  return <Redirect href="/my-schedule" />;
}
