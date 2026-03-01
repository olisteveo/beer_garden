import osmtogeojson from "osmtogeojson";
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import type { BBox, BuildingFeature } from "../types";
import { DEFAULT_BUILDING_HEIGHT, METRES_PER_LEVEL } from "./constants";
import { isOverpassResponse, isNumber, isString } from "./validation";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function buildQuery(bbox: BBox): string {
  const { south, west, north, east } = bbox;
  return `[out:json][timeout:30];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;
}

/**
 * Extract building height from OSM feature properties.
 */
function extractHeight(properties: Record<string, unknown>): number {
  // Check direct height tag
  const tags = properties["tags"];
  if (tags && typeof tags === "object" && tags !== null) {
    const t = tags as Record<string, unknown>;
    const heightStr = t["height"];
    if (isString(heightStr)) {
      const parsed = parseFloat(heightStr);
      if (isNumber(parsed) && parsed > 0) return parsed;
    }

    const levels = t["building:levels"];
    if (isString(levels)) {
      const parsed = parseInt(levels, 10);
      if (isNumber(parsed) && parsed > 0) return parsed * METRES_PER_LEVEL;
    }
  }

  return DEFAULT_BUILDING_HEIGHT;
}

/**
 * Convert a GeoJSON Feature with Polygon/MultiPolygon geometry to BuildingFeature(s).
 */
function featureToBuildingFeatures(
  feature: Feature<Polygon | MultiPolygon>,
): BuildingFeature[] {
  const height = extractHeight(
    (feature.properties ?? {}) as Record<string, unknown>,
  );

  if (feature.geometry.type === "Polygon") {
    return [
      {
        coordinates: feature.geometry.coordinates as [number, number][][],
        height,
      },
    ];
  }

  // MultiPolygon — return each polygon as a separate building
  return feature.geometry.coordinates.map((polygon) => ({
    coordinates: polygon as [number, number][][],
    height,
  }));
}

/**
 * Fetch building data from the Overpass API for the given bounding box.
 */
export async function fetchBuildings(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<BuildingFeature[]> {
  const query = buildQuery(bbox);

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const raw: unknown = await response.json();

  if (!isOverpassResponse(raw)) {
    throw new Error("Invalid Overpass API response format");
  }

  const geojson: FeatureCollection = osmtogeojson(raw);

  const buildings: BuildingFeature[] = [];

  for (const feature of geojson.features) {
    const geomType = feature.geometry.type;
    if (geomType !== "Polygon" && geomType !== "MultiPolygon") continue;

    const typedFeature = feature as Feature<Polygon | MultiPolygon>;
    buildings.push(...featureToBuildingFeatures(typedFeature));
  }

  return buildings;
}
