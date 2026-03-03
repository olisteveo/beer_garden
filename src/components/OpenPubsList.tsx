import type { SearchPub } from "../types";

interface OpenPubsListProps {
  pubs: SearchPub[];
  onSelectPub: (pub: SearchPub) => void;
}

export function OpenPubsList({ pubs, onSelectPub }: OpenPubsListProps) {
  // Show pubs that are open or have unknown hours (might be open)
  const visiblePubs = pubs.filter((p) => p.isOpen !== false);

  if (visiblePubs.length === 0) {
    return (
      <div className="mt-2 rounded-xl bg-slate-800/80 px-4 py-3 text-center text-xs text-slate-400 backdrop-blur-sm">
        No pubs currently open
      </div>
    );
  }

  return (
    <div className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-slate-800/80 backdrop-blur-sm">
      {visiblePubs.map((pub) => (
        <button
          key={pub.id}
          className="flex w-full items-center justify-between px-4 py-2 text-left text-xs active:bg-slate-700/50"
          onClick={() => onSelectPub(pub)}
        >
          <span className="font-medium text-white">{pub.name}</span>
          <span className={pub.isOpen === true ? "text-green-400" : "text-slate-500"}>
            {pub.openStatusLabel}
          </span>
        </button>
      ))}
    </div>
  );
}
