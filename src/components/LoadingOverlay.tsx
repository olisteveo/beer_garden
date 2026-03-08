interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({
  visible,
  message = "Loading map...",
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="text-center">
        <div className="mb-3 h-8 w-8 mx-auto animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="text-sm text-slate-300">{message}</p>
      </div>
    </div>
  );
}
