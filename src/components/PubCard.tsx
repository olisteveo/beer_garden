import type { Pub, PubOpenStatus } from "../types";

interface PubCardProps {
  pub: Pub;
  status: PubOpenStatus;
}

function openDirections(pub: Pub) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${pub.lat},${pub.lon}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${pub.lat},${pub.lon}&travelmode=walking`;
  window.open(url, "_blank");
}

export function PubCard({ pub, status }: PubCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{pub.name}</h2>
        {status.isOpen ? (
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
            Open
          </span>
        ) : (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            Closed
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-slate-400">{pub.description}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
        <div className="rounded-lg bg-slate-700/50 px-2 py-1">
          Garden: {pub.gardenOrientation}-facing
        </div>
        {status.closingTime && (
          <div className="rounded-lg bg-slate-700/50 px-2 py-1">
            {status.closingSoon ? "Closing soon: " : "Closes: "}
            {status.closingTime}
          </div>
        )}
        {status.minutesUntilClose !== null && status.isOpen && (
          <div className="rounded-lg bg-slate-700/50 px-2 py-1">
            {status.minutesUntilClose} min left
          </div>
        )}
      </div>

      <button
        onClick={() => openDirections(pub)}
        className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 active:bg-amber-600"
      >
        Get Directions
      </button>
    </div>
  );
}
