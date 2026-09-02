import { List, Map as MapIcon, Maximize2, ZoomIn, ZoomOut } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { getPlaces } from '@/data/repository';
import { borderWidth, minTouchTarget, opacity, useTheme } from '@/theme';
import type { Place } from '@/types/content';

import { groundsMapCaveat } from './geometry';
import { LayerToggles } from './LayerToggles';
import { MapCanvas } from './MapCanvas';
import { PlaceListView } from './PlaceListView';
import { PlaceSheet } from './PlaceSheet';
import { ALL_LAYERS_ON, countByLayer, visiblePlaces, type LayerId, type LayerState } from './layers';
import { useMapViewport, ZOOM_STEP } from './useMapViewport';

type ViewMode = 'map' | 'list';

/**
 * The Map tab.
 *
 * There is no official grounds map for this festival, so this one is honest
 * about what it is: 33 pins whose coordinates were reconstructed from the
 * festival's own prose, drawn over blocks rather than a survey. The caption
 * saying so is always on screen — it is not a dismissible banner and it does
 * not hide behind an info button.
 *
 * Two peer views over the same filtered data: the schematic, and a list. GPS is
 * deliberately absent — see the About panel.
 */
export function MapScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const places = useMemo(() => getPlaces(), []);
  const counts = useMemo(() => countByLayer(places), [places]);
  const caveat = useMemo(() => groundsMapCaveat(), []);

  const [layers, setLayers] = useState<LayerState>(ALL_LAYERS_ON);
  const [mode, setMode] = useState<ViewMode>('map');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [aboutOpen, setAboutOpen] = useState(false);

  const controller = useMapViewport();
  const shown = useMemo(() => visiblePlaces(places, layers), [places, layers]);
  const selected = useMemo(() => places.find((p) => p.id === selectedId), [places, selectedId]);

  const toggleLayer = useCallback((id: LayerId): void => {
    setLayers((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const showAll = useCallback((): void => setLayers(ALL_LAYERS_ON), []);
  const selectPlace = useCallback((place: Place): void => setSelectedId(place.id), []);
  const closeSheet = useCallback((): void => setSelectedId(undefined), []);

  const gestureHint =
    Platform.OS === 'web'
      ? 'Drag to pan · scroll or use the buttons to zoom'
      : 'Drag to pan · pinch or use the buttons to zoom';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, gap: theme.space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
          <Text accessibilityRole="header" style={[theme.type.h1, { color: theme.colors.text, flex: 1 }]}>
            Map
          </Text>
          <ModeSwitch mode={mode} onChange={setMode} />
        </View>

        <Text style={[theme.type.bodySm, { color: theme.colors.text }]}>
          Approximate layout, drawn from the festival&rsquo;s own descriptions. This is not an official
          festival map and the distances are not to scale.
        </Text>

        <Pressable
          onPress={() => setAboutOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={aboutOpen ? 'Hide how this map was made' : 'How this map was made'}
          accessibilityState={{ expanded: aboutOpen }}
          hitSlop={theme.hitSlop}
          style={({ pressed }) => [
            { alignSelf: 'flex-start', minHeight: theme.space.xl },
            pressed ? { opacity: opacity.pressed } : null,
          ]}
        >
          <Text style={[theme.type.label, { color: theme.colors.accent }]}>
            {aboutOpen ? 'Hide details' : 'How this map was made'}
          </Text>
        </Pressable>

        {aboutOpen ? (
          <View
            style={{
              gap: theme.space.sm,
              padding: theme.space.md,
              borderRadius: theme.radius.md,
              borderWidth: borderWidth.hairline,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            {caveat ? (
              <View style={{ gap: theme.space.xs }}>
                <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
                  From the bundled data&rsquo;s own provenance note
                </Text>
                <Text style={[theme.type.bodySm, { color: theme.colors.text }]}>{caveat}.</Text>
              </View>
            ) : null}
            <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
              Pins marked &ldquo;Approx.&rdquo; are ones the festival has never placed publicly — the
              Truck Stage is the one that matters this year. Everything else is positioned from a stated
              relationship (&ldquo;between the Main Stage and the Blues Stage&rdquo;, &ldquo;east edge of
              the grounds&rdquo;), not from a measurement.
            </Text>
            <Text style={[theme.type.bodySm, { color: theme.colors.textMuted }]}>
              There is no blue dot. The app asks for no location permission and does no distance or
              walk-time estimates, because coordinates this rough would make both of those lie
              confidently. A surveyed map would change that.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingTop: theme.space.sm }}>
        <LayerToggles state={layers} counts={counts} onToggle={toggleLayer} onShowAll={showAll} />
      </View>

      {mode === 'map' ? (
        <View style={{ flex: 1 }}>
          <MapCanvas
            places={shown}
            selectedId={selectedId}
            onSelectPlace={selectPlace}
            controller={controller}
            testID="map-canvas"
          />
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              right: theme.space.lg,
              bottom: theme.space.lg,
              gap: theme.space.sm,
            }}
          >
            <ZoomButton
              label="Zoom in"
              onPress={() => controller.zoomBy(ZOOM_STEP)}
              disabled={controller.atMaxZoom}
              icon={<ZoomIn size={theme.space.xl} color={theme.colors.text} />}
              testID="map-zoom-in"
            />
            <ZoomButton
              label="Zoom out"
              onPress={() => controller.zoomBy(1 / ZOOM_STEP)}
              disabled={controller.atMinZoom}
              icon={<ZoomOut size={theme.space.xl} color={theme.colors.text} />}
              testID="map-zoom-out"
            />
            <ZoomButton
              label="Fit the whole map"
              value={`${controller.zoomPercent} percent`}
              onPress={controller.reset}
              icon={<Maximize2 size={theme.space.xl} color={theme.colors.text} />}
              testID="map-zoom-fit"
            />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <PlaceListView places={shown} layers={layers} onSelectPlace={selectPlace} />
        </View>
      )}

      {mode === 'map' ? (
        <Text
          style={[
            theme.type.label,
            {
              color: theme.colors.textMuted,
              paddingHorizontal: theme.space.lg,
              paddingVertical: theme.space.sm,
            },
          ]}
        >
          {gestureHint} · {shown.length} of {places.length} places shown
        </Text>
      ) : null}

      <PlaceSheet place={selected} onClose={closeSheet} />
    </View>
  );
}

interface ModeSwitchProps {
  mode: ViewMode;
  onChange: (next: ViewMode) => void;
}

/** Map or list, as equals. The list is the accessible route to the same pins. */
function ModeSwitch({ mode, onChange }: ModeSwitchProps): React.JSX.Element {
  const { theme } = useTheme();

  const options: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'map', label: 'Map view', icon: <MapIcon size={theme.space.lg} color={theme.colors.text} /> },
    { id: 'list', label: 'List view', icon: <List size={theme.space.lg} color={theme.colors.text} /> },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: theme.radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      {options.map((option) => {
        const active = option.id === mode;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            testID={`map-mode-${option.id}`}
            style={({ pressed }) => [
              {
                minWidth: minTouchTarget,
                minHeight: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: theme.space.md,
                backgroundColor: active ? theme.colors.surfaceAlt : theme.colors.surface,
              },
              pressed ? { opacity: opacity.pressed } : null,
            ]}
          >
            {option.icon}
          </Pressable>
        );
      })}
    </View>
  );
}

interface ZoomButtonProps {
  label: string;
  value?: string;
  onPress: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  testID?: string;
}

function ZoomButton({
  label,
  value,
  onPress,
  icon,
  disabled = false,
  testID,
}: ZoomButtonProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={value === undefined ? undefined : { text: value }}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        {
          width: minTouchTarget,
          height: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.md,
          borderWidth: borderWidth.hairline,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
        },
      ]}
    >
      {icon}
    </Pressable>
  );
}
