import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import * as THREE from "three";
import type { ReactNode } from "react";
import type { SunPhase } from "../types";
import { GroundPlane } from "./GroundPlane";
import { ShadowPlane } from "./ShadowPlane";
import { latLonToXZ } from "../utils/projection";

interface SceneProps {
  children?: ReactNode;
  phase?: SunPhase;
  centerLat: number;
  centerLon: number;
}

function getFogColor(phase: SunPhase): string {
  switch (phase) {
    case "night":
      return "#0a0a1a";
    case "dawn":
    case "dusk":
      return "#8a6050";
    case "golden":
      return "#b8a080";
    case "day":
      return "#c9d6df";
  }
}

/** Sets scene background to match fog color */
function SceneBackground({ fogColor }: { fogColor: string }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color(fogColor);
  }, [scene, fogColor]);

  return null;
}

/**
 * Imperatively repositions camera + controls when the target lat/lon changes.
 * Ignores the initial render (Canvas mount already handles that).
 */
function CameraPositioner({ lat, lon }: { lat: number; lon: number }) {
  const { camera, controls } = useThree();
  const prevRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Skip first render — Canvas mount already set the camera position
    if (prevRef.current === null) {
      prevRef.current = { lat, lon };
      return;
    }

    // Only reposition if lat/lon actually changed (geolocation resolved)
    if (lat === prevRef.current.lat && lon === prevRef.current.lon) return;
    prevRef.current = { lat, lon };

    const [x, z] = latLonToXZ(lat, lon);

    // Map-like camera: overhead with slight tilt
    camera.position.set(x + 100, 400, z + 350);

    const ctrl = controls as unknown as {
      target?: THREE.Vector3;
      update?: () => void;
    };
    if (ctrl?.target) {
      ctrl.target.set(x, 0, z);
      ctrl.update?.();
    }
  }, [lat, lon, camera, controls]);

  return null;
}

export function Scene({
  children,
  phase = "day",
  centerLat,
  centerLon,
}: SceneProps) {
  const fogColor = getFogColor(phase);

  // Compute camera position from lat/lon (applied on Canvas mount)
  const [x, z] = latLonToXZ(centerLat, centerLon);
  const cameraPos: [number, number, number] = [x + 100, 400, z + 350];
  const target: [number, number, number] = [x, 0, z];

  return (
    <Canvas
      camera={{
        position: cameraPos,
        fov: 45,
        near: 1,
        far: 6000,
      }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <SceneBackground fogColor={fogColor} />

      <fog attach="fog" args={[fogColor, 600, 2800]} />

      <MapControls
        makeDefault
        target={target}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={50}
        maxDistance={1200}
        enableDamping
        dampingFactor={0.05}
        panSpeed={1.5}
      />

      <CameraPositioner lat={centerLat} lon={centerLon} />

      <GroundPlane phase={phase} />
      <ShadowPlane />

      {children}
    </Canvas>
  );
}
