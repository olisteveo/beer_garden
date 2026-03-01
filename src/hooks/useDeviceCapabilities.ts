import { useMemo } from "react";
import { MAX_DPR } from "../utils/constants";

export interface DeviceCapabilities {
  webgl: boolean;
  dpr: number;
  reducedMotion: boolean;
}

export function useDeviceCapabilities(): DeviceCapabilities {
  return useMemo(() => {
    const webgl =
      typeof window !== "undefined" &&
      (!!window.WebGLRenderingContext || !!window.WebGL2RenderingContext);

    const rawDpr =
      typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const dpr = Math.min(rawDpr, MAX_DPR);

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    return { webgl, dpr, reducedMotion };
  }, []);
}
