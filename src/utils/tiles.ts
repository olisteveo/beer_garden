import type { BBox } from "../types";
import {
  TILE_SIZE_LAT,
  TILE_SIZE_LON,
  MAP_BBOX,
  EARTH_RADIUS,
} from "./constants";
import { latLonToXZ } from "./projection";

const DEG_TO_RAD = Math.PI / 180;
const COS_CENTER = Math.cos(51.515 * DEG_TO_RAD); // at London latitude

/**
 * Snap a lat/lon to the nearest tile grid origin and return a stable key string.
 * Keys look like "51.5000:-0.0850" (6 decimal precision on the grid snap).
 */
export function latLonToTileKey(lat: number, lon: number): string {
  const tLat = Math.floor(lat / TILE_SIZE_LAT) * TILE_SIZE_LAT;
  const tLon = Math.floor(lon / TILE_SIZE_LON) * TILE_SIZE_LON;
  return `${tLat.toFixed(4)}:${tLon.toFixed(4)}`;
}

/**
 * Convert a tile key back to a BBox for the Overpass API query.
 */
export function tileKeyToBBox(key: string): BBox {
  const [latStr, lonStr] = key.split(":");
  const south = parseFloat(latStr!);
  const west = parseFloat(lonStr!);
  return {
    south,
    west,
    north: south + TILE_SIZE_LAT,
    east: west + TILE_SIZE_LON,
  };
}

/**
 * Get the world-space XZ center of a tile for distance calculations.
 */
export function tileKeyToXZ(key: string): [number, number] {
  const [latStr, lonStr] = key.split(":");
  const lat = parseFloat(latStr!) + TILE_SIZE_LAT / 2;
  const lon = parseFloat(lonStr!) + TILE_SIZE_LON / 2;
  return latLonToXZ(lat, lon);
}

/**
 * Compute all tile keys within a radius (metres) of a center lat/lon.
 * Only returns tiles that fall within the M25 boundary.
 */
export function getVisibleTileKeys(
  centerLat: number,
  centerLon: number,
  radiusM: number,
): string[] {
  // Convert radius to approximate degree offsets
  const latSpan = radiusM / (EARTH_RADIUS * DEG_TO_RAD);
  const lonSpan = radiusM / (EARTH_RADIUS * DEG_TO_RAD * COS_CENTER);

  const minLat = Math.max(centerLat - latSpan, MAP_BBOX.south);
  const maxLat = Math.min(centerLat + latSpan, MAP_BBOX.north);
  const minLon = Math.max(centerLon - lonSpan, MAP_BBOX.west);
  const maxLon = Math.min(centerLon + lonSpan, MAP_BBOX.east);

  const keys: string[] = [];
  const centerX = centerLon * DEG_TO_RAD * EARTH_RADIUS * COS_CENTER;
  const centerZ = centerLat * DEG_TO_RAD * EARTH_RADIUS;
  const r2 = radiusM * radiusM;

  for (let lat = Math.floor(minLat / TILE_SIZE_LAT) * TILE_SIZE_LAT;
       lat <= maxLat;
       lat += TILE_SIZE_LAT) {
    for (let lon = Math.floor(minLon / TILE_SIZE_LON) * TILE_SIZE_LON;
         lon <= maxLon;
         lon += TILE_SIZE_LON) {
      // Check if tile center is within radius (circular, not square)
      const tileCenterLat = lat + TILE_SIZE_LAT / 2;
      const tileCenterLon = lon + TILE_SIZE_LON / 2;
      const tx = tileCenterLon * DEG_TO_RAD * EARTH_RADIUS * COS_CENTER;
      const tz = tileCenterLat * DEG_TO_RAD * EARTH_RADIUS;
      const dx = tx - centerX;
      const dz = tz - centerZ;
      if (dx * dx + dz * dz <= r2) {
        keys.push(latLonToTileKey(lat, lon));
      }
    }
  }

  return keys;
}

/**
 * Sort tile keys by distance to a world-space point (nearest first).
 */
export function sortTileKeysByDistance(
  keys: string[],
  cameraX: number,
  cameraZ: number,
): string[] {
  return [...keys].sort((a, b) => {
    const [ax, az] = tileKeyToXZ(a);
    const [bx, bz] = tileKeyToXZ(b);
    const da = (ax - cameraX) ** 2 + (az - cameraZ) ** 2;
    const db = (bx - cameraX) ** 2 + (bz - cameraZ) ** 2;
    return da - db;
  });
}
