import type { Pub, PubOpenStatus } from "../types";

interface OpenPubsListProps {
  pubs: Pub[];
  statuses: Map<string, PubOpenStatus>;
  onSelectPub: (pub: Pub) => void;
}

export function OpenPubsList({ pubs, statuses, onSelectPub }: OpenPubsListProps) {
  const openPubs = pubs
    .filter((p) => statuses.get(p.id)?.isOpen)
    .sort((a, b) => {
      const aStatus = statuses.get(a.id);
      const bStatus = statuses.get(b.id);
      const aMin = aStatus?.minutesUntilClose ?? Infinity;
      const bMin = bStatus?.minutesUntilClose ?? Infinity;
      return aMin - bMin;
    });

  if (openPubs.length === 0) {
    return (
      <div className="mt-2 rounded-xl bg-slate-800/80 px-4 py-3 text-center text-xs text-slate-400 backdrop-blur-sm">
        No pubs currently open
      </div>
    );
  }

  return (
    <div className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-slate-800/80 backdrop-blur-sm">
      {openPubs.map((pub) => {
        const status = statuses.get(pub.id);
        return (
          <button
            key={pub.id}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-xs active:bg-slate-700/50"
            onClick={() => onSelectPub(pub)}
          >
            <span className="font-medium text-white">{pub.name}</span>
            {status?.closingTime && (
              <span
                className={
                  status.closingSoon ? "text-amber-400" : "text-slate-400"
                }
              >
                {status.closingSoon ? "Closing " : ""}
                {status.closingTime}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
