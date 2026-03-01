export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type SunPhase = "night" | "dawn" | "golden" | "day" | "dusk";

export interface SolarPosition {
  altitude: number; // radians
  azimuth: number; // radians (suncalc convention: 0=south, +west)
  altitudeDeg: number;
  azimuthDeg: number; // geographic: 0=north, 90=east
  phase: SunPhase;
}

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  open: string; // "HH:MM"
  close: string; // "HH:MM" — may be past midnight (e.g. "01:00")
}

export interface Pub {
  id: string;
  name: string;
  lat: number;
  lon: number;
  gardenOrientation: string; // "south", "southwest", etc.
  description: string;
  openingHours: Record<DayOfWeek, DayHours>;
}

export interface PubOpenStatus {
  isOpen: boolean;
  closingTime: string | null; // "HH:MM" or null if closed
  closingSoon: boolean; // within 30 minutes
  minutesUntilClose: number | null;
}

export interface WeatherData {
  cloudCover: number; // 0-100
  condition: string; // "Clear", "Clouds", "Rain", etc.
  conditionId: number; // OWM condition code
  temperature: number; // Celsius
  uvIndex: number; // 0-11+
  humidity: number;
  windSpeed: number; // m/s
  icon: string; // OWM icon code e.g. "01d"
}

export interface SunIntensity {
  score: number; // 0-100
  label: string; // "Full sun", "Partly cloudy", "Overcast", etc.
}

export interface BuildingFeature {
  coordinates: [number, number][][]; // rings of [lon, lat] pairs
  height: number; // metres
}
