import type { Theme } from '@/theme';
import type { Place, PlaceKind } from '@/types/content';

/**
 * Layer grouping for the grounds map.
 *
 * `Place.kind` has eleven values, which is far too many switches to put in
 * front of someone standing in a field. They collapse into five groups a
 * festivalgoer actually thinks in: where the music is, where the beer is, the
 * things you need when something goes wrong, where you sleep, and how you get
 * around. Every kind belongs to exactly one group — `layerForKind` is total, so
 * a kind added to the schema later still lands somewhere visible.
 */
export type LayerId = 'stages' | 'beer' | 'services' | 'camping' | 'access';

export interface MapLayer {
  id: LayerId;
  label: string;
  /** What turning this layer off actually hides. Read out as the toggle hint. */
  description: string;
  kinds: PlaceKind[];
}

export const MAP_LAYERS: readonly MapLayer[] = [
  {
    id: 'stages',
    label: 'Stages',
    description: 'Stages on the grounds and the late-night club venues in town.',
    kinds: ['stage'],
  },
  {
    id: 'beer',
    label: 'Beer & food',
    description: 'Bars, the Beer Garden, and the food and craft vendor area.',
    kinds: ['food'],
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Medical, water, restrooms, ATMs, the box office and info points.',
    kinds: ['medical', 'water', 'restroom', 'atm', 'info'],
  },
  {
    id: 'camping',
    label: 'Camping',
    description: 'The campgrounds and Warner Field.',
    kinds: ['camp'],
  },
  {
    id: 'access',
    label: 'Getting around',
    description: 'Gates, the gondola station and the town shuttle.',
    kinds: ['gate', 'gondola', 'shuttle'],
  },
] as const;

const KIND_TO_LAYER: Record<PlaceKind, LayerId> = {
  stage: 'stages',
  food: 'beer',
  medical: 'services',
  water: 'services',
  restroom: 'services',
  atm: 'services',
  info: 'services',
  camp: 'camping',
  gate: 'access',
  gondola: 'access',
  shuttle: 'access',
};

export function layerForKind(kind: PlaceKind): LayerId {
  return KIND_TO_LAYER[kind];
}

export function layerFor(place: Place): LayerId {
  return layerForKind(place.kind);
}

export function findLayer(id: LayerId): MapLayer | undefined {
  return MAP_LAYERS.find((l) => l.id === id);
}

/**
 * Layer colours come out of the theme's stage/status ramp, which is already
 * verified for contrast on both grounds. Nothing here invents a hue.
 */
export function layerColor(theme: Theme, id: LayerId): string {
  switch (id) {
    case 'stages':
      return theme.colors.stageMain;
    case 'beer':
      return theme.colors.primary;
    case 'services':
      return theme.colors.stageBlues;
    case 'camping':
      return theme.colors.success;
    case 'access':
      return theme.colors.stageClub;
  }
}

const KIND_LABELS: Record<PlaceKind, string> = {
  gate: 'Entrance',
  water: 'Drinking water',
  medical: 'Medical',
  atm: 'ATM',
  restroom: 'Restrooms',
  shuttle: 'Shuttle',
  gondola: 'Gondola',
  food: 'Food & drink',
  stage: 'Stage',
  camp: 'Camping',
  info: 'Info & services',
};

export function kindLabel(kind: PlaceKind): string {
  return KIND_LABELS[kind];
}

export type LayerState = Record<LayerId, boolean>;

export const ALL_LAYERS_ON: LayerState = {
  stages: true,
  beer: true,
  services: true,
  camping: true,
  access: true,
};

export function visiblePlaces(places: readonly Place[], state: LayerState): Place[] {
  return places.filter((p) => state[layerFor(p)]);
}

export function countByLayer(places: readonly Place[]): Record<LayerId, number> {
  const counts: Record<LayerId, number> = { stages: 0, beer: 0, services: 0, camping: 0, access: 0 };
  for (const place of places) counts[layerFor(place)] += 1;
  return counts;
}
