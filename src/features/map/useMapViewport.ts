import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  type GestureResponderEvent,
  type GestureResponderHandlers,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';

import { fitScale, fitViewport, MAP_EXTENT, type MapViewport, type Point } from './geometry';

/**
 * Pan and zoom for the grounds map, in plain React state.
 *
 * One gesture path serves both platforms: the responder system delivers touch
 * on native and mouse drags on web, two-finger pinch is read straight off
 * `nativeEvent.touches`, and the wheel/trackpad path is attached by the canvas
 * (web only) through `zoomAt`. The buttons on the screen do the same work, so
 * zoom is reachable without any gesture at all.
 */

/** How far you may zoom out past "everything fits", and in past it. */
const MIN_ZOOM_FACTOR = 0.9;
const MAX_ZOOM_FACTOR = 6;

/** Movement, in px, before a drag steals the gesture from a pin underneath. */
const DRAG_SLOP = 5;

/** Fraction of the map that must stay on screen, so it can never be lost. */
const MIN_VISIBLE_FRACTION = 0.35;

export const ZOOM_STEP = 1.6;

export interface MapSize {
  width: number;
  height: number;
}

export interface MapViewportController {
  viewport: MapViewport;
  size: MapSize;
  /** Feed the canvas's measured size in; the first measure fits the map. */
  onLayout: (event: LayoutChangeEvent) => void;
  responderHandlers: GestureResponderHandlers;
  /** Multiplies the zoom about the canvas centre. */
  zoomBy: (factor: number) => void;
  /** Multiplies the zoom about a point in canvas pixels — wheel and pinch. */
  zoomAt: (factor: number, focus: Point) => void;
  reset: () => void;
  /** 100 = everything fits. Announced next to the zoom controls. */
  zoomPercent: number;
  atMinZoom: boolean;
  atMaxZoom: boolean;
}

function clampViewport(next: MapViewport, size: MapSize, fit: number): MapViewport {
  const scale = Math.min(Math.max(next.scale, fit * MIN_ZOOM_FACTOR), fit * MAX_ZOOM_FACTOR);
  const content = MAP_EXTENT * scale;
  const keepX = Math.min(content, size.width) * MIN_VISIBLE_FRACTION;
  const keepY = Math.min(content, size.height) * MIN_VISIBLE_FRACTION;
  return {
    scale,
    tx: Math.min(Math.max(next.tx, keepX - content), size.width - keepX),
    ty: Math.min(Math.max(next.ty, keepY - content), size.height - keepY),
  };
}

interface GestureBookkeeping {
  lastDx: number;
  lastDy: number;
  lastDistance: number;
  lastMid: Point | null;
}

function touchDistance(event: GestureResponderEvent): number {
  const [a, b] = event.nativeEvent.touches;
  if (!a || !b) return 0;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

function touchMidpoint(event: GestureResponderEvent): Point | null {
  const [a, b] = event.nativeEvent.touches;
  if (!a || !b) return null;
  return { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
}

export function useMapViewport(): MapViewportController {
  const [size, setSize] = useState<MapSize>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<MapViewport>({ scale: 1, tx: 0, ty: 0 });

  const sizeRef = useRef<MapSize>({ width: 0, height: 0 });
  const viewportRef = useRef<MapViewport>({ scale: 1, tx: 0, ty: 0 });
  const fitRef = useRef<number>(1);
  const gesture = useRef<GestureBookkeeping>({
    lastDx: 0,
    lastDy: 0,
    lastDistance: 0,
    lastMid: null,
  });

  const apply = useCallback((next: MapViewport): void => {
    const clamped = clampViewport(next, sizeRef.current, fitRef.current);
    viewportRef.current = clamped;
    setViewport(clamped);
  }, []);

  const onLayout = useCallback(
    (event: LayoutChangeEvent): void => {
      const { width, height } = event.nativeEvent.layout;
      if (width <= 0 || height <= 0) return;
      const previous = sizeRef.current;
      if (previous.width === width && previous.height === height) return;

      sizeRef.current = { width, height };
      fitRef.current = fitScale(width, height);
      setSize({ width, height });

      // First measure, or a resize while still at the fitted view (rotation, a
      // browser window drag): re-fit. A viewer who has panned or zoomed keeps
      // what they were looking at.
      const untouched = previous.width === 0 || viewportRef.current.scale === fitScale(previous.width, previous.height);
      if (untouched) {
        const fitted = fitViewport(width, height);
        viewportRef.current = fitted;
        setViewport(fitted);
      } else {
        apply(viewportRef.current);
      }
    },
    [apply],
  );

  const zoomAt = useCallback(
    (factor: number, focus: Point): void => {
      const current = viewportRef.current;
      const scale = current.scale * factor;
      // Hold the focus point still: it names the same map coordinate before
      // and after the zoom.
      const ratio = scale / current.scale;
      apply({
        scale,
        tx: focus.x - (focus.x - current.tx) * ratio,
        ty: focus.y - (focus.y - current.ty) * ratio,
      });
    },
    [apply],
  );

  const zoomBy = useCallback(
    (factor: number): void => {
      const { width, height } = sizeRef.current;
      zoomAt(factor, { x: width / 2, y: height / 2 });
    },
    [zoomAt],
  );

  const reset = useCallback((): void => {
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;
    const fitted = fitViewport(width, height);
    viewportRef.current = fitted;
    setViewport(fitted);
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Pins sit on top of the canvas and must keep their taps, so the drag
        // only takes over once the finger (or mouse) has actually moved.
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_evt, g: PanResponderGestureState) =>
          Math.abs(g.dx) > DRAG_SLOP || Math.abs(g.dy) > DRAG_SLOP,
        onMoveShouldSetPanResponderCapture: (evt, g: PanResponderGestureState) =>
          evt.nativeEvent.touches.length > 1 ||
          Math.abs(g.dx) > DRAG_SLOP ||
          Math.abs(g.dy) > DRAG_SLOP,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          gesture.current = { lastDx: 0, lastDy: 0, lastDistance: 0, lastMid: null };
        },
        onPanResponderMove: (evt: GestureResponderEvent, g: PanResponderGestureState) => {
          const book = gesture.current;

          if (evt.nativeEvent.touches.length > 1) {
            const distance = touchDistance(evt);
            const mid = touchMidpoint(evt);
            if (distance > 0 && book.lastDistance > 0 && mid && book.lastMid) {
              const current = viewportRef.current;
              const { width, height } = sizeRef.current;
              const ratio = distance / book.lastDistance;
              // Pinch scales about the canvas centre and pans by how far the
              // two fingers moved together — both are deltas, so neither needs
              // the canvas's position on the page.
              const centre = { x: width / 2, y: height / 2 };
              const scale = current.scale * ratio;
              const scaleRatio = scale / current.scale;
              apply({
                scale,
                tx: centre.x - (centre.x - current.tx) * scaleRatio + (mid.x - book.lastMid.x),
                ty: centre.y - (centre.y - current.ty) * scaleRatio + (mid.y - book.lastMid.y),
              });
            }
            book.lastDistance = distance;
            book.lastMid = mid;
            book.lastDx = g.dx;
            book.lastDy = g.dy;
            return;
          }

          // A finger lifted out of a pinch: start the next pan from here rather
          // than jumping by the whole accumulated delta.
          book.lastDistance = 0;
          book.lastMid = null;

          const current = viewportRef.current;
          apply({
            scale: current.scale,
            tx: current.tx + (g.dx - book.lastDx),
            ty: current.ty + (g.dy - book.lastDy),
          });
          book.lastDx = g.dx;
          book.lastDy = g.dy;
        },
        onPanResponderRelease: () => {
          gesture.current = { lastDx: 0, lastDy: 0, lastDistance: 0, lastMid: null };
        },
        onPanResponderTerminate: () => {
          gesture.current = { lastDx: 0, lastDy: 0, lastDistance: 0, lastMid: null };
        },
      }),
    [apply],
  );

  const fit = fitRef.current;
  return {
    viewport,
    size,
    onLayout,
    responderHandlers: responder.panHandlers,
    zoomBy,
    zoomAt,
    reset,
    zoomPercent: Math.round((viewport.scale / (fit || 1)) * 100),
    atMinZoom: viewport.scale <= fit * MIN_ZOOM_FACTOR + Number.EPSILON,
    atMaxZoom: viewport.scale >= fit * MAX_ZOOM_FACTOR - Number.EPSILON,
  };
}
