import type { WeatherData } from "../types";

interface WeatherBadgeProps {
  weather: WeatherData;
}

function getWeatherIcon(condition: string): string {
  switch (condition) {
    case "Clear": return "sun";
    case "Clouds": return "cloud";
    case "Rain":
    case "Drizzle": return "rain";
    case "Thunderstorm": return "storm";
    case "Snow": return "snow";
    case "Mist":
    case "Fog":
    case "Haze": return "fog";
    default: return "sun";
  }
}

function renderIcon(type: string) {
  const cls = "inline-block w-4 h-4";
  switch (type) {
    case "sun":
      return <span className={cls}>&#9728;</span>;
    case "cloud":
      return <span className={cls}>&#9729;</span>;
    case "rain":
      return <span className={cls}>&#127783;</span>;
    case "storm":
      return <span className={cls}>&#9928;</span>;
    case "snow":
      return <span className={cls}>&#10052;</span>;
    case "fog":
      return <span className={cls}>&#127787;</span>;
    default:
      return <span className={cls}>&#9728;</span>;
  }
}

export function WeatherBadge({ weather }: WeatherBadgeProps) {
  const icon = getWeatherIcon(weather.condition);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-2 text-xs backdrop-blur-sm">
      {renderIcon(icon)}
      <span className="text-white">{weather.temperature}&deg;C</span>
      <span className="text-slate-400">{weather.cloudCover}%</span>
      <span className="text-amber-400">UV {weather.uvIndex}</span>
    </div>
  );
}
