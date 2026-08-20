export const CAREER_START = 2020;

const BRISBANE = "Australia/Brisbane";

/**
 * Hour-of-day and weekday-ness in Brisbane, independent of the caller's
 * timezone. Uses Intl rather than a hardcoded UTC+10 offset so this stays
 * correct if Queensland ever adopts daylight saving.
 */
export function brisbaneParts(now: Date): { hour: number; weekday: boolean } {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = fmt.formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const dayPart = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  // "24" is a legitimate en-AU rendering of midnight; normalise it to 0.
  const hour = Number(hourPart) % 24;
  const weekday = !["Sat", "Sun"].includes(dayPart);

  return { hour, weekday };
}

export function careerYears(now: Date = new Date()): number {
  const year = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: BRISBANE,
      year: "numeric",
    }).format(now),
  );
  return year - CAREER_START;
}

/**
 * Time-of-day status shown under the core node.
 *
 * Note vs. the design: its final branch was `weekday ? "fiddling" : "projecting"`,
 * but weekday 08:00–16:59 is caught by the `working` case above, so only weekend
 * hours ever reached it and "fiddling" was unreachable. Collapsed to one value.
 */
export function statusWord(now: Date = new Date()): string {
  const { hour, weekday } = brisbaneParts(now);

  if (hour < 7) return "sleeping";
  if (hour < 8) return "waking up";
  if (weekday && hour < 17) return "working";
  if (hour >= 17 && hour < 19) return "cooking";
  if (hour >= 19 && hour < 22) return weekday ? "projecting" : "relaxing";
  if (hour >= 22) return "fiddling with the homelab";
  return "projecting";
}
