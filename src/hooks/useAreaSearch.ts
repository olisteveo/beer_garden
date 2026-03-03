import { useState, useCallback, useRef } from "react";
import type { SearchState, AreaData, SearchPub } from "../types";
import { geocodeSearch, bboxFromCenter } from "../utils/geocode";
import { fetchAreaData } from "../utils/overpass";
import { areaCacheKey, getCachedArea, setCachedArea } from "../utils/areaCache";
import { toSearchPubs } from "../utils/osmPubs";
import { setProjectionCenter } from "../utils/projection";
import { buildMergedGeometry, type MergedBuildings } from "../utils/buildingGeometry";
import { buildMergedParkGeometry, type MergedParks } from "../utils/parkGeometry";
import { buildMergedRoadGeometry, type MergedRoads } from "../utils/roadGeometry";
import { SEARCH_RADIUS_M } from "../utils/constants";

export interface AreaGeometry {
  buildings: MergedBuildings | null;
  parks: MergedParks | null;
  roads: MergedRoads | null;
}

export interface AreaSearchResult {
  state: SearchState;
  geometry: AreaGeometry | null;
  search: (query: string) => void;
  searchByLocation: (lat: number, lon: number) => void;
}

function disposeAreaGeometry(geom: AreaGeometry): void {
  if (geom.buildings) {
    geom.buildings.mesh.dispose();
    geom.buildings.edges.dispose();
  }
  if (geom.parks) geom.parks.mesh.dispose();
  if (geom.roads) geom.roads.mesh.dispose();
}

export function useAreaSearch(): AreaSearchResult {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [geometry, setGeometry] = useState<AreaGeometry | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevGeomRef = useRef<AreaGeometry | null>(null);

  const loadArea = useCallback(
    async (lat: number, lon: number, displayName: string) => {
      setState({ status: "loading", displayName });

      const bbox = bboxFromCenter(lat, lon, SEARCH_RADIUS_M);
      const cacheKey = areaCacheKey(lat, lon);

      let areaData: AreaData;
      const cached = await getCachedArea(cacheKey);
      if (cached) {
        areaData = cached;
      } else {
        areaData = await fetchAreaData(bbox, abortRef.current?.signal);
        void setCachedArea(cacheKey, areaData);
      }

      // Re-center projection before building geometry
      setProjectionCenter(lat, lon);

      // Build merged geometries
      const buildings = buildMergedGeometry(areaData.buildings);
      const parks = buildMergedParkGeometry(areaData.parks);
      const roads = buildMergedRoadGeometry(areaData.roads);

      // Dispose previous geometry
      if (prevGeomRef.current) {
        disposeAreaGeometry(prevGeomRef.current);
      }

      const newGeom: AreaGeometry = { buildings, parks, roads };
      prevGeomRef.current = newGeom;
      setGeometry(newGeom);

      // Convert pub nodes to SearchPub
      const pubs: SearchPub[] = toSearchPubs(areaData.pubs, new Date());

      setState({
        status: "loaded",
        displayName,
        center: { lat, lon },
        pubs,
      });
    },
    [],
  );

  const search = useCallback(
    async (query: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setState({ status: "geocoding" });
        const result = await geocodeSearch(query, controller.signal);
        if (controller.signal.aborted) return;
        await loadArea(result.lat, result.lon, result.displayName);
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Search failed",
        });
      }
    },
    [loadArea],
  );

  const searchByLocation = useCallback(
    async (lat: number, lon: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await loadArea(lat, lon, "Your location");
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load area",
        });
      }
    },
    [loadArea],
  );

  return {
    state,
    geometry,
    search: (q: string) => void search(q),
    searchByLocation: (lat: number, lon: number) => void searchByLocation(lat, lon),
  };
}
