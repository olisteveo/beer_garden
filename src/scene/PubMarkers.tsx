import type { SearchPub } from "../types";
import { PubMarker } from "./PubMarker";

interface PubMarkersProps {
  pubs: SearchPub[];
  isNight: boolean;
  onSelectPub: (pub: SearchPub) => void;
}

export function PubMarkers({
  pubs,
  isNight,
  onSelectPub,
}: PubMarkersProps) {
  return (
    <>
      {pubs.map((pub) => (
        <PubMarker
          key={pub.id}
          pub={pub}
          isNight={isNight}
          onSelect={onSelectPub}
        />
      ))}
    </>
  );
}
