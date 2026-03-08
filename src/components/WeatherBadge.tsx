import { useState } from "react";
import type { SunIntensity } from "../types";
import type { TimeWeather } from "../hooks/useForecast";

interface WeatherBadgeProps {
  weather: TimeWeather;
  sunIntensity: SunIntensity;
}

// ── Small SVG icons ──────────────────────────────────────────

function TempIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function SunSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function UmbrellaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
    </svg>
  );
}

// ── Large condition icon ─────────────────────────────────────

function ConditionIcon({ condition }: { condition: string }) {
  const cls = "h-6 w-6 flex-shrink-0";
  switch (condition) {
    case "Clear":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case "Clouds":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
    case "Rain":
    case "Drizzle":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
          <line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" /><line x1="12" y1="15" x2="12" y2="23" />
          <path d="M20 8a5 5 0 0 0-9.73-1.79A3.5 3.5 0 0 0 4 10h16a5 5 0 0 0 0-2z" />
        </svg>
      );
    case "Thunderstorm":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
          <polyline points="13 11 9 17 15 17 11 23" />
        </svg>
      );
    case "Snow":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round">
          <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
          <line x1="8" y1="16" x2="8.01" y2="16" /><line x1="8" y1="20" x2="8.01" y2="20" />
          <line x1="12" y1="18" x2="12.01" y2="18" /><line x1="12" y1="22" x2="12.01" y2="22" />
          <line x1="16" y1="16" x2="16.01" y2="16" /><line x1="16" y1="20" x2="16.01" y2="20" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
  }
}

// ── Sun intensity bar ────────────────────────────────────────

function IntensityBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-amber-400" :
    score >= 40 ? "bg-amber-500/80" :
    score >= 15 ? "bg-orange-500/70" :
    "bg-slate-500/50";

  return (
    <div className="h-1.5 w-full rounded-full bg-slate-700/60">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.max(score, 2)}%` }}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export function WeatherBadge({ weather, sunIntensity }: WeatherBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const isRaining = weather.conditionId >= 200 && weather.conditionId < 600;
  const windKmh = Math.round(weather.windSpeed * 3.6);

  return (
    <div className="rounded-xl bg-slate-800/80 backdrop-blur-sm">
      {/* Compact row — always visible */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <ConditionIcon condition={weather.condition} />

        <div className="flex flex-col leading-tight">
          <span className="text-base font-bold text-white">
            {weather.temperature}&deg;C
          </span>
          <span className="text-[10px] text-slate-400">
            {weather.condition}
            {!weather.isLive && " (forecast)"}
          </span>
        </div>

        {/* Quick stats in compact row */}
        <div className="ml-auto flex items-center gap-2 text-[10px]">
          {weather.pop > 0 && (
            <span className={`flex items-center gap-0.5 font-medium ${
              weather.pop >= 50 ? "text-blue-400" : "text-slate-400"
            }`}>
              <DropIcon />
              {weather.pop}%
            </span>
          )}
          {sunIntensity.score > 0 && (
            <span className="flex items-center gap-0.5 font-medium text-amber-400">
              <SunSmallIcon />
              {sunIntensity.score}%
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 flex-shrink-0 text-slate-500 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-slate-700/50 px-3 pb-3 pt-2">
          {/* Sun intensity row */}
          {sunIntensity.score > 0 && (
            <div className="mb-2.5">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-amber-400">
                  <SunSmallIcon />
                  {sunIntensity.label}
                </span>
                <span className="text-slate-400">{sunIntensity.score}%</span>
              </div>
              <IntensityBar score={sunIntensity.score} />
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {/* Feels like */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <TempIcon />
              <span>Feels like</span>
              <span className="ml-auto font-medium text-white">{weather.feelsLike}&deg;C</span>
            </div>

            {/* Cloud cover */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <CloudIcon />
              <span>Cloud</span>
              <span className="ml-auto font-medium text-white">{weather.cloudCover}%</span>
            </div>

            {/* Wind */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <WindIcon />
              <span>Wind</span>
              <span className="ml-auto font-medium text-white">{windKmh} km/h</span>
            </div>

            {/* Humidity */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <DropIcon />
              <span>Humidity</span>
              <span className="ml-auto font-medium text-white">{weather.humidity}%</span>
            </div>

            {/* Rain chance */}
            <div className={`flex items-center gap-1.5 ${
              weather.pop >= 50 ? "text-blue-400" : "text-slate-300"
            }`}>
              <UmbrellaIcon />
              <span>Rain</span>
              <span className="ml-auto font-medium text-white">{weather.pop}%</span>
            </div>

            {/* Rain volume — show if actively raining */}
            {isRaining && weather.rainVolume > 0 && (
              <div className="flex items-center gap-1.5 text-blue-400">
                <DropIcon />
                <span>Rainfall</span>
                <span className="ml-auto font-medium text-white">{weather.rainVolume} mm</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
