export type LngLat = [number, number];

export type Category =
  | "academic" | "administrative" | "student-services" | "health" | "food"
  | "sports" | "residential" | "utility" | "security" | "commercial";

export interface Room { code: string; name?: string; floor?: number; type?: string }
export interface Office { name: string; floor?: number }

export interface PlaceProps {
  id: string;
  kind: "building" | "poi" | "gate" | "area";
  name: string;
  shortName: string | null;
  category: Category;
  description: string | null;
  aliases: string[];
  departments: string[];
  offices: Office[];
  rooms: Room[];
  floors: number | null;
  parentId: string | null;
  hours: string | null;
  verified: boolean;
  identified: boolean;
  source: string[];
  osm: string | null;
  center: LngLat;
  door?: LngLat;
  /** Ground surface of an open area: grass, court or paved. */
  surface?: string | null;
  /** Where to put the map label when the centre is taken (e.g. by an inner court). */
  labelAt?: LngLat;
  /** All entrances when the place has several hand-mapped doors. */
  doors?: LngLat[];
  /** 0 when the place sits directly on the network (door or hallway). */
  walkGapM?: number;
}

export interface Place {
  type: "Feature";
  id: string;
  geometry:
    | { type: "Polygon"; coordinates: LngLat[][] }
    | { type: "MultiPolygon"; coordinates: LngLat[][][] } // one building mapped as several outlines
    | { type: "Point"; coordinates: LngLat };
  properties: PlaceProps;
}

export interface Campus {
  type: "FeatureCollection";
  campus: {
    id: string;
    name: string;
    shortName: string;
    address: string;
    boundary: LngLat[];
    bounds: [number, number, number, number];
    center: LngLat;
    defaultStart: string;
    datasetVersion: string;
  };
  features: Place[];
  /** Hand-mapped walkways (`footway`) and hallways (`corridor`). */
  paths?: { kind: string; coords: LngLat[] }[];
}

/** [from, to, lengthM, flags] flags: 1 covered, 2 steps, 4 vehicle road, 8 roundabout, 16 connector, 32 indoor hallway */
export type Edge = [number, number, number, number];
export interface Graph {
  version: string;
  nodes: LngLat[];
  edges: Edge[];
  /** Entry nodes per place; a place with several doors lists them all. */
  placeNodes: Record<string, number[]>;
}

export type Endpoint = { kind: "place"; id: string } | { kind: "point"; coord: LngLat; label: string };

export interface Step {
  icon: "depart" | "straight" | "left" | "right" | "slight-left" | "slight-right" | "u-turn" | "roundabout" | "arrive";
  text: string;
  distanceM: number;
}

export interface RouteResult {
  path: LngLat[];
  distanceM: number;
  minutes: number;
  steps: Step[];
}
