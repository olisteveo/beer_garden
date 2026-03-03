import { useState, useCallback, useMemo, useEffect, useRef } from "react";

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
import { SearchBar } from "./components/SearchBar";

import { Scene } from "./scene/Scene";
import { SunLight } from "./scene/SunLight";
import { SkyDome } from "./scene/SkyDome";
import { AreaScene } from "./scene/AreaScene";
import { ThamesRiver } from "./scene/ThamesRiver";
import { PubMarkers } from "./scene/PubMarkers";
import { CloudLayer } from "./scene/CloudLayer";

import { useSolarPosition } from "./hooks/useSolarPosition";
import { useTimeOfDay } from "./hooks/useTimeOfDay";
import { useUserLocation } from "./hooks/useUserLocation";
import { useWeather } from "./hooks/useWeather";
import { useAnimationLoop } from "./hooks/useAnimationLoop";
import { usePubSelection } from "./hooks/usePubSelection";
import { useAreaSearch } from "./hooks/useAreaSearch";
import { computeSunIntensity } from "./utils/sunIntensity";
import { CENTER_LAT, CENTER_LON } from "./utils/constants";

export default function App() {
  const webglSupported =
    typeof window !== "undefined" &&
    (!!window.WebGLRenderingContext || !!window.WebGL2RenderingContext);

  // User location — auto-search on first load
  const { lat: userLat, lon: userLon, loading: locationLoading } = useUserLocation();

  // Area search
  const { state: searchState, geometry, search, searchByLocation } = useAreaSearch();
  const flySignalRef = useRef(0);
  const [flySignal, setFlySignal] = useState(0);

  // Auto-search user's geolocation on first load
  const didAutoSearch = useRef(false);
  useEffect(() => {
    if (!locationLoading && !didAutoSearch.current) {
      didAutoSearch.current = true;
      searchByLocation(userLat, userLon);
    }
  }, [locationLoading, userLat, userLon, searchByLocation]);

  // Trigger camera fly-to when search loads
  useEffect(() => {
    if (searchState.status === "loaded") {
      flySignalRef.current += 1;
      setFlySignal(flySignalRef.current);
    }
  }, [searchState.status]);

  // Determine current center for solar/weather
  const centerLat = searchState.status === "loaded" ? searchState.center.lat : CENTER_LAT;
  const centerLon = searchState.status === "loaded" ? searchState.center.lon : CENTER_LON;

  // Pubs from search
  const pubs = searchState.status === "loaded" ? searchState.pubs : [];

  // Date/time state
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [timeMinutes, setTimeMinutes] = useState(
    () => new Date().getHours() * 60 + new Date().getMinutes(),
  );

  const currentDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(Math.floor(timeMinutes / 60), Math.floor(timeMinutes % 60), 0, 0);
    return d;
  }, [selectedDate, timeMinutes]);

  const isCurrentTime = useMemo(() => {
    const now = new Date();
    return Math.abs(currentDate.getTime() - now.getTime()) < 5 * 60 * 1000;
  }, [currentDate]);

  // Solar position — uses search center coordinates
  const solar = useSolarPosition(currentDate, centerLat, centerLon);
  const { isNight } = useTimeOfDay(solar);

  // Weather — uses search center coordinates
  const { weather } = useWeather(isCurrentTime, centerLat, centerLon);
  const sunIntensity = computeSunIntensity(solar, weather);

  // Pub selection
  const { selectedPub, selectPub, clearSelection } = usePubSelection();

  // Open pub count for night mode HUD
  const openPubCount = useMemo(
    () => pubs.filter((p) => p.isOpen === true).length,
    [pubs],
  );

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

  // Loading state — show overlay during initial geo or search loading
  const isLoading = locationLoading ||
    searchState.status === "geocoding" ||
    searchState.status === "loading";

  if (!webglSupported) {
    return <WebGLFallback />;
  }

  return (
    <ErrorBoundary fallback={<WebGLFallback />}>
      <Layout
        topLeft={
          <div className="flex flex-col gap-2">
            <SearchBar state={searchState} onSearch={search} />
            <SunHUD
              solar={solar}
              isNight={isNight}
              openPubCount={openPubCount}
              nextClosingTime={null}
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
            {isNight && pubs.length > 0 && (
              <OpenPubsList
                pubs={pubs}
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
        <Scene phase={solar.phase} flySignal={flySignal}>
          <SunLight solar={solar} cloudCover={weather?.cloudCover} />
          <SkyDome solar={solar} cloudCover={weather?.cloudCover} />
          {weather && <CloudLayer cloudCover={weather.cloudCover} />}
          {geometry && <AreaScene geometry={geometry} />}
          <ThamesRiver />
          {pubs.length > 0 && (
            <PubMarkers
              pubs={pubs}
              isNight={isNight}
              onSelectPub={selectPub}
            />
          )}
        </Scene>

        <LoadingOverlay visible={isLoading} />
      </Layout>

      <BottomSheet open={selectedPub !== null} onClose={clearSelection}>
        {selectedPub && <PubCard pub={selectedPub} />}
      </BottomSheet>
    </ErrorBoundary>
  );
}
