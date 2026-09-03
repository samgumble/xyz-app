import { Download, Share2, SquarePlus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card } from '@/components';
import { useTheme } from '@/theme';

import { useInstallPrompt, type InstallOutcome } from './useInstallPrompt';

export interface InstallSectionProps {
  testID?: string;
}

/**
 * "Put this on your home screen", per plan 05 §3.
 *
 * Renders **nothing** unless there is something real to offer: on the native
 * builds, once the app is already running standalone, and on any browser that
 * has neither a deferred install prompt nor iOS Safari's manual flow. That way
 * `MoreScreen` can drop it in unconditionally without guarding on platform.
 *
 * Two paths, because the platforms genuinely differ:
 *
 * - Chromium fires `beforeinstallprompt`, which the injected `register-sw.js`
 *   catches before React mounts and parks on `window`. Here it becomes a real
 *   Install button.
 * - iOS Safari has no such API at all, so the only honest thing to do is show
 *   the share-sheet steps once, and let the reader dismiss them for good.
 */
export function InstallSection({ testID }: InstallSectionProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const install = useInstallPrompt();
  const [outcome, setOutcome] = useState<InstallOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  const onInstall = useCallback(() => {
    setBusy(true);
    void install.promptInstall().then((result) => {
      setOutcome(result);
      setBusy(false);
    });
  }, [install]);

  if (install.canPrompt) {
    return (
      <Card testID={testID}>
        <View style={{ gap: theme.space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md }}>
            <Download
              size={theme.space.xl}
              color={theme.colors.accent}
              accessibilityLabel="Install"
            />
            <View style={{ flex: 1, gap: theme.space.xs }}>
              <Text accessibilityRole="header" style={[theme.type.h3, { color: theme.colors.text }]}>
                Install Blues &amp; Brews
              </Text>
              <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                Adds an icon to your home screen and opens without browser chrome. The schedule,
                lineup, map and your saved sets keep working with no signal on the box canyon
                grounds.
              </Text>
            </View>
          </View>

          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              label="Install"
              onPress={onInstall}
              busy={busy}
              accessibilityLabel="Install Telluride Blues and Brews"
              accessibilityHint="Opens your browser's install dialog"
              testID="install-prompt-button"
            />
          </View>

          {outcome === 'dismissed' ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[theme.type.bodySm, { color: theme.colors.textMuted }]}
            >
              No problem. You can install any time from your browser's menu.
            </Text>
          ) : null}

          {outcome === 'unavailable' ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[theme.type.bodySm, { color: theme.colors.textMuted }]}
            >
              Your browser would not open the install dialog. Look for "Install app" or "Add to Home
              screen" in its menu.
            </Text>
          ) : null}
        </View>
      </Card>
    );
  }

  if (install.showIosCoachMark) {
    return (
      <Card testID={testID}>
        <View style={{ gap: theme.space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md }}>
            <SquarePlus
              size={theme.space.xl}
              color={theme.colors.accent}
              accessibilityLabel="Add to Home Screen"
            />
            <View style={{ flex: 1, gap: theme.space.xs }}>
              <Text accessibilityRole="header" style={[theme.type.h3, { color: theme.colors.text }]}>
                Add to your Home Screen
              </Text>
              <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
                Safari on iPhone has no install button, so it takes two taps. Once it is on your
                Home Screen the whole app works with no signal.
              </Text>
            </View>
          </View>

          <View
            accessibilityRole="list"
            style={{
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.md,
              padding: theme.space.lg,
              gap: theme.space.md,
            }}
          >
            <View
              accessibilityRole="text"
              accessibilityLabel="Step 1. Tap the Share button in Safari's toolbar."
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}
            >
              <Share2 size={theme.space.lg} color={theme.colors.text} />
              <Text style={[theme.type.body, { color: theme.colors.text, flex: 1 }]}>
                1. Tap Share in Safari's toolbar.
              </Text>
            </View>

            <View
              accessibilityRole="text"
              accessibilityLabel='Step 2. Choose "Add to Home Screen" from the share sheet.'
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}
            >
              <SquarePlus size={theme.space.lg} color={theme.colors.text} />
              <Text style={[theme.type.body, { color: theme.colors.text, flex: 1 }]}>
                2. Choose "Add to Home Screen", then Add.
              </Text>
            </View>
          </View>

          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              label="Got it"
              variant="secondary"
              onPress={install.dismissIosCoachMark}
              accessibilityLabel="Dismiss the Add to Home Screen instructions"
              accessibilityHint="Hides this for good on this device"
              testID="install-ios-dismiss"
            />
          </View>
        </View>
      </Card>
    );
  }

  return null;
}
