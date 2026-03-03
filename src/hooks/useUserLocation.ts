import { useState, useEffect } from "react";
import { CENTER_LAT, CENTER_LON } from "../utils/constants";

interface UserLocation {
  lat: number;
  lon: number;
  loading: boolean;
  error: string | null;
}

/**
 * Request the user's geolocation on first load.
 * Falls back to CENTER_LAT/CENTER_LON if geolocation is unavailable or denied.
 * No boundary clamping — works UK-wide.
 */
export function useUserLocation(): UserLocation {
  const [state, setState] = useState<UserLocation>({
    lat: CENTER_LAT,
    lon: CENTER_LON,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        lat: CENTER_LAT,
        lon: CENTER_LON,
        loading: false,
        error: "Geolocation not supported",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        setState({ lat, lon, loading: false, error: null });
      },
      (err) => {
        setState({
          lat: CENTER_LAT,
          lon: CENTER_LON,
          loading: false,
          error: err.message,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      },
    );
  }, []);

  return state;
}
