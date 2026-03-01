import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingFeature, RoofShape } from "../types";
import { latLonToXZ } from "./projection";
import { signedArea2D, setVertexColor } from "./geometryHelpers";

// ── Bounding-box approach (legacy, kept as fallback) ────────────────

export interface BuildingBox {
  cx: number;
  cz: number;
  width: number;
  depth: number;
  height: number;
}

export function buildingToBox(building: BuildingFeature): BuildingBox | null {
  const outerRing = building.coordinates[0];
  if (!outerRing || outerRing.length < 3) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const coord of outerRing) {
    if (!coord) continue;
    const [x, z] = latLonToXZ(coord[1], coord[0]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const width = maxX - minX;
  const depth = maxZ - minZ;
  if (width < 1 || depth < 1) return null;

  return {
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    width,
    depth,
    height: building.height,
  };
}

export function buildingsToBoxes(buildings: BuildingFeature[]): BuildingBox[] {
  const boxes: BuildingBox[] = [];
  for (const building of buildings) {
    const box = buildingToBox(building);
    if (box) boxes.push(box);
  }
  return boxes;
}

// ── Geometry helpers ────────────────────────────────────────────────

/** Warm stone colour palette for per-building variation */
const BUILDING_COLORS = [
  new THREE.Color("#c8c0b4"),
  new THREE.Color("#cec6ba"),
  new THREE.Color("#d4cec2"),
  new THREE.Color("#d0c8bc"),
  new THREE.Color("#ddd6cc"),
  new THREE.Color("#c4bcb0"),
  new THREE.Color("#d8d0c6"),
];

/** Convert shape-space point (x, -z) back to world (x, z) */
function shapeToWorld(sx: number, sy: number): [number, number] {
  return [sx, -sy];
}

// ── Oriented Bounding Box (OBB) ─────────────────────────────────────

interface OBB {
  center: [number, number]; // shape-space center
  halfLength: number; // half-extent along long axis
  halfWidth: number; // half-extent along short axis
  longAxis: [number, number]; // unit vector
  shortAxis: [number, number]; // unit vector (perpendicular)
}

/**
 * Compute the minimum-area oriented bounding box of a 2D polygon.
 * Tries each edge direction to find the one that minimises area.
 * Used by gabled, hipped, skillion, round roofs for ridge alignment.
 */
function computeOBB(pts: [number, number][]): OBB {
  let bestArea = Infinity;
  let bestResult: OBB | null = null;

  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const dx = pts[j]![0] - pts[i]![0];
    const dy = pts[j]![1] - pts[i]![1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) continue;

    const ax: [number, number] = [dx / len, dy / len];
    const ay: [number, number] = [-ax[1], ax[0]];

    let minA = Infinity,
      maxA = -Infinity;
    let minB = Infinity,
      maxB = -Infinity;

    for (const p of pts) {
      const a = p[0] * ax[0] + p[1] * ax[1];
      const b = p[0] * ay[0] + p[1] * ay[1];
      if (a < minA) minA = a;
      if (a > maxA) maxA = a;
      if (b < minB) minB = b;
      if (b > maxB) maxB = b;
    }

    const area = (maxA - minA) * (maxB - minB);
    if (area < bestArea) {
      bestArea = area;
      const extA = (maxA - minA) / 2;
      const extB = (maxB - minB) / 2;
      const cA = (minA + maxA) / 2;
      const cB = (minB + maxB) / 2;

      bestResult = {
        center: [cA * ax[0] + cB * ay[0], cA * ax[1] + cB * ay[1]],
        halfLength: Math.max(extA, extB),
        halfWidth: Math.min(extA, extB),
        longAxis: extA >= extB ? ax : ay,
        shortAxis: extA >= extB ? ay : ax,
      };
    }
  }

  // Fallback for degenerate polygons — AABB from points
  if (!bestResult) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const hw = (maxX - minX) / 2;
    const hh = (maxY - minY) / 2;
    return {
      center: [(minX + maxX) / 2, (minY + maxY) / 2],
      halfLength: Math.max(hw, hh) || 1,
      halfWidth: Math.min(hw, hh) || 1,
      longAxis: hw >= hh ? [1, 0] : [0, 1],
      shortAxis: hw >= hh ? [0, 1] : [1, 0],
    };
  }

  return bestResult;
}

// ── Roof geometry generators ────────────────────────────────────────

/**
 * Helper: push a triangle (3 vertices) into a vertex array.
 * Each vertex is (x, y, z) in world space.
 */
function pushTri(
  verts: number[],
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  x3: number, y3: number, z3: number,
): void {
  verts.push(x1, y1, z1, x2, y2, z2, x3, y3, z3);
}

/** Build BufferGeometry from a flat array of triangle vertices. */
function triGeom(verts: number[]): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(verts), 3),
  );
  geom.computeVertexNormals();
  return geom;
}

/**
 * Get OBB corners and ridge points in world space.
 * Returns corners (A, B, C, D) going around the OBB, and ridge endpoints.
 */
function obbWorldCorners(
  obb: OBB,
  ridgeInset: number = 0,
): {
  corners: [number, number][]; // 4 corners in world XZ
  ridgeA: [number, number]; // ridge endpoint near corner 0
  ridgeB: [number, number]; // ridge endpoint near corner 1
} {
  const { center, halfLength, halfWidth, longAxis: la, shortAxis: sa } = obb;
  const [cx, cy] = center;

  // OBB corners in shape space, converted to world XZ
  const corners: [number, number][] = [
    shapeToWorld(
      cx + la[0] * halfLength + sa[0] * halfWidth,
      cy + la[1] * halfLength + sa[1] * halfWidth,
    ),
    shapeToWorld(
      cx - la[0] * halfLength + sa[0] * halfWidth,
      cy - la[1] * halfLength + sa[1] * halfWidth,
    ),
    shapeToWorld(
      cx - la[0] * halfLength - sa[0] * halfWidth,
      cy - la[1] * halfLength - sa[1] * halfWidth,
    ),
    shapeToWorld(
      cx + la[0] * halfLength - sa[0] * halfWidth,
      cy + la[1] * halfLength - sa[1] * halfWidth,
    ),
  ];

  const ridgeHL = halfLength - ridgeInset;
  const ridgeA = shapeToWorld(
    cx + la[0] * ridgeHL,
    cy + la[1] * ridgeHL,
  );
  const ridgeB = shapeToWorld(
    cx - la[0] * ridgeHL,
    cy - la[1] * ridgeHL,
  );

  return { corners, ridgeA, ridgeB };
}

// ── Pyramidal roof ──────────────────────────────────────────────────

function createPyramidalRoof(
  shapePts: [number, number][],
  roofHeight: number,
  wallHeight: number,
): THREE.BufferGeometry {
  const eaveY = wallHeight;
  const apexY = wallHeight + roofHeight;

  // Centroid in world space
  let cx = 0;
  let cz = 0;
  const worldPts = shapePts.map(([sx, sy]) => {
    const [wx, wz] = shapeToWorld(sx, sy);
    cx += wx;
    cz += wz;
    return [wx, wz] as [number, number];
  });
  cx /= worldPts.length;
  cz /= worldPts.length;

  const verts: number[] = [];
  for (let i = 0; i < worldPts.length; i++) {
    const j = (i + 1) % worldPts.length;
    const p1 = worldPts[i]!;
    const p2 = worldPts[j]!;
    pushTri(verts, p1[0], eaveY, p1[1], p2[0], eaveY, p2[1], cx, apexY, cz);
  }
  return triGeom(verts);
}

// ── Gabled roof ─────────────────────────────────────────────────────

function createGabledRoof(
  shapePts: [number, number][],
  roofHeight: number,
  wallHeight: number,
): THREE.BufferGeometry {
  const obb = computeOBB(shapePts);
  const { corners, ridgeA, ridgeB } = obbWorldCorners(obb);
  const eaveY = wallHeight;
  const ridgeY = wallHeight + roofHeight;

  const verts: number[] = [];
  const [c0, c1, c2, c3] = corners;

  // Slope 1: c0 → c1 → ridgeB → ridgeA
  pushTri(verts, c0![0], eaveY, c0![1], c1![0], eaveY, c1![1], ridgeB[0], ridgeY, ridgeB[1]);
  pushTri(verts, c0![0], eaveY, c0![1], ridgeB[0], ridgeY, ridgeB[1], ridgeA[0], ridgeY, ridgeA[1]);

  // Slope 2: c2 → c3 → ridgeA → ridgeB
  pushTri(verts, c2![0], eaveY, c2![1], c3![0], eaveY, c3![1], ridgeA[0], ridgeY, ridgeA[1]);
  pushTri(verts, c2![0], eaveY, c2![1], ridgeA[0], ridgeY, ridgeA[1], ridgeB[0], ridgeY, ridgeB[1]);

  // Gable end 1: c0 → c3 → ridgeA
  pushTri(verts, c0![0], eaveY, c0![1], c3![0], eaveY, c3![1], ridgeA[0], ridgeY, ridgeA[1]);

  // Gable end 2: c1 → c2 → ridgeB
  pushTri(verts, c1![0], eaveY, c1![1], c2![0], eaveY, c2![1], ridgeB[0], ridgeY, ridgeB[1]);

  return triGeom(verts);
}

// ── Hipped roof ─────────────────────────────────────────────────────

function createHippedRoof(
  shapePts: [number, number][],
  roofHeight: number,
  wallHeight: number,
): THREE.BufferGeometry {
  const obb = computeOBB(shapePts);

  // If nearly square, use pyramidal instead
  if (obb.halfLength < obb.halfWidth * 1.3) {
    return createPyramidalRoof(shapePts, roofHeight, wallHeight);
  }

  // Ridge inset by halfWidth from each end
  const { corners, ridgeA, ridgeB } = obbWorldCorners(obb, obb.halfWidth);
  const eaveY = wallHeight;
  const ridgeY = wallHeight + roofHeight;

  const verts: number[] = [];
  const [c0, c1, c2, c3] = corners;

  // Long slope 1: c0 → c1 → ridgeB → ridgeA (trapezoid)
  pushTri(verts, c0![0], eaveY, c0![1], c1![0], eaveY, c1![1], ridgeB[0], ridgeY, ridgeB[1]);
  pushTri(verts, c0![0], eaveY, c0![1], ridgeB[0], ridgeY, ridgeB[1], ridgeA[0], ridgeY, ridgeA[1]);

  // Long slope 2: c2 → c3 → ridgeA → ridgeB (trapezoid)
  pushTri(verts, c2![0], eaveY, c2![1], c3![0], eaveY, c3![1], ridgeA[0], ridgeY, ridgeA[1]);
  pushTri(verts, c2![0], eaveY, c2![1], ridgeA[0], ridgeY, ridgeA[1], ridgeB[0], ridgeY, ridgeB[1]);

  // Hip end 1: c0 → c3 → ridgeA (triangle)
  pushTri(verts, c0![0], eaveY, c0![1], c3![0], eaveY, c3![1], ridgeA[0], ridgeY, ridgeA[1]);

  // Hip end 2: c1 → c2 → ridgeB (triangle)
  pushTri(verts, c1![0], eaveY, c1![1], c2![0], eaveY, c2![1], ridgeB[0], ridgeY, ridgeB[1]);

  return triGeom(verts);
}

// ── Dome roof ───────────────────────────────────────────────────────

function createDomeRoof(
  shapePts: [number, number][],
  roofHeight: number,
  wallHeight: number,
): THREE.BufferGeometry {
  // Bounding circle of footprint in world space
  let cx = 0;
  let cz = 0;
  const worldPts = shapePts.map(([sx, sy]) => {
    const w = shapeToWorld(sx, sy);
    cx += w[0];
    cz += w[1];
    return w;
  });
  cx /= worldPts.length;
  cz /= worldPts.length;

  let maxR = 0;
  for (const [wx, wz] of worldPts) {
    const r = Math.sqrt((wx - cx) ** 2 + (wz - cz) ** 2);
    if (r > maxR) maxR = r;
  }

  // Upper hemisphere only
  const segments = Math.min(16, Math.max(8, Math.floor(maxR / 2)));
  const sphere = new THREE.SphereGeometry(
    maxR,
    segments,
    Math.ceil(segments / 2),
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );

  // Scale Y to match roof height
  const yScale = roofHeight / Math.max(maxR, 0.1);
  sphere.scale(1, yScale, 1);
  sphere.translate(cx, wallHeight, cz);
  sphere.deleteAttribute("uv");

  // Convert to non-indexed to match wall geometry
  const nonIndexed = sphere.toNonIndexed();
  sphere.dispose();
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

// ── Skillion roof ───────────────────────────────────────────────────

function createSkillionRoof(
  shapePts: [number, number][],
  roofHeight: number,
  wallHeight: number,
): THREE.BufferGeometry {
  const obb = computeOBB(shapePts);
  const { corners } = obbWorldCorners(obb);
  const highY = wallHeight + roofHeight;
  const lowY = wallHeight;

  const verts: number[] = [];
  const [c0, c1, c2, c3] = corners;

  // Sloped top face: c0(high) → c1(high) → c2(low) → c3(low)
  pushTri(verts, c0![0], highY, c0![1], c1![0], highY, c1![1], c2![0], lowY, c2![1]);
  pushTri(verts, c0![0], highY, c0![1], c2![0], lowY, c2![1], c3![0], lowY, c3![1]);

  // Triangular side infill 1: c0(wall) → c0(high) → c3(wall)
  pushTri(verts, c0![0], lowY, c0![1], c0![0], highY, c0![1], c3![0], lowY, c3![1]);

  // Triangular side infill 2: c1(wall) → c1(high) → c2(wall)
  pushTri(verts, c1![0], lowY, c1![1], c1![0], highY, c1![1], c2![0], lowY, c2![1]);

  return triGeom(verts);
}

// ── Round roof (barrel vault) ───────────────────────────────────────

function createRoundRoof(
  shapePts: [number, number][],
  roofHeight: number,
  wallHeight: number,
): THREE.BufferGeometry {
  const obb = computeOBB(shapePts);
  const { center, halfLength, halfWidth, longAxis: la, shortAxis: sa } = obb;
  const [cx, cy] = center;

  const arcSegments = 8;
  const verts: number[] = [];

  // Generate arc profile points along the short axis
  for (let s = 0; s < arcSegments; s++) {
    const t0 = s / arcSegments;
    const t1 = (s + 1) / arcSegments;
    const angle0 = Math.PI * t0;
    const angle1 = Math.PI * t1;

    // Position along short axis: -halfWidth to +halfWidth
    const offset0 = -Math.cos(angle0) * halfWidth;
    const offset1 = -Math.cos(angle1) * halfWidth;
    const y0 = wallHeight + Math.sin(angle0) * roofHeight;
    const y1 = wallHeight + Math.sin(angle1) * roofHeight;

    // Quad strip along the long axis for this arc segment
    const s0negSx = cx - la[0] * halfLength + sa[0] * offset0;
    const s0negSy = cy - la[1] * halfLength + sa[1] * offset0;
    const s0posSx = cx + la[0] * halfLength + sa[0] * offset0;
    const s0posSy = cy + la[1] * halfLength + sa[1] * offset0;
    const s1negSx = cx - la[0] * halfLength + sa[0] * offset1;
    const s1negSy = cy - la[1] * halfLength + sa[1] * offset1;
    const s1posSx = cx + la[0] * halfLength + sa[0] * offset1;
    const s1posSy = cy + la[1] * halfLength + sa[1] * offset1;

    const [w0n0, w0n1] = shapeToWorld(s0negSx, s0negSy);
    const [w0p0, w0p1] = shapeToWorld(s0posSx, s0posSy);
    const [w1n0, w1n1] = shapeToWorld(s1negSx, s1negSy);
    const [w1p0, w1p1] = shapeToWorld(s1posSx, s1posSy);

    // Two triangles for this quad
    pushTri(verts, w0n0, y0, w0n1, w0p0, y0, w0p1, w1p0, y1, w1p1);
    pushTri(verts, w0n0, y0, w0n1, w1p0, y1, w1p1, w1n0, y1, w1n1);
  }

  return triGeom(verts);
}

// ── Roof dispatcher ─────────────────────────────────────────────────

function createRoofGeometry(
  shapePts: [number, number][],
  roofShape: RoofShape,
  roofHeight: number,
  wallHeight: number,
): THREE.BufferGeometry | null {
  if (roofShape === "flat" || roofHeight <= 0) return null;

  switch (roofShape) {
    case "pyramidal":
      return createPyramidalRoof(shapePts, roofHeight, wallHeight);
    case "gabled":
      return createGabledRoof(shapePts, roofHeight, wallHeight);
    case "hipped":
      return createHippedRoof(shapePts, roofHeight, wallHeight);
    case "dome":
      return createDomeRoof(shapePts, roofHeight, wallHeight);
    case "skillion":
      return createSkillionRoof(shapePts, roofHeight, wallHeight);
    case "round":
      return createRoundRoof(shapePts, roofHeight, wallHeight);
    case "mansard":
      // Approximate mansard as hipped with steeper proportions
      return createHippedRoof(shapePts, roofHeight, wallHeight);
    case "gambrel":
      // Approximate gambrel as gabled
      return createGabledRoof(shapePts, roofHeight, wallHeight);
    default:
      return null;
  }
}

// ── Main building geometry function ─────────────────────────────────

/**
 * Create a THREE.BufferGeometry for a single building.
 * Three stages:
 *   1. Wall extrusion (footprint → wallHeight)
 *   2. Roof geometry (wallHeight → wallHeight + roofHeight)
 *   3. Min-height offset (translate up by minHeight)
 */
export function buildingToGeometry(
  building: BuildingFeature,
): THREE.BufferGeometry | null {
  const outerRing = building.coordinates[0];
  if (!outerRing || outerRing.length < 3) return null;

  // Convert to world XZ coordinates
  const pts: [number, number][] = [];
  for (const coord of outerRing) {
    if (!coord) continue;
    const [x, z] = latLonToXZ(coord[1], coord[0]);
    pts.push([x, z]);
  }
  if (pts.length < 3) return null;

  // Skip tiny buildings (area < 4 m²)
  const area = Math.abs(signedArea2D(pts));
  if (area < 4) return null;

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

  // Stage 1: Wall extrusion
  const wallHeight = building.height - building.roofHeight;
  const wallGeom = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(wallHeight, 0.5), // minimum wall height
    bevelEnabled: false,
  });
  wallGeom.rotateX(-Math.PI / 2);
  // Strip UVs — we don't texture buildings, and roof geometries lack UVs.
  wallGeom.deleteAttribute("uv");

  // Convert to non-indexed so it can merge with roof geometry (also non-indexed).
  let wallNonIndexed: THREE.BufferGeometry;
  if (wallGeom.index) {
    wallNonIndexed = wallGeom.toNonIndexed();
    wallGeom.dispose();
  } else {
    wallNonIndexed = wallGeom;
  }

  // Stage 2: Roof geometry
  const roofGeom = createRoofGeometry(
    shapePts,
    building.roofShape,
    building.roofHeight,
    wallHeight,
  );

  // Combine wall + roof
  let combined: THREE.BufferGeometry;
  if (roofGeom) {
    const merged = mergeGeometries([wallNonIndexed, roofGeom], false);
    wallNonIndexed.dispose();
    roofGeom.dispose();
    if (!merged) return null;
    combined = merged;
  } else {
    combined = wallNonIndexed;
  }

  // Stage 3: Min-height offset
  if (building.minHeight > 0) {
    combined.translate(0, building.minHeight, 0);
  }

  // Safety: skip geometry with NaN positions (degenerate input)
  const posAttr = combined.getAttribute("position");
  if (posAttr) {
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < Math.min(arr.length, 30); i++) {
      if (Number.isNaN(arr[i])) {
        combined.dispose();
        return null;
      }
    }
  }

  return combined;
}

// ── OSM color parsing ───────────────────────────────────────────────

/**
 * Map of non-standard OSM building:colour values to hex.
 * Covers the most common non-CSS names found in London OSM data.
 */
const OSM_COLOR_MAP: Record<string, string> = {
  light_brown: "#c4a882",
  dark_brown: "#5c3a1e",
  darkbrown: "#5c3a1e",
  "yellow-brown": "#c49a3c",
  lightbrown: "#c4a882",
  buff: "#dbc8a0",
  cream: "#fffdd0",
  sandstone: "#c9b98a",
  terracotta: "#c66b3d",
  slate: "#708090",
  stone: "#c8c0b4",
};

/**
 * Set of CSS named colors that THREE.Color accepts without warnings.
 * Only includes names we've seen in OSM data to keep the set small.
 */
const SAFE_CSS_COLORS = new Set([
  "white", "black", "red", "green", "blue", "yellow", "orange", "brown",
  "grey", "gray", "beige", "ivory", "tan", "silver", "gold", "pink",
  "maroon", "navy", "teal", "olive", "coral", "salmon", "khaki",
  "sienna", "peru", "wheat", "linen", "bisque", "chocolate",
  "darkred", "darkgreen", "darkblue", "lightgrey", "lightgray",
  "darkgrey", "darkgray", "dimgrey", "dimgray", "whitesmoke",
]);

/**
 * Parse an OSM building:colour value into a THREE.Color.
 * Handles non-standard OSM names and multi-value strings.
 * Returns null for unrecognised values (fall back to palette).
 */
function parseOSMColor(raw: string): THREE.Color | null {
  // Take first value if semicolon-separated
  const value = raw.split(";")[0]!.trim().toLowerCase();
  if (!value) return null;

  // Hex values — THREE.Color handles these natively
  if (value.startsWith("#")) {
    return new THREE.Color(value);
  }

  // rgb/hsl functions
  if (value.startsWith("rgb") || value.startsWith("hsl")) {
    return new THREE.Color(value);
  }

  // Custom OSM color map
  if (value in OSM_COLOR_MAP) {
    return new THREE.Color(OSM_COLOR_MAP[value]!);
  }

  // Known-safe CSS color names
  if (SAFE_CSS_COLORS.has(value)) {
    return new THREE.Color(value);
  }

  // Unknown — return null (caller falls back to palette)
  return null;
}

// ── Merged buildings ────────────────────────────────────────────────

/** Result of merging all buildings into renderable geometries. */
export interface MergedBuildings {
  mesh: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
  count: number;
}

/**
 * Build a single merged BufferGeometry (+ edge geometry) from all buildings.
 * Each building gets colour from OSM data or palette fallback.
 * Returns null if no valid buildings are produced.
 */
export function buildMergedGeometry(
  buildings: BuildingFeature[],
): MergedBuildings | null {
  const geometries: THREE.BufferGeometry[] = [];

  for (let i = 0; i < buildings.length; i++) {
    const building = buildings[i];
    if (!building) continue;

    const geom = buildingToGeometry(building);
    if (!geom) continue;

    // Colour: use OSM colour if available, desaturated to maintain blueprint aesthetic
    let color: THREE.Color;
    if (building.color) {
      const parsed = parseOSMColor(building.color);
      if (parsed) {
        color = parsed;
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);
        hsl.s = Math.min(hsl.s, 0.15); // cap saturation
        color.setHSL(hsl.h, hsl.s, hsl.l);
      } else {
        color = BUILDING_COLORS[i % BUILDING_COLORS.length]!;
      }
    } else {
      color = BUILDING_COLORS[i % BUILDING_COLORS.length]!;
    }

    setVertexColor(geom, color);
    geometries.push(geom);
  }

  if (geometries.length === 0) return null;

  const merged = mergeGeometries(geometries, false);
  if (!merged) {
    for (const g of geometries) g.dispose();
    return null;
  }

  // Dispose individual geometries — data is now in merged
  for (const g of geometries) g.dispose();

  // Edge outlines for architectural definition (higher angle = fewer edges = better perf)
  const edges = new THREE.EdgesGeometry(merged, 25);

  return { mesh: merged, edges, count: geometries.length };
}
