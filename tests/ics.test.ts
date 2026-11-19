import { describe, expect, it } from 'vitest';
import { fold, reminderIcs } from '../src/ics';

const ics = reminderIcs({
  weekday: 1, time: '19:30', summary: 'Học SQL với BoonData', description: 'Buổi học hằng tuần bạn tự đặt; mở lại, nhé. Mở BoonData:',
  url: 'https://example.org/app/', now: new Date(2026, 10, 20, 8, 0), // a Friday
});
const lines = ics.split('\r\n');

describe('reminderIcs (RFC 5545, minimal)', () => {
  it('is a weekly event from the next chosen weekday, floating local time', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lines).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(lines).toContain('DTSTART:20261123T193000');
    expect(lines.some((l) => /^DTSTAMP:\d{8}T\d{6}Z$/.test(l))).toBe(true);
    expect(lines.some((l) => l.startsWith('UID:'))).toBe(true);
  });
  it('today counts when it is the chosen day; month and year ends', () => {
    const at = (weekday: number, now: Date) => reminderIcs({ weekday, time: '07:05', summary: 's', description: 'd', url: 'u', now });
    expect(at(5, new Date(2026, 10, 20, 8, 0))).toContain('DTSTART:20261120T070500');
    expect(at(4, new Date(2026, 11, 31))).toContain('DTSTART:20261231T070500');
    expect(at(5, new Date(2026, 11, 31))).toContain('DTSTART:20270101T070500');
  });
  it('escapes TEXT and folds every line at 75 octets (UTF-8), never inside a character', () => {
    expect(ics.replace(/\r\n /g, '')).toContain('DESCRIPTION:Buổi học hằng tuần bạn tự đặt\\; mở lại\\, nhé. Mở BoonData: https://example.org/app/\r\n');
    const enc = new TextEncoder();
    for (const l of lines) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    const long = `SUMMARY:${'ồ'.repeat(60)}`;
    const folded = fold(long);
    expect(folded.split('\r\n').length).toBeGreaterThan(1);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
    for (const l of folded.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
  });
  it('carries nothing about the player: no storage key, task id or XP', () => {
    expect(ics).not.toMatch(/cargo-query|ch\d+-\d+|ecom-|fin-|g-[a-z]|\bXP\b/);
  });
});
