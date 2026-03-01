import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { latLonToXZ } from "../utils/projection";
import { MAP_BBOX } from "../utils/constants";

const WALL_HEIGHT = 100;
const WALL_COLOR = "#ff6644";
const WALL_OPACITY = 0.12;
const LINE_OPACITY = 0.4;

/**
 * Clamps OrbitControls target within the map world-space boundary.
 * Prevents users from panning outside the map area.
 * Uses hard clamping for a definitive stop.
 * Renders a visible border wall at the map edge.
 */
export function CameraBounds() {
  const { controls } = useThree();

  // Pre-compute map bounds in world space
  const bounds = useMemo(() => {
    const [swX, swZ] = latLonToXZ(MAP_BBOX.south, MAP_BBOX.west);
    const [neX, neZ] = latLonToXZ(MAP_BBOX.north, MAP_BBOX.east);
    return {
      minX: Math.min(swX, neX),
      maxX: Math.max(swX, neX),
      minZ: Math.min(swZ, neZ),
      maxZ: Math.max(swZ, neZ),
    };
  }, []);

  useFrame(() => {
    const ctrl = controls as unknown as {
      target?: { x: number; z: number };
    };
    if (!ctrl?.target) return;

    const { target } = ctrl;

    // Hard clamp — definitive stop at boundary
    if (target.x < bounds.minX) target.x = bounds.minX;
    if (target.x > bounds.maxX) target.x = bounds.maxX;
    if (target.z < bounds.minZ) target.z = bounds.minZ;
    if (target.z > bounds.maxZ) target.z = bounds.maxZ;
  });

  return <MapBorder bounds={bounds} />;
}

// ── Visible border ────────────────────────────────────────────────

interface BoundsRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function MapBorder({ bounds }: { bounds: BoundsRect }) {
  const { wallGeometry, lineGeometry } = useMemo(() => {
    const { minX, maxX, minZ, maxZ } = bounds;

    // 4 wall quads (each is a PlaneGeometry positioned/rotated)
    const walls: THREE.BufferGeometry[] = [];
    const widthX = maxX - minX;
    const widthZ = maxZ - minZ;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    // South wall (z = maxZ, facing -Z)
    const south = new THREE.PlaneGeometry(widthX, WALL_HEIGHT);
    south.translate(cx, WALL_HEIGHT / 2, maxZ);
    walls.push(south);

    // North wall (z = minZ, facing +Z)
    const north = new THREE.PlaneGeometry(widthX, WALL_HEIGHT);
    north.rotateY(Math.PI);
    north.translate(cx, WALL_HEIGHT / 2, minZ);
    walls.push(north);

    // East wall (x = maxX, facing -X)
    const east = new THREE.PlaneGeometry(widthZ, WALL_HEIGHT);
    east.rotateY(-Math.PI / 2);
    east.translate(maxX, WALL_HEIGHT / 2, cz);
    walls.push(east);

    // West wall (x = minX, facing +X)
    const west = new THREE.PlaneGeometry(widthZ, WALL_HEIGHT);
    west.rotateY(Math.PI / 2);
    west.translate(minX, WALL_HEIGHT / 2, cz);
    walls.push(west);

    // Merge walls
    const merged = mergeGeometries(walls) as THREE.BufferGeometry;
    for (const w of walls) w.dispose();

    // Ground-level line loop
    const linePoints = new Float32Array([
      minX, 0.5, minZ,
      maxX, 0.5, minZ,
      maxX, 0.5, maxZ,
      minX, 0.5, maxZ,
      minX, 0.5, minZ,
    ]);
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(linePoints, 3));

    return { wallGeometry: merged, lineGeometry: lineGeom };
  }, [bounds]);

  return (
    <group>
      <mesh geometry={wallGeometry} renderOrder={999}>
        <meshBasicMaterial
          color={WALL_COLOR}
          transparent
          opacity={WALL_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineLoop geometry={lineGeometry}>
        <lineBasicMaterial
          color={WALL_COLOR}
          transparent
          opacity={LINE_OPACITY}
        />
      </lineLoop>
    </group>
  );
}
