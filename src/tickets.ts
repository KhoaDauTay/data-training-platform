import { parse as parseYaml } from 'yaml';
import { parseScene, type Scene } from './scene';

export type Lang = 'vi' | 'en';
export type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss';
/** Expected-result column label (L25): business meaning in both languages, never the Solution's column name. */
export interface Label { vi: string; en: string }
export interface Step {
  title: string;
  prompt: string;
  solution: string;
  /** Expected result column labels from `columns:` (shape card only; the grader compares by position). */
  columns?: Label[];
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
}
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
}

const BEATS: Beat[] = ['teach', 'develop', 'twist', 'rest', 'boss'];
const FM_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const EN_RE = /^# EN[ \t]*$/m;
const SQL_RE = /```sql\n([\s\S]*?)```/;
const VAR_RE = /\{\{(\w+)\}\}/g;
const VARIANT_VALUE_RE = /^[\w .:/-]{1,40}$/;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

interface Sections { body: string; task: string; hints: string[]; steps: Step[] }

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
    ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : [])];
  const all = [
    ...texts(textOf(t, 'vi')),
    ...(t.en ? texts(t.en) : []),
    ...t.steps.flatMap((s) => [s.solution, ...(s.columns ?? []).flatMap((l) => [l.vi, l.en])]),
    t.starter ?? '',
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
    const isLabel = (c: unknown): c is Label => {
      const o = c as Partial<Label> | null;
      return !!o && typeof o === 'object' && !Array.isArray(o)
        && typeof o.vi === 'string' && o.vi.trim() !== '' && typeof o.en === 'string' && o.en.trim() !== '';
    };
    const lists = t.beat === 'boss' ? fm.columns : [fm.columns];
    const ok = Array.isArray(lists) && lists.length === t.steps.length
      && lists.every((l) => Array.isArray(l) && l.length > 0 && l.every(isLabel));
    if (!ok) fail('columns: mỗi nhãn là { vi, en }; ticket thường một danh sách, cột mốc một danh sách cho mỗi bước');
    (lists as Label[][]).forEach((l, i) => (t.steps[i].columns = l.map((x) => ({ vi: x.vi.trim(), en: x.en.trim() }))));
  }

  if (fm.starter !== undefined) {
    if (typeof fm.starter !== 'string') fail('starter phải là chuỗi SQL');
    t.starter = (fm.starter as string).trim();
  }
  if (fm.scene !== undefined) t.scene = parseScene(fm.scene, t.beat === 'boss', fail);

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
    };
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
    fallback: lang === 'en',
  };
}

export const byOrder = (a: Ticket, b: Ticket): number => a.chapter - b.chapter || a.id.localeCompare(b.id);
