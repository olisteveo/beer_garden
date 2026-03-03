import type { BBox, GeocodeResult } from "../types";
import { NOMINATIM_URL, EARTH_RADIUS } from "./constants";

const DEG_TO_RAD = Math.PI / 180;

/**
 * Geocode a search query (postcode, address, place name) to lat/lon.
 * Uses Nominatim (free, no API key). Restricted to GB.
 */
export async function geocodeSearch(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "gb",
    limit: "1",
    addressdetails: "0",
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No results found for that search");
  }

  const result = data[0] as { lat: string; lon: string; display_name: string };
  return {
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
    displayName: result.display_name,
  };
}

/**
 * Compute a bounding box from a center point and radius in metres.
 */
export function bboxFromCenter(
  lat: number,
  lon: number,
  radiusM: number,
): BBox {
  const latSpan = radiusM / (EARTH_RADIUS * DEG_TO_RAD);
  const cosLat = Math.cos(lat * DEG_TO_RAD);
  const lonSpan = radiusM / (EARTH_RADIUS * DEG_TO_RAD * cosLat);

  return {
    south: lat - latSpan,
    west: lon - lonSpan,
    north: lat + latSpan,
    east: lon + lonSpan,
  };
}
