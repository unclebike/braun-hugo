export const TORONTO_TIME_ZONE = 'America/Toronto';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateInput(input: string | Date): Date | null {
  const value = input instanceof Date
    ? input
    : DATE_ONLY_RE.test(input)
      ? new Date(`${input}T12:00:00Z`)
      : new Date(input);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function formatTorontoDate(
  input: string | Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-CA'
): string | null {
  const parsed = parseDateInput(input);
  if (!parsed) return null;
  return parsed.toLocaleDateString(locale, { timeZone: TORONTO_TIME_ZONE, ...options });
}

export function formatTorontoTime(
  input: string | Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-CA'
): string | null {
  const parsed = parseDateInput(input);
  if (!parsed) return null;
  return parsed.toLocaleTimeString(locale, { timeZone: TORONTO_TIME_ZONE, ...options });
}
