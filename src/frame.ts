// v13 (product-design-v8 §3.3): the scaffold Boon fills into the editor, built from the open step's Solution.
// Keeps keywords, function names, tables, table aliases and CTE names; every column, column alias and value becomes ___.
// Lazy chunk `frame` (loaded when the player first asks for a scaffold): no value imports from main modules (Plan 6 U3).

const HOLE = '___'; // = BLANK in src/tickets.ts, duplicated so this chunk imports nothing
const WIDE = 60; // L88: SQL longer than this goes one clause per line

export interface Tok { t: string; u: string; k: 'str' | 'num' | 'id' | 'op'; s: number; e: number; sp: boolean }

const KEYWORDS = new Set(('SELECT DISTINCT ON FROM JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL LATERAL USING WHERE GROUP BY HAVING ' +
  'ORDER LIMIT OFFSET WITH RECURSIVE MATERIALIZED AS CASE WHEN THEN ELSE END AND OR NOT IS NULL IN BETWEEN SYMMETRIC LIKE ILIKE ' +
  'SIMILAR TO ESCAPE EXISTS OVER PARTITION FILTER WITHIN UNION ALL INTERSECT EXCEPT ANY SOME ASC DESC NULLS FIRST LAST ROWS RANGE ' +
  'GROUPS UNBOUNDED PRECEDING FOLLOWING CURRENT ROW WINDOW FETCH NEXT ONLY TIES VALUES ARRAY AT ZONE COLLATE').split(' '));
/** Type keywords before a literal (`DATE '2026-10-01'`, `interval '1 day'`); elsewhere they may be column names. */
const LITERAL_TYPES = new Set(['DATE', 'TIME', 'TIMESTAMP', 'INTERVAL']);
const JOIN_WORDS = new Set(['LEFT', 'RIGHT', 'FULL', 'INNER', 'CROSS', 'NATURAL', 'OUTER', 'JOIN']);
const LIST_END = new Set(['LIMIT', 'OFFSET', 'HAVING', 'WINDOW', 'UNION', 'INTERSECT', 'EXCEPT', 'ORDER', 'ROWS', 'RANGE', 'GROUPS', 'FETCH', 'WHERE', 'FROM', 'SELECT']);
const CLAUSES = new Set(['SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET', 'WINDOW', 'UNION', 'INTERSECT', 'EXCEPT', 'WITH']);

const TOKEN = /(\s+|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|([eE]?'(?:[^']|'')*'?)|("(?:[^"]|"")*"?)|(\d+(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+)|([A-Za-z_\u0080-￿][\w$\u0080-￿]*)|(::|<=|>=|<>|!=|\|\||->>|->|[\s\S])/gy;

/** Never throws: anything unknown is a one-character operator (a broken `wrong:` SQL must still split). */
export function tokenize(sql: string): Tok[] {
  const out: Tok[] = [];
  let sp = false;
  TOKEN.lastIndex = 0;
  for (let m; (m = TOKEN.exec(sql));) {
    if (m[1]) { sp = true; continue; }
    const t = m[0];
    const k = m[2] ? 'str' : m[4] ? 'num' : m[3] || m[5] ? 'id' : 'op';
    out.push({ t, u: k === 'id' && !m[3] ? t.toUpperCase() : t, k, s: m.index, e: m.index + t.length, sp });
    sp = false;
  }
  return out;
}

/** match[i] = index of the paren that closes/opens tokens[i] (unbalanced → end/-1). owner[i] = innermost open paren around i. */
function parens(ts: { t: string }[]): { match: number[]; owner: number[] } {
  const match: number[] = ts.map(() => -1), owner: number[] = [], stack: number[] = [];
  ts.forEach((x, i) => {
    if (x.t === ')' && stack.length) { const o = stack.pop()!; match[o] = i; match[i] = o; }
    owner.push(stack.at(-1) ?? -1);
    if (x.t === '(') stack.push(i);
  });
  for (const o of stack) match[o] = ts.length;
  return { match, owner };
}

const isQueryStart = (x: { u?: string; t: string } | undefined) => x !== undefined && /^(SELECT|WITH)$/i.test(x.t);

export interface Clause { key: string; a: number; b: number; norm: string }
/** Top-level clauses (L95): SELECT, FROM item, each JOIN item, each ON/USING, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT…, each CTE body. */
export function topClauses(ts: Tok[]): Clause[] {
  const { match, owner } = parens(ts);
  const out: Clause[] = [], seen: Record<string, number> = {};
  let cur: { kind: string; a: number } | undefined;
  const close = (b: number) => {
    if (!cur) return;
    seen[cur.kind] = (seen[cur.kind] ?? 0) + 1;
    out.push({ key: `${cur.kind}#${seen[cur.kind]}`, a: cur.a, b, norm: ts.slice(cur.a, b).map((x) => (x.k === 'str' ? x.t : x.t.toLowerCase())).join(' ') });
    cur = undefined;
  };
  for (let i = 0; i < ts.length; i++) {
    if (owner[i] !== -1) continue;
    const u = ts[i].u;
    if (u === 'WITH') {
      close(i);
      let j = i + 1;
      if (ts[j]?.u === 'RECURSIVE') j++;
      while (ts[j]?.k === 'id') {
        const name = ts[j].t.toLowerCase();
        j++;
        if (ts[j]?.t === '(') j = match[j] + 1;
        if (ts[j]?.u === 'AS') j++;
        if (ts[j]?.u === 'NOT') j++;
        if (ts[j]?.u === 'MATERIALIZED') j++;
        if (ts[j]?.t !== '(') break;
        cur = { kind: `cte:${name}`, a: j + 1 };
        close(match[j]);
        j = match[j] + 1;
        if (ts[j]?.t !== ',') break;
        j++;
      }
      i = j - 1;
      continue;
    }
    let kind: string | undefined, skip = 0;
    if (u === 'GROUP' || u === 'ORDER') { if (ts[i + 1]?.u === 'BY') { kind = u; skip = 1; } }
    else if (JOIN_WORDS.has(u)) {
      if (JOIN_WORDS.has(ts[i - 1]?.u ?? '') && owner[i - 1] === -1) continue; // the rest of `LEFT OUTER JOIN`
      let j = i;
      while (JOIN_WORDS.has(ts[j]?.u ?? '') && ts[j].u !== 'JOIN') j++;
      if (ts[j]?.u !== 'JOIN') continue;
      kind = 'JOIN'; skip = j - i;
    } else if ((u === 'ON' || u === 'USING') && cur?.kind === 'JOIN') kind = 'ON';
    else if (CLAUSES.has(u)) {
      kind = u;
      if (/^(UNION|INTERSECT|EXCEPT)$/.test(u) && /^(ALL|DISTINCT)$/.test(ts[i + 1]?.u ?? '')) skip = 1;
    }
    if (!kind) continue;
    close(i);
    cur = { kind, a: i + 1 + skip };
    i += skip;
  }
  close(ts.length);
  return out;
}

interface Item { text: string; hole: boolean; sp: boolean; fn?: boolean }

/** The scaffold and, in order, the Solution text each ___ stands for (tests refill them: §3.9 round trip). */
export function frameParts(sql: string, trapWrongs?: string[]): { text: string; holes: string[] } {
  const ts = tokenize(sql);
  const { match, owner } = parens(ts);
  const n = ts.length;
  const at = (i: number) => ts[i]?.u ?? '';
  const queryScope = (i: number) => owner[i] === -1 || isQueryStart(ts[owner[i] + 1]);

  // Pass A: tables, table aliases and CTE names, by position (a column alias may share a CTE's name: `paid AS (…)`, `AS paid`).
  const names = new Set<string>();
  const table = new Array<boolean>(n).fill(false);
  const name = (j: number) => { table[j] = true; names.add(ts[j].t.toLowerCase()); };
  for (let i = 0; i < n; i++) {
    const x = ts[i];
    if (x.k === 'id' && !KEYWORDS.has(x.u)) { // CTE / named window: name [(cols)] AS [NOT] [MATERIALIZED] (
      let j = i + 1;
      if (ts[j]?.t === '(' && ts[i - 1]?.u !== 'AS') j = match[j] + 1;
      if (at(j) === 'AS') {
        j++;
        if (at(j) === 'NOT') j++;
        if (at(j) === 'MATERIALIZED') j++;
        if (ts[j]?.t === '(' && (isQueryStart(ts[j + 1]) || at(i - 1) === 'WINDOW' || at(i - 1) === ',' || at(i - 1) === 'WITH' || at(i - 1) === 'RECURSIVE')) name(i);
      }
    }
    if (!((x.u === 'FROM' && queryScope(i)) || x.u === 'JOIN')) continue;
    let j = i + 1;
    for (;;) {
      while (at(j) === 'LATERAL' || at(j) === 'ONLY') j++;
      if (ts[j]?.t === '(') j = match[j] + 1;
      else if (ts[j]?.k === 'id' && !KEYWORDS.has(at(j))) {
        name(j++);
        if (ts[j]?.t === '.' && ts[j + 1]?.k === 'id') { j++; name(j++); } // schema.table
        if (ts[j]?.t === '(') j = match[j] + 1; // table function
      } else break;
      if (at(j) === 'AS') j++;
      if (ts[j]?.k === 'id' && !KEYWORDS.has(at(j)) && !LITERAL_TYPES.has(at(j))) name(j++);
      if (ts[j]?.t === '(') j = match[j] + 1; // column alias list: its names stay holes
      if (x.u === 'FROM' && ts[j]?.t === ',') { j++; continue; }
      break;
    }
  }

  // Pass B: what stays.
  const hole = ts.map((x, i): boolean => {
    if (x.k === 'str' || x.k === 'num') return true;
    if (x.k === 'op') return false;
    const prev = ts[i - 1], next = ts[i + 1];
    if (x.u === 'TRUE' || x.u === 'FALSE') return true;
    if (LITERAL_TYPES.has(x.u)) return !(next?.k === 'str' || prev?.t === '::' || (prev?.u === 'AS' && /^cast$/i.test(ts[owner[i] - 1]?.t ?? '')));
    if (KEYWORDS.has(x.u) || table[i]) return false;
    if (next?.t === '(') return false; // function call
    if (prev?.t === '::') return false; // type
    if (prev?.u === 'AS' && /^cast$/i.test(ts[owner[i] - 1]?.t ?? '')) return false;
    const known = names.has(x.t.toLowerCase());
    if (known && (next?.t === '.' || prev?.u === 'OVER')) return false; // qualifier, named window
    return true;
  });
  const fill = (a: number, b: number) => { for (let i = a; i < b; i++) hole[i] = true; };
  const group = new Array<number>(n).fill(-1); // tokens of one GROUP/ORDER/PARTITION BY item or one trap clause: one ___
  let groups = 0;
  const one = (a: number, b: number) => { if (a < b) { fill(a, b); const g = groups++; for (let i = a; i < b; i++) group[i] = g; } };

  for (let i = 0; i < n - 1; i++) {
    if (!/^(GROUP|ORDER|PARTITION)$/.test(ts[i].u) || ts[i + 1].u !== 'BY') continue;
    let a = i + 2, j = a, depth = 0;
    for (; j < n; j++) {
      const t = ts[j].t;
      if (t === '(') depth++;
      else if (t === ')') { if (depth === 0) break; depth--; }
      else if (depth === 0 && (t === ',' || t === ';')) { one(a, j); a = j + 1; if (t === ';') break; }
      else if (depth === 0 && LIST_END.has(ts[j].u) && !(ts[j].u === 'ORDER' && ts[j - 1]?.u === 'BY')) break;
    }
    one(a, j);
  }

  if (trapWrongs?.length) { // D-H3: a clause that differs from the same clause of a wrong answer becomes one ___
    const mine = topClauses(ts);
    for (const w of trapWrongs) {
      const theirs = new Map(topClauses(tokenize(w)).map((c) => [c.key, c.norm]));
      for (const c of mine) if (theirs.has(c.key) && theirs.get(c.key) !== c.norm) one(c.a, c.b);
    }
  }

  // Items: kept tokens and merged holes (adjacent holes = one ___).
  const items: Item[] = [], holes: string[] = [];
  for (let i = 0; i < n;) {
    if (!hole[i]) { items.push({ text: ts[i].t, hole: false, sp: ts[i].sp, fn: ts[i].k === 'id' && ts[i + 1]?.t === '(' && !ts[i + 1].sp }); i++; continue; }
    let j = i + 1;
    while (j < n && hole[j]) j++;
    holes.push(sql.slice(ts[i].s, ts[j - 1].e));
    items.push({ text: HOLE, hole: true, sp: ts[i].sp });
    i = j;
  }
  return { text: layout(items), holes };
}

export function frameOf(sql: string, trapWrongs?: string[]): string {
  return frameParts(sql, trapWrongs).text;
}

const glue = (prev: Item | undefined, x: Item): string => {
  if (!prev) return x.text;
  const tight = /^[,).\]]$|^::$/.test(x.text) || /^[(.[]$|^::$/.test(prev.text) || (x.text === '(' && prev.fn);
  return (tight ? '' : prev.text === ',' || x.sp ? ' ' : '') + x.text;
};

function flat(items: Item[], a: number, b: number): string {
  let s = '';
  for (let i = a; i < b; i++) s += glue(i > a ? items[i - 1] : undefined, items[i]);
  return s;
}

/** L88 + v8 §3.3: one line when ≤ 60 chars; else one clause per line, sub-queries and CTE bodies indented 2 per level. */
function layout(items: Item[]): string {
  const all = flat(items, 0, items.length);
  if (all.length <= WIDE) return all;
  const { match } = parens(items.map((x) => ({ t: x.hole ? '' : x.text })));
  const kw = (i: number) => (items[i] && !items[i].hole ? items[i].text.toUpperCase() : '');
  const breaks = (i: number) => items[i]?.text === '(' && /^(SELECT|WITH)$/.test(kw(i + 1)) && flat(items, i + 1, match[i]).length > WIDE;
  const lines: string[] = [];
  let line = '', indent = 0;
  const newLine = (to: number) => { if (line.trim()) lines.push(line); line = ' '.repeat(to); indent = to; };
  const add = (s: string) => { line += line.trim() ? s : s.trimStart(); };

  const clauseStart = (i: number): boolean => {
    const u = kw(i);
    if (u === 'GROUP' || u === 'ORDER') return kw(i + 1) === 'BY';
    if (JOIN_WORDS.has(u)) {
      if (JOIN_WORDS.has(kw(i - 1))) return false;
      let j = i;
      while (JOIN_WORDS.has(kw(j)) && kw(j) !== 'JOIN') j++;
      return kw(j) === 'JOIN';
    }
    return CLAUSES.has(u);
  };

  const block = (a: number, b: number, base: number) => {
    newLine(base);
    let cond = false; // inside WHERE / HAVING / ON
    for (let i = a; i < b; i++) {
      const u = kw(i);
      if (i > a && clauseStart(i)) newLine(base);
      if (clauseStart(i) || u === 'ON') cond = u === 'WHERE' || u === 'HAVING' || u === 'ON';
      if (cond && (u === 'AND' || u === 'OR')) {
        let j = i + 1, hasBreak = false;
        for (; j < b && !clauseStart(j) && kw(j) !== 'AND' && kw(j) !== 'OR'; j++) {
          if (items[j].text === '(') { hasBreak ||= breaks(j); j = match[j]; }
        }
        if (hasBreak) newLine(base + 2);
      }
      const prev = items[i - 1];
      if (items[i].text === '(' && !items[i].hole) {
        const m = Math.min(match[i], b);
        if (breaks(i)) {
          add(glue(prev, items[i]));
          const outer = indent;
          block(i + 1, m, outer + 2);
          newLine(outer);
          add(')');
        } else add(glue(prev, items[i]) + flat(items, i + 1, Math.min(m + 1, b)));
        i = m;
        continue;
      }
      add(glue(prev, items[i]));
    }
  };
  block(0, items.length, 0);
  newLine(0);
  return lines.join('\n');
}
