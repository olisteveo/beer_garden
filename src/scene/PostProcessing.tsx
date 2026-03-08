import { useThree } from "@react-three/fiber";
import {
  EffectComposer,
  N8AO,
  Bloom,
  Vignette,
  ToneMapping,
  BrightnessContrast,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { SunPhase } from "../types";

interface PostProcessingProps {
  phase: SunPhase;
}

/**
 * Post-processing pipeline: SSAO + Bloom + Vignette + Contrast + ACES ToneMapping.
 *
 * Automatically reduces quality on mobile for performance.
 */
export function PostProcessing({ phase }: PostProcessingProps) {
  const { size } = useThree();
  const isMobile = size.width < 768;

  // Phase-tuned bloom — stronger during golden hour, subtle warmth at dawn/dusk
  const bloomIntensity =
    phase === "golden"
      ? 0.7
      : phase === "dawn" || phase === "dusk"
        ? 0.5
        : phase === "night"
          ? 0.25
          : 0.2;

  const bloomThreshold =
    phase === "golden"
      ? 0.6
      : phase === "dawn" || phase === "dusk"
        ? 0.65
        : 0.8;

  // Vignette darkness — stronger at night, moderate during day
  const vignetteDarkness =
    phase === "night"
      ? 0.75
      : phase === "dawn" || phase === "dusk"
        ? 0.5
        : 0.35;

  // Subtle contrast boost — more pronounced at dawn/dusk for drama
  const contrastAmount =
    phase === "dawn" || phase === "dusk"
      ? 0.12
      : phase === "golden"
        ? 0.08
        : phase === "night"
          ? 0.06
          : 0.05;

  return (
    <EffectComposer multisampling={isMobile ? 0 : 4}>
      {/* N8AO: aggressive ambient occlusion for depth at building bases */}
      <N8AO
        aoRadius={isMobile ? 3 : 6}
        intensity={isMobile ? 3 : 5}
        distanceFalloff={0.3}
        quality={isMobile ? "low" : "high"}
        halfRes={isMobile}
        color="#1a1520"
      />

      {/* Bloom: atmospheric glow on bright surfaces and sky */}
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.4}
        mipmapBlur
        radius={0.7}
      />

      {/* Brightness/contrast: subtle depth enhancement */}
      <BrightnessContrast brightness={0} contrast={contrastAmount} />

      {/* Vignette: cinematic edge darkening */}
      <Vignette offset={0.25} darkness={vignetteDarkness} />

      {/* ACES Filmic tone mapping for richer colours */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
