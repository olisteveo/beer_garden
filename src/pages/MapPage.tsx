import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { WebGLFallback } from "../components/WebGLFallback";
import { Layout } from "../components/Layout";
import { TimeSlider } from "../components/TimeSlider";
import { DayPicker } from "../components/DayPicker";
import { AnimateButton } from "../components/AnimateButton";
import { SunHUD } from "../components/SunHUD";
import { WeatherBadge } from "../components/WeatherBadge";
import { BottomSheet } from "../components/BottomSheet";
import { PubCard } from "../components/PubCard";
import { OpenPubsList } from "../components/OpenPubsList";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { SearchBar } from "../components/SearchBar";

import { Scene } from "../scene/Scene";
import { SunLight } from "../scene/SunLight";
import { SkyDome } from "../scene/SkyDome";
import { AreaScene } from "../scene/AreaScene";
import { ThamesRiver } from "../scene/ThamesRiver";
import { PubMarkers } from "../scene/PubMarkers";
import { CloudLayer } from "../scene/CloudLayer";
import { RainEffect } from "../scene/RainEffect";
import { NightWindows } from "../scene/NightWindows";

import { useSolarPosition } from "../hooks/useSolarPosition";
import { useTimeOfDay } from "../hooks/useTimeOfDay";
import { useUserLocation } from "../hooks/useUserLocation";
import { useForecast } from "../hooks/useForecast";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { usePubSelection } from "../hooks/usePubSelection";
import { useAreaSearch } from "../hooks/useAreaSearch";
import { computeSunIntensity } from "../utils/sunIntensity";
import type { WeatherData } from "../types";
import { CENTER_LAT, CENTER_LON } from "../utils/constants";

export function MapPage() {
  const navigate = useNavigate();

  const webglSupported =
    typeof window !== "undefined" &&
    (!!window.WebGLRenderingContext || !!window.WebGL2RenderingContext);

  // User location — auto-search on first load
  const { lat: userLat, lon: userLon, loading: locationLoading } = useUserLocation();

  // Area search
  const { state: searchState, geometry, radius, search, searchByLocation } = useAreaSearch();
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

  // Solar position — uses search center coordinates
  const solar = useSolarPosition(currentDate, centerLat, centerLon);
  const { isNight } = useTimeOfDay(solar);

  // Forecast — time-aware weather that updates as you scrub the slider
  const { timeWeather } = useForecast(centerLat, centerLon, currentDate);

  // Convert TimeWeather → WeatherData for sun intensity, sky dome, cloud layer
  const weatherForScene = useMemo<WeatherData | null>(() => {
    if (!timeWeather) return null;
    return {
      cloudCover: timeWeather.cloudCover,
      condition: timeWeather.condition,
      conditionId: timeWeather.conditionId,
      temperature: timeWeather.temperature,
      feelsLike: timeWeather.feelsLike,
      uvIndex: 0, // UV not in forecast entries; sun intensity derives from solar position
      humidity: timeWeather.humidity,
      windSpeed: timeWeather.windSpeed,
      rainVolume: timeWeather.rainVolume,
      icon: timeWeather.icon,
    };
  }, [timeWeather]);

  const sunIntensity = computeSunIntensity(solar, weatherForScene);

  // Rain intensity for particle effect (0 = none, 1 = heavy)
  const rainIntensity = useMemo(() => {
    if (!timeWeather) return 0;
    const cid = timeWeather.conditionId;
    // Thunderstorm
    if (cid >= 200 && cid < 300) return 1.0;
    // Drizzle
    if (cid >= 300 && cid < 400) return 0.3;
    // Rain
    if (cid >= 500 && cid < 510) return 0.7; // light-moderate rain
    if (cid >= 510 && cid < 600) return 1.0; // heavy rain
    // High probability but not yet raining — light hint
    if (timeWeather.pop >= 70) return 0.15;
    return 0;
  }, [timeWeather]);

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
    <div className="h-full w-full overflow-hidden">
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
              {timeWeather && (
                <WeatherBadge weather={timeWeather} sunIntensity={sunIntensity} />
              )}
            </div>
          }
          topRight={
            <div className="flex flex-col items-end gap-2">
              <AnimateButton playing={playing} onToggle={toggleAnimation} />
              <DayPicker date={selectedDate} onChange={setSelectedDate} />
              {/* Settings gear button */}
              <button
                onClick={() => navigate("/settings")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 backdrop-blur-sm transition-colors hover:bg-slate-700/80 hover:text-white"
                aria-label="Settings"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
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
            </div>
          }
        >
          <Scene phase={solar.phase} radius={radius} flySignal={flySignal}>
            <SunLight solar={solar} cloudCover={weatherForScene?.cloudCover} />
            <SkyDome solar={solar} cloudCover={weatherForScene?.cloudCover} />
            <CloudLayer
              cloudCover={weatherForScene?.cloudCover ?? 0}
              phase={solar.phase}
              windSpeed={weatherForScene?.windSpeed}
            />
            <RainEffect intensity={rainIntensity} />
            {geometry && <AreaScene geometry={geometry} phase={solar.phase} />}
            <ThamesRiver phase={solar.phase} windSpeed={weatherForScene?.windSpeed} />
            {geometry?.buildings && (
              <NightWindows
                buildingGeometry={geometry.buildings.mesh}
                phase={solar.phase}
              />
            )}
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
    </div>
  );
}
