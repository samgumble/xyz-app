import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { borderWidth, minTouchTarget, useTheme } from '@/theme';
import type { Place } from '@/types/content';

import {
  findZone,
  GROUNDS_ZONE_ID,
  isApproximatePlace,
  MAP_ZONES,
  pinRadius,
  TOWN_ZONE_ID,
  project,
  selectedPinRadius,
  zoneContains,
  type MapZone,
  type Point,
} from './geometry';
import { kindLabel, layerColor, layerFor } from './layers';
import type { MapViewportController } from './useMapViewport';

/** Dash pattern for every zone edge — nothing on this map is a surveyed line. */
const ZONE_DASH = '7,6';
/** A stage block in map units, drawn behind the pins that sit on the grounds. */
const STAGE_BLOCK = { width: 118, height: 52 };
/** Trackpad and wheel sensitivity; the exponent keeps zoom smooth either way. */
const WHEEL_SENSITIVITY = 0.0022;
/** Zoom, as a percentage of the fitted view, at which stage labels appear. */
const STAGE_LABEL_ZOOM = 140;
/** Rough width of one character, as a fraction of the font size. */
const CHAR_WIDTH_RATIO = 0.54;

interface WheelLikeEvent {
  deltaY: number;
  clientX: number;
  clientY: number;
  preventDefault: () => void;
}

interface WheelCapableNode {
  addEventListener: (
    type: 'wheel',
    listener: (event: WheelLikeEvent) => void,
    options?: { passive: boolean },
  ) => void;
  removeEventListener: (type: 'wheel', listener: (event: WheelLikeEvent) => void) => void;
  getBoundingClientRect: () => { left: number; top: number };
}

export interface MapCanvasProps {
  places: readonly Place[];
  selectedId: string | undefined;
  onSelectPlace: (place: Place) => void;
  controller: MapViewportController;
  testID?: string;
}

/**
 * The map itself: schematic zones, a pin per place, and a transparent 44pt
 * target over every pin.
 *
 * Only the zone rectangles live in map coordinates. Pins, labels and the north
 * marker are projected into screen pixels and drawn at a fixed size, so zooming
 * in shows you more space between things rather than a bigger blob of ink.
 */
export function MapCanvas({
  places,
  selectedId,
  onSelectPlace,
  controller,
  testID,
}: MapCanvasProps): React.JSX.Element {
  const { theme } = useTheme();
  const { viewport, size, onLayout, responderHandlers, zoomAt, zoomPercent } = controller;
  const containerRef = useRef<View | null>(null);

  // Wheel and trackpad zoom. Web only, attached to the real DOM node because
  // React Native's View has no wheel prop; native keeps the pinch gesture.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as WheelCapableNode | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    const handleWheel = (event: WheelLikeEvent): void => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * WHEEL_SENSITIVITY), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  const grounds = findZone(GROUNDS_ZONE_ID);
  const town = findZone(TOWN_ZONE_ID);
  // The stages you navigate by stay labelled at every zoom. The five club
  // venues are a few doors apart on one street, so their labels would pile into
  // an unreadable stack until you have zoomed past the fitted view.
  const showCrowdedLabels = zoomPercent >= STAGE_LABEL_ZOOM;
  const labelled = (place: Place): boolean =>
    place.kind === 'stage' && (showCrowdedLabels || !town || !zoneContains(town, place));
  const radius = pinRadius(theme);
  const selectedRadius = selectedPinRadius(theme);

  const projected = useMemo(
    () =>
      places.map((place) => ({
        place,
        point: project(place, viewport),
        approximate: isApproximatePlace(place),
      })),
    [places, viewport],
  );

  const zoneFill = (tone: MapZone['tone']): string => {
    switch (tone) {
      case 'grounds':
        return theme.colors.surface;
      case 'camp':
        return theme.colors.surfaceAlt;
      case 'town':
        return theme.colors.surfaceAlt;
      case 'focus':
        return theme.colors.surface;
      case 'hint':
        return theme.colors.bg;
    }
  };

  const zoneStroke = (tone: MapZone['tone']): string =>
    tone === 'focus' ? theme.colors.primary : theme.colors.border;

  const zoneRect = (zone: MapZone): { x: number; y: number; width: number; height: number } => {
    const origin = project({ x: zone.x, y: zone.y }, viewport);
    return {
      x: origin.x,
      y: origin.y,
      width: zone.width * viewport.scale,
      height: zone.height * viewport.scale,
    };
  };

  const northAnchor: Point = { x: size.width - theme.space.xl, y: theme.space.xl };

  return (
    <View
      ref={containerRef}
      testID={testID}
      onLayout={onLayout}
      style={[styles.fill, { backgroundColor: theme.colors.bg, userSelect: 'none' }]}
      // The map is a picture; assistive technology gets the list view instead,
      // and every pin is also a labelled button in the overlay below.
      accessibilityRole="image"
      accessibilityLabel="Schematic map of Telluride Town Park and the festival venues in town. Approximate layout."
      {...responderHandlers}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {size.width > 0 && size.height > 0 ? (
          <Svg width={size.width} height={size.height}>
            {MAP_ZONES.map((zone) => {
              const rect = zoneRect(zone);
              return (
                <Rect
                  key={zone.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx={theme.radius.md}
                  fill={zoneFill(zone.tone)}
                  stroke={zoneStroke(zone.tone)}
                  strokeWidth={borderWidth.hairline}
                  strokeDasharray={ZONE_DASH}
                />
              );
            })}

            {/* A block behind each stage that sits inside the grounds, so the
                two anchor points of the site read at a glance. Derived from the
                data, never from an id. */}
            {projected.map(({ place, point, approximate }) => {
              if (place.kind !== 'stage' || approximate) return null;
              if (!grounds || !zoneContains(grounds, place)) return null;
              const width = STAGE_BLOCK.width * viewport.scale;
              const height = STAGE_BLOCK.height * viewport.scale;
              return (
                <Rect
                  key={`block-${place.id}`}
                  x={point.x - width / 2}
                  y={point.y - height / 2}
                  width={width}
                  height={height}
                  rx={theme.radius.sm}
                  fill={theme.colors.surfaceAlt}
                  stroke={theme.colors.stageMain}
                  strokeWidth={borderWidth.hairline}
                />
              );
            })}

            {/* A zone label that overhangs its own block reads as a caption for
                whatever it happens to cross, so it shortens, then disappears,
                as the zone shrinks. */}
            {MAP_ZONES.map((zone) => {
              const origin = project({ x: zone.x, y: zone.y }, viewport);
              const room = zone.width * viewport.scale - theme.space.sm * 2;
              const width = (text: string): number =>
                text.length * theme.type.label.fontSize * CHAR_WIDTH_RATIO;
              const text =
                width(zone.label) <= room ? zone.label : width(zone.short) <= room ? zone.short : undefined;
              if (text === undefined) return null;
              return (
                <SvgText
                  key={`label-${zone.id}`}
                  x={origin.x + theme.space.sm}
                  y={origin.y + theme.space.lg}
                  fontSize={theme.type.label.fontSize}
                  fill={theme.colors.textMuted}
                >
                  {text}
                </SvgText>
              );
            })}

            {projected.map(({ place, point, approximate }) => {
              const selected = place.id === selectedId;
              const color = layerColor(theme, layerFor(place));
              return (
                <React.Fragment key={place.id}>
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={selected ? selectedRadius : radius}
                    fill={approximate ? theme.colors.bg : color}
                    stroke={selected ? theme.colors.text : color}
                    strokeWidth={selected ? borderWidth.thick : borderWidth.hairline}
                    strokeDasharray={approximate ? ZONE_DASH : undefined}
                  />
                  {approximate ? (
                    <SvgText
                      x={point.x}
                      y={point.y + theme.space.xs}
                      fontSize={theme.type.label.fontSize}
                      fontWeight={theme.type.label.fontWeight}
                      textAnchor="middle"
                      fill={theme.colors.text}
                    >
                      ?
                    </SvgText>
                  ) : null}
                  {selected || labelled(place) ? (
                    <SvgText
                      x={point.x}
                      y={point.y - selectedRadius - theme.space.xs}
                      fontSize={theme.type.label.fontSize}
                      fontWeight={selected ? theme.type.label.fontWeight : undefined}
                      textAnchor="middle"
                      fill={selected ? theme.colors.text : theme.colors.textMuted}
                    >
                      {place.name}
                    </SvgText>
                  ) : null}
                </React.Fragment>
              );
            })}

            {/* North marker. The one orientation fact the festival's own copy
                establishes: the main entrance is on the north side. */}
            <Line
              x1={northAnchor.x}
              y1={northAnchor.y + theme.space.lg}
              x2={northAnchor.x}
              y2={northAnchor.y}
              stroke={theme.colors.textMuted}
              strokeWidth={borderWidth.thick}
            />
            <SvgText
              x={northAnchor.x}
              y={northAnchor.y - theme.space.xs}
              fontSize={theme.type.label.fontSize}
              fontWeight={theme.type.label.fontWeight}
              textAnchor="middle"
              fill={theme.colors.textMuted}
            >
              N
            </SvgText>
          </Svg>
        ) : null}
      </View>

      {projected.map(({ place, point, approximate }) => (
        <Pressable
          key={`hit-${place.id}`}
          onPress={() => onSelectPlace(place)}
          accessibilityRole="button"
          accessibilityState={{ selected: place.id === selectedId }}
          accessibilityLabel={`${place.name}. ${kindLabel(place.kind)}.${
            approximate ? ' Approximate position.' : ''
          }`}
          accessibilityHint="Opens the details for this place."
          testID={`map-pin-${place.id}`}
          style={[
            styles.hit,
            {
              left: point.x - minTouchTarget / 2,
              top: point.y - minTouchTarget / 2,
              width: minTouchTarget,
              height: minTouchTarget,
              borderRadius: theme.radius.pill,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  hit: { position: 'absolute' },
});
