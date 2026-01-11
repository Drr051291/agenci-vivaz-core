import { format } from "date-fns";

/**
 * Parse a date string as local date (not UTC)
 * Handles both YYYY-MM-DD and full timestamp formats like YYYY-MM-DD HH:MM:SS+00
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) {
    return new Date(NaN);
  }
  
  // Extract just the date part (YYYY-MM-DD) from the string
  const datePart = dateString.split(' ')[0].split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date(NaN);
  }
  
  return new Date(year, month - 1, day);
}

/**
 * Safely format a date with fallback value
 */
export function safeFormatDate(
  dateString: string | null | undefined,
  formatStr: string,
  options?: { locale?: Locale },
  fallback: string = "—"
): string {
  if (!dateString) return fallback;
  
  try {
    const date = parseLocalDate(dateString);
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatStr, options);
  } catch {
    return fallback;
  }
}

type Locale = Parameters<typeof format>[2] extends { locale?: infer L } ? L : never;
