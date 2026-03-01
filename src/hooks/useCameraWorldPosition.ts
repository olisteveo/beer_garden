import { useState, useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { xzToLatLon } from "../utils/projection";

interface CameraWorldPosition {
  worldX: number;
  worldZ: number;
  lat: number;
  lon: number;
}

const SAMPLE_INTERVAL_MS = 200;
const MOVEMENT_THRESHOLD = 30; // metres — low threshold for responsive tile loading

/**
 * Tracks the MapControls target position in world space, throttled.
 * Falls back to camera position projected onto Y=0 if controls.target
 * isn't available (e.g. if makeDefault is missing or controls not yet mounted).
 */
export function useCameraWorldPosition(): CameraWorldPosition {
  const { controls, camera } = useThree();
  const lastSampleRef = useRef(0);
  const lastEmittedRef = useRef<{ x: number; z: number } | null>(null);

  const [position, setPosition] = useState<CameraWorldPosition>(() => ({
    worldX: 0,
    worldZ: 0,
    lat: 51.515,
    lon: -0.07,
  }));

  const updatePosition = useCallback((x: number, z: number) => {
    const { lat, lon } = xzToLatLon(x, z);
    setPosition({ worldX: x, worldZ: z, lat, lon });
    lastEmittedRef.current = { x, z };
  }, []);

  useFrame(() => {
    const now = performance.now();
    if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
    lastSampleRef.current = now;

    // Primary: read MapControls target (where the camera is looking)
    let x: number;
    let z: number;
    const ctrl = controls as unknown as { target?: { x: number; z: number } };
    if (ctrl?.target) {
      x = ctrl.target.x;
      z = ctrl.target.z;
    } else {
      // Fallback: use camera position directly (XZ plane)
      x = camera.position.x;
      z = camera.position.z;
    }

    // First successful read — emit immediately regardless of threshold
    if (lastEmittedRef.current === null) {
      updatePosition(x, z);
      return;
    }

    const dx = x - lastEmittedRef.current.x;
    const dz = z - lastEmittedRef.current.z;
    const dist2 = dx * dx + dz * dz;

    if (dist2 >= MOVEMENT_THRESHOLD * MOVEMENT_THRESHOLD) {
      updatePosition(x, z);
    }
  });

  return position;
}
