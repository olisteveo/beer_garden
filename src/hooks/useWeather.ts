import { useState, useEffect, useRef } from "react";
import type { WeatherData } from "../types";
import { fetchWeather } from "../utils/weather";
import { cacheGet, cacheSet } from "../utils/cache";
import { WEATHER_CACHE_TTL } from "../utils/constants";

const CACHE_KEY = "beer-garden:weather";
const REFRESH_INTERVAL = WEATHER_CACHE_TTL;

interface WeatherState {
  weather: WeatherData | null;
  loading: boolean;
}

export function useWeather(enabled: boolean): WeatherState {
  const [state, setState] = useState<WeatherState>({
    weather: null,
    loading: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ weather: null, loading: false });
      return;
    }

    const controller = new AbortController();

    async function load() {
      // Try cache
      const cached = cacheGet<WeatherData>(CACHE_KEY, WEATHER_CACHE_TTL);
      if (cached) {
        setState({ weather: cached, loading: false });
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));
      const data = await fetchWeather(controller.signal);
      if (!controller.signal.aborted) {
        if (data) cacheSet(CACHE_KEY, data);
        setState({ weather: data, loading: false });
      }
    }

    void load();

    // Refresh on interval
    intervalRef.current = setInterval(() => {
      void load();
    }, REFRESH_INTERVAL);

    return () => {
      controller.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return state;
}
