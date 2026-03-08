export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type SunPhase = "night" | "dawn" | "golden" | "day" | "dusk";

export interface SolarPosition {
  altitude: number; // radians
  azimuth: number; // radians (suncalc convention: 0=south, +west)
  altitudeDeg: number;
  azimuthDeg: number; // geographic: 0=north, 90=east
  phase: SunPhase;
}

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  open: string; // "HH:MM"
  close: string; // "HH:MM" — may be past midnight (e.g. "01:00")
}

export interface Pub {
  id: string;
  name: string;
  lat: number;
  lon: number;
  gardenOrientation: string; // "south", "southwest", etc.
  description: string;
  openingHours: Record<DayOfWeek, DayHours>;
}

export interface PubOpenStatus {
  isOpen: boolean;
  closingTime: string | null; // "HH:MM" or null if closed
  closingSoon: boolean; // within 30 minutes
  minutesUntilClose: number | null;
}

export interface WeatherData {
  cloudCover: number; // 0-100
  condition: string; // "Clear", "Clouds", "Rain", etc.
  conditionId: number; // OWM condition code
  temperature: number; // Celsius
  feelsLike: number; // Celsius
  uvIndex: number; // 0-11+
  humidity: number;
  windSpeed: number; // m/s
  rainVolume: number; // mm in last 1h (0 if no rain)
  icon: string; // OWM icon code e.g. "01d"
}

export interface SunIntensity {
  score: number; // 0-100
  label: string; // "Full sun", "Partly cloudy", "Overcast", etc.
}

export interface ForecastEntry {
  dt: number; // Unix timestamp (seconds)
  temperature: number;
  feelsLike: number;
  cloudCover: number;
  condition: string;
  conditionId: number;
  humidity: number;
  windSpeed: number;
  pop: number; // probability of precipitation 0-1
  rainVolume: number; // mm in 3h
  icon: string;
}

export interface ForecastData {
  entries: ForecastEntry[];
  current: WeatherData;
}

export type RoofShape =
  | "flat"
  | "gabled"
  | "hipped"
  | "pyramidal"
  | "dome"
  | "skillion"
  | "mansard"
  | "gambrel"
  | "round";

export interface BuildingFeature {
  coordinates: [number, number][][]; // rings of [lon, lat] pairs
  height: number; // metres — total height including roof
  roofShape: RoofShape; // default "flat"
  roofHeight: number; // metres — height of roof portion (0 for flat)
  minHeight: number; // metres — base elevation above ground
  color: string | null; // OSM building:colour or null for palette
}

// ── Parks / green spaces ──────────────────────────────────────────

export type ParkType =
  | "park"
  | "garden"
  | "playground"
  | "grass"
  | "meadow"
  | "recreation_ground"
  | "village_green"
  | "cemetery"
  | "beer_garden";

export interface ParkFeature {
  coordinates: [number, number][][]; // polygon rings [lon, lat]
  parkType: ParkType;
}

// ── Roads ─────────────────────────────────────────────────────────

export type RoadType =
  | "motorway"
  | "trunk"
  | "primary"
  | "secondary"
  | "tertiary"
  | "residential";

export interface RoadFeature {
  coordinates: [number, number][]; // line points [lon, lat] (not rings)
  roadType: RoadType;
}

// ── Area data (buildings + parks + roads + pubs) ─────────────────

export interface AreaData {
  buildings: BuildingFeature[];
  parks: ParkFeature[];
  roads: RoadFeature[];
  pubs: OSMPubNode[];
}

// ── OSM pub data ─────────────────────────────────────────────────

export interface OSMPubNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHoursRaw: string | null;
  outdoorSeating: boolean;
  beerGarden: boolean;
}

export interface SearchPub extends OSMPubNode {
  /** Display-ready open status text: "Open", "Closed", or "Hours unknown" */
  openStatusLabel: string;
  isOpen: boolean | null; // null = unknown
}

// ── Geocode result ───────────────────────────────────────────────

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

// ── Search state machine ─────────────────────────────────────────

export type SearchState =
  | { status: "idle" }
  | { status: "geocoding" }
  | { status: "loading"; displayName: string }
  | { status: "loaded"; displayName: string; center: { lat: number; lon: number }; pubs: SearchPub[]; radius: number }
  | { status: "error"; message: string };
