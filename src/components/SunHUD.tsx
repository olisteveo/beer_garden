import type { SolarPosition } from "../types";

interface SunHUDProps {
  solar: SolarPosition;
  openPubCount?: number;
  nextClosingTime?: string | null;
  isNight: boolean;
}

export function SunHUD({
  solar,
  openPubCount,
  nextClosingTime,
  isNight,
}: SunHUDProps) {
  return (
    <div className="rounded-xl bg-slate-800/80 px-4 py-3 text-xs backdrop-blur-sm">
      {isNight ? (
        <>
          <div className="mb-1 text-sm font-medium text-slate-300">
            Night Mode
          </div>
          <div className="text-slate-400">
            Open pubs: <span className="text-amber-400">{openPubCount ?? 0}</span>
          </div>
          {nextClosingTime && (
            <div className="text-slate-400">
              Next close: <span className="text-amber-400">{nextClosingTime}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-1 text-sm font-medium text-slate-300">
            {solar.phase.charAt(0).toUpperCase() + solar.phase.slice(1)}
          </div>
          <div className="text-slate-400">
            Alt: <span className="text-white">{solar.altitudeDeg.toFixed(1)}</span>
          </div>
          <div className="text-slate-400">
            Azm: <span className="text-white">{solar.azimuthDeg.toFixed(1)}</span>
          </div>
        </>
      )}
    </div>
  );
}
