import { useMemo } from "react";
import * as THREE from "three";
import thamesPath from "../data/thames-path.json";
import { latLonToXZ } from "../utils/projection";

const RIVER_HALF_WIDTH = 110; // metres — ~220m total, realistic for central London

export function ThamesRiver() {
  const geometry = useMemo(() => {
    const points = thamesPath as [number, number][];
    if (points.length < 2) return null;

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const coord = points[i]!;
      const [cx, cz] = latLonToXZ(coord[1], coord[0]);

      // Compute perpendicular direction for width
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

      // Left and right bank vertices (y=0.05 — just above ground, below buildings)
      vertices.push(cx + perpX * RIVER_HALF_WIDTH, 0.05, cz + perpZ * RIVER_HALF_WIDTH);
      vertices.push(cx - perpX * RIVER_HALF_WIDTH, 0.05, cz - perpZ * RIVER_HALF_WIDTH);
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
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, []);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} renderOrder={-1}>
      <meshStandardMaterial
        color="#4a7fb8"
        roughness={0.2}
        metalness={0.15}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-3}
        polygonOffsetUnits={-3}
      />
    </mesh>
  );
}
