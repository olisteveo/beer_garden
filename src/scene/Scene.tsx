import { useEffect, useRef, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import * as THREE from "three";
import type { ReactNode } from "react";
import type { SunPhase } from "../types";
import { GroundPlane } from "./GroundPlane";
import { ShadowPlane } from "./ShadowPlane";
import { BoundaryRing } from "./BoundaryRing";
import { PostProcessing } from "./PostProcessing";

interface SceneProps {
  children?: ReactNode;
  phase?: SunPhase;
  radius?: number;
  /** Increment to trigger camera fly-to center animation */
  flySignal?: number;
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

function SceneBackground({ fogColor }: { fogColor: string }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color(fogColor);
  }, [scene, fogColor]);

  return null;
}

/**
 * Clamp the MapControls target so it stays within the loaded area.
 * Smooth clamping prevents jarring snaps.
 */
function CameraClamp({ radius }: { radius: number }) {
  const { controls } = useThree();
  const clampRadius = radius * 0.55;

  useFrame(() => {
    const ctrl = controls as unknown as {
      target?: THREE.Vector3;
      update?: () => void;
    };
    if (!ctrl?.target) return;

    const dist = Math.sqrt(
      ctrl.target.x * ctrl.target.x + ctrl.target.z * ctrl.target.z,
    );

    if (dist > clampRadius) {
      const scale = clampRadius / dist;
      ctrl.target.x *= scale;
      ctrl.target.z *= scale;
      ctrl.update?.();
    }
  });

  return null;
}

/**
 * After each search, projection is re-centered so target is always [0,0,0].
 * This component triggers an animated fly-to on a "fly" signal.
 */
function CameraFlyTo({ fly, radius }: { fly: number; radius: number }) {
  const { camera, controls } = useThree();
  const animatingRef = useRef(false);
  const progressRef = useRef(0);
  const prevFlyRef = useRef(fly);

  // Camera resting position scaled to radius
  const targetPos = useMemo(
    () =>
      new THREE.Vector3(
        radius * 0.12,
        radius * 0.5,
        radius * 0.44,
      ),
    [radius],
  );
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (fly !== prevFlyRef.current) {
      prevFlyRef.current = fly;
      animatingRef.current = true;
      progressRef.current = 0;
    }
  }, [fly]);

  useFrame((_, delta) => {
    if (!animatingRef.current) return;

    progressRef.current = Math.min(1, progressRef.current + delta * 1.5);
    const t = easeOutCubic(progressRef.current);

    camera.position.lerp(targetPos, t);

    const ctrl = controls as unknown as {
      target?: THREE.Vector3;
      update?: () => void;
    };
    if (ctrl?.target) {
      ctrl.target.lerp(targetLook.current, t);
      ctrl.update?.();
    }

    if (progressRef.current >= 1) {
      animatingRef.current = false;
    }
  });

  return null;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Default camera position — overhead with slight tilt, looking at origin
const CAMERA_POS: [number, number, number] = [100, 400, 350];
const CAMERA_TARGET: [number, number, number] = [0, 0, 0];

export function Scene({
  children,
  phase = "day",
  radius = 800,
  flySignal = 0,
}: SceneProps) {
  const fogColor = getFogColor(phase);

  // Scale fog to radius — tight so boundary edge dissolves into background
  const fogNear = radius * 0.5;
  const fogFar = radius * 1.4;

  // Scale max camera distance — keep camera close so void is never visible
  const maxDistance = Math.max(radius * 0.9, 400);

  return (
    <Canvas
      camera={{
        position: CAMERA_POS,
        fov: 45,
        near: 1,
        far: Math.max(6000, radius * 6),
      }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
    >
      <SceneBackground fogColor={fogColor} />

      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <MapControls
        makeDefault
        target={CAMERA_TARGET}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={50}
        maxDistance={maxDistance}
        enableDamping
        dampingFactor={0.05}
        panSpeed={1.5}
      />

      <CameraFlyTo fly={flySignal} radius={radius} />
      <CameraClamp radius={radius} />

      <GroundPlane phase={phase} radius={radius} />
      <ShadowPlane radius={radius} />
      <BoundaryRing radius={radius} phase={phase} />

      {children}

      <PostProcessing phase={phase} />
    </Canvas>
  );
}
