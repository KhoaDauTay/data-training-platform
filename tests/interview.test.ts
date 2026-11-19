import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import interviewYml from '../content/general/interview.yml?raw';
import { generalNow } from '../src/content';
import { skillOfDrill } from '../src/home';
import { parseInterview, SET_SIZE, takeHomeTicket } from '../src/interview';
import { SKILLS } from '../src/progress';
import { DRILL_ID } from '../src/save';
import { compareResults } from '../src/grader';
import { textOf } from '../src/tickets';
import { ANSWER_WORDS, codeSpans, distinctResults, drillRules, labRun, prose, VI_DIACRITIC } from './generalRules';

const iv = parseInterview(parseYaml(interviewYml));
const skillIds = SKILLS.map((s) => s.id);
const moduleSkills = (modules: number[]): Set<string> => new Set(SKILLS.filter((s) => modules.includes(s.chapter)).map((s) => s.id));

/** What a Solution actually uses, read from its SQL (so the `skills:` tags cannot drift from the code). */
const FEATURES: [RegExp, string][] = [
  [/\bWHERE\b/, 'where'], [/\bORDER BY\b/, 'order_by'], [/\bLIMIT\b/, 'limit'],
  [/\b(SUM|COUNT|AVG|MIN|MAX|ROUND)\(/, 'aggregate'], [/\bGROUP BY\b/, 'group_by'], [/\bHAVING\b/, 'having'],
  [/\bJOIN\b/, 'join'], [/\bJOIN\b[\s\S]*\bJOIN\b/, 'multi_join'], [/\bLEFT JOIN\b/, 'left_join'], [/\bLEFT JOIN\b[\s\S]*\bIS NULL\b/, 'anti_join'],
  [/\bFROM (\w+) \w+ (LEFT )?JOIN \1\b/, 'self_join'], [/\bFULL JOIN\b/, 'full_join'],
  [/\bdate_trunc\(/, 'date_bucket'], [/\b\w+(_on|_date|_order) [-+] [\w.]/, 'date_math'], [/\bIS (NOT )?NULL\b/, 'null_logic'],
  [/\bCASE\b/, 'case_when'], [/\bFILTER \(/, 'conditional_agg'], [/\bCOALESCE\(/, 'coalesce'],
  [/\b(lower|upper|trim|split_part|initcap|replace|substring)\(/i, 'string_fn'], [/\bI?LIKE\b/, 'pattern_match'],
  [/\bDISTINCT ON\b/, 'distinct_on'], [/\bDISTINCT (?!ON\b)/, 'distinct'], [/::numeric|\bCAST\(|\b\d+\.0 \*/, 'cast'],
  [/[<>=] \(SELECT\b/, 'scalar_subquery'], [/\bIN \(SELECT\b/, 'in_subquery'], [/\bEXISTS \(/, 'exists'],
  [/^WITH\b/, 'cte'], [/\), \w+ AS \(/, 'multi_cte'], [/\bUNION\b/, 'union'], [/\b(EXCEPT|INTERSECT)\b/, 'except'],
  [/\b(RANK|DENSE_RANK|ROW_NUMBER)\(\)/, 'window_rank'], [/\b(LAG|LEAD)\(/, 'window_lag'], [/\b(SUM|AVG|COUNT|MIN|MAX)\([^()]*\) OVER\b/, 'window_agg'],
];
const used = (sql: string): string[] => FEATURES.filter(([re]) => re.test(sql)).map(([, s]) => s);

describe('parser phòng phỏng vấn', () => {
  const Q = (id: string, extra = '') => `
      - id: ${id}
        skills: [select]
        task: { vi: "Lấy tên.", en: "Get the name." }
        solution: "SELECT name FROM products"
        hint: { vi: "G.", en: "H." }${extra}`;
  const set = (qs: string, head = '') => `
sets:
  - id: s1
    level: junior${head}
    modules: [1]
    minutes: 10
    title: { vi: "Bộ", en: "Set" }
    questions:${qs}
takeHomes: []`;
  const five = [1, 2, 3, 4, 5].map((n) => Q(`g-iv-s1-${n}`)).join('');
  const parse = (src: string) => parseInterview(parseYaml(src), 'x');

  it('đọc bộ đề; câu có wrong là trap, không thì open; id theo bộ và số câu', () => {
    const { sets } = parse(set(five.replace(/(g-iv-s1-5[\s\S]*)$/, `$1\n        wrong:\n          - { sql: "SELECT 1", vi: "sai", en: "wrong" }`)));
    expect(sets[0]).toMatchObject({ id: 's1', level: 'junior', modules: [1], minutes: 10 });
    expect(sets[0].questions.map((q) => [q.id, q.kind])).toEqual([1, 2, 3, 4, 5].map((n) => [`g-iv-s1-${n}`, n === 5 ? 'trap' : 'open']));
  });

  it('ném khi: thiếu câu, id sai, có starter, level lạ, trùng id, thiếu skills', () => {
    expect(() => parse(set(five.replace(Q('g-iv-s1-5'), '')))).toThrow(/5 câu/);
    expect(() => parse(set(five.replace('g-iv-s1-2', 'g-iv-s1-9')))).toThrow(/g-iv-s1-2/);
    expect(() => parse(set(five.replace(Q('g-iv-s1-1'), Q('g-iv-s1-1', '\n        starter: "SELECT ___"'))))).toThrow(/starter/);
    expect(() => parse(set(five).replace('level: junior', 'level: lead'))).toThrow(/level/);
    expect(() => parse(set(five).replace('takeHomes: []', '') + set(five).split('sets:')[1])).toThrow(/trùng/);
    expect(() => parse(set(five.replace('skills: [select]', 'skills: []')))).toThrow(/skills/);
  });

  it('take-home: 3–4 bước ordered, rubric ≥ 3, id g-iv-th-', () => {
    const step = (n: number, ordered = true) => `
      - title: { vi: "B${n}", en: "S${n}" }
        task: { vi: "Làm.", en: "Do." }
        solution: "SELECT ${n} ORDER BY 1"
        ordered: ${ordered}
        hint: { vi: "G.", en: "H." }`;
    const th = (steps: string, rubric = 3, id = 'g-iv-th-9') => `
sets: []
takeHomes:
  - id: ${id}
    modules: [1]
    title: { vi: "T", en: "T" }
    brief: { vi: "Đề.", en: "Brief." }
    steps:${steps}
    conclusion: { vi: "Viết.", en: "Write." }
    rubric:${Array.from({ length: rubric }, () => '\n      - { vi: "Tiêu chí.", en: "Criterion." }').join('')}`;
    const ok = parse(th(step(1) + step(2) + step(3)));
    expect(ok.takeHomes[0].steps.map((s) => s.id)).toEqual(['g-iv-th-9-1', 'g-iv-th-9-2', 'g-iv-th-9-3']);
    expect(() => parse(th(step(1) + step(2)))).toThrow(/3–4/);
    expect(() => parse(th(step(1) + step(2, false) + step(3)))).toThrow(/ordered/);
    expect(() => parse(th(step(1) + step(2) + step(3), 2))).toThrow(/rubric/);
    expect(() => parse(th(step(1) + step(2) + step(3), 3, 'th-9'))).toThrow(/id/);
  });
});

describe('nội dung: content/general/interview.yml', () => {
  const questions = iv.sets.flatMap((s) => s.questions);
  const steps = iv.takeHomes.flatMap((t) => t.steps);
  const all = [...questions, ...steps];

  it('5 bộ đề (junior, mid, senior) × 5 câu và đúng 5 take-home (v19 L169: + mid-3, senior-1, g-iv-th-4/5)', () => {
    expect(iv.sets.map((s) => s.id)).toEqual(['junior-1', 'mid-1', 'mid-2', 'mid-3', 'senior-1']);
    expect(new Set(iv.sets.map((s) => s.level))).toEqual(new Set(['junior', 'mid', 'senior']));
    for (const s of iv.sets) expect(s.questions).toHaveLength(SET_SIZE);
    expect(iv.takeHomes).toHaveLength(5);
  });

  it('mid-3 và senior-1 phủ Phần 1–11 và có CTE lẫn window', () => {
    for (const id of ['mid-3', 'senior-1']) {
      const s = iv.sets.find((x) => x.id === id)!;
      expect(s.modules, id).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
      const sk = new Set(s.questions.flatMap((q) => used(q.solution)));
      expect(sk.has('cte'), id).toBe(true);
      expect(['window_rank', 'window_lag', 'window_agg'].some((x) => sk.has(x)), id).toBe(true);
    }
  });

  it('id khớp DRILL_ID (chạy trên lab như drill), không đọc ra kỹ năng nào, không trùng drill General', () => {
    const g = generalNow()!;
    for (const d of [...all, ...iv.takeHomes]) {
      expect(DRILL_ID.test(d.id), d.id).toBe(true);
      expect(skillOfDrill(d.id, skillIds), d.id).toBeUndefined();
      expect(g.byId.has(d.id), d.id).toBe(false);
    }
  });

  it.each(iv.sets)('$id: modules có thật; skills khai báo là kỹ năng của modules; SQL không dùng kỹ năng ngoài skills', (s) => {
    for (const m of s.modules) expect(moduleSkills([m]).size, `module ${m}`).toBeGreaterThan(0);
    const allowed = moduleSkills(s.modules);
    for (const q of s.questions) {
      expect(q.skills.filter((x) => !allowed.has(x)), q.id).toEqual([]);
      expect(used(q.solution).filter((x) => !q.skills.includes(x)), q.id).toEqual([]);
    }
  });

  it.each(iv.takeHomes)('$id: mọi bước chỉ dùng kỹ năng của modules', (t) => {
    const allowed = moduleSkills(t.modules);
    for (const s of t.steps) expect(used(s.solution).filter((x) => !allowed.has(x)), s.id).toEqual([]);
  });

  it.each(iv.takeHomes)('$id: brief, kết luận, tiêu đề bước, rubric có VI + EN; EN không dấu; code span VI = EN', (t) => {
    expect(t.rubric.length).toBeGreaterThanOrEqual(3);
    for (const b of [t.title, t.brief, t.conclusion, ...t.rubric, ...t.steps.map((s) => s.title)]) {
      expect(b.vi.trim() && b.en.trim()).toBeTruthy();
      expect(codeSpans(b.en)).toEqual(codeSpans(b.vi));
      expect(prose(b.en)).not.toMatch(VI_DIACRITIC);
    }
  });

  it.each(all)('$id: đề không nói từ khóa SQL của đáp án (ngoài backtick)', (d) => {
    for (const s of [d.task.vi, d.task.en]) expect(prose(s)).not.toMatch(ANSWER_WORDS);
  });

  it.each(iv.sets)('$id: các câu trong bộ không cùng kết quả', async (s) => {
    expect(await distinctResults(s.questions)).toEqual([]);
  });

  it.each(iv.takeHomes)('$id: các bước không cùng kết quả', async (t) => {
    expect(await distinctResults(t.steps)).toEqual([]);
  });

  it('không câu nào cho cùng kết quả với một drill General (phòng phỏng vấn không phải chỗ chép đáp án drill)', async () => {
    const run = await labRun();
    const clash: string[] = [];
    const drills = generalNow()!.drills;
    const mine = await Promise.all(questions.map((q) => run(q.solution)));
    for (const d of drills) {
      const r = await run(d.solution).catch(() => undefined);
      if (!r) continue;
      questions.forEach((q, i) => {
        if (compareResults(mine[i], r, false).ok) clash.push(`${q.id} = ${d.id}`);
      });
    }
    expect(clash).toEqual([]);
  });

  it('takeHomeTicket: Ticket kiểu đánh giá thăng tiến, mỗi bước một Solution, không có câu kết luận trắc nghiệm', () => {
    const th = iv.takeHomes[0];
    const t = takeHomeTicket(th);
    expect(t).toMatchObject({ id: th.id, beat: 'boss', ordered: true, chapter: 0 });
    expect(t.conclusion).toBeUndefined();
    expect(t.steps.map((s) => s.solution)).toEqual(th.steps.map((s) => s.solution));
    expect(textOf(t, 'en').steps.map((s) => s.title)).toEqual(th.steps.map((s) => s.title.en));
    expect(textOf(t, 'vi').body).toBe(th.brief.vi);
  });

  // Shared drill rules: Solution runs on lab with 1–500 rows in < 1 s, ordered ⇒ ORDER BY, no CURRENT_DATE/now(),
  // wrong answers differ, code spans VI = EN and EN without diacritics (task, hint, wrong), not valid on the game schema.
  drillRules(all);
});
