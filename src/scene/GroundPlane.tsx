import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SunPhase } from "../types";

interface GroundPlaneProps {
  phase?: SunPhase;
  radius?: number;
}

// ── Phase-aware ground colours ──────────────────────────────

const GROUND_COLORS: Record<SunPhase, { base: THREE.Color; accent: THREE.Color }> = {
  night:  { base: new THREE.Color("#181820"), accent: new THREE.Color("#222230") },
  dawn:   { base: new THREE.Color("#7a6858"), accent: new THREE.Color("#8a7868") },
  dusk:   { base: new THREE.Color("#6a5848"), accent: new THREE.Color("#7a6858") },
  golden: { base: new THREE.Color("#b8a878"), accent: new THREE.Color("#c8b898") },
  day:    { base: new THREE.Color("#d4d0c4"), accent: new THREE.Color("#dedad0") },
};

// ── GLSL shaders ───────────────────────────────────────────

const groundVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const groundFragmentShader = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorAccent;
  uniform float uRadius;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  // Hash-based value noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Large-scale noise for organic variation (like patches of different paving)
    float n1 = noise(vWorldPosition.xz * 0.008);
    // Medium-scale noise for granularity
    float n2 = noise(vWorldPosition.xz * 0.04) * 0.4;
    // Fine-scale noise for surface texture
    float n3 = noise(vWorldPosition.xz * 0.2) * 0.15;

    float combined = n1 + n2 + n3;

    // Subtle grid pattern — suggests city blocks
    float gridX = smoothstep(0.92, 0.96, fract(vWorldPosition.x * 0.01));
    float gridZ = smoothstep(0.92, 0.96, fract(vWorldPosition.z * 0.01));
    float grid = max(gridX, gridZ) * 0.08;

    // Mix base and accent colours using noise
    vec3 color = mix(uColorBase, uColorAccent, combined * 0.5 + 0.25);

    // Darken grid lines slightly
    color -= vec3(grid);

    // Edge fade — darken toward boundary to match fog
    float dist = length(vWorldPosition.xz) / uRadius;
    float edgeDarken = smoothstep(0.6, 1.0, dist) * 0.3;
    color -= vec3(edgeDarken);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Component ──────────────────────────────────────────────

export function GroundPlane({ phase = "day", radius = 800 }: GroundPlaneProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const colors = GROUND_COLORS[phase];

  const circleGeo = useMemo(() => {
    const geo = new THREE.CircleGeometry(radius, 128);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [radius]);

  const uniforms = useMemo(
    () => ({
      uColorBase: { value: colors.base },
      uColorAccent: { value: colors.accent },
      uRadius: { value: radius },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Update phase colours each frame
  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uColorBase!.value = colors.base;
    mat.uniforms.uColorAccent!.value = colors.accent;
    mat.uniforms.uRadius!.value = radius;
  });

  return (
    <mesh geometry={circleGeo} position={[0, -0.1, 0]} receiveShadow>
      <shaderMaterial
        ref={matRef}
        vertexShader={groundVertexShader}
        fragmentShader={groundFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
