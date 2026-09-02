import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { getFestival } from '@/data/repository';
import { ExternalLinkRow, ProvenanceNote, RowGroup, festivalDataNote } from '@/features/info';
import { useTheme } from '@/theme';

export interface CreditsSectionProps {
  testID?: string;
}

const ACRONYMS: Record<string, string> = {
  faqs: 'FAQs',
  rv: 'RV',
  vip: 'VIP',
};

/** `brewersShowcase` → `Brewers showcase`, `faqs` → `FAQs`. */
function humaniseLinkKey(key: string): string {
  const known = ACRONYMS[key.toLowerCase()];
  if (known) return known;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => ACRONYMS[w] ?? w);
  const first = words[0] ?? key;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

/**
 * Credits and provenance. The caveats are read straight out of
 * `festival._dataNote` rather than restated, so this block cannot go stale and
 * the client sees exactly what the data itself admits to.
 */
export function CreditsSection({ testID }: CreditsSectionProps): React.JSX.Element {
  const { theme } = useTheme();
  const festival = getFestival();
  const note = useMemo(() => festivalDataNote(), []);

  const links = useMemo(
    () =>
      Object.entries(festival.links)
        .filter(([, url]) => typeof url === 'string' && url.length > 0)
        .map(([key, url]) => ({ key, url, label: humaniseLinkKey(key) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [festival.links],
  );

  return (
    <View testID={testID} style={{ gap: theme.space.lg }}>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          padding: theme.space.lg,
          gap: theme.space.sm,
        }}
      >
        <Text style={[theme.type.h3, { color: theme.colors.text }]}>{festival.name}</Text>
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
          {festival.edition} · {festival.venue.name}
        </Text>
        <Text style={[theme.type.body, { color: theme.colors.text, marginTop: theme.space.sm }]}>
          This is a preview build. It runs entirely offline against a bundled snapshot of the festival&apos;s
          own published content — there is no server, no account and no analytics, and nothing you do in the
          app leaves the device.
        </Text>
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
          All festival content is sourced from tellurideblues.com and belongs to SBG Productions. Set times,
          prices and policies must be re-verified against the official site before this ships.
        </Text>
        <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
          Not wired up in this build: live weather, gondola status, push notifications, and content sync —
          the sync engine exists but points at a stub and falls back to the bundled snapshot.
        </Text>
      </View>

      {note.intro || note.caveats.length > 0 ? (
        <ProvenanceNote
          title="What the bundled data does and does not know"
          lines={note.intro ? [note.intro] : []}
          items={note.caveats}
          testID="credits-data-note"
        />
      ) : null}

      {links.length > 0 ? (
        <View>
          <Text
            accessibilityRole="header"
            style={[theme.type.h3, { color: theme.colors.text, marginBottom: theme.space.md }]}
          >
            Official links
          </Text>
          <RowGroup>
            {links.map((link, index) => (
              <ExternalLinkRow
                key={link.key}
                first={index === 0}
                label={link.label}
                url={link.url}
                description={link.url}
              />
            ))}
          </RowGroup>
        </View>
      ) : null}
    </View>
  );
}
