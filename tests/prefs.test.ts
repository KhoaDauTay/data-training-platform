import { describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { PREFS_KEY } from '../src/i18n';
import { getTheme, parseThemePref, resolveTheme, setTheme } from '../src/theme';
import { stepKey, ticketOfKey } from '../src/save';
import { readDraft, SANDBOX_STARTER, session, writeDraft } from '../src/session';
import { app, initialDoc } from '../src/state';
import { COACH_KEY, coachDone } from '../src/ui/coach';
import { parseSidePref, SIDE_KEY } from '../src/ui/sidebar';
import { LAYOUT_KEY, parseLayout } from '../src/ui/splitter';

const store = (key: string, raw: string | null) => ({ getItem: (k: string) => (k === key ? raw : null), setItem: () => {} });

describe('splitter: kích thước đọc từ storage', () => {
  it('giá trị hợp lệ được giữ, ngoài giới hạn bị kẹp', () => {
    expect(parseLayout({ col: 50, row: 30 })).toEqual({ col: 50, row: 30 });
    expect(parseLayout({ col: 99, row: 1 })).toEqual({ col: 60, row: 20 });
  });

  it('không phải số hữu hạn → mặc định (không ra NaN%)', () => {
    expect(parseLayout({ col: 'x', row: null })).toEqual({ col: 40, row: 45 });
    expect(parseLayout({ col: '50', row: Infinity })).toEqual({ col: 40, row: 45 });
    expect(parseLayout(undefined)).toEqual({ col: 40, row: 45 });
    expect(parseLayout([1, 2])).toEqual({ col: 40, row: 45 });
    expect(parseLayout('oops')).toEqual({ col: 40, row: 45 });
  });

  it('LAYOUT_KEY không đổi', () => {
    expect(LAYOUT_KEY).toBe('cargo-query/layout');
  });
});

describe('coach-done đọc từ storage', () => {
  it('chỉ true mới là đã bỏ qua', () => {
    expect(coachDone(store(COACH_KEY, 'true'))).toBe(true);
    expect(coachDone(store(COACH_KEY, '"false"'))).toBe(false);
    expect(coachDone(store(COACH_KEY, '1'))).toBe(false);
    expect(coachDone(store(COACH_KEY, '{oops'))).toBe(false);
    expect(coachDone(store(COACH_KEY, null))).toBe(false);
    expect(coachDone(undefined)).toBe(false);
  });
});

describe('nội dung editor lúc mở ticket', () => {
  it('draft có chữ → giữ draft', () => {
    expect(initialDoc('SELECT 1', 'SELECT *')).toBe('SELECT 1');
  });
  it('draft thiếu, rỗng hoặc chỉ khoảng trắng → starter', () => {
    expect(initialDoc(undefined, 'SELECT *')).toBe('SELECT *');
    expect(initialDoc('', 'SELECT *')).toBe('SELECT *');
    expect(initialDoc('  \n\t', 'SELECT *')).toBe('SELECT *');
  });
  it('không có starter → draft hoặc chuỗi rỗng', () => {
    expect(initialDoc('  ', undefined)).toBe('  ');
    expect(initialDoc(undefined, undefined)).toBe('');
  });
});

describe('khóa ticketId#step', () => {
  it('dựng và đọc ở một chỗ', () => {
    expect(stepKey('ch1-05', 2)).toBe('ch1-05#2');
    expect(ticketOfKey(stepKey('ch1-05', 2))).toBe('ch1-05');
  });
});

describe('theme (L42): trong cargo-query/prefs, cạnh lang', () => {
  const mem = (init: Record<string, string> = {}) => {
    const m = new Map(Object.entries(init));
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it('chỉ light / dark được giữ; thiếu, rác hay storage lỗi → system', () => {
    expect(getTheme(mem({ [PREFS_KEY]: '{"theme":"dark"}' }))).toBe('dark');
    expect(getTheme(mem({ [PREFS_KEY]: '{"theme":"light"}' }))).toBe('light');
    for (const raw of ['{"theme":"blue"}', '{"theme":1}', '{oops', '"dark"', 'null', '[]']) expect(getTheme(mem({ [PREFS_KEY]: raw }))).toBe('system');
    expect(getTheme(mem())).toBe('system');
    expect(getTheme({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe('system');
    expect(parseThemePref(undefined)).toBe('system');
  });

  it('ghi theme giữ nguyên lang (merge như setLang)', () => {
    const s = mem({ [PREFS_KEY]: '{"lang":"en"}' });
    setTheme('dark', s);
    expect(JSON.parse(s.m.get(PREFS_KEY)!)).toEqual({ lang: 'en', theme: 'dark' });
    setTheme('system', s);
    expect(JSON.parse(s.m.get(PREFS_KEY)!)).toEqual({ lang: 'en', theme: 'system' });
  });

  it('system theo OS, light/dark cố định', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('script trong <head> của index.html đọc đúng key prefs (không nháy theme khi tải)', () => {
    const head = indexHtml.slice(0, indexHtml.indexOf('</head>'));
    expect(head).toContain(`localStorage.getItem('${PREFS_KEY}')`);
    expect(head).toContain('d.dataset.theme');
  });
});

describe('sidebar (v6 §3.2)', () => {
  it('khóa không đổi; chỉ "rail" là thu gọn, còn lại (thiếu, rác) là mở', () => {
    expect(SIDE_KEY).toBe('cargo-query/sidebar');
    expect(parseSidePref('rail')).toBe('rail');
    expect(parseSidePref('open')).toBe('open');
    expect(parseSidePref(undefined)).toBe('rail');
    expect(parseSidePref({ x: 1 })).toBe('rail');
  });
});

describe('Sandbox lần đầu (v4 §B.3)', () => {
  it('nháp trống hoặc chỉ khoảng trắng → câu mẫu; có chữ → giữ', () => {
    session.mode = { kind: 'sandbox' };
    app.save.sandboxDraft = '';
    expect(readDraft()).toBe(SANDBOX_STARTER);
    app.save.sandboxDraft = '  \n';
    expect(readDraft()).toBe(SANDBOX_STARTER);
    app.save.sandboxDraft = 'SELECT 1';
    expect(readDraft()).toBe('SELECT 1');
    session.mode = { kind: 'story' };
  });
});

describe('L5 (v12.0): Sandbox đã sửa thì không hiện lại câu mẫu', () => {
  it('câu mẫu chỉ tới khi người chơi gõ khác câu mẫu; theo từng lĩnh vực', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } });
    session.mode = { kind: 'sandbox' };
    app.save.sandboxDraft = '';
    expect(readDraft()).toBe(SANDBOX_STARTER);
    writeDraft(SANDBOX_STARTER); // the starter itself is not an edit
    expect(readDraft()).toBe(SANDBOX_STARTER);
    writeDraft('SELECT 1');
    writeDraft('');
    expect(readDraft()).toBe('');
    expect(JSON.parse(data.get('cargo-query/sandbox-seen')!)).toEqual(['logistics']);
    session.mode = { kind: 'story' };
    vi.unstubAllGlobals();
  });
});
