export type TimeInput = string | number | Date;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Date-only strings ("2026-10-05") are calendar days, not instants: parse them as local midnight. */
export function parseTime(value: TimeInput | null | undefined): { date: Date; dateOnly: boolean } | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const match = DATE_ONLY.exec(value);
    if (match) {
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return Number.isNaN(date.getTime()) ? null : { date, dateOnly: true };
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false };
}

function startOfDay(ms: number) { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

/** "just now", "4 minutes ago", "yesterday", "in 3 days", "Sep 8, 2026" — never a raw ISO string. */
export function relativeTime(value: TimeInput | null | undefined, now: number = Date.now()): string {
  const parsed = parseTime(value);
  if (!parsed) return "—";
  const { date, dateOnly } = parsed;
  if (dateOnly) {
    const days = Math.round((date.getTime() - startOfDay(now)) / DAY);
    if (Math.abs(days) < 14) return days === 0 ? "today" : rtf.format(days, "day");
    if (Math.abs(days) < 60) return rtf.format(Math.round(days / 7), "week");
  } else {
    const diff = date.getTime() - now;
    const abs = Math.abs(diff);
    if (abs < 45_000) return "just now";
    if (abs < HOUR) return rtf.format(Math.round(diff / MINUTE), "minute");
    if (abs < DAY) return rtf.format(Math.round(diff / HOUR), "hour");
    if (abs < 14 * DAY) return rtf.format(Math.round(diff / DAY), "day");
    if (abs < 60 * DAY) return rtf.format(Math.round(diff / (7 * DAY)), "week");
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/** Full, unambiguous time for the hover / long-press / screen-reader detail. */
export function exactTime(value: TimeInput | null | undefined): string {
  const parsed = parseTime(value);
  if (!parsed) return "";
  return parsed.dateOnly
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(parsed.date)
    : new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(parsed.date);
}

/** "2026-10-19" → "Oct 19". Parsed as UTC so the calendar day never shifts with the viewer's time zone. */
export function shortDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}
