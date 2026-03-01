import { useMemo } from "react";
import type { SolarPosition } from "../types";

interface TimeOfDay {
  isNight: boolean;
  isDawn: boolean;
  isDusk: boolean;
  isDay: boolean;
  isGolden: boolean;
}

export function useTimeOfDay(solar: SolarPosition): TimeOfDay {
  return useMemo(
    () => ({
      isNight: solar.phase === "night",
      isDawn: solar.phase === "dawn",
      isDusk: solar.phase === "dusk",
      isDay: solar.phase === "day",
      isGolden: solar.phase === "golden",
    }),
    [solar.phase],
  );
}
