import { useMemo } from "react";
import { getSolarPosition } from "../utils/solar";
import type { SolarPosition } from "../types";

/**
 * Compute solar position for a given date. Memoized by date value.
 */
export function useSolarPosition(date: Date): SolarPosition {
  const timestamp = date.getTime();
  return useMemo(() => getSolarPosition(new Date(timestamp)), [timestamp]);
}
