import osmtogeojson from "osmtogeojson";
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import type { BBox, BuildingFeature, RoofShape, ParkFeature, ParkType, RoadFeature, RoadType, AreaData, OSMPubNode } from "../types";
import { DEFAULT_BUILDING_HEIGHT, METRES_PER_LEVEL } from "./constants";
import { isOverpassResponse, isNumber, isString } from "./validation";
import thamesPath from "../data/thames-path.json";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// ── Thames corridor filter ──────────────────────────────────────────

const THAMES_BUFFER_M = 120; // metres — filter buildings within this distance of river center
const DEG_TO_M_LAT = 111_320; // metres per degree latitude
const DEG_TO_M_LON = 111_320 * Math.cos(51.515 * (Math.PI / 180)); // at London latitude

/** Precomputed Thames path as [lon, lat] segments for distance checks. */
const thamesPoints = thamesPath as [number, number][];

/**
 * Approximate distance in metres from a point to the nearest segment of the Thames.
 * Uses flat-earth approximation (accurate enough at London scale).
 */
function distanceToThamesM(lon: number, lat: number): number {
  let minDist2 = Infinity;

  for (let i = 0; i < thamesPoints.length - 1; i++) {
    const ax = thamesPoints[i]![0] * DEG_TO_M_LON;
    const ay = thamesPoints[i]![1] * DEG_TO_M_LAT;
    const bx = thamesPoints[i + 1]![0] * DEG_TO_M_LON;
    const by = thamesPoints[i + 1]![1] * DEG_TO_M_LAT;
    const px = lon * DEG_TO_M_LON;
    const py = lat * DEG_TO_M_LAT;

    // Project point onto segment
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) {
      const d2 = (px - ax) ** 2 + (py - ay) ** 2;
      if (d2 < minDist2) minDist2 = d2;
      continue;
    }

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d2 = (px - cx) ** 2 + (py - cy) ** 2;
    if (d2 < minDist2) minDist2 = d2;
  }

  return Math.sqrt(minDist2);
}

/** Check if a building's centroid is inside the Thames corridor. */
function isBuildingInThames(coordinates: [number, number][][]): boolean {
  const ring = coordinates[0];
  if (!ring || ring.length < 3) return false;
  let cx = 0, cy = 0;
  for (const [lon, lat] of ring) {
    cx += lon;
    cy += lat;
  }
  cx /= ring.length;
  cy /= ring.length;
  return distanceToThamesM(cx, cy) < THAMES_BUFFER_M;
}

function buildQuery(bbox: BBox): string {
  const { south, west, north, east } = bbox;
  const b = `${south},${west},${north},${east}`;
  return (
    `[out:json][timeout:30];(` +
    `way["building"](${b});` +
    `relation["building"](${b});` +
    `way["building:part"](${b});` +
    `relation["building:part"](${b});` +
    `way["leisure"~"park|garden|playground"](${b});` +
    `relation["leisure"~"park|garden|playground"](${b});` +
    `way["landuse"~"grass|meadow|recreation_ground|village_green|cemetery"](${b});` +
    `relation["landuse"~"grass|meadow|recreation_ground|village_green|cemetery"](${b});` +
    `way["highway"~"motorway|trunk|primary|secondary|tertiary|residential"](${b});` +
    `node["amenity"~"pub|bar"](${b});` +
    `);out body;>;out skel qt;`
  );
}

// ── S3DB tag extraction ─────────────────────────────────────────────

const VALID_ROOF_SHAPES: Set<string> = new Set([
  "flat",
  "gabled",
  "hipped",
  "pyramidal",
  "dome",
  "skillion",
  "mansard",
  "gambrel",
  "round",
]);

function isValidRoofShape(value: string | null): value is RoofShape {
  return value !== null && VALID_ROOF_SHAPES.has(value);
}

function parseMetres(value: unknown): number | null {
  if (!isString(value)) return null;
  const parsed = parseFloat(value);
  return isNumber(parsed) && parsed > 0 ? parsed : null;
}

function parseLevels(value: unknown): number | null {
  if (!isString(value)) return null;
  const parsed = parseInt(value, 10);
  return isNumber(parsed) && parsed > 0 ? parsed * METRES_PER_LEVEL : null;
}

/** Estimate roof height as a fraction of total height when roof:height is absent */
function estimateRoofHeight(totalHeight: number, roofShape: RoofShape): number {
  switch (roofShape) {
    case "dome":
    case "pyramidal":
      return totalHeight * 0.4;
    case "gabled":
    case "hipped":
    case "mansard":
    case "gambrel":
      return Math.min(totalHeight * 0.25, 4);
    case "skillion":
      return Math.min(totalHeight * 0.15, 2);
    case "round":
      return totalHeight * 0.3;
    default:
      return 0;
  }
}

interface S3DProperties {
  height: number;
  roofShape: RoofShape;
  roofHeight: number;
  minHeight: number;
  color: string | null;
  isBuildingPart: boolean;
}

/**
 * Extract S3DB properties from osmtogeojson feature properties.
 * osmtogeojson flattens OSM tags into GeoJSON properties directly.
 */
function extractS3DProperties(
  properties: Record<string, unknown>,
): S3DProperties {
  // osmtogeojson may nest tags under "tags" key or flatten them
  const tags =
    properties["tags"] && typeof properties["tags"] === "object"
      ? (properties["tags"] as Record<string, unknown>)
      : properties;

  // Height
  const height =
    parseMetres(tags["height"]) ??
    parseLevels(tags["building:levels"]) ??
    DEFAULT_BUILDING_HEIGHT;

  // Roof shape
  const roofShapeRaw = isString(tags["roof:shape"]) ? tags["roof:shape"] : null;
  const roofShape = isValidRoofShape(roofShapeRaw) ? roofShapeRaw : "flat";

  // Roof height
  const roofHeight =
    parseMetres(tags["roof:height"]) ??
    (roofShape !== "flat" ? estimateRoofHeight(height, roofShape) : 0);

  // Min height (for stacked building:parts)
  const minHeight =
    parseMetres(tags["min_height"]) ??
    parseLevels(tags["building:min_level"]) ??
    0;

  // Colour
  const color = isString(tags["building:colour"])
    ? (tags["building:colour"] as string)
    : null;

  // Is this a building:part?
  const isBuildingPart =
    isString(tags["building:part"]) ||
    tags["building:part"] !== undefined;

  return { height, roofShape, roofHeight, minHeight, color, isBuildingPart };
}

// ── Procedural roof assignment ──────────────────────────────────────

/**
 * Deterministic pseudo-random based on coordinates.
 * Returns a value in [0, 1).
 */
function seededRandom(coords: [number, number][]): number {
  const first = coords[0];
  if (!first) return 0;
  return Math.abs(Math.sin(first[0] * 12345.6789) * Math.cos(first[1] * 98765.4321)) % 1;
}

/**
 * Compute signed area of a polygon ring using the shoelace formula.
 * Works in lon/lat — the absolute value gives a relative size comparison.
 */
function ringArea(ring: [number, number][]): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i]!;
    const pj = ring[j]!;
    area += (pj[0] - pi[0]) * (pj[1] + pi[1]);
  }
  return Math.abs(area / 2);
}

/**
 * Assign a procedural roof shape for buildings without a roof:shape tag.
 * Seeded by coordinates so results are deterministic.
 */
function proceduralRoofAssignment(
  coordinates: [number, number][][],
  height: number,
): { roofShape: RoofShape; roofHeight: number } {
  const outerRing = coordinates[0];
  if (!outerRing || outerRing.length < 3)
    return { roofShape: "flat", roofHeight: 0 };

  const seed = seededRandom(outerRing);
  const area = ringArea(outerRing);

  // Small buildings (area < ~100m² in lon/lat proxy): 25% gabled
  if (area < 0.000001) {
    if (seed < 0.25) {
      return { roofShape: "gabled", roofHeight: Math.min(height * 0.2, 3) };
    }
  }

  // Medium buildings: 10% gabled, 5% hipped
  if (area < 0.000005) {
    if (seed < 0.1)
      return { roofShape: "gabled", roofHeight: Math.min(height * 0.15, 3) };
    if (seed < 0.15)
      return { roofShape: "hipped", roofHeight: Math.min(height * 0.15, 3) };
  }

  // Large buildings: stay flat (commercial/office blocks)
  return { roofShape: "flat", roofHeight: 0 };
}

// ── Building:part grouping ──────────────────────────────────────────

/** Point-in-polygon using ray casting algorithm */
function pointInPolygon(
  point: [number, number],
  ring: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ri = ring[i]!;
    const rj = ring[j]!;
    if (
      ri[1] > point[1] !== rj[1] > point[1] &&
      point[0] < ((rj[0] - ri[0]) * (point[1] - ri[1])) / (rj[1] - ri[1]) + ri[0]
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Compute centroid of a polygon ring */
function centroid(ring: [number, number][]): [number, number] {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of ring) {
    cx += x;
    cy += y;
  }
  return [cx / ring.length, cy / ring.length];
}

/** Get outer ring from Polygon or first polygon of MultiPolygon */
function getOuterRing(
  feature: Feature<Polygon | MultiPolygon>,
): [number, number][] | null {
  if (feature.geometry.type === "Polygon") {
    return (feature.geometry.coordinates[0] as [number, number][] | undefined) ?? null;
  }
  const first = feature.geometry.coordinates[0];
  return (first?.[0] as [number, number][] | undefined) ?? null;
}

// ── Feature conversion ──────────────────────────────────────────────

interface ParsedFeature {
  feature: Feature<Polygon | MultiPolygon>;
  props: S3DProperties;
}

/**
 * Convert a GeoJSON Feature to BuildingFeature(s) with full S3DB properties.
 */
function featureToBuildingFeatures(
  feature: Feature<Polygon | MultiPolygon>,
  props: S3DProperties,
  coordinates: [number, number][][] | null = null,
): BuildingFeature[] {
  const base = {
    height: props.height,
    roofShape: props.roofShape,
    roofHeight: props.roofHeight,
    minHeight: props.minHeight,
    color: props.color,
  };

  // Apply procedural roof if still flat and not a building:part
  function withProceduralRoof(
    coords: [number, number][][],
  ): BuildingFeature {
    if (base.roofShape === "flat" && !props.isBuildingPart) {
      const proc = proceduralRoofAssignment(coords, base.height);
      return { ...base, coordinates: coords, ...proc };
    }
    return { ...base, coordinates: coords };
  }

  if (coordinates) {
    return [withProceduralRoof(coordinates)];
  }

  if (feature.geometry.type === "Polygon") {
    return [
      withProceduralRoof(
        feature.geometry.coordinates as [number, number][][],
      ),
    ];
  }

  // MultiPolygon — each polygon as a separate building
  return feature.geometry.coordinates.map((polygon) =>
    withProceduralRoof(polygon as [number, number][][]),
  );
}

// ── Park / road type detection ──────────────────────────────────────

const VALID_PARK_TYPES: Set<string> = new Set([
  "park", "garden", "playground", "grass", "meadow",
  "recreation_ground", "village_green", "cemetery",
]);

const VALID_ROAD_TYPES: Set<string> = new Set([
  "motorway", "trunk", "primary", "secondary", "tertiary", "residential",
]);

function detectParkType(tags: Record<string, unknown>): ParkType | null {
  const leisure = isString(tags["leisure"]) ? tags["leisure"] : null;
  if (leisure && VALID_PARK_TYPES.has(leisure)) return leisure as ParkType;

  const landuse = isString(tags["landuse"]) ? tags["landuse"] : null;
  if (landuse && VALID_PARK_TYPES.has(landuse)) return landuse as ParkType;

  return null;
}

function detectRoadType(tags: Record<string, unknown>): RoadType | null {
  const highway = isString(tags["highway"]) ? tags["highway"] : null;
  if (highway && VALID_ROAD_TYPES.has(highway)) return highway as RoadType;
  return null;
}

function getTags(properties: Record<string, unknown>): Record<string, unknown> {
  if (properties["tags"] && typeof properties["tags"] === "object") {
    return properties["tags"] as Record<string, unknown>;
  }
  return properties;
}

// ── Pub node extraction ──────────────────────────────────────────────

function extractPubNode(
  properties: Record<string, unknown>,
  lat: number,
  lon: number,
): OSMPubNode | null {
  const tags = getTags(properties);
  const name = isString(tags["name"]) ? tags["name"] : null;
  if (!name) return null; // skip unnamed pubs

  const id = isString(properties["id"]) ? properties["id"] : `${lat}:${lon}`;

  const addrParts: string[] = [];
  if (isString(tags["addr:housenumber"])) addrParts.push(tags["addr:housenumber"]);
  if (isString(tags["addr:street"])) addrParts.push(tags["addr:street"]);
  if (isString(tags["addr:postcode"])) addrParts.push(tags["addr:postcode"]);

  return {
    id,
    name,
    lat,
    lon,
    address: addrParts.length > 0 ? addrParts.join(", ") : null,
    phone: isString(tags["phone"]) ? tags["phone"] : (isString(tags["contact:phone"]) ? tags["contact:phone"] : null),
    website: isString(tags["website"]) ? tags["website"] : (isString(tags["contact:website"]) ? tags["contact:website"] : null),
    openingHoursRaw: isString(tags["opening_hours"]) ? tags["opening_hours"] : null,
    outdoorSeating: tags["outdoor_seating"] === "yes",
    beerGarden: tags["beer_garden"] === "yes",
  };
}

// ── Main fetch function ─────────────────────────────────────────────

/**
 * Fetch building, park, road, and pub data from the Overpass API for the given bounding box.
 * Returns all types in a single response from one API call.
 */
export async function fetchAreaData(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<AreaData> {
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

  // Separate features by type
  const shells: ParsedFeature[] = [];
  const parts: ParsedFeature[] = [];
  const parks: ParkFeature[] = [];
  const roads: RoadFeature[] = [];
  const pubs: OSMPubNode[] = [];

  for (const feature of geojson.features) {
    const geomType = feature.geometry.type;
    const properties = (feature.properties ?? {}) as Record<string, unknown>;
    const tags = getTags(properties);

    // Check for pub/bar Point nodes
    if (geomType === "Point") {
      const amenity = isString(tags["amenity"]) ? tags["amenity"] : null;
      if (amenity === "pub" || amenity === "bar") {
        const [lon, lat] = (feature.geometry as unknown as { coordinates: [number, number] }).coordinates;
        const pub = extractPubNode(properties, lat, lon);
        if (pub) pubs.push(pub);
      }
      continue;
    }

    // Check for roads (LineString only)
    if (geomType === "LineString") {
      const roadType = detectRoadType(tags);
      if (roadType) {
        roads.push({
          coordinates: (feature.geometry as unknown as { coordinates: [number, number][] }).coordinates,
          roadType,
        });
      }
      continue;
    }

    if (geomType !== "Polygon" && geomType !== "MultiPolygon") continue;

    const typed = feature as Feature<Polygon | MultiPolygon>;

    // Check if it's a park/green space
    const parkType = detectParkType(tags);
    if (parkType) {
      if (geomType === "Polygon") {
        parks.push({
          coordinates: (typed.geometry as Polygon).coordinates as [number, number][][],
          parkType,
        });
      } else {
        // MultiPolygon — each polygon as separate park
        for (const polygon of (typed.geometry as MultiPolygon).coordinates) {
          parks.push({
            coordinates: polygon as [number, number][][],
            parkType,
          });
        }
      }
      continue;
    }

    // Building or building:part
    const props = extractS3DProperties(properties);
    if (props.isBuildingPart) {
      parts.push({ feature: typed, props });
    } else {
      // Only include if it has a building tag (not just any polygon)
      const hasBuilding = isString(tags["building"]) || tags["building"] !== undefined;
      if (hasBuilding) {
        shells.push({ feature: typed, props });
      }
    }
  }

  // Building pass 2: Mark shells that have building:parts (suppress them)
  const suppressedShells = new Set<number>();

  for (const part of parts) {
    const partRing = getOuterRing(part.feature);
    if (!partRing || partRing.length < 3) continue;
    const c = centroid(partRing);

    for (let i = 0; i < shells.length; i++) {
      if (suppressedShells.has(i)) continue;
      const shellRing = getOuterRing(shells[i]!.feature);
      if (!shellRing || shellRing.length < 3) continue;
      if (pointInPolygon(c, shellRing)) {
        suppressedShells.add(i);
        break;
      }
    }
  }

  // Building pass 3: Emit results (filtering out buildings inside the Thames corridor)
  const buildings: BuildingFeature[] = [];

  for (let i = 0; i < shells.length; i++) {
    if (suppressedShells.has(i)) continue;
    const { feature, props } = shells[i]!;
    const results = featureToBuildingFeatures(feature, props);
    for (const b of results) {
      if (!isBuildingInThames(b.coordinates)) buildings.push(b);
    }
  }

  for (const { feature, props } of parts) {
    const results = featureToBuildingFeatures(feature, props);
    for (const b of results) {
      if (!isBuildingInThames(b.coordinates)) buildings.push(b);
    }
  }

  return { buildings, parks, roads, pubs };
}