import { describe, it, expect } from 'vitest';
import { parseDate, daysBetween, addDays, formatISODate } from './dates';

describe('dates', () => {
  it('parses YYYY-MM-DD as UTC midnight (TZ-independent)', () => {
    const d = parseDate('2024-07-02');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(6); // 0-indexed July
    expect(d.getUTCDate()).toBe(2);
    expect(d.getUTCHours()).toBe(0);
  });

  it('daysBetween returns whole-day difference (b - a)', () => {
    expect(daysBetween(parseDate('2024-01-01'), parseDate('2024-01-11'))).toBe(10);
    expect(daysBetween(parseDate('2024-01-11'), parseDate('2024-01-01'))).toBe(-10);
    expect(daysBetween(parseDate('2024-01-01'), parseDate('2024-01-01'))).toBe(0);
  });

  it('daysBetween spans across a leap day correctly', () => {
    expect(daysBetween(parseDate('2024-02-28'), parseDate('2024-03-01'))).toBe(2);
  });

  it('addDays shifts a date forward and back', () => {
    expect(formatISODate(addDays(parseDate('2025-08-05'), 330))).toBe('2026-07-01');
    expect(formatISODate(addDays(parseDate('2024-01-11'), -10))).toBe('2024-01-01');
  });

  it('formatISODate round-trips with parseDate', () => {
    expect(formatISODate(parseDate('2025-12-17'))).toBe('2025-12-17');
  });
});
