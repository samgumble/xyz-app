/**
 * The install affordances (plan 05 §3).
 *
 * Two things here are worth a test and nothing else in the app covers them:
 *
 * 1. The iOS-Safari check. It is user-agent matching, which rots quietly, and
 *    getting it wrong is visible to the client either way — the coach mark
 *    never appearing on an iPhone, or Add-to-Home-Screen instructions shown to
 *    someone on Android who has a real install button.
 * 2. `InstallSection` rendering nothing when there is nothing to offer. It is
 *    dropped into the More screen unconditionally, so "renders null" is the
 *    contract that keeps a native build and an already-installed PWA clean.
 */

import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { InstallSection } from '../InstallSection';
import { isIosSafariUserAgent } from '../useInstallPrompt';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1';
const IPHONE_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15';
const IPHONE_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 331.0.0.37.90';
const IPAD_SAFARI_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

describe('isIosSafariUserAgent', () => {
  it('accepts Safari on iPhone', () => {
    expect(isIosSafariUserAgent(IPHONE_SAFARI, 5)).toBe(true);
  });

  it('accepts Safari on an iPad reporting the desktop user agent', () => {
    // iPadOS 13+ claims to be a Mac; the touch points are the only tell.
    expect(isIosSafariUserAgent(IPAD_SAFARI_DESKTOP_UA, 5)).toBe(true);
  });

  it('rejects a real Mac, which has no Add to Home Screen', () => {
    expect(isIosSafariUserAgent(MAC_SAFARI, 0)).toBe(false);
  });

  it('rejects Android Chrome, which gets a real install prompt instead', () => {
    expect(isIosSafariUserAgent(ANDROID_CHROME, 5)).toBe(false);
  });

  it.each([
    ['Chrome for iOS', IPHONE_CHROME],
    ['Firefox for iOS', IPHONE_FIREFOX],
    ["Instagram's in-app browser", IPHONE_INSTAGRAM],
  ])('rejects %s, whose share sheet does not match the instructions', (_label, ua) => {
    expect(isIosSafariUserAgent(ua, 5)).toBe(false);
  });
});

describe('InstallSection', () => {
  it('renders nothing when there is no install to offer', async () => {
    // The test environment is not iOS Safari and has no deferred prompt, which
    // is the same state as a native build or an already-installed PWA.
    await render(
      <ThemeProvider>
        <InstallSection testID="install-section" />
      </ThemeProvider>,
    );

    expect(screen.queryByTestId('install-section')).toBeNull();
    expect(screen.queryByTestId('install-prompt-button')).toBeNull();
    expect(screen.queryByTestId('install-ios-dismiss')).toBeNull();
  });
});
