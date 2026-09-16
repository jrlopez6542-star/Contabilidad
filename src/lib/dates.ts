/**
 * America/Bogotá helpers (UTC-5 year-round, no DST).
 * "Today" and day ranges for caja / audit filters use this zone.
 */

const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

/** YYYY-MM-DD for a Date as seen in America/Bogotá. */
export function bogotaDateString(date: Date = new Date()): string {
  const bogota = new Date(date.getTime() + BOGOTA_OFFSET_MS);
  const y = bogota.getUTCFullYear();
  const m = String(bogota.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bogota.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Start/end of a Bogotá calendar day as UTC Date bounds (for Prisma filters). */
export function bogotaDayRange(dateStr: string): { start: Date; end: Date } {
  // dateStr is YYYY-MM-DD in Bogotá → start = that local midnight = UTC+5h earlier
  const start = new Date(`${dateStr}T00:00:00.000-05:00`);
  // exclusive end of next day for cleaner gte/lt queries
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function formatDateTimeBogota(
  date: Date | string | null | undefined
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
