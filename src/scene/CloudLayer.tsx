import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SunPhase } from "../types";

// ── Phase-aware cloud colours ──────────────────────────────

const CLOUD_COLORS: Record<SunPhase, THREE.Color> = {
  night:  new THREE.Color("#2a2a3a"),
  dawn:   new THREE.Color("#c88060"),
  dusk:   new THREE.Color("#b07060"),
  golden: new THREE.Color("#d4a860"),
  day:    new THREE.Color("#c8d0d8"),
};

// ── GLSL shaders ───────────────────────────────────────────

const cloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uCloudCover; // 0.0 – 1.0
  uniform float uWindSpeed;
  uniform vec3 uCloudColor;
  varying vec2 vUv;

  // Hash-based 2D value noise
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

  // 3-octave FBM for cloud-like patterns
  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.50 * noise(p);       p *= 2.01;
    v += 0.25 * noise(p);       p *= 2.02;
    v += 0.125 * noise(p);
    return v;
  }

  void main() {
    float windFactor = max(uWindSpeed * 0.2, 0.1);

    // Scroll UVs with wind
    vec2 uv = vUv * 3.0 + vec2(uTime * windFactor * 0.001, uTime * 0.0003);

    float n = fbm(uv);

    // Threshold: more cloud cover → lower threshold → more visible cloud
    float threshold = 1.0 - uCloudCover;
    float alpha = smoothstep(threshold, threshold + 0.3, n) * uCloudCover * 0.55;

    // Soft edge fade to prevent hard plane edges
    float edgeFade = smoothstep(0.0, 0.15, vUv.x)
                   * smoothstep(1.0, 0.85, vUv.x)
                   * smoothstep(0.0, 0.15, vUv.y)
                   * smoothstep(1.0, 0.85, vUv.y);

    alpha *= edgeFade;

    gl_FragColor = vec4(uCloudColor, alpha);
  }
`;

// ── Component ──────────────────────────────────────────────

interface CloudLayerProps {
  cloudCover: number; // 0-100
  phase?: SunPhase;
  windSpeed?: number; // m/s
}

export function CloudLayer({
  cloudCover,
  phase = "day",
  windSpeed = 1.5,
}: CloudLayerProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const cloudColor = CLOUD_COLORS[phase];
  const coverNorm = cloudCover / 100;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCloudCover: { value: coverNorm },
      uWindSpeed: { value: windSpeed },
      uCloudColor: { value: cloudColor },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime!.value += delta;
    mat.uniforms.uCloudCover!.value = coverNorm;
    mat.uniforms.uWindSpeed!.value = windSpeed;
    mat.uniforms.uCloudColor!.value = cloudColor;
  });

  if (cloudCover < 5) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 300, 0]}>
      <planeGeometry args={[4000, 4000]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
