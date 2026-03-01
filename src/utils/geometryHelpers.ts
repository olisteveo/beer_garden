import * as THREE from "three";

/**
 * Signed area of a 2D polygon (shoelace formula).
 * Positive = CCW, negative = CW.
 */
export function signedArea2D(pts: [number, number][]): number {
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const pi = pts[i]!;
    const pj = pts[j]!;
    area += (pj[0] - pi[0]) * (pj[1] + pi[1]);
  }
  return area / 2;
}

/** Assign a uniform vertex colour to every vertex in a geometry. */
export function setVertexColor(geom: THREE.BufferGeometry, color: THREE.Color): void {
  const count = geom.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}
