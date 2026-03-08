import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import thamesPath from "../data/thames-path.json";
import { latLonToXZ } from "../utils/projection";
import type { SunPhase } from "../types";

const RIVER_HALF_WIDTH = 110; // metres — ~220m total, realistic for central London

// ── Phase-aware water colours ──────────────────────────────

const WATER_COLORS: Record<SunPhase, { shallow: THREE.Color; deep: THREE.Color }> = {
  night:  { shallow: new THREE.Color("#1a2a3a"), deep: new THREE.Color("#0a1520") },
  dawn:   { shallow: new THREE.Color("#6a7888"), deep: new THREE.Color("#3a4858") },
  dusk:   { shallow: new THREE.Color("#6a6070"), deep: new THREE.Color("#3a3848") },
  golden: { shallow: new THREE.Color("#7a8858"), deep: new THREE.Color("#4a6048") },
  day:    { shallow: new THREE.Color("#4a7fb8"), deep: new THREE.Color("#2a5f98") },
};

// ── GLSL shaders ───────────────────────────────────────────

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWindSpeed;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Gentle wave displacement
    float wave1 = sin(pos.x * 0.05 + uTime * 0.8) * 0.3;
    float wave2 = sin(pos.z * 0.08 + uTime * 1.2) * 0.15;
    float wave3 = sin((pos.x + pos.z) * 0.03 + uTime * 0.5) * 0.2;
    pos.y += (wave1 + wave2 + wave3) * max(uWindSpeed * 0.3, 0.3);

    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uWindSpeed;
  uniform vec3 uColorShallow;
  uniform vec3 uColorDeep;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  // Hash-based value noise (no texture needed)
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep interpolation

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    float windFactor = max(uWindSpeed * 0.2, 0.15);

    // Two UV scroll layers at different speeds/directions for flow
    vec2 uv1 = vUv * vec2(8.0, 2.0) + vec2(uTime * windFactor * 0.5, uTime * 0.03);
    vec2 uv2 = vUv * vec2(5.0, 3.0) - vec2(uTime * windFactor * 0.3, uTime * 0.05);

    float n1 = noise(uv1);
    float n2 = noise(uv2);

    // Combine noise layers for ripple pattern
    float ripple = (n1 + n2) * 0.5;

    // Fresnel-like edge darkening (v=0 or v=1 are river banks)
    float edgeDist = abs(vUv.y - 0.5) * 2.0;
    float edgeFactor = smoothstep(0.7, 1.0, edgeDist);

    // Mix shallow and deep colours based on noise + edge
    vec3 color = mix(uColorShallow, uColorDeep, ripple * 0.6 + edgeFactor * 0.4);

    // Subtle specular highlights from ripples
    float highlight = smoothstep(0.65, 0.75, ripple) * 0.15;
    color += vec3(highlight);

    gl_FragColor = vec4(color, 0.92);
  }
`;

// ── Component ──────────────────────────────────────────────

interface ThamesRiverProps {
  phase?: SunPhase;
  windSpeed?: number;
}

export function ThamesRiver({ phase = "day", windSpeed = 1.5 }: ThamesRiverProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const points = thamesPath as [number, number][];
    if (points.length < 2) return null;

    const vertices: number[] = [];
    const uvs: number[] = [];
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

      // Left and right bank vertices
      vertices.push(cx + perpX * RIVER_HALF_WIDTH, 0.05, cz + perpZ * RIVER_HALF_WIDTH);
      vertices.push(cx - perpX * RIVER_HALF_WIDTH, 0.05, cz - perpZ * RIVER_HALF_WIDTH);

      // UVs: u = along river, v = across (0 = left, 1 = right)
      const u = i / (points.length - 1);
      uvs.push(u, 0.0); // left bank
      uvs.push(u, 1.0); // right bank
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
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Resolve phase colors
  const colors = WATER_COLORS[phase];

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindSpeed: { value: windSpeed },
      uColorShallow: { value: colors.shallow },
      uColorDeep: { value: colors.deep },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Animate time + update phase/wind uniforms
  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime!.value += delta;
    mat.uniforms.uWindSpeed!.value = windSpeed;
    mat.uniforms.uColorShallow!.value = colors.shallow;
    mat.uniforms.uColorDeep!.value = colors.deep;
  });

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} renderOrder={-1}>
      <shaderMaterial
        ref={matRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-3}
        polygonOffsetUnits={-3}
      />
    </mesh>
  );
}
