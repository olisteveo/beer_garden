import { useState, useRef, useCallback, useEffect } from "react";

interface AnimationLoop {
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

/**
 * Animation loop that increments time at a given speed.
 * @param onTick - called each frame with delta minutes to add
 * @param speed - simulated minutes per real second (default: 30)
 */
export function useAnimationLoop(
  onTick: (deltaMinutes: number) => void,
  speed: number = 30,
): AnimationLoop {
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    function loop(now: number) {
      const delta = (now - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = now;
      onTickRef.current(delta * speed);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [playing, speed]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return { playing, play, pause, toggle };
}
