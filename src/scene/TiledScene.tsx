import * as THREE from "three";
import type { MergedBuildings } from "../utils/buildingGeometry";
import type { MergedParks } from "../utils/parkGeometry";
import type { MergedRoads } from "../utils/roadGeometry";
import { useCameraWorldPosition } from "../hooks/useCameraWorldPosition";
import { useTileManager, type TileState } from "../hooks/useTileManager";

/** Renders a single tile's merged building geometry. */
function TileBuildingMesh({ geometry }: { geometry: MergedBuildings }) {
  return (
    <group>
      <mesh geometry={geometry.mesh} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.85}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={geometry.edges}>
        <lineBasicMaterial color="#8a8578" transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
}

/** Renders a single tile's merged park geometry. */
function TileParkMesh({ geometry }: { geometry: MergedParks }) {
  return (
    <mesh geometry={geometry.mesh} receiveShadow>
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
  );
}

/** Renders a single tile's merged road geometry. */
function TileRoadMesh({ geometry }: { geometry: MergedRoads }) {
  return (
    <mesh geometry={geometry.mesh}>
      <meshBasicMaterial
        vertexColors
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

/**
 * Combined tile-based renderer for buildings, parks, and roads.
 * Reads camera world position, manages tile lifecycle via useTileManager,
 * and renders each loaded tile's geometry layers.
 */
export function TiledScene() {
  const { lat, lon } = useCameraWorldPosition();
  const { tiles } = useTileManager(lat, lon);

  // Collect renderable tiles
  const entries: [string, TileState][] = [];
  for (const [key, tile] of tiles) {
    if (tile.status === "loaded") {
      entries.push([key, tile]);
    }
  }

  return (
    <group>
      {entries.map(([key, tile]) => (
        <group key={key}>
          {tile.roadGeometry && (
            <TileRoadMesh geometry={tile.roadGeometry} />
          )}
          {tile.parkGeometry && (
            <TileParkMesh geometry={tile.parkGeometry} />
          )}
          {tile.geometry && (
            <TileBuildingMesh geometry={tile.geometry} />
          )}
        </group>
      ))}
    </group>
  );
}
