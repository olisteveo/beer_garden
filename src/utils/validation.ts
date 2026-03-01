/**
 * Runtime type guards for external API responses.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Validate an Overpass API response has the expected structure.
 */
export function isOverpassResponse(
  data: unknown,
): data is { elements: unknown[] } {
  return isRecord(data) && Array.isArray(data["elements"]);
}

/**
 * Validate an OpenWeatherMap API response.
 */
export function isWeatherResponse(
  data: unknown,
): data is {
  clouds: { all: number };
  weather: { main: string; id: number; icon: string }[];
  main: { temp: number; humidity: number };
  wind: { speed: number };
} {
  if (!isRecord(data)) return false;
  if (!isRecord(data["clouds"]) || !isNumber(data["clouds"]["all"]))
    return false;
  if (!Array.isArray(data["weather"]) || data["weather"].length === 0)
    return false;
  if (!isRecord(data["main"]) || !isNumber(data["main"]["temp"]))
    return false;
  return true;
}
