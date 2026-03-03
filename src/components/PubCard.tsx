import type { SearchPub } from "../types";

interface PubCardProps {
  pub: SearchPub;
}

function openDirections(pub: SearchPub) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${pub.lat},${pub.lon}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${pub.lat},${pub.lon}&travelmode=walking`;
  window.open(url, "_blank");
}

export function PubCard({ pub }: PubCardProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{pub.name}</h2>
        {pub.isOpen === true && (
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
            Open
          </span>
        )}
        {pub.isOpen === false && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            Closed
          </span>
        )}
        {pub.isOpen === null && (
          <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-medium text-slate-400">
            Hours unknown
          </span>
        )}
      </div>

      {pub.address && (
        <p className="mt-1 text-sm text-slate-400">{pub.address}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        {pub.outdoorSeating && (
          <div className="rounded-lg bg-green-900/30 px-2 py-1 text-green-400">
            Outdoor seating
          </div>
        )}
        {pub.beerGarden && (
          <div className="rounded-lg bg-amber-900/30 px-2 py-1 text-amber-400">
            Beer garden
          </div>
        )}
        {pub.openingHoursRaw && (
          <div className="rounded-lg bg-slate-700/50 px-2 py-1">
            {pub.openStatusLabel}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => openDirections(pub)}
          className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 active:bg-amber-600"
        >
          Get Directions
        </button>
        {pub.website && (
          <a
            href={pub.website}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white active:bg-slate-600"
          >
            Website
          </a>
        )}
      </div>
    </div>
  );
}
