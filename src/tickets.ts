import { parse as parseYaml } from 'yaml';
import { bilingualOf, type Bilingual } from './progress';
import type { LabSpec, PlanSpec } from './planCheck';
import { parseScene, type Scene } from './scene';

export type Lang = 'vi' | 'en';
export type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss';
/** curriculum §5.1: worked = annotated example + paired task; faded = starter with ___ blanks; open = plain task. */
export type Format = 'worked' | 'faded' | 'open';
/** A blank in a faded starter; Submit refuses SQL that still contains one. */
export const BLANK = '___';
/**
 * Blanks left in `sql` (v13, product-design-v8 §3.8): Submit refuses SQL that still has one, in every exercise. A faded ticket
 * counts every ___ (its starter has blanks inside quotes, ch6-02); anywhere else only a standalone ___ outside '…', "…" and
 * comments counts, since LIKE '___' is a valid pattern. Stateless, so a draft with blanks that survived a reload is still caught.
 */
export function blanksIn(sql: string, faded: boolean): number {
  return (faded ? sql.split(BLANK).length - 1 : codeOnly(sql).match(STANDALONE_G)?.length) ?? 0;
}
// ponytail: comments are not nested and dollar quotes are not skipped; fine for the generated frames and content Solutions.
/** Strings and comments blanked out with spaces of the same length, so offsets still match `sql`. */
const codeOnly = (sql: string): string => sql.replace(/'(?:[^']|'')*'?|"(?:[^"]|"")*"?|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g, (m) => ' '.repeat(m.length));
const STANDALONE = /(?<![\w$])___(?![\w$])/;
const STANDALONE_G = new RegExp(STANDALONE.source, 'g');
/** Offset of the first blank `blanksIn` counts (-1: none): the scaffold selects it so typing replaces it (v13 §3.1). */
export const firstBlank = (sql: string, faded: boolean): number => (faded ? sql.indexOf(BLANK) : codeOnly(sql).search(STANDALONE));
/**
 * v13 §3.5, "Fill the scaffold" with this editor text: empty or the step's starter → replace at once; already the scaffold →
 * only select its first blank again; anything else is the player's own SQL → ask first (never merged into it).
 */
export function fillAction(current: string, frame: string, starter: string | undefined): 'replace' | 'same' | 'ask' {
  const cur = current.trim();
  return cur === frame.trim() ? 'same' : !cur || cur === starter?.trim() ? 'replace' : 'ask';
}
/** Expected-result column label (L25): business meaning in both languages, never the Solution's column name. */
export interface Step {
  title: string;
  prompt: string;
  solution: string;
  /** Expected result column labels from `columns:` (shape card only; the grader compares by position). */
  columns?: Bilingual[];
  /** Chapter 11 `plan:`: after a correct result, the plan must read this table through an index. */
  plan?: PlanSpec;
  /** Chapter 11 `lab:`: the player writes a CREATE INDEX that speeds up this step's Solution (the slow query). */
  lab?: LabSpec;
  /** L4 (v12.0): `precision:`. Numbers must already be at this many decimals (src/grader.ts); absent = lenient 2-decimal compare. */
  precision?: number;
}
export interface Conclusion { question: string; options: string[]; answer: number }
/** Player-facing text in one language. `steps` runs parallel to Ticket.steps. */
export interface TicketText {
  title: string;
  body: string;
  task: string;
  hints: string[];
  steps: { title: string; prompt: string }[];
  conclusion?: { question: string; options: string[] };
  /** "## Example" prose (format: worked): explains the ①… markers of Ticket.example.sql. */
  example?: string;
}
/** Multiple-choice question in the Recap after a correct submit (curriculum §5.5). Not graded, not saved. */
export interface Reflect { q: Bilingual; options: Bilingual[]; answer: number; why: Bilingual }
/** A common wrong answer: when the player's result equals this SQL's result, the feedback shows `why` (curriculum §5.4). */
export interface Wrong { sql: string; why: Bilingual }
/** Values for the {{name}} templates. variants[0] is the version used in the main path. */
export type Variant = Record<string, string>;
export interface Ticket {
  id: string;
  chapter: number;
  /** VI text lives in the top-level fields; EN in `en`. */
  title: string;
  from: { name: string; dept: string };
  difficulty: number;
  beat: Beat;
  requires: string[];
  grants: string[];
  tables: string[];
  ordered: boolean;
  body: string;
  /** "## Task" section: the concrete request. '' when the ticket has none. */
  task: string;
  hints: string[];
  /** Normal tickets: exactly one step with empty title/prompt. Boss: 2+ steps. */
  steps: Step[];
  conclusion?: Conclusion;
  /** SQL preloaded into an empty editor (spec: ch1-01). */
  starter?: string;
  /** Completion animation (completion-animations.md §3.1); sceneOf() fills the default. */
  scene?: Scene;
  variants?: Variant[];
  en?: TicketText;
  /** undefined = open (ch1–3 never declare it). */
  format?: Format;
  /** format: worked. `sql` (markers -- ①…) is shared; `text` is the VI prose (EN prose lives in en.example). */
  example?: { sql: string; text: string };
  reflect?: Reflect;
  wrong?: Wrong[];
  /** Plan 5: a lane side task (content/lanes/) for this map port; `chapter` is then the chapter whose review opens it. */
  lane?: string;
  /** Plan 11 §1.4: advanced General nodes (content/general/adv.yml ids) this task applies; shown as "Relies on" links, never in requires. */
  adv?: string[];
  /** v14 T3 (D-H3): the hint scaffold hides every clause that differs from a `wrong:` answer, like a General trap drill. */
  trap?: true;
}

const BEATS: Beat[] = ['teach', 'develop', 'twist', 'rest', 'boss'];
const FORMATS: Format[] = ['worked', 'faded', 'open'];
const FM_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const EN_RE = /^# EN[ \t]*$/m;
const SQL_RE = /```sql\n([\s\S]*?)```/;
const VAR_RE = /\{\{(\w+)\}\}/g;
const VARIANT_VALUE_RE = /^[\w .:/-]{1,40}$/;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

interface Sections { body: string; task: string; hints: string[]; steps: Step[]; example?: { prose: string; sql: string } }

/** VI part: steps carry ```sql. EN part: same headings, never ```sql (SQL is shared). */
function parseSections(part: string, fail: (msg: string) => never, lang: Lang): Sections {
  const [body, ...sections] = part.split(/^## /m);
  const out: Sections = { body: body.trim(), task: '', hints: [], steps: [] };
  for (const sec of sections) {
    const nl = sec.indexOf('\n');
    const heading = (nl === -1 ? sec : sec.slice(0, nl)).trim();
    const content = nl === -1 ? '' : sec.slice(nl + 1);
    if (heading === 'Task') {
      out.task = content.trim();
    } else if (heading === 'Example') {
      const sql = SQL_RE.exec(content);
      if (lang === 'en' && sql) fail('khối # EN không được chứa ```sql trong "## Example" — SQL dùng chung');
      if (lang === 'vi' && !sql) fail('"## Example" thiếu khối ```sql');
      out.example = { prose: content.replace(SQL_RE, '').trim(), sql: sql ? sql[1].trim() : '' };
    } else if (heading === 'Hints') {
      for (const line of content.split('\n')) {
        const h = /^\d+\.\s+(.*)$/.exec(line.trim());
        if (h) out.hints.push(h[1]);
      }
    } else if (heading === 'Solution' || /^Step \d+:/.test(heading)) {
      const sql = SQL_RE.exec(content);
      if (lang === 'en' && (sql || heading === 'Solution')) fail('khối # EN không được chứa ```sql hay "## Solution" — SQL dùng chung');
      if (lang === 'vi' && !sql) fail(`mục "${heading}" thiếu khối \`\`\`sql`);
      out.steps.push({
        title: heading === 'Solution' ? '' : heading.replace(/^Step \d+:\s*/, ''),
        prompt: heading === 'Solution' ? '' : content.replace(SQL_RE, '').trim(),
        solution: sql ? sql[1].trim() : '',
      });
    } else {
      fail(`mục lạ "## ${heading}"`);
    }
  }
  return out;
}

/** Every {{name}} used anywhere in the ticket's text, SQL and labels. */
function templateNames(t: Ticket): Set<string> {
  const texts = (x: TicketText) => [x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
    ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? ''];
  const both = (b: Bilingual) => [b.vi, b.en];
  const all = [
    ...texts(textOf(t, 'vi')),
    ...(t.en ? texts(t.en) : []),
    ...t.steps.flatMap((s) => [s.solution, ...(s.columns ?? []).flatMap(both)]),
    t.starter ?? '',
    t.example?.sql ?? '',
    ...(t.reflect ? [t.reflect.q, ...t.reflect.options, t.reflect.why].flatMap(both) : []),
    ...(t.wrong ?? []).flatMap((w) => [w.sql, ...both(w.why)]),
  ];
  return new Set(all.flatMap((s) => [...s.matchAll(VAR_RE)].map((m) => m[1])));
}

export function parseTicket(source: string, origin: string): Ticket {
  const fail = (msg: string): never => {
    throw new Error(`${origin}: ${msg}`);
  };
  const m = FM_RE.exec(source.replace(/\r\n/g, '\n'));
  if (!m) return fail('thiếu frontmatter ---');
  const fm = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  const [viPart, enPart, extra] = m[2].split(EN_RE);
  if (extra !== undefined) fail('chỉ được một khối "# EN"');
  const vi = parseSections(viPart, fail, 'vi');

  const from = fm.from as { name?: unknown; dept?: unknown } | undefined;
  const beat = fm.beat as Beat;
  const t: Ticket = {
    id: typeof fm.id === 'string' ? fm.id : fail('thiếu id'),
    chapter: typeof fm.chapter === 'number' ? fm.chapter : fail('thiếu chapter'),
    title: typeof fm.title === 'string' ? fm.title : fail('thiếu title'),
    from: typeof from?.name === 'string' && typeof from?.dept === 'string' ? { name: from.name, dept: from.dept } : fail('thiếu from.name/from.dept'),
    difficulty: typeof fm.difficulty === 'number' && fm.difficulty >= 1 && fm.difficulty <= 5 ? fm.difficulty : fail('difficulty phải từ 1 đến 5'),
    beat: BEATS.includes(beat) ? beat : fail(`beat phải là một trong ${BEATS.join(', ')}`),
    requires: strings(fm.requires),
    grants: strings(fm.grants),
    tables: strings(fm.tables),
    ordered: fm.ordered === true,
    body: vi.body,
    task: vi.task,
    hints: vi.hints,
    steps: vi.steps,
  };
  if (fm.format !== undefined) {
    t.format = FORMATS.includes(fm.format as Format) ? (fm.format as Format) : fail(`format phải là một trong ${FORMATS.join(', ')}`);
  }

  if (t.hints.length !== 3) fail('cần đúng 3 hints');
  if (t.beat === 'boss') {
    const c = fm.conclusion as Partial<Conclusion> | undefined;
    if (!c || typeof c.question !== 'string' || !Array.isArray(c.options) || typeof c.answer !== 'number' || c.answer < 0 || c.answer >= c.options.length) {
      fail('boss cần conclusion { question, options, answer } hợp lệ');
    }
    t.conclusion = { question: c!.question!, options: c!.options!.map(String), answer: c!.answer! };
    if (t.steps.length < 2 || t.steps.some((s) => s.title === '')) fail('boss cần ≥ 2 mục "## Step N: ..." và không có "## Solution"');
  } else if (t.steps.length !== 1 || t.steps[0].title !== '') {
    fail('ticket thường cần đúng một mục "## Solution"');
  }

  if (fm.columns !== undefined) {
    // Normal ticket: one list of labels. Boss: one list per step. Each label is { vi, en } (L25).
    const lists = t.beat === 'boss' ? fm.columns : [fm.columns];
    const parsed = Array.isArray(lists) && lists.length === t.steps.length
      ? lists.map((l) => (Array.isArray(l) && l.length > 0 ? l.map(bilingualOf) : [undefined]))
      : [[undefined]];
    if (parsed.some((l) => l.some((x) => !x))) fail('columns: mỗi nhãn là { vi, en }; ticket thường một danh sách, cột mốc một danh sách cho mỗi bước');
    parsed.forEach((l, i) => (t.steps[i].columns = l as Bilingual[]));
  }

  // plan:/lab: like columns: one object on a normal ticket, one entry per step (null = none) on a promotion review.
  const perStep = (key: 'plan' | 'lab', check: (v: Record<string, unknown>) => boolean): Record<string, unknown>[] | undefined => {
    const v = fm[key];
    if (v === undefined) return undefined;
    const list = t.beat === 'boss' ? v : [v];
    if (!Array.isArray(list) || list.length !== t.steps.length
      || list.some((x) => x !== null && (!x || typeof x !== 'object' || Array.isArray(x) || !check(x as Record<string, unknown>)))) {
      fail(`${key}: ticket thường một bảng, cột mốc một danh sách mỗi bước (null = không có); xem content/TEMPLATE.md`);
    }
    return list as Record<string, unknown>[];
  };
  const isName = (x: unknown) => typeof x === 'string' && /^[a-z_]+$/.test(x);
  perStep('plan', (x) => isName(x.index))?.forEach((x, i) => { if (x) t.steps[i].plan = { index: x.index as string }; });
  perStep('lab', (x) => isName(x.table) && typeof x.ddl === 'string' && typeof x.max_cost_ratio === 'number' && x.max_cost_ratio > 0 && x.max_cost_ratio < 1)
    ?.forEach((x, i) => { if (x) t.steps[i].lab = { table: x.table as string, ddl: x.ddl as string, max_cost_ratio: x.max_cost_ratio as number }; });
  // L4: like columns: one number on a normal ticket, one entry per step (null = none) on a promotion review.
  if (fm.precision !== undefined) {
    const list = t.beat === 'boss' ? fm.precision : [fm.precision];
    const ok = (x: unknown): boolean => x === null || (Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6);
    if (!Array.isArray(list) || list.length !== t.steps.length || !list.every(ok)) {
      fail('precision: số nguyên 0–6; ticket thường một số, cột mốc một danh sách mỗi bước (null = không có)');
    }
    (list as (number | null)[]).forEach((p, i) => { if (p !== null) t.steps[i].precision = p; });
  }
  if (t.steps.some((st) => st.plan && st.lab)) fail('một bước không thể có cả plan: và lab:');
  if (t.steps.some((st) => st.lab) && fm.wrong !== undefined) fail('bước lab: không có kết quả để so với wrong:');

  if (fm.starter !== undefined) {
    if (typeof fm.starter !== 'string') fail('starter phải là chuỗi SQL');
    t.starter = (fm.starter as string).trim();
  }
  if (fm.scene !== undefined) t.scene = parseScene(fm.scene, t.beat === 'boss', fail);
  if (fm.adv !== undefined) {
    const ok = Array.isArray(fm.adv) && fm.adv.length > 0 && fm.adv.every((x) => typeof x === 'string' && /^[a-d]\d{1,2}$/.test(x));
    t.adv = ok ? (fm.adv as string[]) : fail('adv: danh sách id nút nâng cao trong content/general/adv.yml, vd [a3]');
  }
  if (fm.lane !== undefined) t.lane = typeof fm.lane === 'string' && /^[A-Z]{5}$/.test(fm.lane) ? fm.lane : fail('lane là mã cảng của bản đồ, vd NLRTM');

  if (vi.example) {
    t.example = { sql: vi.example.sql, text: vi.example.prose };
    if (t.format !== 'worked') fail('"## Example" chỉ dành cho format: worked');
  } else if (t.format === 'worked') {
    fail('format: worked cần mục "## Example" (khối ```sql có chú thích ①… và lời giải thích)');
  }
  if (t.format === 'faded' && !t.starter?.includes(BLANK)) fail(`format: faded cần starter có ít nhất một chỗ trống ${BLANK}`);
  if (t.beat === 'boss' && (fm.reflect !== undefined || fm.wrong !== undefined)) fail('boss dùng conclusion, không có reflect/wrong');
  if (fm.reflect !== undefined) {
    const r = fm.reflect as { q?: unknown; options?: unknown; answer?: unknown; why?: unknown } | null;
    const options = Array.isArray(r?.options) ? r.options.map(bilingualOf) : [];
    const q = bilingualOf(r?.q);
    const why = bilingualOf(r?.why);
    const answer = r?.answer;
    if (!q || !why || options.length < 2 || options.length > 4 || options.some((o) => !o)
      || typeof answer !== 'number' || answer < 0 || answer >= options.length) {
      fail('reflect cần { q: {vi, en}, options: 2–4 × {vi, en}, answer: số thứ tự đáp án đúng (từ 0), why: {vi, en} }');
    }
    t.reflect = { q: q!, options: options as Bilingual[], answer: answer as number, why: why! };
  }
  if (fm.wrong !== undefined) {
    const ws = Array.isArray(fm.wrong) ? (fm.wrong as unknown[]) : [];
    if (ws.length === 0) fail('wrong: cần ít nhất một mục { sql, vi, en }');
    t.wrong = ws.map((w) => {
      const o = w as { sql?: unknown } | null;
      const why = bilingualOf(w);
      if (typeof o?.sql !== 'string' || !o.sql.trim() || !why) fail('wrong: mỗi mục là { sql, vi, en }');
      return { sql: (o!.sql as string).trim(), why: why! };
    });
  }
  if (fm.trap !== undefined) t.trap = fm.trap === true && t.wrong ? true : fail('trap: true cần wrong: (khung gợi ý giấu mệnh đề khác câu sai)');

  if (enPart !== undefined) {
    const en = parseSections(enPart, fail, 'en');
    if (typeof fm.title_en !== 'string') fail('khối # EN cần title_en');
    if (en.hints.length !== 3) fail('khối # EN cần đúng 3 hints');
    if ((en.task === '') !== (t.task === '')) fail('"## Task" phải có ở cả VI và EN');
    if (t.beat === 'boss' ? en.steps.length !== t.steps.length || en.steps.some((s) => s.title === '') : en.steps.length !== 0) {
      fail('khối # EN phải có cùng các mục "## Step N: ..." với bản VI');
    }
    t.en = {
      title: fm.title_en as string,
      body: en.body,
      task: en.task,
      hints: en.hints,
      steps: t.beat === 'boss' ? en.steps.map((s) => ({ title: s.title, prompt: s.prompt })) : [{ title: '', prompt: '' }],
      ...(en.example ? { example: en.example.prose } : {}),
    };
    if (!vi.example !== !en.example) fail('"## Example" phải có ở cả VI và EN');
    if (t.conclusion) {
      const c = fm.conclusion_en as { question?: unknown; options?: unknown } | undefined;
      if (!c || typeof c.question !== 'string' || !Array.isArray(c.options) || c.options.length !== t.conclusion.options.length) {
        fail('boss cần conclusion_en { question, options } cùng số lựa chọn với conclusion');
      }
      t.en.conclusion = { question: c!.question as string, options: (c!.options as unknown[]).map(String) };
    }
  } else if (fm.title_en !== undefined || fm.conclusion_en !== undefined) {
    fail('title_en/conclusion_en cần khối "# EN"');
  }

  const names = [...templateNames(t)].sort();
  if (fm.variants !== undefined) {
    const vs = fm.variants;
    if (t.beat === 'boss') fail('boss không có variants');
    if (!Array.isArray(vs) || vs.length < 2 || vs.length > 4) fail('variants cần 2–4 biến thể');
    t.variants = (vs as unknown[]).map((v, i) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`variants[${i}] phải là bảng { tên: giá trị }`);
      const out: Variant = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        const s = typeof x === 'number' ? String(x) : x;
        if (typeof s !== 'string' || !VARIANT_VALUE_RE.test(s)) fail(`variants[${i}].${k}: giá trị phải khớp ${VARIANT_VALUE_RE}`);
        out[k] = s as string;
      }
      if (JSON.stringify(Object.keys(out).sort()) !== JSON.stringify(names)) fail(`variants[${i}] phải có đúng các khóa: ${names.join(', ')}`);
      return out;
    });
    // Values after number → string: 2026 and "2026" render the same SQL, so they are duplicates.
    const seenVariant = t.variants.map((v) => JSON.stringify(names.map((n) => v[n])));
    seenVariant.forEach((s, i) => {
      const j = seenVariant.indexOf(s);
      if (j < i) fail(`variants[${i}] trùng variants[${j}]`);
    });
  } else if (names.length) {
    fail(`dùng {{${names[0]}}} nhưng không có variants`);
  }
  return t;
}

/** Text in `lang`. A ticket without "# EN" falls back to VI with fallback = true (UI labels it). */
export function textOf(t: Ticket, lang: Lang): TicketText & { fallback: boolean } {
  if (lang === 'en' && t.en) return { ...t.en, fallback: false };
  return {
    title: t.title,
    body: t.body,
    task: t.task,
    hints: t.hints,
    steps: t.steps.map((s) => ({ title: s.title, prompt: s.prompt })),
    ...(t.conclusion ? { conclusion: { question: t.conclusion.question, options: t.conclusion.options } } : {}),
    ...(t.example ? { example: t.example.text } : {}),
    fallback: lang === 'en',
  };
}

export const byOrder = (a: Ticket, b: Ticket): number => a.chapter - b.chapter || a.id.localeCompare(b.id);

/**
 * Display order of a conclusion's or reflect's options (end-user test v10 B5: authors put the answer first in 68 of 69 tickets).
 * A permutation of 0..n-1 fixed by `seed` (ticket id + which list), so every redraw shows the same order; the stored and
 * compared value stays the option's original index.
 */
export function optionOrder(seed: string, n: number): number[] {
  let x = 2166136261;
  for (const c of seed) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0; // FNV-1a
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0; // LCG step
    const j = x % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
