import type { Pub } from "../types";
import { getPubOpenStatus } from "../utils/pubHours";
import { PubMarker } from "./PubMarker";

interface PubMarkersProps {
  pubs: Pub[];
  isNight: boolean;
  currentDate: Date;
  onSelectPub: (pub: Pub) => void;
}

export function PubMarkers({
  pubs,
  isNight,
  currentDate,
  onSelectPub,
}: PubMarkersProps) {
  return (
    <>
      {pubs.map((pub) => (
        <PubMarker
          key={pub.id}
          pub={pub}
          status={getPubOpenStatus(pub, currentDate)}
          isNight={isNight}
          onSelect={onSelectPub}
        />
      ))}
    </>
  );
}
