import { AlertTriangle, Megaphone, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getActiveAnnouncements } from '@/data/repository';
import { DecorativeIcon } from '@/features/info';
import { useAppStore } from '@/store/useAppStore';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Announcement } from '@/types/content';

import { priorityMeta } from './priority';

export interface AnnouncementBannerProps {
  /** "Now" — passed in so the banner re-evaluates with the Home clock. */
  at: Date;
  testID?: string;
}

/**
 * The one thing allowed to interrupt Home. Only `important` and `urgent`
 * announcements qualify; `info` stays in the feed. Dismissal is stored per id,
 * so a dismissed notice never comes back and a new one still gets through.
 */
export function AnnouncementBanner({ at, testID }: AnnouncementBannerProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const router = useRouter();
  const dismissed = useAppStore((s) => s.dismissedAnnouncements);
  const dismiss = useAppStore((s) => s.dismissAnnouncement);

  const announcement = useMemo<Announcement | undefined>(() => {
    const candidates = getActiveAnnouncements(at).filter(
      (a) => a.priority !== 'info' && !dismissed.includes(a.id),
    );
    // Highest priority first, then newest — the feed order is already newest-first.
    return [...candidates].sort(
      (a, b) =>
        priorityMeta(theme, b.priority).rank - priorityMeta(theme, a.priority).rank ||
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    )[0];
  }, [at, dismissed, theme]);

  const open = useCallback(() => {
    if (announcement) {
      router.push({ pathname: '/announcement/[id]', params: { id: announcement.id } });
    }
  }, [announcement, router]);

  const onDismiss = useCallback(() => {
    if (announcement) dismiss(announcement.id);
  }, [announcement, dismiss]);

  if (!announcement) return null;

  const meta = priorityMeta(theme, announcement.priority);
  const filled = announcement.priority === 'urgent';
  const foreground = filled ? theme.colors.accentText : theme.colors.text;
  const secondary = filled ? theme.colors.accentText : theme.colors.textMuted;
  const Icon = filled ? AlertTriangle : Megaphone;

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        backgroundColor: filled ? meta.color : theme.colors.surface,
        borderWidth: borderWidth.hairline,
        borderColor: filled ? meta.color : theme.colors.border,
        borderLeftWidth: borderWidth.thick + borderWidth.hairline,
        borderLeftColor: meta.color,
        borderRadius: theme.radius.md,
        marginBottom: theme.space.md,
      }}
    >
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${meta.label}: ${announcement.title}`}
        accessibilityHint="Opens the full announcement"
        style={({ pressed }) => [
          {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.md,
            minHeight: minTouchTarget,
            paddingVertical: theme.space.md,
            paddingLeft: theme.space.md,
          },
          pressed ? { opacity: opacity.pressed } : null,
        ]}
      >
        <DecorativeIcon>
          <Icon size={theme.type.h3.fontSize} color={filled ? foreground : meta.color} />
        </DecorativeIcon>
        <View style={{ flex: 1 }}>
          <Text style={[theme.type.label, { color: secondary }]}>{meta.label.toUpperCase()}</Text>
          <Text
            numberOfLines={2}
            style={[theme.type.body, { color: foreground, fontWeight: theme.type.h3.fontWeight }]}
          >
            {announcement.title}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss announcement: ${announcement.title}`}
        accessibilityHint="Hides this banner. You can still read it in More."
        hitSlop={theme.hitSlop}
        style={({ pressed }) => [
          {
            width: minTouchTarget,
            height: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed ? { opacity: opacity.pressed } : null,
        ]}
      >
        <X size={theme.type.h3.fontSize} color={foreground} />
      </Pressable>
    </View>
  );
}
