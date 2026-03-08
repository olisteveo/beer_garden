import { useMemo } from "react";
import * as THREE from "three";
import type { SunPhase } from "../types";

interface BoundaryRingProps {
  radius: number;
  phase?: SunPhase;
}

function getBoundaryColor(phase: SunPhase): string {
  switch (phase) {
    case "night":
      return "#334155";
    case "dawn":
    case "dusk":
      return "#92754a";
    case "golden":
      return "#b8943a";
    case "day":
      return "#94a3b8";
  }
}

function getGlowColor(phase: SunPhase): string {
  switch (phase) {
    case "night":
      return "#475569";
    case "dawn":
    case "dusk":
      return "#d4a054";
    case "golden":
      return "#f59e0b";
    case "day":
      return "#cbd5e1";
  }
}

export function BoundaryRing({ radius, phase = "day" }: BoundaryRingProps) {
  const boundaryColor = getBoundaryColor(phase);
  const glowColor = getGlowColor(phase);

  // Ground ring — wide band at the boundary edge
  const ringGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(radius - 6, radius + 6, 128);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [radius]);

  // Vertical wall — thin transparent cylinder at the boundary
  const wallGeometry = useMemo(() => {
    const wallHeight = 8;
    const geo = new THREE.CylinderGeometry(radius, radius, wallHeight, 128, 1, true);
    geo.translate(0, wallHeight / 2, 0);
    return geo;
  }, [radius]);

  // Edge line — a circle at ground level for crisp definition
  const edgePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          0.15,
          Math.sin(angle) * radius,
        ),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <group>
      {/* Ground ring band */}
      <mesh geometry={ringGeometry} position={[0, 0.1, 0]}>
        <meshStandardMaterial
          color={boundaryColor}
          transparent
          opacity={0.4}
          roughness={0.9}
        />
      </mesh>

      {/* Vertical transparent wall */}
      <mesh geometry={wallGeometry}>
        <meshStandardMaterial
          color={boundaryColor}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Crisp edge line */}
      <lineLoop geometry={edgePoints}>
        <lineBasicMaterial color={glowColor} transparent opacity={0.6} />
      </lineLoop>
    </group>
  );
}
