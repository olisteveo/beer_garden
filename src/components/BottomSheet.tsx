import { useRef, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    startYRef.current = touch.clientY;
    setDragging(true);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!dragging) return;
    setDragging(false);
    const touch = e.changedTouches[0];
    if (!touch) return;
    const delta = touch.clientY - startYRef.current;
    if (delta > 80) {
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop — click to dismiss */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "var(--safe-bottom, 0px)" }}
      >
        <div
          ref={sheetRef}
          className="rounded-t-2xl bg-slate-800/95 backdrop-blur-md"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-slate-600" />
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-5 pb-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
