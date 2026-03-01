import { useState, useEffect, useRef } from "react";
import type { BuildingFeature, BBox } from "../types";
import { fetchBuildings } from "../utils/overpass";
import { cacheGet, cacheSet } from "../utils/cache";
import { DEFAULT_BBOX, OSM_CACHE_TTL } from "../utils/constants";

const CACHE_KEY = "beer-garden:buildings";

interface BuildingState {
  buildings: BuildingFeature[];
  loading: boolean;
  error: string | null;
}

export function useOSMBuildings(bbox: BBox = DEFAULT_BBOX): BuildingState {
  const [state, setState] = useState<BuildingState>({
    buildings: [],
    loading: true,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Try cache first
    const cached = cacheGet<BuildingFeature[]>(CACHE_KEY, OSM_CACHE_TTL);
    if (cached) {
      setState({ buildings: cached, loading: false, error: null });
      return;
    }

    // Fetch from Overpass
    const controller = new AbortController();
    abortRef.current = controller;

    fetchBuildings(bbox, controller.signal)
      .then((buildings) => {
        if (!controller.signal.aborted) {
          cacheSet(CACHE_KEY, buildings);
          setState({ buildings, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Failed to load buildings";
        setState({ buildings: [], loading: false, error: message });
      });

    return () => {
      controller.abort();
    };
  }, [bbox.south, bbox.west, bbox.north, bbox.east]);

  return state;
}
