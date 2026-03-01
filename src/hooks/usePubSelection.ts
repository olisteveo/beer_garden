import { useState, useCallback } from "react";
import type { Pub } from "../types";

export function usePubSelection() {
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);

  const selectPub = useCallback((pub: Pub) => {
    setSelectedPub(pub);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPub(null);
  }, []);

  return { selectedPub, selectPub, clearSelection };
}
