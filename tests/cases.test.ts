// v47 D1/D2 (L930–L939): domain case studies and asks (content/cases/cases.yml, src/cases.ts). Content rules of the
// ticket tests applied to their prose; every Solution runs on its domain's schema; tables and the main skills are open by
// chapter `after` in that domain; the take-home flow and the interview prefs accept the `cs-` ids.
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import casesYml from '../content/cases/cases.yml?raw';
import { CASE_ID, parseCases } from '../src/cases';
import { loadDomain, loadInterview, loadTickets } from '../src/content';
import type { DomainId } from '../src/domains';
import { takeHomeTicket } from '../src/interview';
import { parseInterviewPrefs, passedTakeHomes } from '../src/interviewPrefs';
import { chapterTablesOf, SKILLS } from '../src/progress';
import { DRILL_ID, isWorkId } from '../src/save';
import { whyOpen } from '../src/ui/whyButton';
import { ecomRunner, finRunner, runner } from './helpers';

await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
const cases = parseCases(parseYaml(casesYml));
const DOMAINS: DomainId[] = ['logistics', 'ecommerce', 'finance'];

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|OVER|PARTITION|CASE|WITH|FILTER|COALESCE|NULL|EXISTS)\b|\b[a-z]+_[a-z_]+\b/g;
/** Coded values that must never reach a prompt (Logistics UPPERCASE codes, E-com/Finance lowercase status words in quotes). */
const CODED = /\b(SEA|AIR|FCL|LCL|EXPORT|IMPORT|CANCELLED|DELIVERED|BOOKED|IN_TRANSIT|ARRIVED)\b|'(paid|failed|refunded|cancelled|partner|approved|late|cod)'/;
/** The structural skills a Solution's SQL shows, checked against what the domain teaches by chapter `after`. */
const FEATURES: [RegExp, string][] = [
  [/\bHAVING\b/, 'having'], [/\bLEFT JOIN\b/, 'left_join'], [/\bFULL JOIN\b/, 'full_join'], [/\bCASE\b/, 'case_when'],
  [/\bFILTER \(/, 'conditional_agg'], [/\bCOALESCE\(/, 'coalesce'], [/\bdate_trunc\(/, 'date_bucket'], [/^WITH\b/, 'cte'],
  [/\), \w+ AS \(/, 'multi_cte'], [/\bDISTINCT\b/, 'distinct'], [/\bOVER\b/, 'window_agg'], [/\bJOIN\b[\s\S]*\bJOIN\b/, 'multi_join'],
];
const ALL = (d: DomainId): string[] => Object.values(chapterTablesOf(d)).flat();
const tablesIn = (sql: string, d: DomainId): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => ALL(d).includes(x));
const openTables = (d: DomainId, ch: number): string[] => Object.entries(chapterTablesOf(d)).filter(([c]) => Number(c) <= ch).flatMap(([, t]) => t);
/** Skills taught by chapter `ch` in domain `d`: Logistics by skills.yml, the others by the chapter of their granting ticket. */
function taught(d: DomainId, ch: number): Set<string> {
  if (d === 'logistics') return new Set(SKILLS.filter((s) => s.chapter <= ch).map((s) => s.id));
  return new Set(loadTickets(d).filter((t) => t.chapter <= ch).flatMap((t) => t.grants));
}
const RUN: Record<DomainId, () => Promise<(sql: string) => Promise<{ rows: unknown[][]; columns: string[] }>>> = { logistics: runner, ecommerce: ecomRunner, finance: finRunner };
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();

describe('cấu trúc', () => {
  it('3 case study (một mỗi lĩnh vực, 4–5 bước) và 6 câu hỏi mơ hồ (hai mỗi lĩnh vực, có clarify)', () => {
    for (const d of DOMAINS) {
      expect(cases.filter((c) => c.domain === d && c.kind === 'case')).toHaveLength(1);
      expect(cases.filter((c) => c.domain === d && c.kind === 'ask')).toHaveLength(2);
    }
    for (const c of cases) {
      expect(c.id).toMatch(CASE_ID);
      expect(c.id).not.toMatch(DRILL_ID); // so schemaOf() runs it on the domain's schema, never `lab`
      expect(c.after).toBeLessThanOrEqual(Math.max(...Object.keys(chapterTablesOf(c.domain)).map(Number)));
      if (c.kind === 'case') expect(c.steps.length).toBeGreaterThanOrEqual(4);
      else {
        expect(c.clarify!.options.length).toBeGreaterThanOrEqual(3);
        for (const lang of ['vi', 'en'] as const) { // explain-guide: the right option is not the (only) longest
          const len = c.clarify!.options.map((o) => o[lang].length);
          expect(len.filter((l) => l >= len[c.clarify!.answer]).length, `${c.id} ${lang}: ${len.join('/')}`).toBeGreaterThan(1);
        }
        expect(new Set(cases.filter((x) => x.clarify).map((x) => x.clarify!.answer)).size).toBeGreaterThan(1); // the right one moves
      }
    }
  });

  it('parser ném khi id, domain, số bước, clarify hoặc rubric sai', () => {
    const one = (patch: string) => parseCases(parseYaml(casesYml.split('\n- id: cs-ec-1')[0].replace('- id: cs-lg-1', patch)));
    expect(() => one('- id: g-lg-1')).toThrow(/id/);
    expect(() => one('- id: cs-ec-9')).toThrow(/domain/);
    const raw = parseYaml(casesYml) as Record<string, unknown>[];
    expect(() => parseCases([{ ...raw[0], steps: (raw[0].steps as unknown[]).slice(0, 3) }])).toThrow(/4–5/);
    expect(() => parseCases([{ ...raw[3], clarify: undefined }])).toThrow(/clarify/);
    expect(() => parseCases([{ ...raw[0], rubric: [] }])).toThrow(/rubric/);
  });

  it('chạy như take-home: ticket bậc thang, không vào Save, pref giữ bản nháp `cs-`, không vào portfolio', async () => {
    const tk = takeHomeTicket(cases[0]);
    expect(tk).toMatchObject({ id: 'cs-lg-1', beat: 'boss', chapter: 0 });
    expect(tk.steps).toHaveLength(cases[0].steps.length);
    expect(isWorkId(new Set(), 'cs-lg-1')).toBe(false);
    const p = parseInterviewPrefs({
      takeHomes: { 'cs-lg-1': { at: '2026-11-20', steps: 5, total: 5, text: 'x', checks: [0], rubric: 5 } },
      live: { 'cs-lg-1': { id: 'cs-lg-1', timer: false, start: 1, index: 0, step: 1, solved: ['cs-lg-1-1'], drafts: { 'cs-lg-1-2': 'SELECT 1' }, passed: {}, hints: ['cs-lg-a1-pick'], phase: 'work', text: '', checks: [] } },
    });
    expect(p.live['cs-lg-1']).toMatchObject({ solved: ['cs-lg-1-1'], drafts: { 'cs-lg-1-2': 'SELECT 1' }, hints: ['cs-lg-a1-pick'] });
    expect(passedTakeHomes(p)).toEqual([]);
    expect(whyOpen('cs-lg-1#0', [], { completed: [], bossStep: {} })).toBe(false); // D-V22-6: no "Vì sao?" while it is graded
    const iv = await loadInterview();
    expect(iv.ticketsOf('cs-fn-1')?.[0].steps).toHaveLength(5);
    expect(iv.takeHomes.filter((x) => !x.domain).every((x) => x.id.startsWith('g-iv-th-'))).toBe(true);
  });
});

describe('văn bản', () => {
  it.each(cases)('$id', (c) => {
    const prose = (lang: 'vi' | 'en'): string[] => [c.title[lang], c.brief[lang], ...c.steps.flatMap((s) => [s.title[lang], s.task[lang]]),
      ...(c.clarify ? [c.clarify.q[lang], ...c.clarify.options.flatMap((o) => [o[lang], o.why[lang]])] : [])];
    const rest = (lang: 'vi' | 'en'): string[] => [c.conclusion[lang], ...c.rubric.map((r) => r[lang]), ...c.steps.map((s) => s.hint[lang])];
    for (const lang of ['vi', 'en'] as const) {
      const text = prose(lang).join('\n');
      expect(text).not.toContain('`');
      expect(text.match(SQLISH)).toBeNull();
      expect(text).not.toMatch(CODED);
      expect(/\b(boss|sự cố)\b/i.test([...prose(lang), ...rest(lang)].join('\n'))).toBe(false);
    }
    expect(codeSpans([...prose('en'), ...rest('en')].join('\n'))).toEqual(codeSpans([...prose('vi'), ...rest('vi')].join('\n')));
    expect([...prose('en'), ...rest('en')].join('\n')).not.toMatch(VI_DIACRITIC);
  });
});

describe('Solution', () => {
  const steps = cases.flatMap((c) => c.steps.map((s) => ({ name: s.id, c, s })));
  it.each(steps)('$name', async ({ c, s }) => {
    const sql = s.solution;
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
    if (s.ordered) expect(sql).toMatch(/order\s+by/i);
    else expect(sql).not.toMatch(/order\s+by/i);
    expect(tablesIn(sql, c.domain).filter((x) => !openTables(c.domain, c.after).includes(x))).toEqual([]);
    const skills = taught(c.domain, c.after);
    expect(FEATURES.filter(([re]) => re.test(sql)).map(([, k]) => k).filter((k) => !skills.has(k))).toEqual([]);
    const run = await RUN[c.domain]();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    if (!s.ordered) expect(r.rows).toHaveLength(1); // takeHomeTicket grades every step in order: only a one-row step may skip ORDER BY
    // deterministic: the same rows twice, and no two rows alike (a tie would make the order of equal rows matter)
    expect((await run(sql)).rows).toEqual(r.rows);
    expect(new Set(r.rows.map((x) => JSON.stringify(x))).size).toBe(r.rows.length);
  });
});
