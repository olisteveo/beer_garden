import type { OSMPubNode, SearchPub } from "../types";

/**
 * Try to determine if a pub is currently open from its raw OSM opening_hours string.
 * Only handles simple formats like "Mo-Su 11:00-23:00" or "Mo-Fr 11:00-23:00; Sa-Su 12:00-22:30".
 * Returns null (unknown) for anything complex.
 */
function parseSimpleOpenStatus(
  raw: string,
  date: Date,
): { isOpen: boolean; label: string } | null {
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const currentDay = dayNames[date.getDay()]!;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  // Split by semicolons for multiple rules
  const rules = raw.split(";").map((r) => r.trim());

  for (const rule of rules) {
    // Match patterns like "Mo-Su 11:00-23:00" or "Mo,Tu,We 10:00-22:00"
    const match = rule.match(
      /^([A-Za-z, -]+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/,
    );
    if (!match) continue;

    const [, daySpec, openStr, closeStr] = match;
    if (!daySpec || !openStr || !closeStr) continue;

    // Check if current day matches
    if (!isDayInSpec(currentDay, daySpec, dayNames)) continue;

    const openMin = parseTimeToMinutes(openStr);
    const closeMin = parseTimeToMinutes(closeStr);
    if (openMin === null || closeMin === null) continue;

    if (closeMin > openMin) {
      // Normal hours
      if (currentMinutes >= openMin && currentMinutes < closeMin) {
        return { isOpen: true, label: `Open until ${closeStr}` };
      }
      return { isOpen: false, label: `Opens ${openStr}` };
    } else {
      // Crosses midnight
      if (currentMinutes >= openMin || currentMinutes < closeMin) {
        return { isOpen: true, label: `Open until ${closeStr}` };
      }
      return { isOpen: false, label: `Opens ${openStr}` };
    }
  }

  return null;
}

function isDayInSpec(
  currentDay: string,
  daySpec: string,
  dayNames: string[],
): boolean {
  // Handle ranges like "Mo-Fr" or "Mo-Su"
  const rangeMatch = daySpec.match(/^([A-Za-z]{2})-([A-Za-z]{2})$/);
  if (rangeMatch) {
    const startIdx = dayNames.indexOf(rangeMatch[1]!);
    const endIdx = dayNames.indexOf(rangeMatch[2]!);
    const currentIdx = dayNames.indexOf(currentDay);
    if (startIdx === -1 || endIdx === -1 || currentIdx === -1) return false;
    if (startIdx <= endIdx) {
      return currentIdx >= startIdx && currentIdx <= endIdx;
    }
    // Wraps around (e.g., Fr-Mo)
    return currentIdx >= startIdx || currentIdx <= endIdx;
  }

  // Handle comma-separated like "Mo,Tu,We"
  const days = daySpec.split(",").map((d) => d.trim());
  return days.includes(currentDay);
}

function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0]!, 10);
  const m = parseInt(parts[1]!, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Convert raw OSM pub nodes to SearchPub with open status.
 */
export function toSearchPubs(nodes: OSMPubNode[], date: Date): SearchPub[] {
  return nodes.map((node) => {
    if (!node.openingHoursRaw) {
      return { ...node, openStatusLabel: "Hours unknown", isOpen: null };
    }

    const status = parseSimpleOpenStatus(node.openingHoursRaw, date);
    if (!status) {
      return { ...node, openStatusLabel: "Hours unknown", isOpen: null };
    }

    return {
      ...node,
      openStatusLabel: status.label,
      isOpen: status.isOpen,
    };
  });
}
