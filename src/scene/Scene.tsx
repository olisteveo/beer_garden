import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ReactNode } from "react";
import { useDeviceCapabilities } from "../hooks/useDeviceCapabilities";
import { GroundPlane } from "./GroundPlane";
import { ShadowPlane } from "./ShadowPlane";

interface SceneProps {
  children?: ReactNode;
}

export function Scene({ children }: SceneProps) {
  const { dpr } = useDeviceCapabilities();

  return (
    <Canvas
      dpr={dpr}
      shadows
      camera={{
        position: [400, 300, 400],
        fov: 45,
        near: 1,
        far: 5000,
      }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = 2 as THREE.ShadowMapType; // PCFSoftShadowMap
      }}
    >
      <fog attach="fog" args={["#c9d6df", 800, 2500]} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={50}
        maxDistance={1500}
        target={[0, 0, 0]}
        enablePan
      />

      <GroundPlane />
      <ShadowPlane />

      {children}
    </Canvas>
  );
}
