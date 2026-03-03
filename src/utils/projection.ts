import { CENTER_LAT, CENTER_LON, EARTH_RADIUS } from "./constants";

const DEG_TO_RAD = Math.PI / 180;

/** Mutable projection center — updated by setProjectionCenter() */
let projLat = CENTER_LAT;
let projLon = CENTER_LON;
let cosCenter = Math.cos(projLat * DEG_TO_RAD);

/**
 * Re-center the equirectangular projection.
 * Must be called before building geometry for a new search area.
 * All subsequent latLonToXZ / xzToLatLon calls use this center.
 */
export function setProjectionCenter(lat: number, lon: number): void {
  projLat = lat;
  projLon = lon;
  cosCenter = Math.cos(lat * DEG_TO_RAD);
}

/** Get the current projection center. */
export function getProjectionCenter(): { lat: number; lon: number } {
  return { lat: projLat, lon: projLon };
}

/**
 * Convert lat/lon to local XZ coordinates in metres.
 * Uses equirectangular approximation — accurate within a few metres at city scale.
 * Returns [x, z] where x=east, z=south (Three.js convention: Y is up).
 */
export function latLonToXZ(lat: number, lon: number): [number, number] {
  const x = (lon - projLon) * DEG_TO_RAD * EARTH_RADIUS * cosCenter;
  const z = -(lat - projLat) * DEG_TO_RAD * EARTH_RADIUS;
  return [x, z];
}

/**
 * Convert local XZ coordinates (metres) back to lat/lon.
 * Inverse of latLonToXZ.
 */
export function xzToLatLon(x: number, z: number): { lat: number; lon: number } {
  const lon = x / (DEG_TO_RAD * EARTH_RADIUS * cosCenter) + projLon;
  const lat = -z / (DEG_TO_RAD * EARTH_RADIUS) + projLat;
  return { lat, lon };
}
