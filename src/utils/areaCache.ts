import type { AreaData } from "../types";
import { AREA_CACHE_TTL } from "./constants";

const DB_NAME = "beer-garden-areas";
const DB_VERSION = 1;
const STORE_NAME = "areas";

interface AreaCacheEntry {
  key: string;
  data: AreaData;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/** Generate a cache key from lat/lon (rounded to ~100m grid). */
export function areaCacheKey(lat: number, lon: number): string {
  return `area:${lat.toFixed(3)}:${lon.toFixed(3)}`;
}

/** Read cached area data. Returns null if missing or expired. */
export async function getCachedArea(key: string): Promise<AreaData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as AreaCacheEntry | undefined;
        if (!entry || Date.now() - entry.timestamp > AREA_CACHE_TTL) {
          resolve(null);
          return;
        }
        resolve(entry.data);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Write area data to cache. */
export async function setCachedArea(key: string, data: AreaData): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now() } satisfies AreaCacheEntry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Cache is optional
  }
}
