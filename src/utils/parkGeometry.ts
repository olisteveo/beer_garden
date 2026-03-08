import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ParkFeature, ParkType } from "../types";
import { latLonToXZ } from "./projection";
import { signedArea2D, setVertexColor } from "./geometryHelpers";

export interface MergedParks {
  mesh: THREE.BufferGeometry;
  count: number;
}

/** Park Y position — above ground (-0.1), below Thames (0.05) */
const PARK_Y = 0.02;

/** Colors by park type — rich saturated greens for vibrancy */
const PARK_COLORS: Record<ParkType, THREE.Color> = {
  park: new THREE.Color("#3d9935"),
  garden: new THREE.Color("#3d9935"),
  playground: new THREE.Color("#52b848"),
  grass: new THREE.Color("#4aaa3e"),
  meadow: new THREE.Color("#4aaa3e"),
  recreation_ground: new THREE.Color("#429538"),
  village_green: new THREE.Color("#4aaa3e"),
  cemetery: new THREE.Color("#4a8848"),
  beer_garden: new THREE.Color("#2dd4bf"), // Teal — distinct from regular parks
};

/**
 * Build a single merged BufferGeometry from all park polygons.
 * Each park becomes a flat ShapeGeometry at PARK_Y, colored by type.
 */
export function buildMergedParkGeometry(
  parks: ParkFeature[],
): MergedParks | null {
  if (parks.length === 0) return null;

  const geometries: THREE.BufferGeometry[] = [];

  for (const park of parks) {
    const outerRing = park.coordinates[0];
    if (!outerRing || outerRing.length < 3) continue;

    // Convert to world XZ
    const pts: [number, number][] = [];
    for (const coord of outerRing) {
      if (!coord) continue;
      const [x, z] = latLonToXZ(coord[1], coord[0]);
      pts.push([x, z]);
    }
    if (pts.length < 3) continue;

    // Build shape in (x, -z) space with CCW winding
    const shapePts: [number, number][] = pts.map(([x, z]) => [x, -z]);
    if (signedArea2D(shapePts) < 0) {
      shapePts.reverse();
    }

    const shape = new THREE.Shape();
    shape.moveTo(shapePts[0]![0], shapePts[0]![1]);
    for (let i = 1; i < shapePts.length; i++) {
      shape.lineTo(shapePts[i]![0], shapePts[i]![1]);
    }
    shape.closePath();

    const geom = new THREE.ShapeGeometry(shape);
    // Rotate to lie flat on XZ plane and position at PARK_Y
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, PARK_Y, 0);
    geom.deleteAttribute("uv");

    const color = PARK_COLORS[park.parkType] ?? PARK_COLORS.park;
    setVertexColor(geom, color);
    geometries.push(geom);
  }

  if (geometries.length === 0) return null;

  const merged = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();

  if (!merged) return null;

  merged.computeVertexNormals();
  return { mesh: merged, count: geometries.length };
}
