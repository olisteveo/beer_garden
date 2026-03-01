import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RoadFeature, RoadType } from "../types";
import { latLonToXZ } from "./projection";
import { setVertexColor } from "./geometryHelpers";

export interface MergedRoads {
  mesh: THREE.BufferGeometry;
  count: number;
}

/** Road Y position — below parks (0.02), above ground (-0.1) */
const ROAD_Y = 0.01;

/** Half-widths by road type (metres) */
const ROAD_HALF_WIDTHS: Record<RoadType, number> = {
  motorway: 4,
  trunk: 4,
  primary: 2.5,
  secondary: 2,
  tertiary: 1.5,
  residential: 1.5,
};

/** Colors by road type — lighter tones to contrast with ground */
const ROAD_COLORS: Record<RoadType, THREE.Color> = {
  motorway: new THREE.Color("#d0d0d0"),
  trunk: new THREE.Color("#d0d0d0"),
  primary: new THREE.Color("#c8c0b0"),
  secondary: new THREE.Color("#bfb8a8"),
  tertiary: new THREE.Color("#bfb8a8"),
  residential: new THREE.Color("#bfb8a8"),
};

/**
 * Build a single merged BufferGeometry from all road line features.
 * Each road is extruded into a thin flat strip along its path,
 * following the same pattern as ThamesRiver.tsx.
 */
export function buildMergedRoadGeometry(
  roads: RoadFeature[],
): MergedRoads | null {
  if (roads.length === 0) return null;

  const geometries: THREE.BufferGeometry[] = [];

  for (const road of roads) {
    const points = road.coordinates;
    if (points.length < 2) continue;

    const halfWidth = ROAD_HALF_WIDTHS[road.roadType] ?? 1.5;
    const color = ROAD_COLORS[road.roadType] ?? ROAD_COLORS.residential;

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const coord = points[i]!;
      const [cx, cz] = latLonToXZ(coord[1], coord[0]);

      // Compute tangent direction from neighbors
      let dx = 0;
      let dz = 1;
      if (i < points.length - 1) {
        const next = points[i + 1]!;
        const [nx, nz] = latLonToXZ(next[1], next[0]);
        dx = nx - cx;
        dz = nz - cz;
      } else if (i > 0) {
        const prev = points[i - 1]!;
        const [px, pz] = latLonToXZ(prev[1], prev[0]);
        dx = cx - px;
        dz = cz - pz;
      }

      // Normalise and rotate 90 degrees for perpendicular
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const perpX = -dz / len;
      const perpZ = dx / len;

      // Left and right edge vertices
      vertices.push(
        cx + perpX * halfWidth, ROAD_Y, cz + perpZ * halfWidth,
      );
      vertices.push(
        cx - perpX * halfWidth, ROAD_Y, cz - perpZ * halfWidth,
      );
    }

    // Build triangle indices
    for (let i = 0; i < points.length - 1; i++) {
      const bl = i * 2;
      const br = i * 2 + 1;
      const tl = (i + 1) * 2;
      const tr = (i + 1) * 2 + 1;
      indices.push(bl, tl, br);
      indices.push(br, tl, tr);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geom.setIndex(indices);
    geom.computeVertexNormals();

    setVertexColor(geom, color);
    geometries.push(geom);
  }

  if (geometries.length === 0) return null;

  const merged = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();

  if (!merged) return null;

  return { mesh: merged, count: geometries.length };
}
