import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';

import { EmptyState, Screen } from '@/components';
import { getFestival, getInfoPage, getInfoPages } from '@/data/repository';
import { useTheme } from '@/theme';

import { InfoBody } from './InfoBody';
import { ProvenanceNote } from './ProvenanceNote';
import { ExternalLinkRow, NavRow, RowGroup } from './Rows';

export interface InfoPageScreenProps {
  slug: string;
}

/**
 * One published info page. The body is markdown-ish plain text; it is parsed
 * and rendered by `InfoBody` — headings, lists and the ticket price table all
 * keep their structure.
 */
export function InfoPageScreen({ slug }: InfoPageScreenProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const page = useMemo(() => getInfoPage(slug), [slug]);
  const others = useMemo(() => getInfoPages().filter((p) => p.slug !== slug), [slug]);
  const festival = getFestival();

  const goToPage = useCallback(
    (nextSlug: string) => {
      router.push({ pathname: '/info/[slug]', params: { slug: nextSlug } });
    },
    [router],
  );

  if (!page) {
    return (
      <Screen testID="screen-info-detail">
        <Stack.Screen options={{ title: 'Info' }} />
        <EmptyState
          title="That page is not in this build"
          message="The festival info pages bundled with the app may have changed. Go back and pick one from the list."
          actionLabel="Back to More"
          onAction={() => {
            router.back();
          }}
        />
      </Screen>
    );
  }

  const website = festival.links['website'];

  return (
    <Screen testID="screen-info-detail">
      <Stack.Screen options={{ title: page.title }} />

      <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text }]}>
        {page.title}
      </Text>
      <Text style={[theme.type.bodySm, { color: theme.colors.textMuted, marginTop: theme.space.xs }]}>
        {festival.name} · {festival.edition}
      </Text>

      <InfoBody
        body={page.body}
        omitLeadingTitle={page.title}
        style={{ marginTop: theme.space.lg }}
        testID="info-body"
      />

      <ProvenanceNote
        title="Where this page comes from"
        lines={[
          'Transcribed from the official festival site. It is a preview build, so treat prices, hours and policies as indicative until the client confirms them.',
        ]}
        style={{ marginTop: theme.space.xl }}
      />

      {website ? (
        <View style={{ marginTop: theme.space.lg }}>
          <RowGroup>
            <ExternalLinkRow
              first
              label="Read this on tellurideblues.com"
              url={website}
              description="The official site is always the last word."
            />
          </RowGroup>
        </View>
      ) : null}

      {others.length > 0 ? (
        <View style={{ marginTop: theme.space.xl }}>
          <Text
            accessibilityRole="header"
            style={[theme.type.h3, { color: theme.colors.text, marginBottom: theme.space.md }]}
          >
            More festival info
          </Text>
          <RowGroup>
            {others.map((other, index) => (
              <NavRow
                key={other.slug}
                first={index === 0}
                label={other.title}
                onPress={() => {
                  goToPage(other.slug);
                }}
              />
            ))}
          </RowGroup>
        </View>
      ) : null}
    </Screen>
  );
}
