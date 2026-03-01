import { useMemo } from "react";
import type { Pub, PubOpenStatus } from "../types";
import { getPubOpenStatus } from "../utils/pubHours";

/**
 * Get open status for all pubs at the given date/time.
 */
export function usePubOpenStatuses(
  pubs: Pub[],
  date: Date,
): Map<string, PubOpenStatus> {
  const timestamp = date.getTime();
  return useMemo(() => {
    const d = new Date(timestamp);
    const map = new Map<string, PubOpenStatus>();
    for (const pub of pubs) {
      map.set(pub.id, getPubOpenStatus(pub, d));
    }
    return map;
  }, [pubs, timestamp]);
}
