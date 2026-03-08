import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RainEffectProps {
  /** How heavy the rain is: 0 = no rain, 1 = max downpour */
  intensity: number;
}

const PARTICLE_COUNT = 4000;
const SPREAD = 800; // XZ area the rain covers
const HEIGHT = 400; // vertical extent
const SPEED_BASE = 600; // units per second base fall speed
const SPEED_VAR = 200; // random variation

/**
 * GPU-friendly rain particle system using points.
 *
 * Each particle falls downward. When it goes below ground it wraps to the top.
 */
export function RainEffect({ intensity }: RainEffectProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate initial positions and speeds
  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * SPREAD;
      pos[i3 + 1] = Math.random() * HEIGHT;
      pos[i3 + 2] = (Math.random() - 0.5) * SPREAD;
      spd[i] = SPEED_BASE + Math.random() * SPEED_VAR;
    }

    return { positions: pos, speeds: spd };
  }, []);

  // Animate rain
  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts || intensity <= 0) return;

    const geom = pts.geometry;
    const posAttr = geom.getAttribute("position");
    if (!posAttr) return;

    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const xi = i * 3;
      const yi = xi + 1;
      const zi = xi + 2;
      const speed = speeds[i] ?? SPEED_BASE;
      arr[yi]! -= speed * delta * intensity;

      // Wrap around when below ground
      if ((arr[yi] ?? 0) < -10) {
        arr[yi] = HEIGHT + Math.random() * 50;
        arr[xi] = (Math.random() - 0.5) * SPREAD;
        arr[zi] = (Math.random() - 0.5) * SPREAD;
      }
    }

    posAttr.needsUpdate = true;
  });

  if (intensity <= 0) return null;

  // Fade particle opacity with intensity
  const opacity = Math.min(intensity * 0.6, 0.5);
  // More particles visible at higher intensity
  const visibleCount = Math.floor(PARTICLE_COUNT * Math.min(intensity, 1));

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={visibleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#a8c4d4"
        size={3}
        transparent
        opacity={opacity}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
