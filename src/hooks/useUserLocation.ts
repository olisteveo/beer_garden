import { useState, useEffect } from "react";
import { CENTER_LAT, CENTER_LON, MAP_BBOX } from "../utils/constants";

interface UserLocation {
  lat: number;
  lon: number;
  loading: boolean;
  error: string | null;
}

/**
 * Request the user's geolocation on first load.
 * Falls back to CENTER_LAT/CENTER_LON if geolocation is unavailable,
 * denied, or the user is outside the M25 boundary.
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
        let { latitude: lat, longitude: lon } = position.coords;

        // Clamp within map boundary — if outside, fall back to center
        if (
          lat < MAP_BBOX.south ||
          lat > MAP_BBOX.north ||
          lon < MAP_BBOX.west ||
          lon > MAP_BBOX.east
        ) {
          lat = CENTER_LAT;
          lon = CENTER_LON;
        }

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
        maximumAge: 300000, // accept cached position up to 5 minutes old
      },
    );
  }, []);

  return state;
}
