/**
 * Parse a date string in format YYYY-MM-DD as local date (not UTC)
 * This prevents timezone offset issues where dates appear one day earlier
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
