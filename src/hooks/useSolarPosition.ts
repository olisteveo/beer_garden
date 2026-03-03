import { useMemo } from "react";
import { getSolarPosition } from "../utils/solar";
import type { SolarPosition } from "../types";

/**
 * Compute solar position for a given date and location. Memoized.
 */
export function useSolarPosition(date: Date, lat: number, lon: number): SolarPosition {
  const timestamp = date.getTime();
  return useMemo(
    () => getSolarPosition(new Date(timestamp), lat, lon),
    [timestamp, lat, lon],
  );
}
