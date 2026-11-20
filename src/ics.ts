/**
 * V22-C (L209): a weekly reminder the player adds to their own calendar. Minimal RFC 5545, built on the device, never sent
 * anywhere; it holds the chosen time, the texts passed in and the site link, nothing about progress.
 */
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const pad = (n: number): string => String(n).padStart(2, '0');
const text = (s: string): string => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

/** Content lines are folded at 75 octets (UTF-8), never inside a character; a continuation starts with one space. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

export interface Reminder {
  /** 0 = Sunday (Date.getDay). */
  weekday: number;
  /** HH:MM, local (floating) time. */
  time: string;
  summary: string;
  description: string;
  url: string;
  now: Date;
}

/** A weekly 30-minute event from the next `weekday` (today included) at `time`, with an alarm at its start. */
export function reminderIcs(r: Reminder): string {
  const [hh, mm] = r.time.split(':');
  const first = new Date(r.now.getFullYear(), r.now.getMonth(), r.now.getDate() + ((r.weekday - r.now.getDay() + 7) % 7));
  const start = `${first.getFullYear()}${pad(first.getMonth() + 1)}${pad(first.getDate())}T${hh}${mm}00`;
  const stamp = r.now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const day = BYDAY[r.weekday];
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BoonData//Weekly reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:boondata-${day}-${hh}${mm}-${stamp}@boondata`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, 'DURATION:PT30M',
    `RRULE:FREQ=WEEKLY;BYDAY=${day}`, `SUMMARY:${text(r.summary)}`, `DESCRIPTION:${text(`${r.description} ${r.url}`)}`, `URL:${r.url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text(r.summary)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
}
