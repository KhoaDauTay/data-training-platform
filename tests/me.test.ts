import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { MAX_CARDS, readDashboard, type Card } from '../src/dashboard';
import { DOMAINS } from '../src/domains';
import { ATTEMPTS_KEY, ERRORS_KEY, notePass, noteTry, readAttempts, readErrors } from '../src/insights';
import { ME_DICT, meText } from '../src/i18n/me';
import { EXPORT_DICT } from '../src/i18n/meExport';
import { calendar, portfolioEntries, nextSkill, topErrors, trySummary } from '../src/me';
import { dashFile, importDash, portfolioMd, touchesSandbox } from '../src/meExport';
import { hashOf, parseRoute, SHARE_MAX, shareHash, sharedOf } from '../src/route';
import type { KV } from '../src/storage';
import { textOf } from '../src/tickets';

/** v16 "Của tôi" (L142, roadmap v15 §5 success tests for v16). */
const mem = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};
const domains = DOMAINS.map((d) => d.id);
const card = (id: string, sql: string, extra: Partial<Card> = {}): Card => ({ id, title: `Thẻ ${id}`, sql, kind: 'table', source: 'sandbox', ...extra });

describe('#/me route and shared SQL links', () => {
  it('#/me is its own page', () => {
    expect(parseRoute('#/me')).toBe('me');
    expect(hashOf('me')).toBe('#/me');
  });
  it('a share link round-trips UTF-8 SQL and names its domain', () => {
    const sql = "SELECT name FROM customers WHERE city = 'Đà Nẵng' -- ghi chú\nORDER BY 1";
    const hash = shareHash(sql, 'finance');
    expect(hash).toMatch(/^#\/share\?d=finance&sql=[A-Za-z0-9_-]+$/);
    expect(sharedOf(hash)).toEqual({ sql, d: 'finance' });
    expect(parseRoute(hash)).toBe('home'); // main.ts turns it into the domain's workspace hash before the router
  });
  it('bad links are ignored: unknown domain, broken base64/UTF-8, empty or too long SQL', () => {
    const ok = shareHash('SELECT 1', 'logistics');
    expect(sharedOf(ok.replace('d=logistics', 'd=moon'))).toBeUndefined();
    expect(sharedOf('#/share?d=logistics&sql=%%%')).toBeUndefined();
    expect(sharedOf('#/share?d=logistics&sql=_w')).toBeUndefined(); // 0xff: not UTF-8
    expect(sharedOf(shareHash('   ', 'logistics'))).toBeUndefined();
    expect(sharedOf(shareHash('x'.repeat(SHARE_MAX + 1), 'logistics'))).toBeUndefined();
    expect(sharedOf(shareHash('x'.repeat(SHARE_MAX), 'logistics'))?.sql.length).toBe(SHARE_MAX);
    expect(sharedOf('#/d/logistics/play')).toBeUndefined();
  });
});

describe('device-only statistics (src/insights.ts)', () => {
  it('counts runs, submits, SQLSTATE codes and the first pass', () => {
    const kv = mem();
    noteTry('ch1-01', 'runs', '42703', kv);
    noteTry('ch1-01', 'runs', undefined, kv);
    noteTry('ch1-01', 'submits', '42703', kv);
    noteTry('ch1-01', 'submits', undefined, kv);
    notePass('ch1-01', kv);
    noteTry('ch1-01', 'submits', undefined, kv);
    notePass('ch1-01', kv); // a re-solve keeps the first pass
    noteTry(undefined, 'runs', '42601', kv); // Sandbox: the code only
    expect(readAttempts(kv)).toEqual({ 'ch1-01': { runs: 2, submits: 3, passedOn: 2 } });
    expect(readErrors(kv)).toEqual({ 42703: 2, 42601: 1 });
    expect([...kv.data.values()].join()).not.toMatch(/SELECT/i); // codes and counts only, never SQL
  });
  it('drops bad stored values and caps the number of codes', () => {
    const kv = mem();
    kv.setItem(ERRORS_KEY, JSON.stringify({ 42703: 3, nope: 1, 42601: -1, '22012': 1.5 }));
    kv.setItem(ATTEMPTS_KEY, JSON.stringify({ 'ch1-01': { runs: 1, submits: 0 }, 'BAD ID': { runs: 1, submits: 1 }, 'ch1-02': { runs: 'x' } }));
    expect(readErrors(kv)).toEqual({ 42703: 3 });
    expect(readAttempts(kv)).toEqual({ 'ch1-01': { runs: 1, submits: 0 } });
    kv.setItem(ERRORS_KEY, '[1,2]');
    expect(readErrors(kv)).toEqual({});
    for (let i = 0; i < 60; i++) noteTry(undefined, 'runs', `X${String(i).padStart(4, '0')}`, kv);
    expect(Object.keys(readErrors(kv))).toHaveLength(50);
  });
  it('summaries for the page', () => {
    expect(trySummary({ a: { runs: 4, submits: 1, passedOn: 1 }, b: { runs: 2, submits: 3, passedOn: 3 }, c: { runs: 9, submits: 2 } }))
      .toEqual({ passed: 2, first: 0.5, runs: 3, wrong: 4 }); // b: 2 wrong before passing, c: 2 wrong, not passed
    expect(trySummary({})).toEqual({ passed: 0, first: 0, runs: 0, wrong: 0 });
    // L312: one wrong Submit (no Postgres error), then a pass: 0 % first time AND one wrong submit, never "no mistakes"
    expect(trySummary({ a: { runs: 1, submits: 2, passedOn: 2 } })).toMatchObject({ first: 0, wrong: 1 });
    // F03 (L485): one scale (mastery 0-4): a skill due for review first, else the first one only met, in route order
    const lv = new Map([['select', { level: 3 }], ['where', { level: 1 }], ['join', { level: 2, review: true }]]);
    expect(nextSkill(['select', 'where', 'join'], lv)).toBe('join');
    expect(nextSkill(['select', 'where'], lv)).toBe('where');
    expect(nextSkill(['select'], lv)).toBeUndefined();
    // F07/F21: derived counts, EN plurals as function messages
    expect(meText('en', 'map.review', { n: 1 })).toBe('Review 1 skill that needs it');
    expect(meText('en', 'map.review', { n: 3 })).toBe('Review 3 skills that need it');
    expect(meText('vi', 'next.empty', { n: 4 })).toContain('4 bài luyện');
    expect(meText('en', 'next.empty', { n: 4 })).toContain('4 drills');
    expect(topErrors({ a: 1, b: 5, c: 5 }, 2)).toEqual([['b', 5], ['c', 5]]);
    const cal = calendar(['2026-11-19', '2026-11-02', '2026-01-01'], new Date(2026, 10, 19), 8);
    expect(cal).toHaveLength(56);
    expect(cal[0].day).toBe('2026-09-28'); // a Monday, 8 weeks back
    expect(cal.filter((c) => c.on).map((c) => c.day)).toEqual(['2026-11-02', '2026-11-19']);
    expect(cal.filter((c) => c.future)).toHaveLength(3); // Fri–Sun of this week
  });
});

describe('dashboard export / import (v7 §5.1)', () => {
  const mine = [
    card('c1', 'SELECT count(*) FROM shipments', { kind: 'number', col: 0 }),
    card('c3', 'SELECT port, count(*) FROM shipments GROUP BY 1', { kind: 'bar', col: 1, slow: true }),
    card('c4', 'SELECT * FROM my_sales'), // an imported table
    card('c5', 'SELECT * FROM sandbox.orders_my'),
  ];
  it('export → import keeps every card (title, kind, SQL, value column), with new ids, never marked slow', () => {
    const { file, dropped } = dashFile('logistics', mine.slice(0, 2), []);
    expect(dropped).toBe(0);
    const r = importDash(JSON.stringify(file), 'logistics', [], readDashboard, domains);
    if ('error' in r) throw new Error(r.error);
    expect(r.added).toBe(2);
    expect(r.cards.map(({ title, kind, sql, col }) => ({ title, kind, sql, col }))).toEqual(mine.slice(0, 2).map(({ title, kind, sql, col }) => ({ title, kind, sql, col })));
    expect(r.cards.every((c) => !c.slow && c.source === 'import')).toBe(true);
    // Into a dashboard that already has cards: appended after them, ids after the highest one.
    const again = importDash(JSON.stringify(file), 'logistics', mine.slice(0, 2), readDashboard, domains);
    if ('error' in again) throw new Error(again.error);
    expect(again.cards.map((c) => c.id)).toEqual(['c1', 'c3', 'c4', 'c5']);
  });
  it('no export carries a card that reads imported data', () => {
    const { file, dropped } = dashFile('logistics', mine, ['my_sales']);
    expect(dropped).toBe(2);
    const text = JSON.stringify(file);
    expect(text).not.toMatch(/my_sales|sandbox/);
    expect(touchesSandbox('select * from "My_Sales"', ['my_sales'])).toBe(true);
    expect(touchesSandbox('SELECT my_sales_total FROM shipments', ['my_sales'])).toBe(false);
  });
  it('refuses other domains and broken files; stops at the card limit', () => {
    const { file } = dashFile('finance', mine.slice(0, 1), []);
    expect(importDash(JSON.stringify(file), 'logistics', [], readDashboard, domains)).toEqual({ error: 'domain', domain: 'finance' });
    expect(importDash('{"format":1,"domain":"moon","cards":[]}', 'logistics', [], readDashboard, domains)).toEqual({ error: 'bad' });
    expect(importDash('not json', 'logistics', [], readDashboard, domains)).toEqual({ error: 'bad' });
    expect(importDash('{"format":2,"domain":"logistics","cards":[]}', 'logistics', [], readDashboard, domains)).toEqual({ error: 'bad' });
    const full = Array.from({ length: MAX_CARDS - 1 }, (_, i) => card(`c${i + 1}`, 'SELECT 1'));
    const big = { format: 1, domain: 'logistics', cards: [{ title: 'a', kind: 'table', sql: 'SELECT 1' }, { title: 'b', kind: 'table', sql: 'SELECT 2' }, { title: 'bad', kind: 'pie', sql: 'SELECT 3' }] };
    const r = importDash(JSON.stringify(big), 'logistics', full, readDashboard, domains);
    if ('error' in r) throw new Error(r.error);
    expect(r.cards).toHaveLength(MAX_CARDS);
    expect([r.added, r.skipped]).toEqual([1, 2]);
  });
});

describe('portfolio (I6)', () => {
  const tickets = loadTickets('logistics');
  const [a, b, c] = tickets;
  const boss = tickets.find((t) => t.beat === 'boss' && t.conclusion)!;
  it('holds only SQL that passed the grader (never a draft, never the Solution)', () => {
    const save = {
      completed: [a.id, b.id, boss.id],
      graded: {
        [`${a.id}#0`]: 'SELECT 1 AS graded_a',
        [`${c.id}#0`]: 'SELECT 3 AS not_completed', // graded but not completed
        ...Object.fromEntries(boss.steps.map((_, i) => [`${boss.id}#${i}`, `SELECT ${i} AS boss_step`])),
      },
      drafts: { [`${b.id}#0`]: 'SELECT 2 AS draft_only' },
    };
    const entries = portfolioEntries(tickets, save, (t) => textOf(t, 'vi'));
    expect(entries.map((e) => e.title)).toEqual([textOf(a, 'vi').title, textOf(boss, 'vi').title]);
    const md = portfolioMd({ lang: 'vi', scope: 'logistics', what: 'Logistics', name: 'An', date: '19/11/2026', entries, cards: [], imported: [] });
    expect(md).toContain('graded_a');
    expect(md).toContain('boss_step');
    expect(md).not.toMatch(/draft_only|not_completed/);
    for (const t of [a, boss]) for (const s of t.steps) expect(md).not.toContain(s.solution.trim());
    expect(md).toContain(textOf(boss, 'vi').conclusion!.options[boss.conclusion!.answer]);
    expect(md).toContain('hư cấu');
    expect(md).toContain('không xác minh');
  });
  it('lists dashboard cards but never one on imported data; EN text in EN', () => {
    const md = portfolioMd({
      lang: 'en', scope: 'finance', what: 'Finance', name: '', date: 'x', entries: [],
      cards: [card('c1', 'SELECT 1 AS kept'), card('c2', 'SELECT * FROM my_sales'), card('c3', 'SELECT * FROM sandbox.t')], imported: ['my_sales'],
    });
    expect(md).toContain('kept');
    expect(md).not.toMatch(/my_sales|sandbox/);
    expect(md).toMatch(/fictional/);
    expect(md).toMatch(/not verified/);
    expect(md).toContain(EXPORT_DICT.en['pf.anon']);
  });
  it('v24 (L323): a "current skill levels" section, self-measured, only when there is something to show', () => {
    const base = { lang: 'vi' as const, scope: 'logistics' as const, what: 'L', name: 'An', date: 'x', entries: [], cards: [], imported: [] };
    const md = portfolioMd({ ...base, levels: { skills: [{ label: 'A | B', level: 'Vững' }], badges: ['Phần 1 vững'] } });
    expect(md).toContain(EXPORT_DICT.vi['pf.levels']);
    expect(md).toContain(String.raw`| A \| B | Vững |`);
    expect(md).toContain('Phần 1 vững');
    expect(portfolioMd({ ...base, levels: { skills: [], badges: [] } })).not.toContain(EXPORT_DICT.vi['pf.levels']);
  });
});

describe('L316 wording (user feedback)', () => {
  it('no "1 study days": the EN day counts carry no plural noun after the number', () => {
    for (const k of ['days.total', 'days.label'] as const) expect(ME_DICT.en[k]).not.toMatch(/\{n\} study days/);
  });
  it('Lily is the learner\'s study buddy (L87), never "that is you"; the two Home counters name what they count', async () => {
    const { dict } = await import('../src/i18n/vi').then((m) => ({ dict: m.vi as Record<string, string> }));
    const en = (await import('../src/i18n/en')).en as Record<string, unknown>;
    for (const k of ['teach.scene', 'teach.lily', 'lily.line']) {
      expect(dict[k]).not.toMatch(/là bạn\)/);
      expect(String(en[k])).not.toMatch(/that is you/);
    }
    expect(dict['home.skillsTeaser']).toMatch(/Kỹ năng SQL/);
    expect(dict['home.progress']).toMatch(/^Việc/);
  });
});
