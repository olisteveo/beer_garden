import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SolarPosition } from "../types";
import { sunPositionToVector3 } from "../utils/sunVector";
import { SHADOW_MAP_SIZE } from "../utils/constants";

interface SunLightProps {
  solar: SolarPosition;
  cloudCover?: number; // 0-100
}

export function SunLight({ solar, cloudCover = 0 }: SunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  useFrame(() => {
    const light = lightRef.current;
    const hemi = hemiRef.current;
    if (!light) return;

    const pos = sunPositionToVector3(solar.altitude, solar.azimuth);
    light.position.copy(pos);

    // Intensity fades at horizon, dims with clouds — boosted multiplier for richer lighting
    const baseIntensity = Math.max(0, Math.sin(solar.altitude));
    const cloudFactor = 1 - (cloudCover / 100) * 0.5;
    light.intensity = baseIntensity * cloudFactor * 3.5;

    // Phase-based colour + hemisphere fill light
    switch (solar.phase) {
      case "night":
        light.color.set("#4466aa");
        light.intensity = 0.2;
        if (hemi) {
          hemi.color.set("#1a1a3a");
          hemi.groundColor.set("#0a0a15");
          hemi.intensity = 0.15;
        }
        break;
      case "dawn":
      case "dusk":
        light.color.set("#e8825c");
        if (hemi) {
          hemi.color.set("#c87850");
          hemi.groundColor.set("#4a3a30");
          hemi.intensity = 0.5;
        }
        break;
      case "golden":
        light.color.set("#daa520");
        if (hemi) {
          hemi.color.set("#d4a040");
          hemi.groundColor.set("#8a7050");
          hemi.intensity = 0.6;
        }
        break;
      case "day":
        light.color.set("#ffffff");
        if (hemi) {
          hemi.color.set("#87ceeb");
          hemi.groundColor.set("#e8e0d0");
          hemi.intensity = 0.5;
        }
        break;
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-left={-600}
        shadow-camera-right={600}
        shadow-camera-top={600}
        shadow-camera-bottom={-600}
        shadow-camera-near={1}
        shadow-camera-far={1500}
        shadow-bias={-0.0005}
      />
      {/* Hemisphere light: sky-to-ground gradient fill for better depth */}
      <hemisphereLight ref={hemiRef} intensity={0.5} />
    </>
  );
}
