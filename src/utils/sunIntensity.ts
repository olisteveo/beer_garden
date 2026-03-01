import type { SolarPosition, WeatherData, SunIntensity } from "../types";

/**
 * Compute real sun intensity (0-100) by combining solar position with weather data.
 *
 * Formula:
 * 1. Base = sin(altitude) — maximum at zenith, zero at horizon
 * 2. Cloud factor = 1 - (cloudCover / 100 * 0.8) — clouds block up to 80%
 * 3. Weather override — rain/storm caps intensity
 */
export function computeSunIntensity(
  solar: SolarPosition,
  weather: WeatherData | null,
): SunIntensity {
  // Below horizon = no sun
  if (solar.altitude <= 0) {
    return { score: 0, label: "No sun" };
  }

  // Base intensity from solar altitude (0-100)
  const baseIntensity = Math.sin(solar.altitude) * 100;

  // If no weather data, return theoretical
  if (!weather) {
    return {
      score: Math.round(baseIntensity),
      label: getLabel(baseIntensity),
    };
  }

  // Cloud factor: clouds reduce intensity by up to 80%
  const cloudFactor = 1 - (weather.cloudCover / 100) * 0.8;

  let intensity = baseIntensity * cloudFactor;

  // Weather condition overrides
  const condId = weather.conditionId;
  if (isRainy(condId)) {
    intensity = Math.min(intensity, 10);
  } else if (isFoggy(condId)) {
    intensity = Math.min(intensity, 20);
  }

  const score = Math.round(Math.max(0, Math.min(100, intensity)));

  return {
    score,
    label: getLabelWithWeather(score, weather.condition),
  };
}

function isRainy(conditionId: number): boolean {
  // OWM condition IDs: 2xx=Thunderstorm, 3xx=Drizzle, 5xx=Rain
  return conditionId >= 200 && conditionId < 600;
}

function isFoggy(conditionId: number): boolean {
  // OWM 7xx = Atmosphere (fog, mist, haze)
  return conditionId >= 700 && conditionId < 800;
}

function getLabel(score: number): string {
  if (score >= 80) return "Full sun";
  if (score >= 50) return "Sunny";
  if (score >= 20) return "Weak sun";
  return "Low sun";
}

function getLabelWithWeather(score: number, condition: string): string {
  if (condition === "Rain" || condition === "Drizzle") return "Rainy";
  if (condition === "Thunderstorm") return "Stormy";
  if (condition === "Snow") return "Snowy";
  if (condition === "Mist" || condition === "Fog") return "Foggy";
  if (score >= 80) return "Full sun";
  if (score >= 50) return "Partly cloudy";
  if (score >= 20) return "Mostly cloudy";
  return "Overcast";
}
