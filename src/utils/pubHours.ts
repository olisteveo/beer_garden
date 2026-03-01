import type { Pub, PubOpenStatus, DayOfWeek } from "../types";
import { CLOSING_SOON_MINUTES } from "./constants";

const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getDayOfWeek(date: Date): DayOfWeek {
  return DAYS[date.getDay()]!;
}

/**
 * Parse "HH:MM" to minutes since midnight.
 */
function parseTime(time: string): number {
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  return hours * 60 + minutes;
}

/**
 * Determine if a pub is open at the given date/time.
 * Handles midnight-crossing (e.g. closing at 01:00 means still open at 00:30).
 */
export function getPubOpenStatus(pub: Pub, date: Date): PubOpenStatus {
  const currentDay = getDayOfWeek(date);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  // Check today's hours
  const todayHours = pub.openingHours[currentDay];
  if (todayHours) {
    const openMin = parseTime(todayHours.open);
    const closeMin = parseTime(todayHours.close);

    if (closeMin > openMin) {
      // Normal hours (e.g. 11:00 - 23:00)
      if (currentMinutes >= openMin && currentMinutes < closeMin) {
        const minutesLeft = closeMin - currentMinutes;
        return {
          isOpen: true,
          closingTime: todayHours.close,
          closingSoon: minutesLeft <= CLOSING_SOON_MINUTES,
          minutesUntilClose: minutesLeft,
        };
      }
    } else if (closeMin < openMin) {
      // Crosses midnight (e.g. 11:00 - 01:00)
      if (currentMinutes >= openMin) {
        // Still in the "before midnight" part
        const minutesLeft = 24 * 60 - currentMinutes + closeMin;
        return {
          isOpen: true,
          closingTime: todayHours.close,
          closingSoon: minutesLeft <= CLOSING_SOON_MINUTES,
          minutesUntilClose: minutesLeft,
        };
      }
    }
  }

  // Check if we're in yesterday's late-night hours (past midnight)
  const yesterdayIndex = (date.getDay() + 6) % 7;
  const yesterdayDay = DAYS[yesterdayIndex]!;
  const yesterdayHours = pub.openingHours[yesterdayDay];

  if (yesterdayHours) {
    const openMin = parseTime(yesterdayHours.open);
    const closeMin = parseTime(yesterdayHours.close);

    // Only relevant if yesterday crossed midnight
    if (closeMin < openMin && currentMinutes < closeMin) {
      const minutesLeft = closeMin - currentMinutes;
      return {
        isOpen: true,
        closingTime: yesterdayHours.close,
        closingSoon: minutesLeft <= CLOSING_SOON_MINUTES,
        minutesUntilClose: minutesLeft,
      };
    }
  }

  return {
    isOpen: false,
    closingTime: null,
    closingSoon: false,
    minutesUntilClose: null,
  };
}
