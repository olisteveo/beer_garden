import type { BBox } from "../types";

/** London center — roughly Shoreditch/City area */
export const CENTER_LAT = 51.515;
export const CENTER_LON = -0.07;

/** Default bounding box for OSM building fetch (~3km x 2km) */
export const DEFAULT_BBOX: BBox = {
  south: 51.5,
  west: -0.085,
  north: 51.53,
  east: -0.055,
};

/** Default building height when OSM data is missing */
export const DEFAULT_BUILDING_HEIGHT = 12;

/** Metres per building level */
export const METRES_PER_LEVEL = 3.5;

/** Earth radius in metres */
export const EARTH_RADIUS = 6_371_000;

/** Sun distance for directional light placement */
export const SUN_DISTANCE = 500;

/** Shadow map size */
export const SHADOW_MAP_SIZE = 2048;

/** Max device pixel ratio (prevent GPU overload on high-DPI mobile) */
export const MAX_DPR = 2;

/** Weather cache TTL in milliseconds (5 minutes) */
export const WEATHER_CACHE_TTL = 5 * 60 * 1000;

/** OSM building cache TTL in milliseconds (24 hours) */
export const OSM_CACHE_TTL = 24 * 60 * 60 * 1000;

/** Minutes before closing to show "closing soon" warning */
export const CLOSING_SOON_MINUTES = 30;
