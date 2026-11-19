/**
 * V19-A (N8, L162): one line under the editor that reads the last run in plain words, clause by clause ("This query: take
 * 3 columns from `ports`, keep rows where …"). It describes `app.lastRun`, never the editor being typed and never a Solution;
 * a changed editor marks the line "changed", like the tabs. The words come from the `steps` request (shared memo with the
 * Execution order tab, src/ui/vizTabs.ts), so this module imports only types from the parser side. Its VI/EN text is
 * this table, not en.ts (L162).
 */
import { getLang, t, type Lang } from '../i18n';
import { app, type LastRun } from '../state';
import type { DbClient } from '../db/client';
import type { StepsResult } from '../viz/steps';
import { WORDS_ONLY } from '../viz/stepText';
import type { Agg, Cond, JoinKind, Val, WordPart } from '../viz/sqlWords';
import { h } from './dom';

/** A sentence piece: plain words, or a name/literal from the player's query shown as code. */
export type Piece = string | { code: string };
type Words = {
  lead: string; failed: string; changed: string; read: string; and: string; then: string;
  cols: (n: number) => string; star: string; starPlus: (n: number) => string; computing: string; agg: Record<Agg, string>;
  from: string; join: Record<JoinKind, (t: Piece[]) => Piece[]>;
  where: string; having: string; group: string; sets: string;
  distinct: string; distinctOn: (n: number) => string;
  order: string; desc: string; asc: string;
  limit: (n?: number, offset?: number) => string;
  val: { sub: string; list: string; expr: string };
  cond: Record<Cond['op'], (l: Piece[], r: Piece[], r2: Piece[], not: boolean, n: number) => Piece[]>;
};

const W: Record<Lang, Words> = {
  vi: {
    lead: 'Truy vấn này:', failed: 'Chưa mô tả được câu này bằng lời.', changed: 'đã đổi', read: 'Đọc truy vấn bằng lời', and: ' và ', then: ', rồi ',
    cols: (n) => `lấy ${n} cột`, star: 'lấy mọi cột', starPlus: (n) => `lấy mọi cột (*) và thêm ${n} cột`, computing: 'có tính', agg: { count: 'đếm', sum: 'tổng', avg: 'trung bình', min: 'nhỏ nhất', max: 'lớn nhất', other: 'hàm gộp khác' },
    from: 'từ',
    join: {
      inner: (x) => ['nối với ', ...x],
      left: (x) => ['nối thêm ', ...x, ' (giữ cả dòng không khớp)'],
      right: (x) => ['nối ', ...x, ' (giữ mọi dòng của bảng này)'],
      full: (x) => ['nối ', ...x, ' (giữ dòng không khớp của cả hai bên)'],
      cross: (x) => ['ghép mọi cặp dòng với ', ...x],
    },
    where: 'giữ dòng có', having: 'chỉ giữ nhóm có', group: 'nhóm theo', sets: ' (kèm dòng tổng phụ)',
    distinct: 'bỏ dòng trùng', distinctOn: (n) => `giữ một dòng cho mỗi giá trị của ${n} biểu thức đầu`,
    order: 'sắp theo', desc: ' giảm dần', asc: ' tăng dần',
    limit: (n, o) => (o !== undefined && n !== undefined ? `bỏ ${o} dòng đầu rồi lấy ${n} dòng` : o !== undefined ? `bỏ ${o} dòng đầu` : n !== undefined ? `lấy ${n} dòng đầu` : 'giới hạn số dòng'),
    val: { sub: 'một truy vấn con', list: 'một danh sách', expr: 'một biểu thức' },
    cond: {
      eq: (l, r) => [...l, ' bằng ', ...r],
      ne: (l, r) => [...l, ' khác ', ...r],
      lt: (l, r) => [...l, ' nhỏ hơn ', ...r],
      le: (l, r) => [...l, ' tối đa ', ...r],
      gt: (l, r) => [...l, ' lớn hơn ', ...r],
      ge: (l, r) => [...l, ' từ ', ...r, ' trở lên'],
      like: (l, r, _, not) => [...l, not ? ' không khớp mẫu ' : ' khớp mẫu ', ...r],
      ilike: (l, r, _, not) => [...l, not ? ' không khớp mẫu ' : ' khớp mẫu ', ...r, ' (không phân biệt hoa thường)'],
      in: (l, r, _, not) => [...l, not ? ' không thuộc ' : ' thuộc ', ...r],
      between: (l, r, r2, not) => [...l, not ? ' nằm ngoài khoảng ' : ' trong khoảng ', ...r, ' đến ', ...r2],
      null: (l, _, __, not) => [...l, not ? ' có giá trị' : ' trống (NULL)'],
      or: (_, __, ___, ____, n) => [`một trong ${n} điều kiện`],
      exists: (_, __, ___, not) => [not ? 'không có dòng khớp trong một truy vấn con' : 'có dòng khớp trong một truy vấn con'],
      other: () => ['một điều kiện khác'],
    },
  },
  en: {
    lead: 'This query:', failed: 'This query cannot be read in words yet.', changed: 'changed', read: 'Read the query in words', and: ' and ', then: ', then ',
    cols: (n) => `takes ${n} column${n === 1 ? '' : 's'}`, star: 'takes every column', starPlus: (n) => `takes every column (*) plus ${n} more`, computing: 'computing', agg: { count: 'a count', sum: 'a total', avg: 'an average', min: 'a minimum', max: 'a maximum', other: 'another aggregate' },
    from: 'from',
    join: {
      inner: (x) => ['joins ', ...x],
      left: (x) => ['left-joins ', ...x, ' (keeping rows with no match)'],
      right: (x) => ['joins ', ...x, ' (keeping every row of that table)'],
      full: (x) => ['joins ', ...x, ' (keeping unmatched rows on both sides)'],
      cross: (x) => ['pairs every row with ', ...x],
    },
    where: 'keeps rows where', having: 'keeps only groups where', group: 'groups by', sets: ' (with subtotal rows)',
    distinct: 'drops duplicate rows', distinctOn: (n) => `keeps one row per value of the first ${n} expression${n === 1 ? '' : 's'}`,
    order: 'sorts by', desc: ' descending', asc: ' ascending',
    limit: (n, o) => (o !== undefined && n !== undefined ? `skips ${o} rows and takes ${n}` : o !== undefined ? `skips the first ${o} rows` : n !== undefined ? `takes the first ${n} row${n === 1 ? '' : 's'}` : 'limits the rows'),
    val: { sub: 'a sub-query', list: 'a list', expr: 'an expression' },
    cond: {
      eq: (l, r) => [...l, ' equals ', ...r],
      ne: (l, r) => [...l, ' is not ', ...r],
      lt: (l, r) => [...l, ' is below ', ...r],
      le: (l, r) => [...l, ' is at most ', ...r],
      gt: (l, r) => [...l, ' is above ', ...r],
      ge: (l, r) => [...l, ' is at least ', ...r],
      like: (l, r, _, not) => [...l, not ? ' does not match ' : ' matches ', ...r],
      ilike: (l, r, _, not) => [...l, not ? ' does not match ' : ' matches ', ...r, ' (ignoring case)'],
      in: (l, r, _, not) => [...l, not ? ' is not in ' : ' is in ', ...r],
      between: (l, r, r2, not) => [...l, not ? ' is outside ' : ' is between ', ...r, not ? ' to ' : ' and ', ...r2],
      null: (l, _, __, not) => [...l, not ? ' has a value' : ' is empty (NULL)'],
      or: (_, __, ___, ____, n) => [`one of ${n} conditions holds`],
      exists: (_, __, ___, not) => [not ? 'a sub-query finds no matching row' : 'a sub-query finds a matching row'],
      other: () => ['another condition holds'],
    },
  },
};

function val(v: Val | undefined, w: Words): Piece[] {
  if (!v) return [w.val.expr];
  if ('c' in v) return [{ code: v.c }];
  if ('v' in v) return [{ code: v.v }];
  if ('f' in v) return [{ code: `${v.f}(…)` }];
  return [w.val[v.e]];
}

const joined = (lists: Piece[][], sep: string): Piece[] => lists.flatMap((l, i) => (i ? [sep, ...l] : l));

function cond(c: Cond, w: Words): Piece[] {
  if (!('l' in c)) return w.cond[c.op]([], [], [], 'not' in c && !!c.not, 'n' in c ? c.n : 0);
  return w.cond[c.op](val(c.l, w), val(c.r, w), val(c.r2, w), !!c.not, 0);
}

/** One clause in words (pure, tested over every Solution in tests/sqlWords.test.ts). */
export function partWords(p: WordPart, w: Words): Piece[] {
  switch (p.k) {
    case 'select': {
      const head = !p.star ? w.cols(p.cols) : p.cols ? w.starPlus(p.cols) : w.star;
      return p.aggs.length ? [`${head} (${w.computing} ${p.aggs.map((a) => w.agg[a]).join(', ')})`] : [head];
    }
    case 'from':
      return [w.from, ' ', ...joined(p.tables.map((x) => val(x, w)), ', '), ...p.joins.flatMap((j) => [', ', ...w.join[j.kind](val(j.table, w))])];
    case 'where':
    case 'having':
      return [w[p.k], ' ', ...joined(p.conds.map((c) => cond(c, w)), w.and)];
    case 'group':
      return [w.group, ' ', ...joined(p.keys.map((x) => val(x, w)), ', '), p.sets ? w.sets : ''];
    case 'distinct':
      return [p.on ? w.distinctOn(p.on) : w.distinct];
    case 'order':
      return [w.order, ' ', ...joined(p.keys.map((x) => [...val(x.key, w), x.desc ? w.desc : w.asc]), w.then)];
    case 'limit':
      return [w.limit(p.n, p.offset)];
  }
}

/** The whole sentence, one entry per clause: the SELECT part runs straight into its FROM ("take 3 columns from …"). */
export function sentence(parts: WordPart[], lang: Lang): { k: WordPart['k']; pieces: Piece[] }[] {
  const w = W[lang];
  return parts.map((p, i) => ({ k: p.k, pieces: [i === 0 ? '' : p.k === 'from' ? ' ' : ', ', ...partWords(p, w)].filter((x) => x !== '') }));
}

/** Plain text of a sentence (announcements and tests). */
export const plainText = (s: { pieces: Piece[] }[]): string => s.flatMap((x) => x.pieces.map((p) => (typeof p === 'string' ? p : p.code))).join('');

/** What the line needs from DbClient: the parser download and a words-only `steps` request (parse, no sub-query). */
export type WordsDb = Pick<DbClient, 'loadParser' | 'steps'>;

export interface WordsLine {
  el: HTMLElement;
  /** Redraws from app.lastRun (a new run starts its request), the "changed" mark and the language. Cheap: call on every redraw and edit. */
  draw(): void;
}

/**
 * `off()`: the open step is an index lab (L162: no line there, even with an earlier step's run still in lastRun).
 * The request is `WORDS_ONLY` + SQL: the worker only parses (never the per-clause counts of the Execution order tab, which
 * can take seconds on a comma join and restart the worker), so every successful run is read at once.
 */
export function wordsLine(editorSql: () => string, db: Partial<WordsDb>, off: () => boolean): WordsLine {
  const el = h('p', { class: 'mt-1 mb-0 text-body-sm text-muted', hidden: true });
  let run: LastRun | undefined;
  let state: { kind: 'wait' | 'failed' } | { kind: 'done'; r: StepsResult } = { kind: 'wait' };

  const fetch = (r: LastRun): void => {
    const { loadParser, steps } = db;
    if (!loadParser || !steps) return void (state = { kind: 'failed' });
    loadParser.call(db).then(() => steps.call(db, WORDS_ONLY + r.sql, r.schema ? { schema: r.schema } : {})).then(
      (res) => { if (run === r) { state = { kind: 'done', r: res as StepsResult }; paint(); } },
      () => { if (run === r) { state = { kind: 'failed' }; paint(); } }, // timeout, restart, no parser: no line, and no retry for this run
    );
  };

  function paint(): void {
    const w = W[getLang()];
    const r = run;
    if (!r || off() || state.kind !== 'done') {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const changed = editorSql().trim() !== r.sql.trim()
      ? h('span', { class: 'mr-2 rounded-full bg-warn-soft px-2 text-caption font-semibold text-ink ring-1 ring-warn/40', title: t('res.stale') }, w.changed)
      : null;
    const res = state.r;
    if (!res.ok || !res.words) {
      el.replaceChildren(...[changed, w.failed].filter((x) => x !== null));
      return;
    }
    el.replaceChildren(...[changed, h('span', { class: 'font-semibold text-ink' }, w.lead), ' ',
      ...sentence(res.words, getLang()).map((s) => h('span', { 'data-k': s.k }, ...s.pieces.map((p) => (typeof p === 'string' ? p : h('code', { class: 'break-words' }, p.code)))))].filter((x) => x !== null));
  }

  return {
    el,
    draw() {
      const r = app.lastRun;
      if (r !== run) {
        run = r; // a new run, or none (index lab clears lastRun)
        state = { kind: 'wait' };
        if (r?.result) fetch(r);
        else state = { kind: 'failed' }; // an error: no line
      }
      paint();
    },
  };
}
