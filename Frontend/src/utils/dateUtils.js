/**
 * Unified Date Utility for HELPDESK.AI
 * Compatible with Safari, Firefox, and Chrome.
 * Fixes Safari ISO-8601 parsing issues by normalizing date strings.
 */

/**
 * Normalize a date string for Safari compatibility.
 * Safari fails to parse "YYYY-MM-DDTHH:MM:SS" (no TZ, no 'Z').
 * This converts it to a format Safari understands.
 */
const normalizeDateString = (dateStr) => {
  if (!dateStr) return null;

  // If it already has timezone info, return as-is
  if (dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('T')) {
    // Replace "YYYY-MM-DDTHH:MM:SS" with "YYYY-MM-DDTHH:MM:SSZ" if no TZ
    if (dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
      return dateStr + 'Z';
    }
    return dateStr;
  }

  // Raw date without time - assume UTC
  return dateStr + 'T00:00:00Z';
};

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

export const getTimeZoneAbbr = () => {
  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
      })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value || 'UTC'
    );
  } catch (_e) {
    return 'UTC';
  }
};

export const formatFullTimestamp = (dateStr) => {
  const formatted = formatTimelineDate(dateStr);
  if (!formatted) return 'Processing...';
  return `${formatted} (${getTimeZoneAbbr()})`;
};
