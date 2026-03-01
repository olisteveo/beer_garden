import type { WeatherData } from "../types";
import { isWeatherResponse, isNumber } from "./validation";
import { CENTER_LAT, CENTER_LON } from "./constants";

const OWM_BASE = "https://api.openweathermap.org/data/2.5/weather";

/**
 * Fetch current weather data from OpenWeatherMap.
 * Returns null if API key is missing or request fails.
 */
export async function fetchWeather(
  signal?: AbortSignal,
): Promise<WeatherData | null> {
  const apiKey = import.meta.env.VITE_OWM_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return null;
  }

  const url = `${OWM_BASE}?lat=${CENTER_LAT}&lon=${CENTER_LON}&units=metric&appid=${apiKey}`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    console.warn(`[Weather] API error: ${response.status}`);
    return null;
  }

  const raw: unknown = await response.json();

  if (!isWeatherResponse(raw)) {
    console.warn("[Weather] Invalid response format");
    return null;
  }

  const weather = raw.weather[0]!;
  const uvIndex = isNumber((raw as Record<string, unknown>)["uvi"])
    ? ((raw as Record<string, unknown>)["uvi"] as number)
    : estimateUVIndex();

  return {
    cloudCover: raw.clouds.all,
    condition: weather.main,
    conditionId: weather.id,
    temperature: Math.round(raw.main.temp),
    uvIndex: Math.round(uvIndex),
    humidity: isNumber(raw.main.humidity) ? raw.main.humidity : 0,
    windSpeed: isNumber(raw.wind?.speed) ? raw.wind.speed : 0,
    icon: weather.icon,
  };
}

/**
 * Rough UV estimate when the API doesn't provide it.
 * Based on typical London values.
 */
function estimateUVIndex(): number {
  const month = new Date().getMonth();
  // Very rough London UV by month: [Jan..Dec]
  const monthlyUV = [1, 1, 2, 3, 5, 6, 6, 5, 4, 2, 1, 1];
  return monthlyUV[month] ?? 3;
}
