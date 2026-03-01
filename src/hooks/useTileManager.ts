import { useRef, useCallback, useEffect, useState } from "react";
import type { BuildingFeature, ParkFeature, RoadFeature, TileData } from "../types";
import { fetchTileData } from "../utils/overpass";
import {
  buildMergedGeometry,
  type MergedBuildings,
} from "../utils/buildingGeometry";
import { buildMergedParkGeometry, type MergedParks } from "../utils/parkGeometry";
import { buildMergedRoadGeometry, type MergedRoads } from "../utils/roadGeometry";
import {
  getVisibleTileKeys,
  tileKeyToBBox,
  tileKeyToXZ,
  sortTileKeysByDistance,
  latLonToTileKey,
} from "../utils/tiles";
import { getCachedTile, setCachedTile, clearExpiredTiles } from "../utils/tileCache";
import { latLonToXZ } from "../utils/projection";
import {
  TILE_LOAD_RADIUS,
  TILE_UNLOAD_RADIUS,
  MAX_LOADED_TILES,
  MAX_CONCURRENT_FETCHES,
} from "../utils/constants";

// ── Types ──────────────────────────────────────────────────────────

export interface TileState {
  status: "loading" | "loaded" | "error";
  buildings: BuildingFeature[];
  parks: ParkFeature[];
  roads: RoadFeature[];
  geometry: MergedBuildings | null;
  parkGeometry: MergedParks | null;
  roadGeometry: MergedRoads | null;
  lastAccessed: number;
}

export interface TileManagerResult {
  tiles: Map<string, TileState>;
  loading: boolean;
  tileCount: number;
}

// ── Configuration ──────────────────────────────────────────────────

/** Minimum delay between starting successive individual Overpass fetches (ms). */
const FETCH_COOLDOWN_MS = 500;

/** Max retries for rate-limited (429) or timed-out (504) requests. */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms). */
const BACKOFF_BASE_MS = 2000;

/** Tiles stuck in "loading" longer than this get retried (ms). */
const STUCK_TILE_TIMEOUT = 15_000;

/** Global 429 cooldown period (ms). When ANY request gets 429, pause all fetching. */
const RATE_LIMIT_COOLDOWN_MS = 10_000;

/** Shared 429 cooldown timestamp — when we last got rate-limited. */
let rateLimitedUntil = 0;

/**
 * Global fetch lock — prevents StrictMode double-mount from
 * firing duplicate Overpass requests. Only one batch at a time.
 */
let globalFetchInProgress = false;

function isRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

function setRateLimited(): void {
  rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Geometry builders ─────────────────────────────────────────────

function buildAllGeometry(data: TileData): {
  geometry: MergedBuildings | null;
  parkGeometry: MergedParks | null;
  roadGeometry: MergedRoads | null;
} {
  return {
    geometry: data.buildings.length > 0 ? buildMergedGeometry(data.buildings) : null,
    parkGeometry: data.parks.length > 0 ? buildMergedParkGeometry(data.parks) : null,
    roadGeometry: data.roads.length > 0 ? buildMergedRoadGeometry(data.roads) : null,
  };
}

function disposeTileGeometry(tile: TileState): void {
  if (tile.geometry) {
    tile.geometry.mesh.dispose();
    tile.geometry.edges.dispose();
  }
  if (tile.parkGeometry) {
    tile.parkGeometry.mesh.dispose();
  }
  if (tile.roadGeometry) {
    tile.roadGeometry.mesh.dispose();
  }
}

function makeTileState(
  data: TileData,
  geom: ReturnType<typeof buildAllGeometry>,
): TileState {
  return {
    status: "loaded",
    buildings: data.buildings,
    parks: data.parks,
    roads: data.roads,
    ...geom,
    lastAccessed: Date.now(),
  };
}

function makeEmptyLoadingTile(): TileState {
  return {
    status: "loading",
    buildings: [],
    parks: [],
    roads: [],
    geometry: null,
    parkGeometry: null,
    roadGeometry: null,
    lastAccessed: Date.now(),
  };
}

function makeErrorTile(): TileState {
  return {
    status: "error",
    buildings: [],
    parks: [],
    roads: [],
    geometry: null,
    parkGeometry: null,
    roadGeometry: null,
    lastAccessed: Date.now(),
  };
}

// ── Network helpers ────────────────────────────────────────────────

/**
 * Fetch tile data with retry + exponential backoff.
 */
async function fetchWithRetry(
  key: string,
  signal: AbortSignal,
): Promise<TileData> {
  const bbox = tileKeyToBBox(key);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    // Wait for global rate limit cooldown
    if (isRateLimited()) {
      const waitMs = rateLimitedUntil - Date.now();
      if (waitMs > 0) await delay(waitMs);
    }

    try {
      return await fetchTileData(bbox, signal);
    } catch (err: unknown) {
      if (signal.aborted) throw err;

      const message = err instanceof Error ? err.message : "";
      const is429 = message.includes("429");
      const isRetryable = is429 || message.includes("504");

      if (is429) setRateLimited();

      if (isRetryable && attempt < MAX_RETRIES) {
        await delay(BACKOFF_BASE_MS * Math.pow(2, attempt));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Max retries exceeded");
}

/**
 * Fetch tile data for multiple tiles in a single Overpass query.
 * Computes the union bbox, fetches once, then distributes results
 * to tile buckets based on each feature's centroid.
 */
async function batchFetchTileData(
  keys: string[],
  signal: AbortSignal,
): Promise<Map<string, TileData>> {
  // Union bbox of all tile keys
  let south = Infinity,
    west = Infinity,
    north = -Infinity,
    east = -Infinity;

  for (const key of keys) {
    const bbox = tileKeyToBBox(key);
    south = Math.min(south, bbox.south);
    west = Math.min(west, bbox.west);
    north = Math.max(north, bbox.north);
    east = Math.max(east, bbox.east);
  }

  // Single Overpass query with retry
  let tileData: TileData | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    // Wait for global rate limit cooldown
    if (isRateLimited()) {
      const waitMs = rateLimitedUntil - Date.now();
      if (waitMs > 0) await delay(waitMs);
    }

    try {
      tileData = await fetchTileData({ south, west, north, east }, signal);
      break;
    } catch (err: unknown) {
      if (signal.aborted) throw err;
      const message = err instanceof Error ? err.message : "";
      const is429 = message.includes("429");
      const isRetryable = is429 || message.includes("504");
      if (is429) setRateLimited();
      if (isRetryable && attempt < MAX_RETRIES) {
        await delay(BACKOFF_BASE_MS * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }

  if (!tileData) throw new Error("Batch fetch failed after retries");

  // Initialise empty buckets for every requested key
  const keySet = new Set(keys);
  const buckets = new Map<string, TileData>();
  for (const key of keys) {
    buckets.set(key, { buildings: [], parks: [], roads: [] });
  }

  // Distribute buildings based on centroid of their outer ring
  for (const building of tileData.buildings) {
    const ring = building.coordinates[0];
    if (!ring || ring.length === 0) continue;
    const [lon, lat] = ring[0]!;
    const key = latLonToTileKey(lat, lon);
    if (keySet.has(key)) {
      buckets.get(key)!.buildings.push(building);
    }
  }

  // Distribute parks based on centroid of their outer ring
  for (const park of tileData.parks) {
    const ring = park.coordinates[0];
    if (!ring || ring.length === 0) continue;
    let cx = 0, cy = 0;
    for (const [lon, lat] of ring) {
      cx += lon;
      cy += lat;
    }
    cx /= ring.length;
    cy /= ring.length;
    const key = latLonToTileKey(cy, cx);
    if (keySet.has(key)) {
      buckets.get(key)!.parks.push(park);
    }
  }

  // Distribute roads based on midpoint of their coordinates
  for (const road of tileData.roads) {
    if (road.coordinates.length === 0) continue;
    const mid = road.coordinates[Math.floor(road.coordinates.length / 2)]!;
    const key = latLonToTileKey(mid[1], mid[0]);
    if (keySet.has(key)) {
      buckets.get(key)!.roads.push(road);
    }
  }

  return buckets;
}

// ── Hook ───────────────────────────────────────────────────────────

/**
 * Central tile lifecycle orchestrator.
 *
 * Loading strategy:
 * 1. For new tiles, check IndexedDB cache first (parallel, instant).
 * 2. For cache misses:
 *    - If >= BATCH_THRESHOLD -> single Overpass query for union bbox.
 *    - Otherwise -> individual per-tile fetches with rate limiting.
 * 3. Geometry is built per-tile, yielding between builds to avoid jank.
 * 4. Distant tiles are disposed when camera moves away.
 */
export function useTileManager(
  cameraLat: number,
  cameraLon: number,
): TileManagerResult {
  const tilesRef = useRef<Map<string, TileState>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(
    new Map(),
  );
  const activeFetchCount = useRef(0);
  const fetchQueueRef = useRef<string[]>([]);
  const lastFetchStartRef = useRef(0);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchControllersRef = useRef<Set<AbortController>>(new Set());
  const generationRef = useRef(0);
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Clean up expired IndexedDB entries on mount
  useEffect(() => {
    clearExpiredTiles();
  }, []);

  // ── Individual tile fetch queue ───────────────────────────────

  const processQueue = useCallback(() => {
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
      queueTimerRef.current = null;
    }

    if (
      activeFetchCount.current >= MAX_CONCURRENT_FETCHES ||
      fetchQueueRef.current.length === 0
    ) {
      return;
    }

    // Respect global rate limit cooldown
    if (isRateLimited()) {
      const waitMs = rateLimitedUntil - Date.now();
      queueTimerRef.current = setTimeout(() => processQueue(), waitMs + 100);
      return;
    }

    // Enforce cooldown between fetch starts
    const now = Date.now();
    const elapsed = now - lastFetchStartRef.current;
    if (elapsed < FETCH_COOLDOWN_MS) {
      queueTimerRef.current = setTimeout(
        () => processQueue(),
        FETCH_COOLDOWN_MS - elapsed,
      );
      return;
    }

    const key = fetchQueueRef.current.shift()!;
    const tiles = tilesRef.current;

    // Skip if tile was already loaded or removed
    const existing = tiles.get(key);
    if (existing && existing.status !== "loading") {
      processQueue();
      return;
    }
    if (!tiles.has(key)) {
      processQueue();
      return;
    }

    activeFetchCount.current++;
    lastFetchStartRef.current = Date.now();
    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);

    (async () => {
      try {
        const data = await fetchWithRetry(key, controller.signal);
        if (controller.signal.aborted) return;

        await setCachedTile(key, data);

        const geom = buildAllGeometry(data);
        tiles.set(key, makeTileState(data, geom));
        bump();
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.warn(
          `Tile ${key}: ${err instanceof Error ? err.message : "fetch failed"}`,
        );
        tiles.set(key, makeErrorTile());
        bump();
      } finally {
        activeFetchCount.current--;
        abortControllersRef.current.delete(key);
        processQueue();
      }
    })();

    // Schedule next if capacity remains
    if (
      activeFetchCount.current < MAX_CONCURRENT_FETCHES &&
      fetchQueueRef.current.length > 0
    ) {
      queueTimerRef.current = setTimeout(
        () => processQueue(),
        FETCH_COOLDOWN_MS,
      );
    }
  }, [bump]);

  // ── Load new tiles (cache-first, then batch or individual) ────

  const loadNewTiles = useCallback(
    (sortedKeys: string[], generation: number) => {
      const tiles = tilesRef.current;

      // Fire-and-forget async loading
      (async () => {
        const isStale = () => generationRef.current !== generation;

        // Phase 1: Check IndexedDB cache for all tiles in parallel
        const cacheResults = await Promise.all(
          sortedKeys.map(async (key) => ({
            key,
            data: await getCachedTile(key),
          })),
        );

        if (isStale()) return;

        let anyHit = false;
        const cacheMisses: string[] = [];

        for (const { key, data } of cacheResults) {
          if (!tiles.has(key)) continue;

          if (data) {
            // Cache HIT — build geometry immediately
            const geom = buildAllGeometry(data);
            tiles.set(key, makeTileState(data, geom));
            anyHit = true;
          } else {
            cacheMisses.push(key);
          }
        }

        // Render cache hits immediately
        if (anyHit && !isStale()) bump();

        if (cacheMisses.length === 0) return;
        if (isStale()) return;

        // Prevent StrictMode double-mount from firing duplicate Overpass requests
        if (globalFetchInProgress) return;
        globalFetchInProgress = true;

        // Phase 2: Fetch all cache misses in a single batch Overpass query
        const controller = new AbortController();
        batchControllersRef.current.add(controller);

        try {
          const buckets = await batchFetchTileData(
            cacheMisses,
            controller.signal,
          );
          if (controller.signal.aborted || isStale()) return;

          // Build geometry per-tile
          for (const key of cacheMisses) {
            if (controller.signal.aborted || isStale()) return;
            if (!tiles.has(key)) continue;

            const tileData = buckets.get(key) ?? { buildings: [], parks: [], roads: [] };
            setCachedTile(key, tileData);

            const geom = buildAllGeometry(tileData);
            tiles.set(key, makeTileState(tileData, geom));
          }
          if (!isStale()) bump();
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "unknown";
          const is429 = message.includes("429");

          if (is429) {
            console.warn(`Batch fetch rate-limited, will retry after cooldown`);
            if (!isStale()) {
              const waitMs = Math.max(rateLimitedUntil - Date.now(), RATE_LIMIT_COOLDOWN_MS);
              await delay(waitMs);
              if (!isStale()) {
                const retryController = new AbortController();
                batchControllersRef.current.add(retryController);
                try {
                  const buckets = await batchFetchTileData(cacheMisses, retryController.signal);
                  if (retryController.signal.aborted || isStale()) return;
                  for (const key of cacheMisses) {
                    if (retryController.signal.aborted || isStale()) return;
                    if (!tiles.has(key)) continue;
                    const tileData = buckets.get(key) ?? { buildings: [], parks: [], roads: [] };
                    setCachedTile(key, tileData);
                    const geom = buildAllGeometry(tileData);
                    tiles.set(key, makeTileState(tileData, geom));
                  }
                  if (!isStale()) bump();
                } catch {
                  // Give up after second attempt
                } finally {
                  batchControllersRef.current.delete(retryController);
                }
              }
            }
          } else {
            console.warn(`Batch fetch failed: ${message}`);
          }
        } finally {
          batchControllersRef.current.delete(controller);
          globalFetchInProgress = false;
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bump],
  );

  // ── Main effect: react to camera position changes ─────────────

  useEffect(() => {
    const gen = generationRef.current;

    const tiles = tilesRef.current;
    const [cameraX, cameraZ] = latLonToXZ(cameraLat, cameraLon);

    // 1. Compute visible tile keys
    const visibleKeys = new Set(
      getVisibleTileKeys(cameraLat, cameraLon, TILE_LOAD_RADIUS),
    );

    // 2. Find new tiles not yet in state
    const newKeys: string[] = [];
    for (const key of visibleKeys) {
      if (!tiles.has(key)) {
        tiles.set(key, makeEmptyLoadingTile());
        newKeys.push(key);
      } else {
        tiles.get(key)!.lastAccessed = Date.now();
      }
    }

    // 3. Retry stuck or errored tiles that are still visible
    const now = Date.now();
    const retryKeys: string[] = [];
    for (const [key, tile] of tiles) {
      if (!visibleKeys.has(key)) continue;
      const shouldRetry =
        (tile.status === "loading" && now - tile.lastAccessed > STUCK_TILE_TIMEOUT) ||
        (tile.status === "error" && now - tile.lastAccessed > STUCK_TILE_TIMEOUT);
      if (shouldRetry) {
        const controller = abortControllersRef.current.get(key);
        if (controller) {
          controller.abort();
          abortControllersRef.current.delete(key);
        }
        tiles.delete(key);
        retryKeys.push(key);
      }
    }

    // 4. Load new tiles (cache -> batch/individual fetch)
    for (const key of retryKeys) {
      if (!tiles.has(key)) {
        tiles.set(key, makeEmptyLoadingTile());
        newKeys.push(key);
      }
    }

    if (newKeys.length > 0) {
      const sorted = sortTileKeysByDistance(newKeys, cameraX, cameraZ);
      loadNewTiles(sorted, gen);
    }

    // 5. Unload distant tiles
    for (const [key, tile] of tiles) {
      if (visibleKeys.has(key)) continue;

      const [tx, tz] = tileKeyToXZ(key);
      const dx = tx - cameraX;
      const dz = tz - cameraZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > TILE_UNLOAD_RADIUS) {
        const controller = abortControllersRef.current.get(key);
        if (controller) {
          controller.abort();
          abortControllersRef.current.delete(key);
        }
        disposeTileGeometry(tile);
        tiles.delete(key);
      }
    }

    // 6. Evict if over MAX_LOADED_TILES (furthest first)
    if (tiles.size > MAX_LOADED_TILES) {
      const entries = Array.from(tiles.entries())
        .filter(([, t]) => t.status === "loaded")
        .map(([key, tile]) => {
          const [tx, tz] = tileKeyToXZ(key);
          const dist2 = (tx - cameraX) ** 2 + (tz - cameraZ) ** 2;
          return { key, tile, dist2 };
        })
        .sort((a, b) => b.dist2 - a.dist2);

      let excess = tiles.size - MAX_LOADED_TILES;
      for (const { key, tile } of entries) {
        if (excess <= 0) break;
        disposeTileGeometry(tile);
        tiles.delete(key);
        excess--;
      }
    }

    bump();
  }, [cameraLat, cameraLon, loadNewTiles, bump]);

  // Cleanup on unmount (or StrictMode double-mount).
  // Don't abort batch controllers — let them finish and cache results
  // so the StrictMode remount finds data in IndexedDB instantly.
  useEffect(() => {
    return () => {
      generationRef.current++;

      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
      // Only abort individual tile fetches, NOT batch controllers
      for (const controller of abortControllersRef.current.values()) {
        controller.abort();
      }
      for (const tile of tilesRef.current.values()) {
        disposeTileGeometry(tile);
      }
      tilesRef.current.clear();
    };
  }, []);

  // Compute loading state
  const tiles = tilesRef.current;
  let loading = false;
  for (const tile of tiles.values()) {
    if (tile.status === "loading") {
      loading = true;
      break;
    }
  }

  void version;

  return {
    tiles,
    loading,
    tileCount: tiles.size,
  };
}
