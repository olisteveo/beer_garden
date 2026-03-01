import { CENTER_LAT, CENTER_LON, EARTH_RADIUS } from "./constants";

const DEG_TO_RAD = Math.PI / 180;
const COS_CENTER = Math.cos(CENTER_LAT * DEG_TO_RAD);

/**
 * Convert lat/lon to local XZ coordinates in metres.
 * Uses equirectangular approximation — accurate within a few metres at city scale.
 * Returns [x, z] where x=east, z=south (Three.js convention: Y is up).
 */
export function latLonToXZ(lat: number, lon: number): [number, number] {
  const x = (lon - CENTER_LON) * DEG_TO_RAD * EARTH_RADIUS * COS_CENTER;
  const z = -(lat - CENTER_LAT) * DEG_TO_RAD * EARTH_RADIUS;
  return [x, z];
}
