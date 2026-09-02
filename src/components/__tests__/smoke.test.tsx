import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Heart } from 'lucide-react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { Badge } from '../Badge';

/**
 * Guards two things that each independently made UI untestable in this repo:
 *
 * 1. React Native 0.81's own jest mock crashes on components without a
 *    `prototype`, so importing `Text` from 'react-native' in a test threw.
 *    Worked around by jest/mockComponent.js + a moduleNameMapper entry.
 * 2. @testing-library/react-native 14 returns a PROMISE from `render`, so the
 *    familiar `const { getByText } = render(...)` silently yields undefined.
 *    Await it, or use `screen`.
 *
 * If this file starts failing, check whether React Native fixed the mock
 * upstream and the local patch can be deleted.
 */
describe('component rendering', () => {
  it('renders a core React Native component', async () => {
    const { getByText } = await render(<Text>hello</Text>);
    expect(getByText('hello')).toBeTruthy();
  });

  it('renders a lucide icon, which ships ESM as .mjs', async () => {
    // The preset's transform matches only .js/.jsx/.ts/.tsx, so without the
    // extra .mjs transform rule this import throws "Unexpected token 'export'".
    await render(<Heart accessibilityLabel="Save" />);
    expect(screen.getAllByLabelText('Save').length).toBeGreaterThan(0);
  });

  it('renders a themed app component through the real ThemeProvider', async () => {
    await render(
      <ThemeProvider>
        <Badge label="URGENT" />
      </ThemeProvider>,
    );
    expect(screen.getByText('URGENT')).toBeTruthy();
  });
});
