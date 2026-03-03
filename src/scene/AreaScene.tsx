import * as THREE from "three";
import type { AreaGeometry } from "../hooks/useAreaSearch";

interface AreaSceneProps {
  geometry: AreaGeometry;
}

export function AreaScene({ geometry }: AreaSceneProps) {
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
              roughness={0.85}
              metalness={0.05}
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          </mesh>
          <lineSegments geometry={geometry.buildings.edges}>
            <lineBasicMaterial color="#8a8578" transparent opacity={0.3} />
          </lineSegments>
        </group>
      )}
    </group>
  );
}
