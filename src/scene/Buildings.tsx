import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildingFeature } from "../types";
import { mergeBuildings } from "../utils/buildingGeometry";

interface BuildingsProps {
  buildings: BuildingFeature[];
}

export function Buildings({ buildings }: BuildingsProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    if (buildings.length === 0) return null;
    return mergeBuildings(buildings);
  }, [buildings]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#d4d0c8"
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}
