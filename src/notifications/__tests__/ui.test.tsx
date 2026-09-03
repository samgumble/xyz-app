/**
 * Render smoke tests for the two reminder controls.
 *
 * The scheduler is mocked so these run without a native module and so each
 * platform state — supported, unsupported, permission denied — can be forced.
 * The assertions are all on what a person actually reads: the point of this
 * feature's UI is that it never claims a reminder was set when none was.
 */

import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ReminderPermission, ReminderScheduler } from '@/notifications/types';

const state: { supported: boolean; permission: ReminderPermission } = {
  supported: true,
  permission: 'granted',
};

jest.mock('@/notifications/scheduler', () => ({
  get scheduler(): ReminderScheduler {
    return {
      get supported() {
        return state.supported;
      },
      async getPermission() {
        return state.permission;
      },
      async requestPermission() {
        return state.permission;
      },
      async list() {
        return [];
      },
      async schedule() {
        return 'n1';
      },
      async cancel() {
        /* no-op */
      },
    };
  },
}));

// Imported after the mock is registered.
import { RemindersSection } from '@/features/settings/RemindersSection';
import { SetReminderRow } from '@/features/schedule/SetReminderRow';
import { entryForSet } from '@/features/schedule/model';
import { useAppStore } from '@/store/useAppStore';
import { useReminderPrefs } from '@/notifications/prefs';
import { useReminderStatus } from '@/notifications/controller';

const ENTRY = entryForSet('fri-main-1200-myron-elkins');

function wrap(node: React.ReactElement): React.ReactElement {
  return <ThemeProvider>{node}</ThemeProvider>;
}

beforeEach(() => {
  state.supported = true;
  state.permission = 'granted';
  useAppStore.setState({ favorites: [] });
  useReminderPrefs.setState({ enabled: true, muted: [] });
  useReminderStatus.setState({
    supported: true,
    supportMessage: '',
    permission: 'granted',
    scheduledKeys: [],
    skipped: [],
    busy: false,
  });
});

describe('SetReminderRow', () => {
  it('offers a reminder switch with the chosen lead time in its label', async () => {
    if (!ENTRY) throw new Error('fixture set missing from the snapshot');
    await render(wrap(<SetReminderRow entry={ENTRY} />));

    expect(screen.getByLabelText('Remind me 15 minutes before')).toBeTruthy();
  });

  it('says reminders need the app instead of showing a switch, when unsupported', async () => {
    if (!ENTRY) throw new Error('fixture set missing from the snapshot');
    useReminderStatus.setState({
      supported: false,
      supportMessage: 'Reminders need the phone app.',
    });

    await render(wrap(<SetReminderRow entry={ENTRY} />));

    expect(screen.getByText('Reminders need the app')).toBeTruthy();
    expect(screen.queryByLabelText('Remind me 15 minutes before')).toBeNull();
  });
});

describe('RemindersSection', () => {
  it('shows the master switch, the lead-time choices and a count', async () => {
    await render(wrap(<RemindersSection />));

    expect(screen.getByLabelText('Set reminders')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    // The count comes from what the OS is holding, and nothing is saved here.
    expect(screen.getByText('0 reminders scheduled')).toBeTruthy();
  });

  it('replaces the whole section with an explanation where it cannot work', async () => {
    useReminderStatus.setState({
      supported: false,
      supportMessage: 'Reminders need the phone app.',
    });

    await render(wrap(<RemindersSection />));

    expect(screen.getByText('Not available here')).toBeTruthy();
    expect(screen.queryByLabelText('Set reminders')).toBeNull();
  });
});
