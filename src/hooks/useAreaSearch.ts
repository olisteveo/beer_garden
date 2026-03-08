import { useState, useCallback, useRef } from "react";
import type { SearchState, AreaData, SearchPub } from "../types";
import { apiSearch, apiSearchByLocation } from "../utils/api";
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
  radius: number;
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

function buildGeometry(areaData: AreaData): AreaGeometry {
  return {
    buildings: buildMergedGeometry(areaData.buildings),
    parks: buildMergedParkGeometry(areaData.parks),
    roads: buildMergedRoadGeometry(areaData.roads),
  };
}

export function useAreaSearch(): AreaSearchResult {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [geometry, setGeometry] = useState<AreaGeometry | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevGeomRef = useRef<AreaGeometry | null>(null);

  const applyResult = useCallback(
    (
      center: { lat: number; lon: number },
      displayName: string,
      areaData: AreaData,
      radius: number,
    ) => {
      setProjectionCenter(center.lat, center.lon);

      const newGeom = buildGeometry(areaData);

      if (prevGeomRef.current) {
        disposeAreaGeometry(prevGeomRef.current);
      }
      prevGeomRef.current = newGeom;
      setGeometry(newGeom);

      const pubs: SearchPub[] = toSearchPubs(areaData.pubs, new Date());

      setState({
        status: "loaded",
        displayName,
        center,
        pubs,
        radius,
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
        setState({ status: "loading", displayName: query });

        const result = await apiSearch(query, SEARCH_RADIUS_M, controller.signal);
        if (controller.signal.aborted) return;

        applyResult(result.center, result.displayName, result.area, result.radius);
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Search failed",
        });
      }
    },
    [applyResult],
  );

  const searchByLocation = useCallback(
    async (lat: number, lon: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setState({ status: "loading", displayName: "Your location" });

        const result = await apiSearchByLocation(lat, lon, SEARCH_RADIUS_M, controller.signal);
        if (controller.signal.aborted) return;

        applyResult(result.center, "Your location", result.area, result.radius);
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load area",
        });
      }
    },
    [applyResult],
  );

  const radius = state.status === "loaded" ? state.radius : SEARCH_RADIUS_M;

  return {
    state,
    geometry,
    radius,
    search: (q: string) => void search(q),
    searchByLocation: (lat: number, lon: number) => void searchByLocation(lat, lon),
  };
}
