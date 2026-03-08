import { useState, useEffect, useMemo } from "react";
import type { ForecastData, ForecastEntry, WeatherData } from "../types";
import { apiForecast, apiWeather } from "../utils/api";
import { cacheGet, cacheSet } from "../utils/cache";

const FORECAST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const WEATHER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (for fallback)

interface ForecastState {
  /** Full forecast data (null while loading or if unavailable) */
  forecast: ForecastData | null;
  /** Weather snapshot interpolated for the selected time */
  timeWeather: TimeWeather | null;
  loading: boolean;
}

/** Weather data for the selected time point */
export interface TimeWeather {
  temperature: number;
  feelsLike: number;
  cloudCover: number;
  condition: string;
  conditionId: number;
  humidity: number;
  windSpeed: number;
  pop: number; // 0-100 percentage
  rainVolume: number;
  icon: string;
  /** true if this is live current data, false if forecast/interpolated */
  isLive: boolean;
}

/**
 * Fetch forecast data for a location and select the closest entry to `currentDate`.
 *
 * - When `currentDate` is close to now (within 5 min), returns current weather.
 * - When scrubbing the time slider, returns the interpolated forecast entry.
 * - Falls back to current weather API if forecast is unavailable.
 */
export function useForecast(
  lat: number,
  lon: number,
  currentDate: Date,
): ForecastState {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);

  const forecastCacheKey = `pub-garden:forecast:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const weatherCacheKey = `pub-garden:weather-fb:${lat.toFixed(2)}:${lon.toFixed(2)}`;

  // Fetch forecast data (with fallback to current weather)
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      // Try forecast cache first
      const cached = cacheGet<ForecastData>(forecastCacheKey, FORECAST_CACHE_TTL);
      if (cached) {
        setForecast(cached);
        return;
      }

      setLoading(true);

      // Try forecast API
      let data: ForecastData | null = null;
      try {
        data = await apiForecast(lat, lon, controller.signal);
      } catch {
        // Forecast failed — will try fallback below
      }

      if (controller.signal.aborted) return;

      // If forecast worked, cache and use it
      if (data) {
        cacheSet(forecastCacheKey, data);
        setForecast(data);
        setLoading(false);
        return;
      }

      // Fallback: fetch current weather and wrap it as ForecastData
      try {
        const cachedWeather = cacheGet<WeatherData>(weatherCacheKey, WEATHER_CACHE_TTL);
        const weather = cachedWeather ?? await apiWeather(lat, lon, controller.signal);

        if (controller.signal.aborted) return;

        if (weather) {
          if (!cachedWeather) cacheSet(weatherCacheKey, weather);
          // Wrap current weather as a ForecastData with no forecast entries
          const fallback: ForecastData = {
            entries: [],
            current: weather,
          };
          setForecast(fallback);
        }
      } catch {
        // Both APIs failed — forecast stays null
      }

      if (!controller.signal.aborted) setLoading(false);
    }

    void load();

    return () => controller.abort();
  }, [lat, lon, forecastCacheKey, weatherCacheKey]);

  // Select the appropriate weather for the current time
  const timeWeather = useMemo<TimeWeather | null>(() => {
    if (!forecast) return null;

    const now = new Date();
    const isLive = Math.abs(currentDate.getTime() - now.getTime()) < 5 * 60 * 1000;

    // If viewing current time, use live current weather
    if (isLive) {
      return {
        temperature: forecast.current.temperature,
        feelsLike: forecast.current.feelsLike,
        cloudCover: forecast.current.cloudCover,
        condition: forecast.current.condition,
        conditionId: forecast.current.conditionId,
        humidity: forecast.current.humidity,
        windSpeed: forecast.current.windSpeed,
        pop: derivePopFromCondition(forecast.current.conditionId),
        rainVolume: forecast.current.rainVolume,
        icon: forecast.current.icon,
        isLive: true,
      };
    }

    // Find the two closest forecast entries and interpolate
    const targetTs = Math.floor(currentDate.getTime() / 1000);
    const entries = forecast.entries;

    if (entries.length === 0) return null;

    const first = entries[0]!;
    const last = entries[entries.length - 1]!;

    // If before first or after last entry, clamp
    if (targetTs <= first.dt) {
      return entryToTimeWeather(first, false);
    }
    if (targetTs >= last.dt) {
      return entryToTimeWeather(last, false);
    }

    // Find bracketing entries
    for (let i = 0; i < entries.length - 1; i++) {
      const a = entries[i]!;
      const b = entries[i + 1]!;
      if (targetTs >= a.dt && targetTs <= b.dt) {
        return interpolateEntries(a, b, targetTs);
      }
    }

    // Fallback — closest entry
    return entryToTimeWeather(closestEntry(entries, targetTs), false);
  }, [forecast, currentDate]);

  return { forecast, timeWeather, loading };
}

// ── Helpers ──────────────────────────────────────────────────

function entryToTimeWeather(e: ForecastEntry, isLive: boolean): TimeWeather {
  return {
    temperature: e.temperature,
    feelsLike: e.feelsLike,
    cloudCover: e.cloudCover,
    condition: e.condition,
    conditionId: e.conditionId,
    humidity: e.humidity,
    windSpeed: e.windSpeed,
    pop: Math.round(e.pop * 100),
    rainVolume: e.rainVolume,
    icon: e.icon,
    isLive,
  };
}

function interpolateEntries(
  a: ForecastEntry,
  b: ForecastEntry,
  targetTs: number,
): TimeWeather {
  const span = b.dt - a.dt;
  const t = span > 0 ? (targetTs - a.dt) / span : 0;

  // For numeric values, linear interpolation
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);

  // For condition: use whichever entry is closer
  const closer = t < 0.5 ? a : b;

  return {
    temperature: lerp(a.temperature, b.temperature),
    feelsLike: lerp(a.feelsLike, b.feelsLike),
    cloudCover: lerp(a.cloudCover, b.cloudCover),
    condition: closer.condition,
    conditionId: closer.conditionId,
    humidity: lerp(a.humidity, b.humidity),
    windSpeed: Math.round((a.windSpeed + (b.windSpeed - a.windSpeed) * t) * 10) / 10,
    pop: Math.round((a.pop + (b.pop - a.pop) * t) * 100),
    rainVolume: Math.round((a.rainVolume + (b.rainVolume - a.rainVolume) * t) * 10) / 10,
    icon: closer.icon,
    isLive: false,
  };
}

function closestEntry(entries: ForecastEntry[], targetTs: number): ForecastEntry {
  let best = entries[0]!;
  let bestDist = Math.abs(best.dt - targetTs);
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i]!;
    const dist = Math.abs(entry.dt - targetTs);
    if (dist < bestDist) {
      best = entry;
      bestDist = dist;
    }
  }
  return best;
}

/** Derive a rough rain probability from OWM condition ID when we only have current data */
function derivePopFromCondition(conditionId: number): number {
  if (conditionId >= 200 && conditionId < 300) return 90; // Thunderstorm
  if (conditionId >= 300 && conditionId < 400) return 70; // Drizzle
  if (conditionId >= 500 && conditionId < 600) return 85; // Rain
  if (conditionId >= 600 && conditionId < 700) return 80; // Snow
  if (conditionId >= 700 && conditionId < 800) return 20; // Atmosphere (fog, mist)
  if (conditionId === 800) return 0; // Clear
  if (conditionId > 800) return 15; // Clouds
  return 0;
}
