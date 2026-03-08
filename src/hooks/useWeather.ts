import { useState, useEffect, useRef } from "react";
import type { WeatherData } from "../types";
import { apiWeather } from "../utils/api";
import { cacheGet, cacheSet } from "../utils/cache";
import { WEATHER_CACHE_TTL } from "../utils/constants";

const REFRESH_INTERVAL = WEATHER_CACHE_TTL;

interface WeatherState {
  weather: WeatherData | null;
  loading: boolean;
}

export function useWeather(
  enabled: boolean,
  lat: number,
  lon: number,
): WeatherState {
  const [state, setState] = useState<WeatherState>({
    weather: null,
    loading: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cache key includes rounded coordinates so weather updates on search
  const cacheKey = `pub-garden:weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;

  useEffect(() => {
    if (!enabled) {
      setState({ weather: null, loading: false });
      return;
    }

    const controller = new AbortController();

    async function load() {
      const cached = cacheGet<WeatherData>(cacheKey, WEATHER_CACHE_TTL);
      if (cached) {
        setState({ weather: cached, loading: false });
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));
      const data = await apiWeather(lat, lon, controller.signal);
      if (!controller.signal.aborted) {
        if (data) cacheSet(cacheKey, data);
        setState({ weather: data, loading: false });
      }
    }

    void load();

    intervalRef.current = setInterval(() => {
      void load();
    }, REFRESH_INTERVAL);

    return () => {
      controller.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, lat, lon, cacheKey]);

  return state;
}
