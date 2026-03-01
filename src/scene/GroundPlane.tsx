import type { SunPhase } from "../types";

interface GroundPlaneProps {
  phase?: SunPhase;
}

function getGroundColor(phase: SunPhase): string {
  switch (phase) {
    case "night":
      return "#1a1a24";
    case "dawn":
    case "dusk":
      return "#8a7868";
    case "golden":
      return "#c8b898";
    case "day":
      return "#e8e4d8";
  }
}

export function GroundPlane({ phase = "day" }: GroundPlaneProps) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[80000, 80000]} />
      <meshStandardMaterial color={getGroundColor(phase)} />
    </mesh>
  );
}
