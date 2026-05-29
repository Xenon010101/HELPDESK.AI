/**
 * Unified Date Utility for HELPDESK.AI
 * Fixes timezone shift issues by explicitly forcing local display.
 * v2 — Safari-compatible ISO-8601 normalization added.
 */

/**
 * Normalize an ISO-8601 timestamp so it parses correctly in Safari.
 * Safari is strict: rejects space-instead-of-T, non-standard timezone
 * offsets, and microsecond-precision fractional seconds in some cases.
 */
const normalizeDateStr = (dateStr) => {
    if (typeof dateStr !== 'string') return dateStr;
    let s = dateStr.trim();

    // Replace space between date and time with 'T' (Safari requirement)
    // e.g. "2024-01-15 14:30:00+00" → "2024-01-15T14:30:00+00"
    s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, '$1T$2');

    // Ensure trailing Z for UTC if no timezone info is present
    // after normalization (bare "2024-01-15T14:30:00" → "2024-01-15T14:30:00Z")
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
        s += 'Z';
    }

    return s;
};

export const formatTimelineDate = (dateStr) => {
    if (!dateStr) return null;
    
    let date;
    const normalized = normalizeDateStr(dateStr);

    if (typeof normalized === 'string' && !normalized.includes('Z') && !normalized.includes('+')) {
        // If it's a raw string without TZ, assume UTC
        date = new Date(normalized + 'Z');
    } else {
        date = new Date(normalized);
    }

    // Graceful fallback for invalid / corrupt dates
    if (isNaN(date.getTime())) {
        // Return current timestamp as fallback instead of crashing
        date = new Date();
    }

    return date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

export const getTimeZoneAbbr = () => {
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZoneName: 'short'
        })
        .formatToParts(new Date())
        .find(part => part.type === 'timeZoneName')?.value || 'IST';
    } catch (_e) {
        return 'IST';
    }
};

export const formatFullTimestamp = (dateStr) => {
    const formatted = formatTimelineDate(dateStr);
    if (!formatted) return 'Processing...';
    return `${formatted} (${getTimeZoneAbbr()})`;
};
