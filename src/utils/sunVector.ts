import * as THREE from "three";
import { SUN_DISTANCE } from "./constants";

/**
 * Convert sun altitude + azimuth (suncalc convention) to a Three.js Vector3.
 *
 * Suncalc convention:
 *   azimuth: 0 = south, positive = westward
 *   altitude: 0 = horizon, PI/2 = zenith
 *
 * Three.js convention:
 *   x = east, y = up, z = south
 */
export function sunPositionToVector3(
  altitude: number,
  azimuth: number,
): THREE.Vector3 {
  const y = Math.sin(altitude) * SUN_DISTANCE;
  const horizDist = Math.cos(altitude) * SUN_DISTANCE;

  // suncalc: positive azimuth = west, but our x = east
  const x = -Math.sin(azimuth) * horizDist;
  // suncalc: 0 azimuth = south = +z in our system
  const z = Math.cos(azimuth) * horizDist;

  return new THREE.Vector3(x, y, z);
}
