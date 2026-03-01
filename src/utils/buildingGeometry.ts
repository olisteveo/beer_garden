import * as THREE from "three";
import type { BuildingFeature } from "../types";
import { latLonToXZ } from "./projection";

/**
 * Convert a BuildingFeature (GeoJSON polygon + height) into a Three.js ExtrudeGeometry.
 * Returns null if the polygon is degenerate (< 3 points).
 */
export function buildingToGeometry(
  building: BuildingFeature,
): THREE.ExtrudeGeometry | null {
  const outerRing = building.coordinates[0];
  if (!outerRing || outerRing.length < 3) return null;

  // Create shape from outer ring
  const shape = new THREE.Shape();
  for (let i = 0; i < outerRing.length; i++) {
    const coord = outerRing[i];
    if (!coord) continue;
    const [x, z] = latLonToXZ(coord[1], coord[0]); // GeoJSON is [lon, lat]
    if (i === 0) {
      shape.moveTo(x, z);
    } else {
      shape.lineTo(x, z);
    }
  }

  // Add holes (inner rings)
  for (let h = 1; h < building.coordinates.length; h++) {
    const holeRing = building.coordinates[h];
    if (!holeRing || holeRing.length < 3) continue;

    const holePath = new THREE.Path();
    for (let i = 0; i < holeRing.length; i++) {
      const coord = holeRing[i];
      if (!coord) continue;
      const [x, z] = latLonToXZ(coord[1], coord[0]);
      if (i === 0) {
        holePath.moveTo(x, z);
      } else {
        holePath.lineTo(x, z);
      }
    }
    shape.holes.push(holePath);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: building.height,
    bevelEnabled: false,
  });

  // ExtrudeGeometry extrudes along Z. We need height along Y.
  // Rotate -90 degrees around X axis so Z-up becomes Y-up.
  geometry.rotateX(-Math.PI / 2);

  return geometry;
}

/**
 * Merge multiple building geometries into a single BufferGeometry for performance.
 * This produces one draw call for all buildings.
 */
export function mergeBuildings(
  buildings: BuildingFeature[],
): THREE.BufferGeometry | null {
  const geometries: THREE.BufferGeometry[] = [];

  for (const building of buildings) {
    const geom = buildingToGeometry(building);
    if (geom) {
      geometries.push(geom);
    }
  }

  if (geometries.length === 0) return null;

  // Use mergeBufferGeometries from three's BufferGeometryUtils
  const merged = mergeBufferGeometries(geometries);

  // Dispose individual geometries after merging
  for (const geom of geometries) {
    geom.dispose();
  }

  return merged;
}

/**
 * Inline merge utility — avoids importing from three/addons which can be tricky.
 */
function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[],
): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();

  let totalVertices = 0;
  let totalIndices = 0;

  for (const geom of geometries) {
    const pos = geom.getAttribute("position");
    const idx = geom.getIndex();
    if (pos) totalVertices += pos.count;
    if (idx) totalIndices += idx.count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const indices = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;
  let vertexCount = 0;

  for (const geom of geometries) {
    const pos = geom.getAttribute("position");
    const norm = geom.getAttribute("normal");
    const idx = geom.getIndex();

    if (!pos) continue;

    // Copy positions
    for (let i = 0; i < pos.count; i++) {
      positions[(vertexOffset + i) * 3] = pos.getX(i);
      positions[(vertexOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vertexOffset + i) * 3 + 2] = pos.getZ(i);
    }

    // Copy normals
    if (norm) {
      for (let i = 0; i < norm.count; i++) {
        normals[(vertexOffset + i) * 3] = norm.getX(i);
        normals[(vertexOffset + i) * 3 + 1] = norm.getY(i);
        normals[(vertexOffset + i) * 3 + 2] = norm.getZ(i);
      }
    }

    // Copy indices (offset by vertex count)
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[indexOffset + i] = idx.array[i]! + vertexCount;
      }
      indexOffset += idx.count;
    }

    vertexCount += pos.count;
    vertexOffset += pos.count;
  }

  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeBoundingSphere();

  return merged;
}
