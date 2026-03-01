import SunCalc from "suncalc";
import { CENTER_LAT, CENTER_LON } from "./constants";
import type { SolarPosition, SunPhase } from "../types";

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Determine the sun phase from altitude in degrees.
 */
function getPhase(altitudeDeg: number): SunPhase {
  if (altitudeDeg < -6) return "night";
  if (altitudeDeg < 0) {
    // Dawn or dusk — caller differentiates by time if needed
    return "dawn";
  }
  if (altitudeDeg < 10) return "golden";
  return "day";
}

/**
 * Convert suncalc's azimuth (south=0, west=positive) to geographic (north=0, east=90).
 */
function toGeographicAzimuth(azimuthRad: number): number {
  return ((azimuthRad * RAD_TO_DEG + 180) % 360 + 360) % 360;
}

/**
 * Get solar position for a given date at London center.
 */
export function getSolarPosition(date: Date): SolarPosition {
  const pos = SunCalc.getPosition(date, CENTER_LAT, CENTER_LON);
  const altitudeDeg = pos.altitude * RAD_TO_DEG;
  const azimuthDeg = toGeographicAzimuth(pos.azimuth);

  // Distinguish dawn from dusk: before solar noon = dawn, after = dusk
  let phase = getPhase(altitudeDeg);
  if (phase === "dawn") {
    const hour = date.getHours() + date.getMinutes() / 60;
    phase = hour > 12 ? "dusk" : "dawn";
  }

  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth,
    altitudeDeg,
    azimuthDeg,
    phase,
  };
}
