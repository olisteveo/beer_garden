interface TimeSliderProps {
  value: number; // 0-1440 (minutes)
  onChange: (minutes: number) => void;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function TimeSlider({ value, onChange }: TimeSliderProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 px-4 py-3 backdrop-blur-sm">
      <span className="min-w-[3rem] text-center text-sm font-mono text-amber-400">
        {formatTime(value)}
      </span>
      <input
        type="range"
        min={0}
        max={1440}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600
          [&::-webkit-slider-thumb]:h-[44px] [&::-webkit-slider-thumb]:w-[44px]
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-lg"
        aria-label="Time of day"
      />
    </div>
  );
}
