import { useState, useCallback, useMemo } from "react";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { WebGLFallback } from "./components/WebGLFallback";
import { Layout } from "./components/Layout";
import { TimeSlider } from "./components/TimeSlider";
import { DayPicker } from "./components/DayPicker";
import { AnimateButton } from "./components/AnimateButton";
import { SunHUD } from "./components/SunHUD";
import { WeatherBadge } from "./components/WeatherBadge";
import { BottomSheet } from "./components/BottomSheet";
import { PubCard } from "./components/PubCard";
import { OpenPubsList } from "./components/OpenPubsList";
import { LoadingOverlay } from "./components/LoadingOverlay";

import { Scene } from "./scene/Scene";
import { SunLight } from "./scene/SunLight";
import { SkyDome } from "./scene/SkyDome";
import { Buildings } from "./scene/Buildings";
import { ThamesRiver } from "./scene/ThamesRiver";
import { PubMarkers } from "./scene/PubMarkers";
import { CloudLayer } from "./scene/CloudLayer";

import { useSolarPosition } from "./hooks/useSolarPosition";
import { useTimeOfDay } from "./hooks/useTimeOfDay";
import { useOSMBuildings } from "./hooks/useOSMBuildings";
import { useWeather } from "./hooks/useWeather";
import { useAnimationLoop } from "./hooks/useAnimationLoop";
import { usePubSelection } from "./hooks/usePubSelection";
import { usePubOpenStatuses } from "./hooks/usePubOpenStatus";
import { computeSunIntensity } from "./utils/sunIntensity";
import { getPubOpenStatus } from "./utils/pubHours";

import pubsData from "./data/pubs.json";
import type { Pub } from "./types";

const pubs = pubsData as Pub[];

export default function App() {
  const webglSupported =
    typeof window !== "undefined" &&
    (!!window.WebGLRenderingContext || !!window.WebGL2RenderingContext);

  // Date/time state
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [timeMinutes, setTimeMinutes] = useState(
    () => new Date().getHours() * 60 + new Date().getMinutes(),
  );

  // Build the simulated date from day + time slider
  const currentDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(Math.floor(timeMinutes / 60), Math.floor(timeMinutes % 60), 0, 0);
    return d;
  }, [selectedDate, timeMinutes]);

  // Is current time = now? (within 5 minutes)
  const isCurrentTime = useMemo(() => {
    const now = new Date();
    return Math.abs(currentDate.getTime() - now.getTime()) < 5 * 60 * 1000;
  }, [currentDate]);

  // Solar position
  const solar = useSolarPosition(currentDate);
  const { isNight } = useTimeOfDay(solar);

  // Weather (only fetch when viewing current time)
  const { weather } = useWeather(isCurrentTime);
  const sunIntensity = computeSunIntensity(solar, weather);

  // Buildings
  const { buildings, loading: buildingsLoading } = useOSMBuildings();

  // Pub selection
  const { selectedPub, selectPub, clearSelection } = usePubSelection();
  const pubStatuses = usePubOpenStatuses(pubs, currentDate);

  // Open pub count for night mode
  const openPubCount = useMemo(
    () => pubs.filter((p) => pubStatuses.get(p.id)?.isOpen).length,
    [pubStatuses],
  );

  // Next closing time
  const nextClosingTime = useMemo(() => {
    let earliest: string | null = null;
    let earliestMin = Infinity;
    for (const pub of pubs) {
      const status = pubStatuses.get(pub.id);
      if (status?.isOpen && status.minutesUntilClose !== null) {
        if (status.minutesUntilClose < earliestMin) {
          earliestMin = status.minutesUntilClose;
          earliest = status.closingTime;
        }
      }
    }
    return earliest;
  }, [pubStatuses]);

  // Animation loop
  const { playing, toggle: toggleAnimation } = useAnimationLoop(
    useCallback(
      (delta: number) => {
        setTimeMinutes((prev) => {
          const next = prev + delta;
          return next >= 1440 ? next - 1440 : next;
        });
      },
      [],
    ),
  );

  if (!webglSupported) {
    return <WebGLFallback />;
  }

  return (
    <ErrorBoundary fallback={<WebGLFallback />}>
      <Layout
        topLeft={
          <div className="flex flex-col gap-2">
            <SunHUD
              solar={solar}
              isNight={isNight}
              openPubCount={openPubCount}
              nextClosingTime={nextClosingTime}
            />
            {weather && isCurrentTime && !isNight && (
              <WeatherBadge weather={weather} />
            )}
          </div>
        }
        topRight={
          <div className="flex flex-col items-end gap-2">
            <AnimateButton playing={playing} onToggle={toggleAnimation} />
            <DayPicker date={selectedDate} onChange={setSelectedDate} />
          </div>
        }
        bottom={
          <div>
            <TimeSlider value={timeMinutes} onChange={setTimeMinutes} />
            {isNight && (
              <OpenPubsList
                pubs={pubs}
                statuses={pubStatuses}
                onSelectPub={selectPub}
              />
            )}
            {sunIntensity.score > 0 && !isNight && (
              <div className="mt-2 rounded-xl bg-slate-800/80 px-4 py-2 text-center text-xs backdrop-blur-sm">
                <span className="text-amber-400">{sunIntensity.label}</span>
                <span className="ml-2 text-slate-400">
                  {sunIntensity.score}% intensity
                </span>
              </div>
            )}
          </div>
        }
      >
        <Scene>
          <SunLight solar={solar} cloudCover={weather?.cloudCover} />
          <SkyDome solar={solar} cloudCover={weather?.cloudCover} />
          {weather && <CloudLayer cloudCover={weather.cloudCover} />}
          <Buildings buildings={buildings} />
          <ThamesRiver />
          <PubMarkers
            pubs={pubs}
            isNight={isNight}
            currentDate={currentDate}
            onSelectPub={selectPub}
          />
        </Scene>

        <LoadingOverlay visible={buildingsLoading} />
      </Layout>

      <BottomSheet open={selectedPub !== null} onClose={clearSelection}>
        {selectedPub && (
          <PubCard
            pub={selectedPub}
            status={getPubOpenStatus(selectedPub, currentDate)}
          />
        )}
      </BottomSheet>
    </ErrorBoundary>
  );
}
