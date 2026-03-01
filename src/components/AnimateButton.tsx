interface AnimateButtonProps {
  playing: boolean;
  onToggle: () => void;
}

export function AnimateButton({ playing, onToggle }: AnimateButtonProps) {
  return (
    <button
      className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-amber-500 text-slate-900 shadow-lg active:bg-amber-600"
      onClick={onToggle}
      aria-label={playing ? "Pause animation" : "Play animation"}
    >
      {playing ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="2" width="4" height="12" rx="1" />
          <rect x="9" y="2" width="4" height="12" rx="1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <polygon points="3,1 14,8 3,15" />
        </svg>
      )}
    </button>
  );
}
