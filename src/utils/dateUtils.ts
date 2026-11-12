/**
 * Real-time date and time utilities for OmniStock
 * Base reference: Current real system time
 */

export function getRelativeDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatCurrentDateFull(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(now);
}

export function formatCurrentTime(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now);
}

export function getCalculatedDaysToExpiry(expiryDateStr: string): number | undefined {
  if (!expiryDateStr || expiryDateStr === 'N/A') return undefined;
  const parsed = new Date(expiryDateStr);
  if (isNaN(parsed.getTime())) return undefined;
  const diffTime = parsed.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
