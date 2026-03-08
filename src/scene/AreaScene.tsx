import * as THREE from "three";
import type { AreaGeometry } from "../hooks/useAreaSearch";
import type { SunPhase } from "../types";

interface AreaSceneProps {
  geometry: AreaGeometry;
  phase?: SunPhase;
}

function getEdgeColor(phase: SunPhase): string {
  switch (phase) {
    case "night":
      return "#2a2838";
    case "dawn":
    case "dusk":
      return "#6a5040";
    case "golden":
      return "#7a6848";
    case "day":
      return "#5a5550";
  }
}

function getEdgeOpacity(phase: SunPhase): number {
  return phase === "night" ? 0.35 : 0.55;
}

export function AreaScene({ geometry, phase = "day" }: AreaSceneProps) {
  const edgeColor = getEdgeColor(phase);
  const edgeOpacity = getEdgeOpacity(phase);

  return (
    <group>
      {/* Roads — lowest layer */}
      {geometry.roads && (
        <mesh geometry={geometry.roads.mesh}>
          <meshBasicMaterial
            vertexColors
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      )}

      {/* Parks — above roads */}
      {geometry.parks && (
        <mesh geometry={geometry.parks.mesh} receiveShadow>
          <meshStandardMaterial
            vertexColors
            roughness={0.9}
            metalness={0}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* Buildings — mesh + edge lines */}
      {geometry.buildings && (
        <group>
          <mesh geometry={geometry.buildings.mesh} castShadow receiveShadow>
            <meshStandardMaterial
              vertexColors
              roughness={0.7}
              metalness={0.08}
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
              envMapIntensity={0.5}
            />
          </mesh>
          <lineSegments geometry={geometry.buildings.edges}>
            <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
          </lineSegments>
        </group>
      )}
    </group>
  );
}
