import { Sky } from "@react-three/drei";
import type { SolarPosition } from "../types";
import { sunPositionToVector3 } from "../utils/sunVector";

interface SkyDomeProps {
  solar: SolarPosition;
  cloudCover?: number;
}

export function SkyDome({ solar, cloudCover = 0 }: SkyDomeProps) {
  const sunPos = sunPositionToVector3(solar.altitude, solar.azimuth);

  // Ambient intensity varies by phase
  let ambientIntensity: number;
  let ambientColor: string;

  switch (solar.phase) {
    case "night":
      ambientIntensity = 0.2;
      ambientColor = "#1a1a3a";
      break;
    case "dawn":
    case "dusk":
      ambientIntensity = 0.3;
      ambientColor = "#4a3a5a";
      break;
    case "golden":
      ambientIntensity = 0.4;
      ambientColor = "#8a7060";
      break;
    case "day":
      ambientIntensity = 0.5;
      ambientColor = "#87ceeb";
      break;
  }

  // Clouds reduce sky clarity (increase turbidity)
  const turbidity = 2 + (cloudCover / 100) * 8;
  const rayleigh = solar.phase === "night" ? 0.1 : 2;

  return (
    <>
      <Sky
        sunPosition={[sunPos.x, sunPos.y, sunPos.z]}
        turbidity={turbidity}
        rayleigh={rayleigh}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
    </>
  );
}
