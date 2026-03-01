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

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;

    const pos = sunPositionToVector3(solar.altitude, solar.azimuth);
    light.position.copy(pos);

    // Intensity fades at horizon, dims with clouds
    const baseIntensity = Math.max(0, Math.sin(solar.altitude));
    const cloudFactor = 1 - (cloudCover / 100) * 0.6;
    light.intensity = baseIntensity * cloudFactor * 2;

    // Phase-based colour
    switch (solar.phase) {
      case "night":
        light.color.set("#4466aa"); // Moonlight blue
        light.intensity = 0.15;
        break;
      case "dawn":
      case "dusk":
        light.color.set("#e8825c");
        break;
      case "golden":
        light.color.set("#daa520");
        break;
      case "day":
        light.color.set("#ffffff");
        break;
    }
  });

  return (
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
  );
}
