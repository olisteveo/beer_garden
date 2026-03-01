import type { ReactNode } from "react";

interface LayoutProps {
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottom?: ReactNode;
  children: ReactNode;
}

export function Layout({ topLeft, topRight, bottom, children }: LayoutProps) {
  return (
    <div className="relative h-full w-full">
      {/* 3D Canvas fills the background */}
      {children}

      {/* Top bar overlay */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4"
        style={{ paddingTop: "calc(var(--safe-top, 0px) + 12px)" }}
      >
        <div className="pointer-events-auto">{topLeft}</div>
        <div className="pointer-events-auto">{topRight}</div>
      </div>

      {/* Bottom controls overlay */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 px-4"
        style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)" }}
      >
        <div className="pointer-events-auto">{bottom}</div>
      </div>
    </div>
  );
}
