// ENG-CORE (L220): Database Engine content, schema ENGINE-CONTENT-V1 (src/engine/content.ts). Every file under content/engine
// parses, ids are unique and match the path, requires resolve, VI/EN parity, EN without diacritics, code identical VI/EN,
// sources are https URLs, every module has a name; Postgres `check: rows` solutions run on `lab`.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  blocksOf, ENGINE_XP, engineXp, isRight, lessonPassed, lessonProblems, parseEngineLesson, parseModules, partsOf, progressOf, treeOf,
  type EngineLesson,
} from '../src/engine/content';
import { compareResults } from '../src/grader';
import { labRun } from './generalRules';

const files = import.meta.glob<string>('../content/engine/**/*.md', { query: '?raw', import: 'default', eager: true });
const moduleFiles = import.meta.glob<string>('../content/engine/*/modules.yml', { query: '?raw', import: 'default', eager: true });
const lessons: EngineLesson[] = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p, parse));
const ids = new Set(lessons.map((l) => l.id));

describe('content/engine (ENGINE-CONTENT-V1)', () => {
  it('có ít nhất 3 bài Postgres L1 mẫu (khái niệm, lab, câu hỏi)', () => {
    const pg = lessons.filter((l) => l.engine === 'postgres' && l.level === 'L1');
    for (const k of ['concept', 'lab', 'quiz'] as const) expect(pg.some((l) => l.kind === k)).toBe(true);
  });

  it('id không trùng', () => expect(ids.size).toBe(lessons.length));

  it.each(lessons.map((l) => [l.id, l] as const))('%s: luật nội dung', (_, l) => {
    expect(lessonProblems(l, ids)).toEqual([]);
  });

  it('mỗi module có tên VI/EN trong modules.yml, mọi tên trong modules.yml đều được dùng', () => {
    for (const engine of new Set(lessons.map((l) => l.engine))) {
      const path = Object.keys(moduleFiles).find((p) => p.includes(`/engine/${engine}/`));
      expect([engine, path]).not.toEqual([engine, undefined]);
      const names = parseModules(moduleFiles[path!], path!, parse);
      const used = new Set(lessons.filter((l) => l.engine === engine).map((l) => l.module));
      expect(new Set(names.map((n) => n.id))).toEqual(used);
      for (const n of names) expect(n.en).not.toMatch(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
    }
  });

  it('requires không vòng', () => {
    const by = new Map(lessons.map((l) => [l.id, l]));
    const seen = new Set<string>();
    const visit = (id: string, path: string[]): void => {
      expect(path).not.toContain(id);
      if (seen.has(id)) return;
      for (const r of by.get(id)?.requires ?? []) visit(r, [...path, id]);
      seen.add(id);
    };
    for (const l of lessons) visit(l.id, []);
  });

  const pgRows = lessons.filter((l) => l.engine === 'postgres' && !l.lab?.setup)
    .flatMap((l) => (l.lab?.steps ?? []).filter((s) => s.check === 'rows').map((s, i) => [`${l.id} bước ${i + 1}`, s] as const));
  it.each(pgRows)('%s: Solution chạy trên lab; ordered ⇒ ORDER BY', async (_, s) => {
    const run = await labRun();
    const r = await run(s.solution);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(compareResults(r, await run(s.solution), s.ordered).ok).toBe(true);
    if (s.ordered) expect(s.solution).toMatch(/ORDER BY/i);
  });
});

const FM = (fm: string, body = '## Ý chính\n\nA `x`.\n\n# EN\n\n## Key idea\n\nA `x`.\n'): string => `---\n${fm}\n---\n${body}`;
const BASE = 'id: e-pg-l1-07\nengine: postgres\nlevel: L1\nmodule: types\ntitle: T\ntitle_en: T\nkind: concept\nminutes: 3\nobjectives: [{ vi: a, en: a }]\nsources: [https://x.org]';
const PATH = 'content/engine/postgres/L1/07-x.md';

describe('parseEngineLesson (thuần)', () => {
  it('đọc bài tối thiểu', () => {
    const l = parseEngineLesson(FM(BASE), PATH, parse);
    expect(l).toMatchObject({ id: 'e-pg-l1-07', engine: 'postgres', level: 'L1', kind: 'concept', order: 7 });
    expect(l.sections).toEqual([{ id: 'idea', text: { vi: 'A `x`.', en: 'A `x`.' } }]);
  });

  it.each([
    ['id lệch đường dẫn', FM(BASE.replace('e-pg-l1-07', 'e-pg-l1-08')), PATH, /id phải là e-pg-l1-07/],
    ['engine lệch thư mục', FM(BASE), 'content/engine/mongodb/L1/07-x.md', /engine phải là mongodb/],
    ['level lệch thư mục', FM(BASE), 'content/engine/postgres/L2/07-x.md', /level phải là L2/],
    ['đường dẫn sai', FM(BASE), 'content/engine/postgres/07-x.md', /đường dẫn/],
    ['thiếu # EN', FM(BASE, '## Ý chính\n\nA\n'), PATH, /# EN/],
    ['mục VI/EN lệch', FM(BASE, '## Ý chính\n\nA\n\n# EN\n\n## Example\n\nA\n'), PATH, /giống nhau/],
    ['mục lạ', FM(BASE, '## Khác\n\nA\n\n# EN\n\n## Key idea\n\nA\n'), PATH, /mục lạ/],
    ['kind lab không có lab', FM(BASE.replace('kind: concept', 'kind: lab')), PATH, /cần lab/],
    ['quiz answer ngoài khoảng', FM(`${BASE}\nquiz: [{ q: { vi: a, en: a }, options: [{ vi: a, en: a }, { vi: b, en: b }], answer: 2, why: { vi: a, en: a } }]`), PATH, /answer/],
    ['check lạ', FM(`${BASE}\nlab: { steps: [{ task: { vi: a, en: a }, solution: x, check: speed, hint: { vi: a, en: a } }] }`), PATH, /check/],
    ['thiếu en', FM(BASE.replace('[{ vi: a, en: a }]', '[{ vi: a }]')), PATH, /objectives\[0\] cần vi và en/],
  ])('từ chối: %s', (_, src, path, msg) => {
    expect(() => parseEngineLesson(src, path, parse)).toThrow(msg);
  });

  it('lessonProblems: dấu trong EN, code VI ≠ EN, URL http, requires không có', () => {
    const l = parseEngineLesson(FM(`${BASE}\nrequires: [e-pg-l1-99]`.replace('https://x.org', 'http://x.org'), '## Ý chính\n\nA `x`.\n\n# EN\n\n## Key idea\n\nCó `y`.\n'), PATH, parse);
    const p = lessonProblems(l, new Set([l.id]));
    expect(p).toEqual(expect.arrayContaining([expect.stringMatching(/EN có dấu/), expect.stringMatching(/code VI ≠ EN/),
      expect.stringMatching(/không phải URL https/), expect.stringMatching(/requires e-pg-l1-99/)]));
  });
});

describe('chấm câu hỏi, phần, XP, cây (thuần)', () => {
  const quiz = parseEngineLesson(FM(`${BASE.replace('kind: concept', 'kind: quiz')}
quiz:
  - { q: { vi: a, en: a }, options: [{ vi: a, en: a }, { vi: b, en: b }], answer: 1, why: { vi: a, en: a } }
predict: { sql: SELECT 1, q: { vi: a, en: a }, options: [{ vi: a, en: a }, { vi: b, en: b }], answer: 0, why: { vi: a, en: a } }
lab: { steps: [{ task: { vi: a, en: a }, solution: SELECT 1, check: rows, hint: { vi: a, en: a } }] }`), PATH, parse);

  it('isRight so chỉ số gốc', () => {
    expect(isRight(quiz.quiz![0], 1)).toBe(true);
    expect(isRight(quiz.quiz![0], 0)).toBe(false);
    expect(isRight(quiz.predict!, undefined)).toBe(false);
  });

  it('partsOf / lessonPassed: mọi câu hỏi, đoán và bước lab', () => {
    expect(partsOf(quiz)).toEqual(['q0', 'p', 's0']);
    expect(lessonPassed(quiz, new Set(['q0', 'p']))).toBe(false);
    expect(lessonPassed(quiz, new Set(['q0', 'p', 's0']))).toBe(true);
    const concept = parseEngineLesson(FM(BASE), PATH, parse);
    expect(partsOf(concept)).toEqual([]); // completed by its button
  });

  it('XP chỉ lần đầu', () => {
    expect(engineXp(quiz, false)).toBe(ENGINE_XP.quiz);
    expect(engineXp(quiz, true)).toBe(0);
    expect(ENGINE_XP).toEqual({ concept: 5, quiz: 5, predict: 5, lab: 10, capstone: 20 });
  });

  it('treeOf: cấp L1–L5, module theo modules.yml, bài theo NN; progressOf', () => {
    const t = treeOf('postgres', lessons, [{ id: 'types', vi: 'Kiểu', en: 'Types' }]);
    expect(t.levels.map((x) => x.level)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    const l1 = t.levels[0].modules.find((m) => m.id === 'types')!;
    expect(l1.name).toEqual({ vi: 'Kiểu', en: 'Types' });
    expect(l1.lessons.map((l) => l.order)).toEqual([...l1.lessons.map((l) => l.order)].sort((a, b) => a - b));
    expect(progressOf(l1.lessons, new Set([l1.lessons[0].id]))).toEqual({ done: 1, total: l1.lessons.length });
    expect(treeOf('mongodb', []).levels.every((x) => x.modules.length === 0)).toBe(true);
  });

  it('blocksOf: đoạn, danh sách, khối code', () => {
    expect(blocksOf('Một\ndòng.\n\n- a\n- b\n\n```sql\nSELECT 1;\n```\n\nCuối.')).toEqual([
      { kind: 'p', text: 'Một dòng.' }, { kind: 'ul', items: ['a', 'b'] }, { kind: 'code', lang: 'sql', code: 'SELECT 1;' }, { kind: 'p', text: 'Cuối.' },
    ]);
  });
});
