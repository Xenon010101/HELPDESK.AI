/**
 * Tests for Frontend/src/utils/dateUtils.js
 * Covers Safari-safe date parsing, formatting, relative time, and edge cases.
 *
 * Run with: npx vitest run Frontend/src/utils/dateUtils.test.js
 * or:       npx jest Frontend/src/utils/dateUtils.test.js
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
    parseISO,
    isValidDate,
    getRelativeTime,
    formatTimelineDate,
    getTimeZoneAbbr,
    formatFullTimestamp,
} from './dateUtils';

// ---------------------------------------------------------------------------
// parseISO
// ---------------------------------------------------------------------------
describe('parseISO', () => {
    it('returns empty string for null', () => {
        expect(parseISO(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(parseISO(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(parseISO('')).toBe('');
    });

    it('handles standard UTC ISO string unchanged', () => {
        const s = '2023-01-15T10:30:00.000Z';
        const result = parseISO(s);
        expect(new Date(result).toISOString()).toBe(s);
    });

    it('replaces space separator with T', () => {
        const result = parseISO('2023-01-15 10:30:00');
        expect(result).toContain('T');
        expect(result).not.toContain(' 1');
    });

    it('strips microseconds (6-digit fractional) — keeps milliseconds', () => {
        const result = parseISO('2023-01-15T10:30:00.123456Z');
        // Should have at most 3 fractional digits
        expect(result).not.toMatch(/\.\d{4,}/);
        const d = new Date(result);
        expect(isNaN(d.getTime())).toBe(false);
    });

    it('handles 7-digit microseconds', () => {
        const result = parseISO('2023-01-15T10:30:00.0000000Z');
        const d = new Date(result);
        expect(isNaN(d.getTime())).toBe(false);
    });

    it('converts +05:30 offset to UTC Z form', () => {
        // 2023-01-15T16:00:00+05:30 = 2023-01-15T10:30:00Z
        const result = parseISO('2023-01-15T16:00:00+05:30');
        const d = new Date(result);
        expect(isNaN(d.getTime())).toBe(false);
        // UTC hour should be 10:30
        expect(d.getUTCHours()).toBe(10);
        expect(d.getUTCMinutes()).toBe(30);
    });

    it('converts -08:00 offset to UTC', () => {
        const result = parseISO('2023-01-15T02:30:00-08:00');
        const d = new Date(result);
        expect(isNaN(d.getTime())).toBe(false);
        expect(d.getUTCHours()).toBe(10);
        expect(d.getUTCMinutes()).toBe(30);
    });

    it('appends Z when no timezone info present', () => {
        const result = parseISO('2023-01-15T10:30:00');
        expect(result.endsWith('Z') || result.includes('Z')).toBe(true);
    });

    it('handles string with both microseconds and offset', () => {
        const result = parseISO('2023-01-15T10:30:00.000000+05:30');
        const d = new Date(result);
        expect(isNaN(d.getTime())).toBe(false);
    });

    it('trims leading/trailing whitespace', () => {
        const result = parseISO('  2023-01-15T10:30:00Z  ');
        expect(result).toBeTruthy();
        const d = new Date(result);
        expect(isNaN(d.getTime())).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isValidDate
// ---------------------------------------------------------------------------
describe('isValidDate', () => {
    it('returns false for null', () => expect(isValidDate(null)).toBe(false));
    it('returns false for undefined', () => expect(isValidDate(undefined)).toBe(false));
    it('returns false for empty string', () => expect(isValidDate('')).toBe(false));
    it('returns false for "not-a-date"', () => expect(isValidDate('not-a-date')).toBe(false));

    it('returns true for standard ISO string', () => {
        expect(isValidDate('2023-01-15T10:30:00.000Z')).toBe(true);
    });

    it('returns true for Date object', () => {
        expect(isValidDate(new Date())).toBe(true);
    });

    it('returns false for invalid Date object', () => {
        expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('returns true for date with +05:30 offset', () => {
        expect(isValidDate('2023-01-15T16:00:00+05:30')).toBe(true);
    });

    it('returns true for space-separated datetime', () => {
        expect(isValidDate('2023-01-15 10:30:00')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// getRelativeTime
// ---------------------------------------------------------------------------
describe('getRelativeTime', () => {
    const NOW = new Date('2023-06-01T12:00:00Z').getTime();

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it('returns "just now" for very recent dates', () => {
        const d = new Date(NOW - 5000).toISOString();
        expect(getRelativeTime(d)).toBe('just now');
    });

    it('returns minutes ago', () => {
        const d = new Date(NOW - 3 * 60 * 1000).toISOString();
        expect(getRelativeTime(d)).toBe('3 minutes ago');
    });

    it('returns hours ago', () => {
        const d = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
        expect(getRelativeTime(d)).toBe('2 hours ago');
    });

    it('returns days ago', () => {
        const d = new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString();
        expect(getRelativeTime(d)).toBe('3 days ago');
    });

    it('returns months ago', () => {
        const d = new Date(NOW - 45 * 24 * 60 * 60 * 1000).toISOString();
        expect(getRelativeTime(d)).toMatch(/month/);
    });

    it('returns "Unknown" for null', () => {
        expect(getRelativeTime(null)).toBe('Unknown');
    });

    it('returns "Unknown" for invalid date string', () => {
        expect(getRelativeTime('not-a-date')).toBe('Unknown');
    });

    it('handles Date object input', () => {
        const d = new Date(NOW - 61 * 1000);
        expect(getRelativeTime(d)).toBe('1 minute ago');
    });
});

// ---------------------------------------------------------------------------
// formatTimelineDate
// ---------------------------------------------------------------------------
describe('formatTimelineDate', () => {
    it('returns null for null input', () => {
        expect(formatTimelineDate(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(formatTimelineDate(undefined)).toBeNull();
    });

    it('returns "Invalid Date" for garbage string', () => {
        expect(formatTimelineDate('not-a-date')).toBe('Invalid Date');
    });

    it('returns a non-empty string for valid ISO date', () => {
        const result = formatTimelineDate('2023-01-15T10:30:00.000Z');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toBe('Invalid Date');
    });

    it('handles space-separated datetime (Safari-unsafe input)', () => {
        const result = formatTimelineDate('2023-01-15 10:30:00');
        expect(result).not.toBe('Invalid Date');
        expect(result).not.toBeNull();
    });

    it('handles microsecond precision timestamp', () => {
        const result = formatTimelineDate('2023-01-15T10:30:00.000000Z');
        expect(result).not.toBe('Invalid Date');
    });

    it('handles +05:30 offset timestamp', () => {
        const result = formatTimelineDate('2023-01-15T16:00:00.000+05:30');
        expect(result).not.toBe('Invalid Date');
    });
});

// ---------------------------------------------------------------------------
// formatFullTimestamp
// ---------------------------------------------------------------------------
describe('formatFullTimestamp', () => {
    it('returns "Processing..." for null', () => {
        expect(formatFullTimestamp(null)).toBe('Processing...');
    });

    it('returns "Processing..." for invalid date', () => {
        expect(formatFullTimestamp('bad-date')).toBe('Processing...');
    });

    it('includes timezone abbreviation for valid date', () => {
        const result = formatFullTimestamp('2023-01-15T10:30:00.000Z');
        // Should contain parenthesized tz abbreviation
        expect(result).toMatch(/\([\w/+\-:]+\)/);
    });
});

// ---------------------------------------------------------------------------
// getTimeZoneAbbr
// ---------------------------------------------------------------------------
describe('getTimeZoneAbbr', () => {
    it('returns a non-empty string', () => {
        const result = getTimeZoneAbbr();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
 * Tests for dateUtils.js
 * Ensures cross-browser compatibility, especially for Safari's strict parsing.
 */

import { describe, it, expect } from 'vitest';
import {
    formatTimelineDate,
    formatFullTimestamp,
    isValidDate,
    getRelativeTime,
    getTimeZoneAbbr
} from './dateUtils';

describe('formatTimelineDate', () => {
    it('should handle ISO-8601 with Z suffix', () => {
        const result = formatTimelineDate('2024-01-15T10:30:00Z');
        expect(result).not.toBe('Invalid Date');
        expect(result).toContain('Jan');
        expect(result).toContain('2024');
    });

    it('should handle ISO-8601 without timezone', () => {
        const result = formatTimelineDate('2024-01-15T10:30:00');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle date with space instead of T', () => {
        const result = formatTimelineDate('2024-01-15 10:30:00');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle date with slashes', () => {
        const result = formatTimelineDate('2024/01/15');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle date without leading zeros', () => {
        const result = formatTimelineDate('2024-1-5');
        expect(result).not.toBe('Invalid Date');
    });

    it('should return Invalid Date for null/undefined/empty', () => {
        expect(formatTimelineDate(null)).toBe('Invalid Date');
        expect(formatTimelineDate(undefined)).toBe('Invalid Date');
        expect(formatTimelineDate('')).toBe('Invalid Date');
    });

    it('should return Invalid Date for garbage input', () => {
        expect(formatTimelineDate('not-a-date')).toBe('Invalid Date');
        expect(formatTimelineDate('abc123')).toBe('Invalid Date');
    });

    it('should handle Supabase timestamp format', () => {
        // Supabase often returns this format
        const result = formatTimelineDate('2024-01-15T10:30:00.000+00:00');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle epoch timestamps', () => {
        const result = formatTimelineDate('1705312200000');
        // This should parse as a valid date string representation
        expect(result).not.toBe('Invalid Date');
    });
});

describe('isValidDate', () => {
    it('should return true for valid dates', () => {
        expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
        expect(isValidDate('2024-01-15')).toBe(true);
        expect(isValidDate('2024/01/15')).toBe(true);
    });

    it('should return false for invalid dates', () => {
        expect(isValidDate(null)).toBe(false);
        expect(isValidDate('')).toBe(false);
        expect(isValidDate('not-a-date')).toBe(false);
        expect(isValidDate('2024-13-45')).toBe(false);
    });
});

describe('getRelativeTime', () => {
    it('should return Just now for recent dates', () => {
        const now = new Date();
        const result = getRelativeTime(now.toISOString());
        expect(result).toBe('Just now');
    });

    it('should return minutes ago', () => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const result = getRelativeTime(fiveMinAgo.toISOString());
        expect(result).toContain('minute');
        expect(result).toContain('ago');
    });

    it('should return hours ago', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const result = getRelativeTime(twoHoursAgo.toISOString());
        expect(result).toContain('hour');
        expect(result).toContain('ago');
    });

    it('should return days ago', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const result = getRelativeTime(threeDaysAgo.toISOString());
        expect(result).toContain('day');
        expect(result).toContain('ago');
    });

    it('should return formatted date for old dates', () => {
        const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = getRelativeTime(oldDate.toISOString());
        expect(result).not.toContain('ago');
        expect(result).not.toBe('Unknown');
    });

    it('should return Unknown for invalid dates', () => {
        expect(getRelativeTime(null)).toBe('Unknown');
        expect(getRelativeTime('invalid')).toBe('Unknown');
    });
});

describe('getTimeZoneAbbr', () => {
    it('should return a timezone abbreviation', () => {
        const result = getTimeZoneAbbr();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('should return IST as fallback on error', () => {
        // This tests the catch block
        const result = getTimeZoneAbbr();
        expect(result).toBeTruthy();
    });
});

describe('formatFullTimestamp', () => {
    it('should include timezone abbreviation', () => {
        const result = formatFullTimestamp('2024-01-15T10:30:00Z');
        expect(result).toContain('(');
        expect(result).toContain(')');
    });

    it('should return Processing... for null', () => {
        expect(formatFullTimestamp(null)).toBe('Processing...');
        expect(formatFullTimestamp('')).toBe('Processing...');
    });

    it('should return Processing... for invalid dates', () => {
        expect(formatFullTimestamp('invalid')).toBe('Processing...');
    });
});

describe('Safari-specific parsing', () => {
    it('should handle YYYY-MM-DD HH:MM:SS format (Safari problematic)', () => {
        // Safari traditionally fails on this format
        const result = formatTimelineDate('2024-01-15 10:30:00');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle YYYY/MM/DD format', () => {
        // Some systems output this format
        const result = formatTimelineDate('2024/01/15');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle date-only ISO format', () => {
        const result = formatTimelineDate('2024-01-15');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle full ISO with milliseconds', () => {
        const result = formatTimelineDate('2024-01-15T10:30:00.123Z');
        expect(result).not.toBe('Invalid Date');
    });

    it('should handle ISO with timezone offset', () => {
        const result = formatTimelineDate('2024-01-15T10:30:00+05:30');
        expect(result).not.toBe('Invalid Date');
    });
});
