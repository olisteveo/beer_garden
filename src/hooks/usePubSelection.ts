import { useState, useCallback } from "react";
import type { SearchPub } from "../types";

export function usePubSelection() {
  const [selectedPub, setSelectedPub] = useState<SearchPub | null>(null);

  const selectPub = useCallback((pub: SearchPub) => {
    setSelectedPub(pub);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPub(null);
  }, []);

  return { selectedPub, selectPub, clearSelection };
}
