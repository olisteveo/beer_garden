const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface DayPickerProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function DayPicker({ date, onChange }: DayPickerProps) {
  const month = MONTH_NAMES[date.getMonth()] ?? "";
  const day = date.getDate();

  function shift(days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    onChange(next);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-2 backdrop-blur-sm">
      <button
        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg text-slate-300 active:bg-slate-700"
        onClick={() => shift(-1)}
        aria-label="Previous day"
      >
        &larr;
      </button>
      <span className="min-w-[5rem] text-center text-sm font-medium text-white">
        {day} {month}
      </span>
      <button
        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg text-slate-300 active:bg-slate-700"
        onClick={() => shift(1)}
        aria-label="Next day"
      >
        &rarr;
      </button>
    </div>
  );
}
