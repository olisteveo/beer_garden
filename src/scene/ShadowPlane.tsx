import { useMemo } from "react";
import * as THREE from "three";

interface ShadowPlaneProps {
  radius?: number;
}

export function ShadowPlane({ radius = 800 }: ShadowPlaneProps) {
  const circleGeo = useMemo(() => {
    const geo = new THREE.CircleGeometry(radius * 1.05, 128);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [radius]);

  return (
    <mesh geometry={circleGeo} position={[0, 0.05, 0]} receiveShadow>
      <shadowMaterial transparent opacity={0.45} />
    </mesh>
  );
}
