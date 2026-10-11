/** All money in this app is stored and passed around as integer cents. */

export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Cents -> a plain `$12.50` string for inputs and API responses. */
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** A user-typed dollar amount -> integer cents. Returns null if unparseable. */
export function dollarsToCents(value: string | number): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(value.trim());
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** `2026-10-11` for `<input type="date">` and API date params. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Midnight UTC for a `YYYY-MM-DD` string, matching how slots store dates. */
export function fromDateInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
