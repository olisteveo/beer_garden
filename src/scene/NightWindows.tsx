import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SunPhase } from "../types";

// ── GLSL shaders ───────────────────────────────────────────

const windowVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const windowFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhaseFade; // 1.0 = full night, 0.5 = dusk/dawn, 0.0 = off

  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  // Deterministic per-window random
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Only wall faces — discard roofs and floors
    float wallFactor = 1.0 - abs(vNormal.y);
    if (wallFactor < 0.3) discard;

    // Window grid dimensions (metres)
    float windowWidth = 3.0;
    float windowHeight = 3.5; // matches METRES_PER_LEVEL

    // Choose wall axis based on dominant normal component
    float wallU = abs(vNormal.x) > abs(vNormal.z)
      ? vWorldPosition.z
      : vWorldPosition.x;
    float wallV = vWorldPosition.y;

    // Grid cell UV (0–1 within each window cell)
    float cellU = fract(wallU / windowWidth);
    float cellV = fract(wallV / windowHeight);

    // Window padding (frame between windows)
    float padU = 0.15;
    float padV = 0.12;
    float inWindow = step(padU, cellU) * step(cellU, 1.0 - padU)
                   * step(padV, cellV) * step(cellV, 1.0 - padV);

    // Deterministic on/off per window cell (~60% lit)
    vec2 cellId = vec2(floor(wallU / windowWidth), floor(wallV / windowHeight));
    float onOff = step(0.4, hash(cellId));

    // Skip ground floor (y < one level)
    float aboveGround = step(windowHeight, wallV);

    // Warm glow colour with slight variation per window
    float warmth = 0.85 + 0.15 * hash(cellId + vec2(42.0, 17.0));
    vec3 glowColor = vec3(1.0, warmth, 0.45 + 0.15 * warmth);

    float alpha = inWindow * onOff * wallFactor * aboveGround * 0.5;

    // Fade with sun phase
    alpha *= uPhaseFade;

    if (alpha < 0.01) discard;

    gl_FragColor = vec4(glowColor, alpha);
  }
`;

// ── Component ──────────────────────────────────────────────

interface NightWindowsProps {
  buildingGeometry: THREE.BufferGeometry;
  phase: SunPhase;
}

function phaseFade(phase: SunPhase): number {
  switch (phase) {
    case "night":
      return 1.0;
    case "dawn":
    case "dusk":
      return 0.5;
    default:
      return 0;
  }
}

/**
 * Procedural window glow overlay on building walls.
 * Only visible at night/dusk — adds warm lit-window effect.
 */
export function NightWindows({ buildingGeometry, phase }: NightWindowsProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const fade = phaseFade(phase);

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime!.value += delta;
    mat.uniforms.uPhaseFade!.value = fade;
  });

  // Don't render during day/golden hour
  if (fade <= 0) return null;

  return (
    <mesh geometry={buildingGeometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={windowVertexShader}
        fragmentShader={windowFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uPhaseFade: { value: fade },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
