interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get a cached value from localStorage. Returns null if expired or missing.
 */
export function cacheGet<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Set a cached value in localStorage with a timestamp.
 */
export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Remove a cached value from localStorage.
 */
export function cacheClear(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // silently fail
  }
}
