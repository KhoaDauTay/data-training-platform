/**
 * ENG-CORE (L220): Database Engine lessons, schema ENGINE-CONTENT-V1. Pure: no DOM, no value import from main modules (the
 * engine UI chunk imports this; a value import of a main module would split main, Plan 6 U3). The YAML parser comes in as an
 * argument for the same reason (`yaml` lives in main).
 *
 * File: `content/engine/<engine>/<level>/<NN>-<slug>.md`, engine ∈ postgres|mongodb|dynamodb|design, level ∈ L1..L5.
 * Frontmatter: id, engine, level, module, title (VI), title_en, kind, minutes, objectives [{vi,en}], requires [ids],
 * sources [https urls], viz?, lab? {setup?, steps:[{task:{vi,en}, solution, check, ordered?, hint:{vi,en}}]},
 * quiz? [{q:{vi,en}, options:[{vi,en}], answer, why:{vi,en}}], predict? {sql, q, options, answer, why}.
 * Body: VI sections (## Ý chính, ## Ví dụ, ## Thực hành), then `# EN` with the same sections (## Key idea, ## Example,
 * ## Practice). Section text: paragraphs, `- ` bullet lists, inline `code` and ``` fenced blocks; nothing else.
 */
import type { PerfSpec } from '../planCheck';
import { type FigRef, parseFigures } from './figureSlot';
import { LAYERS, MATERIALIZED, type ModelSpec } from './stack/dbt';

/** v28 R4 (L322, L420): `design` = database design and DBMS theory, the fourth card; its labs run on PostgreSQL (`onPg`). */
export const ENGINES = ['postgres', 'mongodb', 'dynamodb', 'design', 'stack',
  'graph', // v47 (L1080): Graph basics on PostgreSQL
] as const; // v45 (L740): + stack, the data stack (dbt, Fivetran, Snowflake)
export type EngineId = (typeof ENGINES)[number];
/** The three database products (the interview room and the glossary): every engine but the design track. */
export type ProductEngine = Exclude<EngineId, 'design' | 'stack' | 'graph'>;
export const ENGINE_SHORT: Record<EngineId, 'pg' | 'mg' | 'dy' | 'ds' | 'st' | 'gr'> = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy', design: 'ds', stack: 'st',
  graph: 'gr', // v47 (L1080)
};
/** The engines whose labs, predicts and plans run on PostgreSQL (PGlite): Postgres itself and the design track (L420). */
export const onPg = (e: EngineId): boolean => e === 'postgres' || e === 'design' || e === 'stack' || e === 'graph'; // v47 (L1080): + graph
export const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
/** A rung of an engine's ladder (the trees, badges and skill map hold only these). */
export type Rung = (typeof LEVELS)[number];
/** v43 (L720): `EXT` = the PostgreSQL Extensions shelf (content/engine/postgres/ext/), never in a tree: no badge, no XP. */
export type Level = Rung | 'EXT';
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
/** `perf` / `slow` (v24, L340): a performance bar on a Postgres `rows` step, as on a General drill (src/planCheck.ts slowVerdict). */
/**
 * v25 MongoDB (route R5): `rule` = a bar graded by rule (`esr` on `target`, `covered` on `index`, `match-first`), never
 * measured; `error` = the code MongoDB must refuse the command with ("mong lỗi"); `sql` = the equivalent SQL, shown after
 * the step passes ("So với SQL"), never run. Checked in tests/engineContent.test.ts and tests/engineIntegration.test.ts.
 */
export interface LabStep {
  task: Bi; solution: string; check: Check; ordered: boolean; hint: Bi; expect?: Record<string, number>; fact?: Fact; target?: string; name?: Bi; perf?: PerfSpec; slow?: string;
  rule?: 'esr' | 'covered' | 'match-first'; index?: string; error?: string; sql?: string;
  /** v27 R3: a read run right after the statement on a Postgres setup lab; the step is graded on its rows (GRANT, CALL, TRUNCATE, a write). */
  after?: string;
  /** v45 (L742): a dbt-style model step (engine stack): the code is a Jinja SELECT compiled by src/engine/stack/dbt.ts; graded by `after`. */
  model?: ModelSpec;
}
export interface Lab { setup?: string; steps: LabStep[] }
export interface Question { q: Bi; options: Bi[]; answer: number; why: Bi }
/**
 * `expect` (Postgres): a plan node the real EXPLAIN (FORMAT JSON) shows, `{ node, table?, index?, rows? }` (`rows` = the
 * planner's row estimate on that node); checked by tests/enginePredict.test.ts through src/engine/predict.ts.
 */
export interface PredictExpect { node: string; table?: string; index?: string; rows?: number }
/**
 * v25 REC (research-nosql-v25-v26 §2.3): where a predict's answer comes from when nothing runs here. `tier: docs` = figures
 * and stage names quoted from the official manual page `url` (never a whole explain JSON); `mongod` = captured from a real
 * server (needs `explainVersion`). `output` = the few lines quoted, absent when the docs state only the conclusion.
 */
export interface Recorded { tier: 'docs' | 'mongod'; server: string; version: string; date: string; url?: string; explainVersion?: string | null; output?: string }
export interface Predict extends Question { sql: string; expect?: PredictExpect; recorded?: Recorded }
/** `browser`: runs here; `docs`: numbers come from the official docs, nothing runs (the page says so). */
export const RUNTIMES = ['browser', 'docs'] as const;
export type Runtime = (typeof RUNTIMES)[number];
/** Why a `runtime: docs` lesson does not run here (L305), shown on its page: two sessions at once, a real server, billions of transactions, or a concept whose run is the next lab. */
export const DOCS_WHY = ['sessions', 'server', 'scale', 'next', 'ext'] as const;
export type DocsWhy = (typeof DOCS_WHY)[number];
/**
 * The i18n key of a `runtime: docs` lesson's notice (L578a): the `docs_why` texts name Postgres and PGlite, so a MongoDB or
 * DynamoDB lesson gets its own engine's `server` wording (a real cluster / the real AWS service), else the generic notice.
 */
export function docsNoteKey(l: { engine: EngineId; docsWhy?: DocsWhy }): string {
  if (!l.docsWhy) return 'runtime.docs';
  if (l.engine === 'mongodb' || l.engine === 'dynamodb') return l.docsWhy === 'server' ? `runtime.docs.server.${l.engine}` : 'runtime.docs';
  return `runtime.docs.${l.docsWhy}`;
}
/**
 * v27 R3 (product-route-v24 §2.2): the eight-section anatomy adds `open` (drawn above the objectives), `syntax`, `pitfalls`
 * and `recap` (drawn after the questions). Which sections a kind needs: tests/engineAnatomy.test.ts.
 */
export const SECTIONS = {
  open: ['Mở bài', 'Opening'], idea: ['Ý chính', 'Key idea'], syntax: ['Cú pháp', 'Syntax'], example: ['Ví dụ', 'Example'],
  pitfalls: ['Lỗi hay gặp', 'Common mistakes'], practice: ['Thực hành', 'Practice'], recap: ['Tóm tắt', 'Recap'],
} as const;
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
  docsWhy?: DocsWhy;
  minutes: number;
  objectives: Bi[];
  requires: string[];
  sources: string[];
  /** v38 (R2 E08): a source written as `{ url, title }` shows that title in "Đọc thêm" instead of its URL slug. */
  sourceTitles?: Record<string, string>;
  viz?: string;
  /** v39 (L600): figures placed at the end of a named section (src/engine/figureSlot.ts). Full lesson only, never in META_KEYS. */
  figures?: FigRef[];
  lab?: Lab;
  quiz?: Question[];
  predict?: Predict;
  /** Frontmatter `demo_setup`: the data the runnable examples use when the lesson has no `lab.setup` (src/engine/demo.ts). */
  demoSetup?: string;
  sections: Section[];
  /** File order inside its level (the NN of the file name). */
  order: number;
}

/** `e-pg-l1-01`: engine short name, level, the file's NN. */
export const lessonIdFor = (engine: EngineId, level: Level, nn: string): string => `e-${ENGINE_SHORT[engine]}-${level.toLowerCase()}-${nn}`;
const PATH_RE = /engine\/(postgres|mongodb|dynamodb|design|stack|graph)\/(L[1-5]|ext)\/(\d{2})-[a-z0-9-]+\.md$/;
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
  const perfOf = (v: unknown, slow: unknown, what: string): PerfSpec => {
    const p = (v ?? {}) as Record<string, unknown>;
    if (typeof p.table !== 'string' || !p.table) fail(`${what}.perf cần table`);
    if (typeof slow !== 'string' || !slow.trim()) fail(`${what}.perf cần slow`);
    return { table: String(p.table), ...(typeof p.max_ratio === 'number' ? { max_ratio: p.max_ratio } : {}) };
  };

  const modelOf = (v: unknown, what: string): ModelSpec => {
    const m = (v ?? {}) as Record<string, unknown>;
    if (typeof m.name !== 'string' || !/^[a-z_][a-z0-9_]*$/.test(m.name)) fail(`${what}.name`);
    if (!(LAYERS as readonly unknown[]).includes(m.layer)) fail(`${what}.layer phải là ${LAYERS.join(', ')}`);
    if (m.materialized !== undefined && !(MATERIALIZED as readonly unknown[]).includes(m.materialized)) fail(`${what}.materialized`);
    return { name: String(m.name), layer: m.layer as ModelSpec['layer'], ...(m.materialized ? { materialized: m.materialized as ModelSpec['materialized'] } : {}) };
  };

  const [engine, level, nn] = [where[1] as EngineId, (where[2] === 'ext' ? 'EXT' : where[2]) as Level, where[3]];
  if (level === 'EXT' && engine !== 'postgres') fail('ext/ chỉ có ở content/engine/postgres/ext');
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
    sources: list(fm.sources, 'sources').map((s) => (s && typeof s === 'object' ? String((s as { url?: unknown }).url) : String(s))),
    sections: [],
    order: Number(nn),
  };
  const titled = list(fm.sources, 'sources').filter((s): s is { url: unknown; title: unknown } => !!s && typeof s === 'object');
  for (const s of titled) if (typeof s.title !== 'string' || !s.title.trim()) fail('sources: { url, title } cần title');
  if (titled.length) lesson.sourceTitles = Object.fromEntries(titled.map((s) => [String(s.url), String(s.title)]));
  if (lesson.id !== lessonIdFor(engine, level, nn)) fail(`id phải là ${lessonIdFor(engine, level, nn)} (theo đường dẫn)`);
  if (fm.runtime !== undefined) lesson.runtime = RUNTIMES.includes(fm.runtime as Runtime) ? (fm.runtime as Runtime) : fail(`runtime phải là một trong ${RUNTIMES.join(', ')}`);
  if (fm.docs_why !== undefined) {
    if (lesson.runtime !== 'docs') fail('docs_why chỉ dùng với runtime: docs');
    lesson.docsWhy = DOCS_WHY.includes(fm.docs_why as DocsWhy) ? (fm.docs_why as DocsWhy) : fail(`docs_why phải là một trong ${DOCS_WHY.join(', ')}`);
  }
  // An index entry (no body): the header only; the lesson's own chunk is parsed in full when it opens.
  if (src.body === undefined) return lesson;
  if (!lesson.objectives.length) fail('cần ít nhất một objectives');
  if (fm.viz !== undefined) lesson.viz = /^[a-z0-9-]+$/.test(String(fm.viz)) ? String(fm.viz) : fail('viz phải là [a-z0-9-]+');
  if (fm.figures !== undefined) lesson.figures = parseFigures(fm.figures, Object.keys(SECTIONS), fail);
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
        ...(s.name !== undefined ? { name: bi(s.name, `lab.steps[${i}].name`) } : {}),
        ...(s.perf !== undefined ? { perf: perfOf(s.perf, s.slow, `lab.steps[${i}]`) } : {}),
        ...(s.model !== undefined ? { model: modelOf(s.model, `lab.steps[${i}].model`) } : {}),
        ...Object.fromEntries(['target', 'slow', 'rule', 'index', 'error', 'sql', 'after'].flatMap((k) => (typeof s[k] === 'string' && s[k] ? [[k, s[k].trim()]] : []))),
      };
    });
    if (!steps.length) fail('lab cần ít nhất một bước');
    if (steps.some((s) => s.model && !s.after)) fail('bước model cần after (CREATE VIEW không trả dòng nào)');
    lesson.lab = { steps, ...(typeof lab.setup === 'string' && lab.setup.trim() ? { setup: lab.setup.trim() } : {}) };
  }
  if (typeof fm.demo_setup === 'string' && fm.demo_setup.trim()) lesson.demoSetup = fm.demo_setup.trim();
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
    if (p.recorded) lesson.predict.recorded = p.recorded as Recorded;
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
  for (const f of lesson.figures ?? []) if (!vi.some((s) => s.id === f.at)) fail(`figures: bài không có mục "${f.at}" cho ${f.name}`);
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
/** v43 (L721): the Extensions shelf gives no XP (the user: "full lessons, no XP"). */
export const engineXp = (l: EngineLesson, done: boolean): number => (done || l.level === 'EXT' ? 0 : ENGINE_XP[l.kind]);

export interface Tree { engine: EngineId; levels: { level: Rung; modules: { id: string; name: Bi; lessons: EngineLesson[] }[] }[] }
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
