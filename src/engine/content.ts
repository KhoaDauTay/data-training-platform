/**
 * ENG-CORE (L220): Database Engine lessons, schema ENGINE-CONTENT-V1. Pure: no DOM, no value import from main modules (the
 * engine UI chunk imports this; a value import of a main module would split main, Plan 6 U3). The YAML parser comes in as an
 * argument for the same reason (`yaml` lives in main).
 *
 * File: `content/engine/<engine>/<level>/<NN>-<slug>.md`, engine ∈ postgres|mongodb|dynamodb, level ∈ L1..L5.
 * Frontmatter: id, engine, level, module, title (VI), title_en, kind, minutes, objectives [{vi,en}], requires [ids],
 * sources [https urls], viz?, lab? {setup?, steps:[{task:{vi,en}, solution, check, ordered?, hint:{vi,en}}]},
 * quiz? [{q:{vi,en}, options:[{vi,en}], answer, why:{vi,en}}], predict? {sql, q, options, answer, why}.
 * Body: VI sections (## Ý chính, ## Ví dụ, ## Thực hành), then `# EN` with the same sections (## Key idea, ## Example,
 * ## Practice). Section text: paragraphs, `- ` bullet lists, inline `code` and ``` fenced blocks; nothing else.
 */

export const ENGINES = ['postgres', 'mongodb', 'dynamodb'] as const;
export type EngineId = (typeof ENGINES)[number];
export const ENGINE_SHORT: Record<EngineId, 'pg' | 'mg' | 'dy'> = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy' };
export const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
export type Level = (typeof LEVELS)[number];
export const KINDS = ['concept', 'lab', 'predict', 'quiz', 'capstone'] as const;
export type Kind = (typeof KINDS)[number];
export const CHECKS = ['rows', 'plan', 'catalog', 'doc'] as const;
export type Check = (typeof CHECKS)[number];

export interface Bi { vi: string; en: string }
/**
 * Additive fields (integration, L248): `expect` = engine numbers the player's result must also show (DynamoDB `Count`,
 * `ScannedCount`); `fact` = a verified sentence shown after the step passes (`probe`/`expect` are the reviewers' check,
 * re-run by scripts/e2e.mjs); `target` = the query a `CREATE INDEX` step is for.
 */
export interface Fact extends Bi { probe?: string; expect?: unknown[][] }
/** `name` (v23 CAP, L257): a short step name for the capstone step bar; without it the bar derives one from `task`. */
export interface LabStep { task: Bi; solution: string; check: Check; ordered: boolean; hint: Bi; expect?: Record<string, number>; fact?: Fact; target?: string; name?: Bi }
export interface Lab { setup?: string; steps: LabStep[] }
export interface Question { q: Bi; options: Bi[]; answer: number; why: Bi }
/**
 * `expect` (Postgres): a plan node the real EXPLAIN (FORMAT JSON) shows, `{ node, table?, index?, rows? }` (`rows` = the
 * planner's row estimate on that node); checked by tests/enginePredict.test.ts through src/engine/predict.ts.
 */
export interface PredictExpect { node: string; table?: string; index?: string; rows?: number }
export interface Predict extends Question { sql: string; expect?: PredictExpect }
/** `browser`: runs here; `docs`: numbers come from the official docs, nothing runs (the page says so). */
export const RUNTIMES = ['browser', 'docs'] as const;
export type Runtime = (typeof RUNTIMES)[number];
export const SECTIONS = { idea: ['Ý chính', 'Key idea'], example: ['Ví dụ', 'Example'], practice: ['Thực hành', 'Practice'] } as const;
export type SectionId = keyof typeof SECTIONS;
export interface Section { id: SectionId; text: Bi }

export interface EngineLesson {
  id: string;
  engine: EngineId;
  level: Level;
  module: string;
  title: Bi;
  kind: Kind;
  runtime?: Runtime;
  minutes: number;
  objectives: Bi[];
  requires: string[];
  sources: string[];
  viz?: string;
  lab?: Lab;
  quiz?: Question[];
  predict?: Predict;
  sections: Section[];
  /** File order inside its level (the NN of the file name). */
  order: number;
}

/** `e-pg-l1-01`: engine short name, level, the file's NN. */
export const lessonIdFor = (engine: EngineId, level: Level, nn: string): string => `e-${ENGINE_SHORT[engine]}-${level.toLowerCase()}-${nn}`;
const PATH_RE = /engine\/(postgres|mongodb|dynamodb)\/(L[1-5])\/(\d{2})-[a-z0-9-]+\.md$/;
const FM_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const EN_RE = /^# EN[ \t]*$/m;

type Yaml = (text: string) => unknown;
/** A lesson file as the build gives it (V22-E `?fm`, scripts/contentJson.mjs): frontmatter already parsed, body as text. */
export interface LessonSource { fm: unknown; body?: string }
/** Frontmatter keys of the lesson index (`?fm&meta=…`): parseEngineLesson on a source without body gives a list-only lesson. */
export const META_KEYS = 'id,engine,level,module,title,title_en,kind,minutes,requires,runtime,viz';

/** `source`: the `?fm` object (the app), or the raw file text plus a YAML parser (tests, tools). */
export function parseEngineLesson(source: string | LessonSource, path: string, yaml?: Yaml): EngineLesson {
  const fail = (msg: string): never => {
    throw new Error(`${path}: ${msg}`);
  };
  const where = PATH_RE.exec(path.replace(/\\/g, '/')) ?? fail('đường dẫn phải là content/engine/<engine>/L<n>/<NN>-<slug>.md');
  let src: LessonSource;
  if (typeof source === 'string') {
    const m = FM_RE.exec(source.replace(/\r\n/g, '\n')) ?? fail('thiếu frontmatter ---');
    src = { fm: yaml ? yaml(m[1]) : fail('cần bộ đọc YAML'), body: m[2] };
  } else src = source ?? fail('thiếu frontmatter ---');
  const fm = (src.fm ?? {}) as Record<string, unknown>;
  const str = (k: string): string => (typeof fm[k] === 'string' && fm[k] ? fm[k] : fail(`thiếu ${k}`));
  const bi = (v: unknown, what: string): Bi => {
    const b = v as Partial<Bi> | undefined;
    return typeof b?.vi === 'string' && typeof b.en === 'string' && b.vi.trim() && b.en.trim() ? { vi: b.vi.trim(), en: b.en.trim() } : fail(`${what} cần vi và en`);
  };
  const list = (v: unknown, what: string): unknown[] => (v === undefined ? [] : Array.isArray(v) ? v : fail(`${what} phải là danh sách`));
  const question = (v: unknown, what: string): Question => {
    const x = (v ?? {}) as Record<string, unknown>;
    const options = list(x.options, `${what}.options`).map((o, i) => bi(o, `${what}.options[${i}]`));
    if (options.length < 2) fail(`${what} cần ít nhất 2 lựa chọn`);
    const answer = typeof x.answer === 'number' && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < options.length ? x.answer : fail(`${what}.answer phải là chỉ số của một lựa chọn`);
    return { q: bi(x.q, `${what}.q`), options, answer, why: bi(x.why, `${what}.why`) };
  };
  const counts = (v: unknown, what: string): Record<string, number> => {
    const o = (v ?? {}) as Record<string, unknown>;
    return typeof v === 'object' && !Array.isArray(v) && Object.values(o).every((n) => typeof n === 'number') ? (o as Record<string, number>) : fail(`${what} phải là { tên: số }`);
  };
  const fact = (v: unknown, what: string): Fact => {
    const f = (v ?? {}) as Record<string, unknown>;
    return { ...bi(f, what), ...(typeof f.probe === 'string' ? { probe: f.probe } : {}), ...(Array.isArray(f.expect) ? { expect: f.expect as unknown[][] } : {}) };
  };

  const [engine, level, nn] = [where[1] as EngineId, where[2] as Level, where[3]];
  const kind = KINDS.includes(fm.kind as Kind) ? (fm.kind as Kind) : fail(`kind phải là một trong ${KINDS.join(', ')}`);
  const lesson: EngineLesson = {
    id: str('id'),
    engine: fm.engine === engine ? engine : fail(`engine phải là ${engine} (theo thư mục)`),
    level: fm.level === level ? level : fail(`level phải là ${level} (theo thư mục)`),
    module: /^[a-z0-9-]+$/.test(String(fm.module)) ? String(fm.module) : fail('module phải là [a-z0-9-]+'),
    title: { vi: str('title'), en: str('title_en') },
    kind,
    minutes: typeof fm.minutes === 'number' && fm.minutes > 0 && fm.minutes <= 120 ? fm.minutes : fail('minutes phải từ 1 đến 120'),
    objectives: list(fm.objectives, 'objectives').map((o, i) => bi(o, `objectives[${i}]`)),
    requires: list(fm.requires, 'requires').map(String),
    sources: list(fm.sources, 'sources').map(String),
    sections: [],
    order: Number(nn),
  };
  if (lesson.id !== lessonIdFor(engine, level, nn)) fail(`id phải là ${lessonIdFor(engine, level, nn)} (theo đường dẫn)`);
  if (fm.runtime !== undefined) lesson.runtime = RUNTIMES.includes(fm.runtime as Runtime) ? (fm.runtime as Runtime) : fail(`runtime phải là một trong ${RUNTIMES.join(', ')}`);
  // An index entry (no body): the header only; the lesson's own chunk is parsed in full when it opens.
  if (src.body === undefined) return lesson;
  if (!lesson.objectives.length) fail('cần ít nhất một objectives');
  if (fm.viz !== undefined) lesson.viz = /^[a-z0-9-]+$/.test(String(fm.viz)) ? String(fm.viz) : fail('viz phải là [a-z0-9-]+');
  if (fm.lab !== undefined) {
    const lab = fm.lab as Record<string, unknown>;
    const steps = list(lab.steps, 'lab.steps').map((v, i): LabStep => {
      const s = (v ?? {}) as Record<string, unknown>;
      return {
        task: bi(s.task, `lab.steps[${i}].task`),
        solution: typeof s.solution === 'string' && s.solution.trim() ? s.solution.trim() : fail(`lab.steps[${i}].solution trống`),
        check: CHECKS.includes(s.check as Check) ? (s.check as Check) : fail(`lab.steps[${i}].check phải là một trong ${CHECKS.join(', ')}`),
        ordered: s.ordered === true,
        hint: bi(s.hint, `lab.steps[${i}].hint`),
        ...(s.expect !== undefined ? { expect: counts(s.expect, `lab.steps[${i}].expect`) } : {}),
        ...(s.fact !== undefined ? { fact: fact(s.fact, `lab.steps[${i}].fact`) } : {}),
        ...(typeof s.target === 'string' && s.target.trim() ? { target: s.target.trim() } : {}),
        ...(s.name !== undefined ? { name: bi(s.name, `lab.steps[${i}].name`) } : {}),
      };
    });
    if (!steps.length) fail('lab cần ít nhất một bước');
    lesson.lab = { steps, ...(typeof lab.setup === 'string' && lab.setup.trim() ? { setup: lab.setup.trim() } : {}) };
  }
  if (fm.quiz !== undefined) lesson.quiz = list(fm.quiz, 'quiz').map((q, i) => question(q, `quiz[${i}]`));
  if (fm.predict !== undefined) {
    const p = fm.predict as Record<string, unknown>;
    lesson.predict = { sql: typeof p.sql === 'string' && p.sql.trim() ? p.sql.trim() : fail('predict.sql trống'), ...question(p, 'predict') };
    const x = p.expect as Record<string, unknown> | undefined;
    if (x !== undefined) {
      if (typeof x?.node !== 'string') fail('predict.expect cần node');
      if (x.rows !== undefined && typeof x.rows !== 'number') fail('predict.expect.rows phải là số');
      lesson.predict.expect = { node: String(x.node), ...(x.table ? { table: String(x.table) } : {}), ...(x.index ? { index: String(x.index) } : {}),
        ...(typeof x.rows === 'number' ? { rows: x.rows } : {}) };
    }
  }
  if ((kind === 'lab' || kind === 'capstone') && !lesson.lab) fail(`kind ${kind} cần lab`);
  if (kind === 'quiz' && !lesson.quiz?.length) fail('kind quiz cần quiz');
  if (kind === 'predict' && !lesson.predict) fail('kind predict cần predict');

  const [viPart, enPart, extra] = src.body.split(EN_RE);
  if (enPart === undefined) fail('thiếu khối "# EN"');
  if (extra !== undefined) fail('chỉ được một khối "# EN"');
  const vi = sectionsOf(viPart, 0, fail);
  const en = sectionsOf(enPart, 1, fail);
  if (vi.map((s) => s.id).join() !== en.map((s) => s.id).join()) fail('mục VI và EN phải giống nhau, cùng thứ tự');
  if (!vi.length) fail('cần ít nhất một mục ## trong thân bài');
  lesson.sections = vi.map((s, i) => ({ id: s.id, text: { vi: s.text, en: en[i].text } }));
  return lesson;
}

function sectionsOf(part: string, lang: 0 | 1, fail: (msg: string) => never): { id: SectionId; text: string }[] {
  const [lead, ...rest] = part.split(/^## /m);
  if (lead.trim()) fail(`chữ ngoài mục ## (${lang ? 'EN' : 'VI'}): "${lead.trim().slice(0, 40)}"`);
  return rest.map((sec) => {
    const nl = sec.indexOf('\n');
    const heading = (nl === -1 ? sec : sec.slice(0, nl)).trim();
    const id = (Object.keys(SECTIONS) as SectionId[]).find((k) => SECTIONS[k][lang] === heading) ?? fail(`mục lạ "## ${heading}"`);
    const text = nl === -1 ? '' : sec.slice(nl + 1).trim();
    if (!text) fail(`mục "## ${heading}" trống`);
    return { id, text };
  });
}

/** Optional `content/engine/<engine>/modules.yml`: `- { id, vi, en }`, the modules' names in display order. */
export interface ModuleName { id: string; vi: string; en: string }
export function parseModules(source: string | unknown, path: string, yaml?: Yaml): ModuleName[] {
  const v = typeof source === 'string' ? (yaml ?? ((): never => { throw new Error(`${path}: cần bộ đọc YAML`); }))(source) : source;
  if (!Array.isArray(v)) throw new Error(`${path}: phải là danh sách`);
  return v.map((x: Record<string, unknown>, i) => {
    if (typeof x?.id !== 'string' || typeof x.vi !== 'string' || typeof x.en !== 'string') throw new Error(`${path}[${i}]: cần id, vi, en`);
    return { id: x.id, vi: x.vi, en: x.en };
  });
}

/** One block of section text: a paragraph, a bullet list or a fenced code block (lang = the fence's info string). */
export type Block = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] } | { kind: 'code'; lang: string; code: string };
export function blocksOf(text: string): Block[] {
  const out: Block[] = [];
  const parts = text.replace(/\r\n/g, '\n').split(/^```([a-z]*)\n([\s\S]*?)^```[ \t]*$/m);
  for (let i = 0; i < parts.length; i += 3) {
    for (const para of parts[i].trim().split(/\n\s*\n/).filter((p) => p.trim())) {
      const lines = para.split('\n').map((l) => l.trim());
      if (lines.every((l) => l.startsWith('- '))) out.push({ kind: 'ul', items: lines.map((l) => l.slice(2)) });
      else out.push({ kind: 'p', text: lines.join(' ') });
    }
    if (i + 2 < parts.length) out.push({ kind: 'code', lang: parts[i + 1], code: parts[i + 2].replace(/\n$/, '') });
  }
  return out;
}

const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
/** Inline `code` and fenced blocks, sorted: VI and EN must hold the same ones (code is never translated). */
export const codeOf = (text: string): string[] =>
  [...text.matchAll(/```[a-z]*\n([\s\S]*?)```|`([^`\n]+)`/g)].map((m) => (m[1] ?? m[2]).trim()).sort();

/**
 * Content rules beyond parsing (tests/engineContent.test.ts and the content agents run these): EN without Vietnamese
 * diacritics (code excluded), code identical in VI and EN, sources are https URLs. `ids`: every lesson id, for `requires`.
 */
export function lessonProblems(l: EngineLesson, ids: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const pairs: [string, Bi][] = [
    ['title', l.title], ...l.objectives.map((b, i): [string, Bi] => [`objectives[${i}]`, b]),
    ...l.sections.map((s): [string, Bi] => [`## ${SECTIONS[s.id][1]}`, s.text]),
    ...(l.lab?.steps ?? []).flatMap((s, i): [string, Bi][] => [[`lab.steps[${i}].task`, s.task], [`lab.steps[${i}].hint`, s.hint],
      ...(s.name ? [[`lab.steps[${i}].name`, s.name] as [string, Bi]] : []),
      ...(s.fact ? [[`lab.steps[${i}].fact`, { vi: s.fact.vi, en: s.fact.en }] as [string, Bi]] : [])]),
    ...[...(l.quiz ?? []), ...(l.predict ? [l.predict] : [])].flatMap((q, i): [string, Bi][] =>
      [[`q${i}`, q.q], [`why${i}`, q.why], ...q.options.map((o, j): [string, Bi] => [`q${i}.options[${j}]`, o])]),
  ];
  for (const [what, b] of pairs) {
    const en = b.en.replace(/```[\s\S]*?```|`[^`\n]+`/g, '');
    if (DIACRITIC.test(en)) out.push(`${what}: EN có dấu tiếng Việt`);
    if (codeOf(b.vi).join('\u0000') !== codeOf(b.en).join('\u0000')) out.push(`${what}: code VI ≠ EN`);
  }
  for (const r of l.requires) if (!ids.has(r)) out.push(`requires ${r}: không có bài này`);
  if (l.requires.includes(l.id)) out.push('requires chính nó');
  for (const s of l.sources) {
    let ok = false;
    try {
      ok = new URL(s).protocol === 'https:';
    } catch { /* not a URL */ }
    if (!ok) out.push(`sources: "${s}" không phải URL https`);
  }
  if (!l.sources.length) out.push('cần ít nhất một sources');
  return out;
}

/** A multiple-choice answer (quiz item or predict): the picked option's original index. */
export const isRight = (q: Question, picked: number | undefined): boolean => picked === q.answer;

/**
 * Graded parts of a lesson, each passed once in a visit: every quiz item, the predict question, every lab step that can be
 * graded here (`gradable`, src/engine/labs.ts: a runner exists and handles the step's check). A lesson with none (a concept,
 * or a lab whose engine does not run in the browser) is completed by its "mark as learned" button.
 */
export type Gradable = (l: EngineLesson, step: LabStep) => boolean;
export const partsOf = (l: EngineLesson, gradable: Gradable = () => true): string[] =>
  [...(l.quiz ?? []).map((_, i) => `q${i}`), ...(l.predict ? ['p'] : []),
    ...(l.lab?.steps ?? []).flatMap((s, i) => (gradable(l, s) ? [`s${i}`] : []))];
export const lessonPassed = (l: EngineLesson, passed: ReadonlySet<string>, gradable?: Gradable): boolean =>
  partsOf(l, gradable).every((p) => passed.has(p));

/** XP on the first completion only (L220): concept/quiz/predict 5, lab 10 (like a General drill), capstone 20 (like a challenge). */
export const ENGINE_XP: Record<Kind, number> = { concept: 5, quiz: 5, predict: 5, lab: 10, capstone: 20 };
export const engineXp = (l: EngineLesson, done: boolean): number => (done ? 0 : ENGINE_XP[l.kind]);

export interface Tree { engine: EngineId; levels: { level: Level; modules: { id: string; name: Bi; lessons: EngineLesson[] }[] }[] }
/** One engine's lessons by level, then module (modules.yml order, then first appearance), then file order. */
export function treeOf(engine: EngineId, lessons: readonly EngineLesson[], names: readonly ModuleName[] = []): Tree {
  const own = lessons.filter((l) => l.engine === engine).sort((a, b) => a.level.localeCompare(b.level) || a.order - b.order);
  const rank = (id: string): number => {
    const i = names.findIndex((n) => n.id === id);
    return i === -1 ? names.length : i;
  };
  return {
    engine,
    levels: LEVELS.map((level) => {
      const here = own.filter((l) => l.level === level);
      const ids = [...new Set(here.map((l) => l.module))].sort((a, b) => rank(a) - rank(b));
      return {
        level,
        modules: ids.map((id) => {
          const n = names.find((x) => x.id === id);
          return { id, name: n ? { vi: n.vi, en: n.en } : { vi: id, en: id }, lessons: here.filter((l) => l.module === id) };
        }),
      };
    }),
  };
}

/** `done` / `total` lessons of a list. */
export const progressOf = (lessons: readonly EngineLesson[], completed: ReadonlySet<string>): { done: number; total: number } =>
  ({ done: lessons.filter((l) => completed.has(l.id)).length, total: lessons.length });
