/**
 * BP-T (v24, ADD-8 of product-design-best-practice §4): Best Practice cards, `content/engine/best/<track>/<code>-<slug>.md`.
 * Pure, like ./content (the engineBest chunk imports it; no value import from main modules, Plan 6 U3).
 * Not a lesson: own sections (## Ý chính / ## Vì sao / ## Ví dụ), id `e-bp-<code>` (the catalogue code, so progress survives a
 * level change), a `pair` (Không nên / Nên) that runs, `avoid`, optional `lint`. `best` is not in ENGINES on purpose.
 *
 * Released tracks: RELEASED. v24 ships SQL + PostgreSQL (60 cards); the MongoDB and DynamoDB cards stay in the repo, parse
 * here (tests/bestContent.test.ts checks their structure) but are never bundled: src/bestSources.ts globs only the released
 * folders and tracks() drops the other tracks. v25/v26 add one folder to that glob and one id here.
 */
import type { Bi, Question } from './content';
import type { LabScript, ScriptResult } from './pglab/script';

/**
 * v24 BP-UI (L346): `#/engine/best[/<track>[/<card id>]]` (and `#/engine/best/habits`) → its parts; undefined on any other
 * hash. Words only from [a-z]; the page sends an unknown or unreleased track to SQL and an unknown card to its track.
 */
// Here, not in src/route.ts: only the lazy engineBest chunk parses these (main tests one regex, src/ui/engine.ts), so main stays ≤ +0.3 KB.
export const bestRouteOf = (hash: string): { track?: string; id?: string } | undefined => {
  const m = /^#\/?engine\/best(?:\/([a-z]+)(?:\/(e-bp-[a-z]\d\d))?)?(?=$|[/?])/.exec(hash);
  return m ? { track: m[1], id: m[2] } : undefined;
};
export const bestHash = (track?: string, id?: string): string => `#/engine/best${track ? `/${track}${id ? `/${id}` : ''}` : ''}`;

export const TRACKS = ['sql', 'postgres', 'mongodb', 'dynamodb'] as const;
export type TrackId = (typeof TRACKS)[number];
export const RELEASED: readonly TrackId[] = ['sql', 'postgres', 'mongodb', 'dynamodb'];
export const BP_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
export const RUNTIMES = ['lab', 'engine', 'engine-hb', 'mingo', 'dynoxide', 'none'] as const;
export type BpRuntime = (typeof RUNTIMES)[number];
export const BP_CHECKS = ['diff', 'same', 'plan', 'error', 'runs', 'syntax'] as const;
export type BpCheck = (typeof BP_CHECKS)[number];
export const BP_SECTIONS = { idea: ['Ý chính', 'Key idea'], why: ['Vì sao', 'Why'], example: ['Ví dụ', 'Example'] } as const;
export type BpSectionId = keyof typeof BP_SECTIONS;

/**
 * `compare`: runs/same cards compare planner cost or a size the query returns (the Nên side must be smaller); `table`/`bad`/
 * `good`: the scan node of a `plan` card; `code`: the SQLSTATE of an `error` card; `fails` (catalogue §17.3): which side
 * must raise it (default `bad`; `good` = the safe version refuses, the other one writes). `rcu`/`wcu` are DynamoDB's (v26).
 */
export interface BpExpect { compare?: 'cost' | 'size' | 'rcu' | 'wcu'; table?: string; bad?: string; good?: string; code?: string; fails?: 'bad' | 'good' }
export interface Pair { runtime: BpRuntime; check: BpCheck; setup?: string; bad: string; good: string; expect?: BpExpect }
export interface Track { id: TrackId; areas: string[]; title: Bi; after: Bi; gallery: string[] }
export interface Habit { text: Bi; points: Bi[]; cards: string[] }
export interface Habits { title: Bi; intro: Bi; habits: Habit[]; after: Bi; sources: string[] }

/** The index entry of a card (`?fm&meta=` keys, BP_META): enough for the grid, tabs, sidebar and Boon's tip. */
export interface BpMeta { id: string; code: string; track: TrackId; level: string; module: string; title: Bi; avoid: Bi; lint?: string; skills: string[] }
export interface BpCard extends BpMeta {
  minutes: number; objectives: Bi[]; requires: string[]; adv: string[]; sources: string[];
  /** v38 (R2 E08): like EngineLesson.sourceTitles, from `{ url, title }` entries. */
  sourceTitles?: Record<string, string>;
  verified: { version: string; date: string }; pair: Pair; quiz: Question[]; tip?: Bi;
  sections: { id: BpSectionId; text: Bi }[];
}
export const BP_META = 'id,engine,track,level,module,title,title_en,avoid,lint,skills';
export interface CardSource { fm: unknown; body?: string }

const PATH_RE = /engine\/best\/(sql|postgres|mongodb|dynamodb)\/([a-z]\d\d)-[a-z0-9-]+\.md$/;
const EN_RE = /^# EN[ \t]*$/m;

export function parseBestCard(src: CardSource, path: string): BpCard | BpMeta {
  const fail = (msg: string): never => {
    throw new Error(`${path}: ${msg}`);
  };
  const where = PATH_RE.exec(path.replace(/\\/g, '/')) ?? fail('đường dẫn phải là content/engine/best/<track>/<mã>-<slug>.md');
  const fm = (src?.fm ?? fail('thiếu frontmatter')) as Record<string, unknown>;
  const str = (v: unknown, what: string): string => (typeof v === 'string' && v.trim() ? v.trim() : fail(`thiếu ${what}`));
  const bi = (v: unknown, what: string): Bi => {
    const b = v as Partial<Bi> | undefined;
    return { vi: str(b?.vi, `${what}.vi`), en: str(b?.en, `${what}.en`) };
  };
  const list = (v: unknown, what: string): unknown[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : fail(`${what} phải là danh sách`));
  const [track, code] = [where[1] as TrackId, where[2]];
  if (fm.engine !== 'best') fail('engine phải là best');
  const meta: BpMeta = {
    id: fm.id === `e-bp-${code}` ? `e-bp-${code}` : fail(`id phải là e-bp-${code} (theo tên file)`),
    code, track: fm.track === track ? track : fail(`track phải là ${track} (theo thư mục)`),
    level: BP_LEVELS.includes(fm.level as never) ? String(fm.level) : fail('level phải là L1–L5'),
    module: fm.module === code[0] ? code[0] : fail(`module phải là ${code[0]} (chữ đầu mã)`),
    title: { vi: str(fm.title, 'title'), en: str(fm.title_en, 'title_en') },
    avoid: bi(fm.avoid, 'avoid'),
    skills: list(fm.skills, 'skills').map(String),
  };
  const lint = fm.lint as { rule?: unknown; tip?: unknown } | undefined;
  if (lint) meta.lint = lint.rule === code ? code : fail(`lint.rule phải là ${code}`);
  if (src.body === undefined) return meta;

  const question = (v: unknown, what: string): Question => {
    const x = (v ?? {}) as Record<string, unknown>;
    const options = list(x.options, `${what}.options`).map((o, i) => bi(o, `${what}.options[${i}]`));
    if (options.length < 2) fail(`${what} cần ít nhất 2 lựa chọn`);
    const answer = Number.isInteger(x.answer) && (x.answer as number) >= 0 && (x.answer as number) < options.length ? x.answer as number : fail(`${what}.answer sai`);
    return { q: bi(x.q, `${what}.q`), options, answer, why: bi(x.why, `${what}.why`) };
  };
  const p = (fm.pair ?? fail('thiếu pair')) as Record<string, unknown>;
  const x = p.expect as Record<string, unknown> | null | undefined;
  const pair: Pair = {
    runtime: RUNTIMES.includes(p.runtime as BpRuntime) ? p.runtime as BpRuntime : fail(`pair.runtime phải là một trong ${RUNTIMES.join(', ')}`),
    check: BP_CHECKS.includes(p.check as BpCheck) ? p.check as BpCheck : fail(`pair.check phải là một trong ${BP_CHECKS.join(', ')}`),
    bad: str(p.bad, 'pair.bad'), good: str(p.good, 'pair.good'),
    ...(typeof p.setup === 'string' && p.setup.trim() ? { setup: p.setup.trim() } : {}),
    ...(x ? { expect: x as BpExpect } : {}),
  };
  if ((pair.check === 'syntax') !== (pair.runtime === 'none')) fail('check: syntax ⇔ runtime: none (nhãn trung thực)');
  if (pair.check === 'error' && !pair.expect?.code) fail('check: error cần expect.code');
  if (pair.check === 'plan' && !(pair.expect?.table && pair.expect.bad && pair.expect.good)) fail('check: plan cần expect { table, bad, good }');
  if (pair.expect?.fails && pair.expect.fails !== 'bad' && pair.expect.fails !== 'good') fail('expect.fails phải là bad hoặc good');
  if (pair.expect?.fails === 'good' && pair.runtime === 'lab') fail('expect.fails: good cần runtime có trạng thái (catalogue §17.3)');
  if (pair.setup && pair.runtime === 'lab') fail('runtime lab không có setup');
  const v = fm.verified as Record<string, unknown> | undefined;
  const card: BpCard = {
    ...meta,
    minutes: typeof fm.minutes === 'number' && fm.minutes > 0 && fm.minutes <= 30 ? fm.minutes : fail('minutes phải từ 1 đến 30'),
    objectives: list(fm.objectives, 'objectives').map((o, i) => bi(o, `objectives[${i}]`)),
    requires: list(fm.requires, 'requires').map(String),
    adv: list(fm.adv, 'adv').map(String),
    sources: list(fm.sources, 'sources').map((s) => (s && typeof s === 'object' ? String((s as { url?: unknown }).url) : String(s))),
    verified: { version: str(v?.version, 'verified.version'), date: str(String(v?.date ?? ''), 'verified.date') },
    pair,
    quiz: list(fm.quiz, 'quiz').map((q, i) => question(q, `quiz[${i}]`)),
    ...(lint ? { tip: bi(lint.tip, 'lint.tip') } : {}),
    sections: [],
  };
  const titled = list(fm.sources, 'sources').filter((s): s is { url: unknown; title: unknown } => !!s && typeof s === 'object');
  if (titled.length) card.sourceTitles = Object.fromEntries(titled.map((s) => [String(s.url), str(s.title, 'sources.title')]));
  if (!card.quiz.length) fail('cần ít nhất một quiz (ADD-7: không thẻ chỉ đọc)');
  const [viPart, enPart, extra] = src.body.split(EN_RE);
  if (enPart === undefined || extra !== undefined) fail('cần đúng một khối "# EN"');
  const vi = sectionsOf(viPart, 0, fail);
  const en = sectionsOf(enPart, 1, fail);
  if (vi.map((s) => s.id).join() !== en.map((s) => s.id).join()) fail('mục VI và EN phải giống nhau, cùng thứ tự');
  if (vi[0]?.id !== 'idea' || vi[1]?.id !== 'why') fail('thân bài mở bằng ## Ý chính rồi ## Vì sao');
  card.sections = vi.map((s, i) => ({ id: s.id, text: { vi: s.text, en: en[i].text } }));
  return card;
}

function sectionsOf(part: string, lang: 0 | 1, fail: (msg: string) => never): { id: BpSectionId; text: string }[] {
  const [lead, ...rest] = part.split(/^## /m);
  if (lead.trim()) fail(`chữ ngoài mục ## (${lang ? 'EN' : 'VI'})`);
  return rest.map((sec) => {
    const nl = sec.indexOf('\n');
    const heading = (nl === -1 ? sec : sec.slice(0, nl)).trim();
    const id = (Object.keys(BP_SECTIONS) as BpSectionId[]).find((k) => BP_SECTIONS[k][lang] === heading) ?? fail(`mục lạ "## ${heading}"`);
    const text = nl === -1 ? '' : sec.slice(nl + 1).trim();
    return text ? { id, text } : fail(`mục "## ${heading}" trống`);
  });
}

/** tracks.yml → the released tracks, in file order (unreleased ones are dropped here: no grey tab, no link). */
export function parseTracks(v: unknown, all = false): Track[] {
  if (!Array.isArray(v)) throw new Error('tracks.yml: phải là danh sách');
  return v.map((t: Record<string, unknown>, i): Track => {
    const b = (x: unknown, what: string): Bi => {
      const y = x as Partial<Bi> | undefined;
      if (typeof y?.vi !== 'string' || typeof y.en !== 'string') throw new Error(`tracks.yml[${i}]: ${what} cần vi và en`);
      return { vi: y.vi, en: y.en };
    };
    if (!TRACKS.includes(t?.id as TrackId)) throw new Error(`tracks.yml[${i}]: id lạ`);
    return { id: t.id as TrackId, areas: (t.areas as string[] ?? []).map(String), title: b(t.title, 'title'), after: b(t.after, 'after'), gallery: (t.gallery as string[] ?? []).map(String) };
  }).filter((t) => all || RELEASED.includes(t.id));
}

/** habits.yml ("8 thói quen", catalogue §14.3). */
export function parseHabits(v: unknown): Habits {
  const o = (v ?? {}) as Record<string, unknown>;
  const b = (x: unknown): Bi => {
    const y = x as Partial<Bi> | undefined;
    if (typeof y?.vi !== 'string' || typeof y.en !== 'string') throw new Error('habits.yml: cần vi và en');
    return { vi: y.vi, en: y.en };
  };
  const hs = Array.isArray(o.habits) ? o.habits as Record<string, unknown>[] : [];
  if (!hs.length) throw new Error('habits.yml: cần habits');
  return {
    title: b(o.title), intro: b(o.intro), after: b(o.after), sources: (o.sources as string[] ?? []).map(String),
    habits: hs.map((h) => ({ text: b(h.text), points: (h.points as unknown[] ?? []).map(b), cards: (h.cards as string[] ?? []).map(String) })),
  };
}

/** ./content's codeOf, repeated: a value import of ./content would split it out of the engineui chunk into a shared one. */
export const codeOf = (text: string): string[] =>
  [...text.matchAll(/```[a-z]*\n([\s\S]*?)```|`([^`\n]+)`/g)].map((m) => (m[1] ?? m[2]).trim()).sort();
const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const HOSTS = /^https:\/\/(www\.postgresql\.org|wiki\.postgresql\.org|www\.mongodb\.com\/docs|docs\.aws\.amazon\.com|www\.sqlstyle\.guide|sqlstyle\.guide)\//;
/** §4.3 content rules beyond parsing: EN without diacritics, code VI = EN, official https sources. */
export function cardProblems(c: BpCard): string[] {
  const out: string[] = [];
  const pairs: [string, Bi][] = [['title', c.title], ['avoid', c.avoid], ...c.objectives.map((b, i): [string, Bi] => [`objectives[${i}]`, b]),
    ...c.sections.map((s): [string, Bi] => [s.id, s.text]), ...(c.tip ? [['lint.tip', c.tip] as [string, Bi]] : []),
    ...c.quiz.flatMap((q, i): [string, Bi][] => [[`q${i}`, q.q], [`why${i}`, q.why], ...q.options.map((o, j): [string, Bi] => [`q${i}.o${j}`, o])])];
  for (const [what, b] of pairs) {
    if (DIACRITIC.test(b.en.replace(/```[\s\S]*?```|`[^`\n]+`/g, ''))) out.push(`${what}: EN có dấu tiếng Việt`);
    if (codeOf(b.vi).join('\u0000') !== codeOf(b.en).join('\u0000')) out.push(`${what}: code VI ≠ EN`);
  }
  if (!c.sources.length) out.push('cần ít nhất một sources');
  for (const s of c.sources) if (!HOSTS.test(s)) out.push(`sources: ${s} không phải nguồn chính thức https`);
  if (c.pair.bad.trim() === c.pair.good.trim()) out.push('pair.bad = pair.good');
  return out;
}

// ---- "Chạy cả hai" (§3.2/§3.3): what one side measured, and whether the pair shows what the card claims. Shared by the
// page (src/ui/engineBest.ts) and tests/bestContent.test.ts, so the test checks exactly what the player sees.

/** One side's measure: its result (or the Postgres error), and for plan/cost cards the scan node and planner cost. */
export interface Side {
  columns: string[]; rows: unknown[][];
  error?: { code?: string; message: string };
  /** Scan node on `expect.table` (plan cards) or of the plan's leaf (cost cards); planner Total Cost of the root. */
  node?: string; cost?: number;
  /** v26 (L383): a `dynoxide` side's ConsumedCapacity (RCU or WCU, the engine's own number) for `compare: rcu | wcu`. */
  cap?: number;
}
/** Statements of one side to run after `setup`: the side's own (DDL/DML/read), then its EXPLAIN when the card measures a plan. */
export const needsPlan = (p: Pair): boolean => p.check === 'plan' || p.expect?.compare === 'cost';
export const explainOf = (sql: string): string => `EXPLAIN (FORMAT JSON) ${sql.trim().replace(/;\s*$/, '')}`;

type PlanNode = { 'Node Type'?: string; 'Relation Name'?: string; 'Total Cost'?: number; Plans?: PlanNode[] };
/** EXPLAIN (FORMAT JSON) cell → { node, cost }: the scan reading `table` (else the deepest first leaf), the root's cost. */
export function planScan(json: unknown, table?: string): { node?: string; cost?: number } {
  const v = typeof json === 'string' ? JSON.parse(json) as unknown : json;
  const root = (Array.isArray(v) ? (v[0] as { Plan?: PlanNode })?.Plan : undefined);
  if (!root) return {};
  const all: PlanNode[] = [];
  const walk = (n: PlanNode): void => { all.push(n); n.Plans?.forEach(walk); };
  walk(root);
  const scan = all.find((n) => table && n['Relation Name'] === table) ?? all.filter((n) => !n.Plans?.length)[0];
  return { node: scan?.['Node Type'], cost: root['Total Cost'] };
}

// v25 (L374): a MongoDB document's nested object or array is compared by its JSON, never as "[object Object]".
const cell = (v: unknown): string => (v instanceof Date ? v.toISOString() : typeof v === 'number' ? String(Math.round(v * 100) / 100)
  : v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v));
const key = (s: Side): string => s.rows.map((r) => r.map(cell).join('\u0001')).sort().join('\u0002');
/** Same rows (multiset, numbers to 2 decimals, column names ignored: the grader's rule, without the main module). */
export const sameRows = (a: Side, b: Side): boolean => a.columns.length === b.columns.length && key(a) === key(b);

/** v26: a DynamoDB side's columns come from its items' attribute order, which differs between a Scan and a Query: sort them by name. */
export function byName(columns: string[], rows: unknown[][]): Pick<Side, 'columns' | 'rows'> {
  const order = columns.map((c, i) => [c, i] as const).sort((a, b) => a[0].localeCompare(b[0]));
  return { columns: order.map(([c]) => c), rows: rows.map((r) => order.map(([, i]) => r[i])) };
}

export type Verdict =
  | { kind: 'diff' | 'same' | 'runs'; ok: boolean }
  | { kind: 'plan' | 'cost'; ok: boolean; bad?: string | number; good?: string | number }
  | { kind: 'size' | 'cap'; ok: boolean; bad?: number; good?: number }
  | { kind: 'error'; ok: boolean; side: 'bad' | 'good'; code?: string };
/** Does the pair show what its `check` says (§4.3)? `ok: false` on the page = an unexpected result, said as it is. */
export function judge(p: Pair, bad: Side, good: Side): Verdict {
  const fine = !bad.error && !good.error;
  const x = p.expect ?? {};
  if (p.check === 'error') {
    const side = x.fails ?? 'bad';
    const [fails, other] = side === 'bad' ? [bad, good] : [good, bad];
    return { kind: 'error', side, code: fails.error?.code, ok: fails.error?.code === x.code && !other.error };
  }
  if (p.check === 'plan') return { kind: 'plan', bad: bad.node, good: good.node, ok: fine && bad.node === x.bad && good.node === x.good };
  if (x.compare === 'cost') return { kind: 'cost', bad: bad.cost, good: good.cost, ok: fine && good.cost! < bad.cost! };
  if (x.compare === 'rcu' || x.compare === 'wcu') {
    // v26: the Prefer side uses less measured capacity (a COUNT or a write shows no comparable rows, so only the number counts).
    return { kind: 'cap', bad: bad.cap, good: good.cap, ok: fine && good.cap! < bad.cap! };
  }
  if (x.compare === 'size') {
    const [b, g] = [Number(bad.rows[0]?.[0]), Number(good.rows[0]?.[0])];
    return { kind: 'size', bad: b, good: g, ok: fine && g < b };
  }
  if (p.check === 'diff') return { kind: 'diff', ok: fine && !sameRows(bad, good) };
  if (p.check === 'same') return { kind: 'same', ok: fine && sameRows(bad, good) };
  return { kind: 'runs', ok: fine };
}

/**
 * runtime engine / engine-hb: one side = one script on a fresh database (PgLabClient / runLabScript): `setup` statement by
 * statement outside a transaction (VACUUM, CREATE INDEX CONCURRENTLY and SET ROLE work), the side's statements, then its
 * EXPLAIN for a plan card. So the Nên side never sees what the Không nên side wrote (P05, S04), on every press.
 * `split` = splitSql of src/engine/pglab/session.ts (passed in: that module loads PGlite).
 */
export function sideScript(p: Pair, sql: string, split: (s: string) => string[]): LabScript {
  const own = split(sql);
  return { setup: p.setup, steps: [...own, ...(needsPlan(p) ? [explainOf(own[own.length - 1])] : [])], timeoutMs: 20_000 };
}
export function sideOf(p: Pair, r: ScriptResult): Side {
  const err = r.setupError ?? r.steps.find((s) => s.error)?.error;
  if (err) return { columns: [], rows: [], error: { code: err.code, message: err.message } };
  const steps = needsPlan(p) ? r.steps.slice(0, -1) : r.steps;
  const last = steps[steps.length - 1];
  return { columns: last?.columns ?? [], rows: last?.rows ?? [], ...(needsPlan(p) ? planScan(r.steps[r.steps.length - 1]?.rows[0]?.[0], p.expect?.table) : {}) };
}
