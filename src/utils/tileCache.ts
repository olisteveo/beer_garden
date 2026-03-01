import type { BuildingFeature, ParkFeature, RoadFeature, TileData } from "../types";
import { OSM_CACHE_TTL } from "./constants";

const DB_NAME = "beer-garden-tiles";
const DB_VERSION = 2; // bumped to clear old cache and add parks/roads
const STORE_NAME = "tiles";

interface TileCacheEntry {
  key: string;
  buildings: BuildingFeature[];
  parks: ParkFeature[];
  roads: RoadFeature[];
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open (or create) the IndexedDB database for tile caching.
 * Returns a singleton promise — safe to call multiple times.
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // Delete old store if it exists (schema changed)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: "key" });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Read a cached tile from IndexedDB. Returns null if missing or expired.
 */
export async function getCachedTile(
  key: string,
): Promise<TileData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as TileCacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        // Check TTL
        if (Date.now() - entry.timestamp > OSM_CACHE_TTL) {
          resolve(null);
          return;
        }
        resolve({
          buildings: entry.buildings,
          parks: entry.parks ?? [],
          roads: entry.roads ?? [],
        });
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Write a tile to IndexedDB cache with a timestamp.
 */
export async function setCachedTile(
  key: string,
  data: TileData,
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const entry: TileCacheEntry = {
        key,
        buildings: data.buildings,
        parks: data.parks,
        roads: data.roads,
        timestamp: Date.now(),
      };
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail — cache is optional
  }
}

/**
 * Remove expired tiles from IndexedDB (older than 48 hours).
 * Call periodically (e.g. on app start) to prevent unbounded growth.
 */
export async function clearExpiredTiles(): Promise<void> {
  const MAX_AGE = 48 * 60 * 60 * 1000; // 48 hours

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    const now = Date.now();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;

      const entry = cursor.value as TileCacheEntry;
      if (now - entry.timestamp > MAX_AGE) {
        cursor.delete();
      }
      cursor.continue();
    };
  } catch {
    // Silently fail
  }
}
