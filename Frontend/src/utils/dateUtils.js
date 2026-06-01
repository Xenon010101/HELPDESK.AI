/**
 * Unified Date Utility for HELPDESK.AI
 *
 * Safari-safe ISO-8601 parsing:
 * - Strips microseconds  (e.g. ".000000Z" → ".000Z")
 * - Replaces space separator with "T" (e.g. "2023-01-15 10:30:00")
 * - Normalises timezone offsets (+05:30 → Z via UTC conversion)
 * - Handles null / undefined / empty gracefully
 * - Returns "Invalid Date" string instead of throwing for bad input
 */

/**
 * Normalise an ISO-8601 date string so Safari's Date() constructor can parse it.
 *
 * Transformations applied (in order):
 *  1. Trim whitespace
 *  2. Replace space-separator with "T"
 *  3. Strip microseconds (7-digit fractional seconds → 3 digits)
 *  4. Ensure a trailing "Z" when no timezone info is present
 *
 * @param {string} dateStr - Raw date string from API / database
 * @returns {string} A normalised ISO string Safari can parse, or "" on bad input
 */
export function parseISO(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';

    let s = dateStr.trim();

    // Step 1: Replace space-separator with T
    s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d)/, '$1T$2');

    // Step 2: Strip microseconds (more than 3 decimal digits before Z / + / -)
    // e.g. "2023-01-15T10:30:00.000000Z" → "2023-01-15T10:30:00.000Z"
    // e.g. "2023-01-15T10:30:00.123456+05:30" → "2023-01-15T10:30:00.123+05:30"
    s = s.replace(/(\.\d{3})\d+(Z|[+-]\d{2}:\d{2}|$)/, '$1$2');

    // Step 3: Handle timezone offset (+05:30 style) — convert to UTC then re-express as Z.
    // Safari cannot parse "+05:30" directly in all versions.
    const offsetMatch = s.match(/^(.+?)([+-])(\d{2}):(\d{2})$/);
    if (offsetMatch) {
        const [, base, sign, hh, mm] = offsetMatch;
        // Build a temp string with Z and adjust manually
        const baseDate = new Date(base + 'Z');
        if (!isNaN(baseDate.getTime())) {
            const offsetMinutes = (parseInt(hh, 10) * 60 + parseInt(mm, 10)) * (sign === '+' ? -1 : 1);
            const utcMs = baseDate.getTime() + offsetMinutes * 60 * 1000;
            return new Date(utcMs).toISOString();
        }
    }

    // Step 4: If no timezone designator present at all, assume UTC
    if (!/Z$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(s)) {
        s = s + 'Z';
    }

    return s;
}

/**
 * Check whether a date string (or value) represents a valid date.
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {boolean}
 */
export function isValidDate(dateStr) {
    if (!dateStr) return false;
    if (dateStr instanceof Date) return !isNaN(dateStr.getTime());
    const normalised = parseISO(String(dateStr));
    if (!normalised) return false;
    const d = new Date(normalised);
    return !isNaN(d.getTime());
}

/**
 * Return a relative time string like "2 hours ago", "3 days ago", "just now".
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {string}
 */
export function getRelativeTime(dateStr) {
    if (!dateStr) return 'Unknown';
    let date;
    if (dateStr instanceof Date) {
        date = dateStr;
    } else {
        const normalised = parseISO(String(dateStr));
        if (!normalised) return 'Unknown';
        date = new Date(normalised);
    }

    if (isNaN(date.getTime())) return 'Unknown';

    const nowMs = Date.now();
    const diffMs = nowMs - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSec < 30) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    if (diffHrs < 24) return diffHrs === 1 ? '1 hour ago' : `${diffHrs} hours ago`;
    if (diffDays < 30) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    if (diffMonths < 12) return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

/**
 * Format a date string for display in ticket timelines.
 * Safari-safe: normalises the string before parsing.
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {string|null} Formatted date/time string, or null if input is empty
 */
export const formatTimelineDate = (dateStr) => {
    if (!dateStr) return null;

    let date;
    if (dateStr instanceof Date) {
        date = dateStr;
    } else {
        const normalised = parseISO(String(dateStr));
        if (!normalised) return 'Invalid Date';
        date = new Date(normalised);
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Return the user's current timezone abbreviation (e.g. "IST", "UTC", "PDT").
 * Falls back to "UTC" if the Intl API is unavailable.
 * Fixes timezone shift issues by explicitly forcing local display.
 * Handles Safari's strict ISO-8601 parsing requirements.
 */

/**
 * Normalize date string for cross-browser compatibility.
 * Safari is stricter than Chrome/Firefox about date formats.
 * @param {string} dateStr - Raw date string from database
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
const parseDate = (dateStr) => {
    if (!dateStr) return null;

    // If already a Date object, return it
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    return dateStr;
  }

    // Convert to string if needed
    const str = String(dateStr).trim();
    if (!str) return null;

    // Support epoch timestamps (milliseconds or seconds)
    if (/^\d+$/.test(str)) {
        const num = parseInt(str, 10);
        // If > 1e12, treat as milliseconds; otherwise seconds
        const ms = num > 1e12 ? num : num * 1000;
        const epochDate = new Date(ms);
        return isNaN(epochDate.getTime()) ? null : epochDate;
    }

    // Normalize common problematic formats for Safari
    let normalized = str
        // Replace space between date and time with 'T' (Safari requires 'T')
        .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/, '$1T$2')
        // Replace slashes with dashes (2024/01/01 -> 2024-01-01)
        .replace(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/, '$1-$2-$3')
        // Add leading zeros to month/day if needed (2024-1-1 -> 2024-01-01)
        .replace(/^(\d{4})-(\d{1})-(\d{1})/, '$1-0$2-0$3')
        .replace(/^(\d{4})-(\d{2})-(\d{1})/, '$1-$2-0$3')
        .replace(/^(\d{4})-(\d{1})-(\d{2})/, '$1-0$2-$3');

    // Try parsing the normalized string
    let date = new Date(normalized);

    // If that fails, try adding 'Z' for UTC interpretation
    if (isNaN(date.getTime())) {
        // Check if it's a date without timezone info
        if (!normalized.includes('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
            date = new Date(normalized + 'Z');
        }
    }

    // If still fails, try manual parsing for common formats
    if (isNaN(date.getTime())) {
        // Try parsing YYYY-MM-DD HH:MM:SS format
        const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
        if (match) {
            const [, year, month, day, hour, minute, second = '0'] = match;
            date = new Date(Date.UTC(
                parseInt(year, 10),
                parseInt(month, 10) - 1,
                parseInt(day, 10),
                parseInt(hour, 10),
                parseInt(minute, 10),
                parseInt(second, 10)
            ));
        }
    }

    // Final validation
    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
};

export const formatTimelineDate = (dateStr) => {
    const date = parseDate(dateStr);
    if (!date) return 'Invalid Date';

export const formatTimelineDate = (dateStr) => {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return null;

  const date = new Date(normalized);
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Returns the user's current timezone abbreviation (e.g. "IST", "PST").
 * Falls back to 'Local' when the Intl API is unavailable (very old browsers).
 *
 * @returns {string}
 */
export const getTimeZoneAbbr = () => {
    try {
        return (
            new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
                .formatToParts(new Date())
                .find((part) => part.type === 'timeZoneName')?.value || 'UTC'
        );
  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
      })
        .formatToParts(new Date())
        .find(part => part.type === 'timeZoneName')?.value || 'UTC';
    } catch (_e) {
        return 'UTC';
    }
};

/**
 * Format a date string with timezone abbreviation appended.
 * Safari-safe.
 * Formats a date with its timezone abbreviation appended.
 * Falls back to 'Processing...' when dateStr is falsy.
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {string}
 */
export const formatFullTimestamp = (dateStr) => {
    const formatted = formatTimelineDate(dateStr);
    if (!formatted || formatted === 'Invalid Date') return 'Processing...';
    return `${formatted} (${getTimeZoneAbbr()})`;
  const formatted = formatTimelineDate(dateStr);
  if (!formatted) return 'Processing...';
  return `${formatted} (${getTimeZoneAbbr()})`;
};

/**
 * Check if a date string is valid
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if the date is valid
 */
export const isValidDate = (dateStr) => {
    return parseDate(dateStr) !== null;
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string} dateStr - Date string
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (dateStr) => {
    const date = parseDate(dateStr);
    if (!date) return 'Unknown';

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

    return formatTimelineDate(dateStr);
};
