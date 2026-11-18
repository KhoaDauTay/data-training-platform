import { describe, expect, it } from 'vitest';
import {
  ackTour, gated, navLock, parseTour, readTour, startTour, tabOpen, TOUR_KEY, tourEscSkips, tourStep, welcomeNeeded, type TourFacts,
  bootPick,
} from '../src/onboarding';
import type { KV } from '../src/storage';

const mem = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const base: TourFacts = { onFirst: true, skipped: false, tour: { step: 0, knows: false }, ran: false, exampleRan: false, columnsSeen: false, shapeOk: false, solved: false };
const at = (f: Partial<TourFacts>, step = 0): number | undefined => tourStep({ ...base, tour: { step, knows: false }, ...f });

describe('onboarding (v4 §B, Plan 7 V8–V9)', () => {
  it('pref tour: chỉ object mới là pref; bước kẹp 0..8; knows chỉ nhận true', () => {
    expect(parseTour(undefined)).toBeUndefined();
    expect(parseTour(null)).toBeUndefined();
    expect(parseTour([1])).toBeUndefined();
    expect(parseTour('x')).toBeUndefined();
    expect(parseTour({})).toEqual({ step: 0, knows: false });
    expect(parseTour({ step: 3.5, knows: 'yes' })).toEqual({ step: 0, knows: false });
    expect(parseTour({ step: 99, knows: true })).toEqual({ step: 8, knows: true });
    expect(parseTour({ step: -2 })).toEqual({ step: 0, knows: false });
  });

  it('startTour / ackTour: bước chỉ tiến, không có pref thì ack không ghi gì', () => {
    const s = mem();
    ackTour(3, s);
    expect(s.data.has(TOUR_KEY)).toBe(false);
    startTour(false, s);
    ackTour(3, s);
    ackTour(2, s);
    expect(readTour(s)).toEqual({ step: 3, knows: false });
    startTour(true, s);
    expect(readTour(s)).toEqual({ step: 8, knows: true });
  });

  it('màn chào chỉ cho người mới: chưa xong việc nào, chưa có pref tour, chưa bỏ qua hướng dẫn cũ', () => {
    expect(welcomeNeeded(0, undefined, false)).toBe(true);
    expect(welcomeNeeded(1, undefined, false)).toBe(false);
    expect(welcomeNeeded(0, { step: 0, knows: false }, false)).toBe(false);
    expect(welcomeNeeded(0, undefined, true)).toBe(false);
  });

  it('tour đi đúng 8 bước, suy ra từ việc người chơi đã làm', () => {
    expect(at({})).toBe(1);
    expect(at({}, 1)).toBe(2);
    expect(at({ ran: true }, 1)).toBe(3);
    expect(at({ ran: true }, 3)).toBe(4);
    expect(at({ ran: true, exampleRan: true }, 3)).toBe(5);
    expect(at({ ran: true, exampleRan: true, columnsSeen: true }, 3)).toBe(6);
    expect(at({ ran: true, exampleRan: true, columnsSeen: true, shapeOk: true }, 3)).toBe(7);
  });

  it('làm khác thứ tự thì nhảy tới bước tương ứng; tải lại không lùi', () => {
    expect(at({ solved: true }, 1)).toBe(8); // Submit at once
    expect(at({ solved: true }, 8)).toBeUndefined(); // tour over
    expect(at({}, 8)).toBeUndefined(); // v11 B1: tour over, another domain's unsolved first ticket
    expect(at({ ran: true, columnsSeen: true }, 3)).toBe(4); // the lesson step still waits
    expect(at({}, 5)).toBe(6); // reload: lastRun is gone, steps 1–5 were passed
  });

  it('không có tour: ngoài việc 1, đã bỏ qua, đã biết SQL, chưa qua màn chào', () => {
    expect(at({ onFirst: false })).toBeUndefined();
    expect(at({ skipped: true })).toBeUndefined();
    expect(tourStep({ ...base, tour: { step: 0, knows: true } })).toBeUndefined();
    expect(tourStep({ ...base, tour: undefined })).toBeUndefined();
  });

  it('mở dần chỉ cho người bắt đầu từ màn chào và chưa biết SQL (V9)', () => {
    expect(gated(undefined)).toBe(false);
    expect(gated({ step: 0, knows: true })).toBe(false);
    expect(gated({ step: 4, knows: false })).toBe(true);
  });

  it('khóa nav: Sandbox, Dữ liệu tới khi xong việc 1; Bảng điều hành tới khi xong việc 2; Lộ trình, Luyện SQL không khóa', () => {
    const order = ['ch1-01', 'ch1-02', 'ch1-03'];
    expect(navLock('sandbox', new Set(), order, true)).toBe('lock.afterTask1');
    expect(navLock('data', new Set(), order, true)).toBe('lock.afterTask1');
    expect(navLock('dashboard', new Set(), order, true)).toBe('lock.afterTask1');
    expect(navLock('dashboard', new Set(['ch1-01']), order, true)).toBeUndefined(); // L86: starter cards from task 1
    expect(navLock('dashboard', new Set(['ch1-01', 'ch1-02']), order, true)).toBeUndefined();
    expect(navLock('data', new Set(['ch1-01']), order, true)).toBeUndefined();
    expect(navLock('learn', new Set(), order, true)).toBeUndefined();
    expect(navLock('sandbox', new Set(), order, false)).toBeUndefined();
  });

  it('tab có `from` hiện khi việc đó đã tới; người không bị mở dần thấy đủ', () => {
    const reached = new Set(['ch1-01', 'ch1-02', 'ch1-03']);
    expect(tabOpen('ch1-03', reached, true)).toBe(true);
    expect(tabOpen('ch3-01', reached, true)).toBe(false);
    expect(tabOpen(undefined, reached, true)).toBe(true);
    expect(tabOpen('ch3-01', reached, false)).toBe(true);
  });
  it('Esc chỉ bỏ tour khi thấy dấu của Boon và không ai khác nhận Esc (code review v10 #1)', () => {
    expect(tourEscSkips({ markVisible: true, owned: false })).toBe(true);
    expect(tourEscSkips({ markVisible: false, owned: false })).toBe(false); // ở trang khác, dấu nằm trong workspace ẩn
    expect(tourEscSkips({ markVisible: true, owned: true })).toBe(false); // đang đóng menu ⋯ / sổ tay / popup editor
  });
});

describe('bootPick (v12.0 P1/P2)', () => {
  it('domain in the hash wins, then the pref, then Logistics for anyone who is not new', () => {
    expect(bootPick('ecommerce', 'logistics', true)).toBe('ecommerce');
    expect(bootPick(undefined, 'ecommerce', true)).toBe('ecommerce');
    expect(bootPick(undefined, 'general', false)).toBe('general');
    expect(bootPick(undefined, undefined, false)).toBe('logistics');
    expect(bootPick(undefined, 'finance', false)).toBe('logistics'); // not live
  });
  it('a first visit with nothing remembered asks (undefined = the welcome picker)', () => {
    expect(bootPick(undefined, undefined, true)).toBeUndefined();
    expect(bootPick(undefined, 42, true)).toBeUndefined();
  });
});
