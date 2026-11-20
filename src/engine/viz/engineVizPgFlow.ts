import { box, cut, define, fill, line, num, type Shape, text, type Tone } from './engineVizCore';
import { planNodesOf, type RawPlan } from './engineVizPlanJson';

// v23 PG-VIZ (L263–L266): pg-query-path, pg-partition-prune and pg-replication, a lazy chunk of their own (budget group
// engineVizPg) loaded by engineViz's loadViz() the first time a lesson names one, like the NoSQL diagrams. The plan
// samples are real PGlite output, pinned by tests/enginePgViz.test.ts; replication is an illustration (no standby can
// run in the browser) except its slots and wal_level, which are real.

// ── shared by queryPath and partitionPrune ──────────────────────────────────────────────────────────────────────
/** Splits text into lines of at most n characters at spaces (a longer word is cut); more than `max` lines end in "…". */
const wrap = (s: string, n: number, max: number): string[] => {
  const out: string[] = [];
  for (const w of s.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + w.length <= n) out[out.length - 1] = `${last} ${w}`;
    else out.push(cut(w, n));
  }
  if (out.length > max) {
    out.length = max;
    out[max - 1] = `${out[max - 1].slice(0, n - 1)}…`;
  }
  return out;
};
/** Characters a box label keeps at the smallest font (8 px) so it never spills out of a box `w` wide. */
const fitChars = (w: number): number => Math.max(3, Math.floor((w - 6) / (8 * 0.6)));
const RECORDED = 'PGlite 0.5.16';

// ── queryPath ───────────────────────────────────────────────────────────────────────────────────────────────────
/** The query's text and its EXPLAIN (FORMAT JSON) (ANALYZE adds the real row counts). `recorded` = where a stored plan came from. */
export interface QueryPathModel { sql?: string; plan?: unknown; recorded?: string }
/** Recorded from PGlite 0.5.16 (lesson e-pg-l1-10's data), EXPLAIN (ANALYZE, TIMING OFF, FORMAT JSON); pinned in tests/enginePgViz.test.ts. */
export const QUERY_PATH_SAMPLE: QueryPathModel = {
  sql: "SELECT id, amount FROM orders WHERE status = 'new'",
  recorded: RECORDED,
  plan: {
    'Node Type': 'Bitmap Heap Scan', 'Relation Name': 'orders', 'Total Cost': 153.54, 'Plan Rows': 1000, 'Actual Rows': 1000, 'Actual Loops': 1,
    Plans: [{ 'Node Type': 'Bitmap Index Scan', 'Index Name': 'orders_status_idx', 'Parent Relationship': 'Outer', 'Total Cost': 11.79, 'Plan Rows': 1000, 'Actual Rows': 1000, 'Actual Loops': 1 }],
  },
};
define<unknown>('pg-query-path', QUERY_PATH_SAMPLE, (m0, tr) => {
  const m: QueryPathModel = m0 && typeof m0 === 'object' && !Array.isArray(m0) && ('plan' in m0 || 'sql' in m0) ? m0 as QueryPathModel : { plan: m0 };
  let nodes = planNodesOf(m.plan);
  if (!nodes.length) nodes = planNodesOf(QUERY_PATH_SAMPLE.plan);
  const root = nodes[0];
  const sql = m.sql ?? '';
  const from = /\bfrom\s+([\w."]+)/i.exec(sql)?.[1];
  const sel = /\bselect\s+(.+?)\s+from\s/is.exec(sql)?.[1] ?? '*';
  const where = /\bwhere\s+(.+?)(?:\s+(?:group|order|limit)\b|;|$)/is.exec(sql)?.[1];
  const rel = from ?? nodes.find((n) => n.relation)?.relation ?? '?';
  const isView = !!from && !nodes.some((n) => n.relation === from);
  const actual = num(root.rows);
  const rows = actual ?? num(root.estRows) ?? '?';
  const STAGES: [string, string, string][] = [
    ['cl', tr('Ứng dụng', 'Client'), tr('gửi chữ', 'sends text')],
    ['pa', 'Parser', tr('cú pháp', 'syntax')],
    ['an', tr('Phân tích', 'Analyzer'), 'catalog'],
    ['rw', 'Rewriter', tr('view, rule', 'views, rules')],
    ['pl', 'Planner', tr('chọn kế hoạch', 'picks a plan')],
    ['ex', 'Executor', tr('chạy kế hoạch', 'runs the plan')],
    ['bu', 'Shared buffers', tr('trang 8 KB', '8 KB pages')],
  ];
  const Y = (i: number) => 8 + i * 34;
  const X0 = 144;
  const PW = 186;
  const rowsOf = (lines: string[]): Shape[] => lines.map((s, i) => text(`q${i}`, X0, 38 + i * 18, cut(s, 30), { size: 9.5, mono: true }));
  const planBoxes = (ran: boolean): Shape[] => nodes.slice(0, 5).flatMap((n, i) => {
    let d = 0;
    for (let p = n.parent; p !== null; p = nodes.find((x) => x.id === p)?.parent ?? null) d++;
    const x = X0 + Math.min(d, 3) * 12;
    const w = PW - Math.min(d, 3) * 12;
    const name = n.relation ? `${n.type} ${n.relation}` : n.index ? `${n.type} ${n.index}` : n.type;
    const r = ran ? num(n.rows) : undefined;
    const sub = r !== undefined ? tr(`${r} dòng thật`, `${r} actual rows`) : `cost ${num(n.cost) ?? '?'}`;
    return box(`pn${n.id}`, x, 30 + i * 32, w, 26, cut(name, fitChars(w)), ran ? 'live' : 'new', sub);
  });
  const draw = (at: number): Shape[] => {
    const out: Shape[] = [];
    STAGES.forEach(([k, label, sub], i) => {
      const on = i === at || (at === 5 && i === 6) || (at === 6 && (i === 0 || i === 5));
      out.push(...box(k, 10, Y(i), 112, 28, label, on ? 'new' : i < at ? 'live' : 'cell', sub));
      if (i < STAGES.length - 1) out.push(line(`a${i}`, 66, Y(i) + 28, 66, Y(i + 1), { ink: i < at ? 'new' : 'edge', arrow: true, w: i < at ? 1.8 : 1.2 }));
    });
    if (at === 6) out.push({ k: 'ret', t: 'p', d: `M122 ${Y(5) + 14} H134 V${Y(0) + 14} H124`, ink: 'new', w: 1.8, arrow: true });
    const head = [tr('Câu SQL (chỉ là chữ)', 'The SQL (just text)'), 'parse tree', 'query tree', tr('sau rewriter', 'after the rewriter'),
      tr('kế hoạch rẻ nhất', 'the cheapest plan'), tr('chạy: kéo dòng lên', 'running: rows flow up'), tr('kết quả', 'the result')][at];
    out.push(text('qh', X0, 14, head, { size: 10, b: true, ink: 'muted' }));
    if (at === 0) out.push(...rowsOf(wrap(sql || '?', 30, 6)));
    if (at === 1) out.push(...rowsOf(['SelectStmt', `  targetList: ${sel}`, `  fromClause: ${rel}`, ...(where ? [`  whereClause: ${where}`] : [])]));
    if (at === 2) out.push(...rowsOf([`${rel} → pg_class`, `${tr('cột', 'columns')}: ${sel}`, tr('tên, kiểu: đã kiểm', 'names, types: checked')]));
    if (at === 3) out.push(...rowsOf(isView ? [`${rel}: view`, tr('→ câu định nghĩa', '→ its defining query')] : [`${rel}: ${tr('bảng', 'table')}`, tr('cây giữ nguyên', 'tree unchanged')]));
    if (at === 4) out.push(...planBoxes(false));
    if (at === 5) out.push(...planBoxes(true));
    if (at === 6) out.push(text('res', X0 + PW / 2, 90, tr(`${rows} dòng`, `${rows} rows`), { a: 'm', size: 20, b: true }));
    return out;
  };
  const src = m.recorded ? fill(tr('Kế hoạch ghi sẵn từ {p}.', 'The plan was recorded from {p}.'), { p: m.recorded }) : tr('Kế hoạch là kết quả thật của bài.', 'The plan is this lesson\'s real result.');
  return {
    title: tr('Đường đi của một câu truy vấn', 'The path of a query'), w: 340, h: 248,
    frames: [
      { say: tr('Ứng dụng gửi câu SQL dạng chữ qua kết nối. Postgres có một tiến trình backend cho mỗi kết nối, mọi tầng bên dưới chạy trong tiến trình đó. (PGlite chạy cùng các tầng này trong WASM, với một kết nối.)', 'The client sends the SQL as text over its connection. Postgres runs one backend process per connection, and every layer below runs inside it. (PGlite runs the same layers in WASM, with one connection.)'), nodes: draw(0) },
      { say: tr('Parser kiểm cú pháp và dựng cây phân tích (parse tree). Nó chưa đọc catalog: lỗi cú pháp (42601) dừng ở đây.', 'The parser checks the syntax and builds a parse tree. It has not read the catalog yet: a syntax error (42601) stops here.'), nodes: draw(1) },
      { say: fill(tr('Bước phân tích tra catalog: {r} là bảng nào, có cột nào, kiểu gì. Tên sai (42P01, 42703) dừng ở đây. Kết quả là cây truy vấn (query tree).', 'The analyzer looks names up in the catalog: which table {r} is, its columns and their types. A wrong name (42P01, 42703) stops here. The result is a query tree.'), { r: rel }), nodes: draw(2) },
      { say: fill(isView ? tr('Rewriter thay view bằng câu định nghĩa của nó và áp rule. Ở đây {r} là view nên được mở ra.', 'The rewriter replaces a view with its defining query and applies rules. Here {r} is a view, so it is expanded.') : tr('Rewriter thay view bằng câu định nghĩa của nó và áp rule. {r} là bảng thường nên cây giữ nguyên.', 'The rewriter replaces a view with its defining query and applies rules. {r} is a plain table, so the tree is unchanged.'), { r: rel }), nodes: draw(3) },
      { say: fill(tr('Planner ước lượng chi phí nhiều cách đọc (Seq Scan, Index Scan, Bitmap…) từ thống kê của ANALYZE rồi chọn cách rẻ nhất: {t}, chi phí {c} (đơn vị planner, không phải ms). {s}', 'The planner estimates the cost of several access paths (Seq Scan, Index Scan, Bitmap…) from ANALYZE\'s statistics and picks the cheapest: {t} at cost {c} (planner units, not ms). {s}'), { t: root.type, c: num(root.cost) ?? '?', s: src }), nodes: draw(4) },
      { say: fill(actual !== undefined ? tr('Executor chạy cây kế hoạch, kéo dòng từ lá lên gốc. Trang dữ liệu đi qua shared buffers; trang chưa có trong bộ nhớ mới phải đọc từ đĩa. Gốc trả {n} dòng thật.', 'The executor runs the plan tree, pulling rows from the leaves up to the root. Data pages go through shared buffers; only pages not in memory are read from disk. The root returned {n} actual rows.') : tr('Executor chạy cây kế hoạch, kéo dòng từ lá lên gốc. Trang dữ liệu đi qua shared buffers; trang chưa có trong bộ nhớ mới phải đọc từ đĩa. Planner ước lượng {n} dòng.', 'The executor runs the plan tree, pulling rows from the leaves up to the root. Data pages go through shared buffers; only pages not in memory are read from disk. The planner estimated {n} rows.'), { n: rows }), nodes: draw(5) },
      { say: tr('Mỗi dòng kết quả được gửi về ứng dụng ngay khi gốc tạo ra nó, không đợi đủ cả kết quả. Khi gốc hết dòng, câu truy vấn xong.', 'Each result row goes back to the client as soon as the root produces it, without waiting for the whole result. When the root runs out of rows, the query is done.'), nodes: draw(6) },
    ],
  };
});

// ── partitionPrune ──────────────────────────────────────────────────────────────────────────────────────────────
/**
 * A real partitioned table: `key` = pg_get_partkeydef, `parts` = the pg_partition_tree leaves with pg_get_expr(relpartbound),
 * `cases` = queries with their EXPLAIN (FORMAT JSON) (ANALYZE for run-time pruning). A partition is kept when a scan
 * outside an InitPlan/SubPlan reads it, and ran when that scan's Actual Loops > 0.
 */
export interface PruneModel { table: string; key: string; parts: { name: string; bound: string }[]; cases: { sql: string; plan: unknown }[]; recorded?: string }
const seq = (rel: string, rel2: string, cost: number, rows: number, loops?: number, actual?: number): RawPlan => ({
  'Node Type': 'Seq Scan', 'Relation Name': rel, 'Parent Relationship': rel2, 'Total Cost': cost, 'Plan Rows': rows,
  ...(loops !== undefined ? { 'Actual Rows': actual ?? 0, 'Actual Loops': loops } : {}),
});
const agg = (cost: number, kids: RawPlan[], extra: RawPlan = {}): RawPlan => ({ 'Node Type': 'Aggregate', 'Total Cost': cost, 'Plan Rows': 1, ...extra, Plans: kids });
const app = (cost: number, rows: number, kids: RawPlan[], extra: RawPlan = {}): RawPlan => ({ 'Node Type': 'Append', 'Parent Relationship': 'Outer', 'Total Cost': cost, 'Plan Rows': rows, ...extra, 'Subplans Removed': 0, Plans: kids });
const P4 = ['events_2026_08', 'events_2026_09', 'events_2026_10', 'events_default'];
const all4 = (c: number[], r: number[]): RawPlan[] => P4.map((p, i) => seq(p, 'Member', c[i], r[i]));
/** Recorded from PGlite 0.5.16 on lesson e-pg-l4-07's `events` table (slimPlan of each EXPLAIN); pinned in tests/enginePgViz.test.ts. */
export const PRUNE_SAMPLE: PruneModel = {
  table: 'events', key: 'RANGE (created_on)', recorded: RECORDED,
  parts: [
    { name: P4[0], bound: "FOR VALUES FROM ('2026-08-01') TO ('2026-09-01')" },
    { name: P4[1], bound: "FOR VALUES FROM ('2026-09-01') TO ('2026-10-01')" },
    { name: P4[2], bound: "FOR VALUES FROM ('2026-10-01') TO ('2026-11-01')" },
    { name: P4[3], bound: 'DEFAULT' },
  ],
  cases: [
    { sql: 'SELECT count(*) FROM events', plan: agg(221.02, [app(198, 9201, all4([51, 50, 51, 0], [3100, 3000, 3100, 1]))]) },
    { sql: "SELECT count(*) FROM events WHERE created_on >= '2026-10-01' AND created_on < '2026-10-08'", plan: agg(68.26, [seq(P4[2], 'Outer', 66.5, 700)]) },
    { sql: 'SELECT count(*) FROM events WHERE tenant_id = 7', plan: agg(176.4, [app(175.93, 185, all4([58.75, 57.5, 58.75, 0], [64, 60, 60, 1]))]) },
    { sql: "SELECT count(*) FROM events WHERE date_trunc('month', created_on) = '2026-09-01'", plan: agg(221.37, [app(221.24, 48, all4([74.25, 72.5, 74.25, 0], [16, 15, 16, 1]))]) },
    {
      sql: 'SELECT count(*) FROM events WHERE created_on = (SELECT max(created_on) FROM events_2026_09)',
      plan: agg(234.78, [
        agg(57.51, [seq(P4[1], 'Outer', 50, 3000, 1, 3000)], { 'Parent Relationship': 'InitPlan', 'Actual Rows': 1, 'Actual Loops': 1 }),
        app(176.5, 301, [seq(P4[0], 'Member', 58.75, 100, 0), seq(P4[1], 'Member', 57.5, 100, 1, 100), seq(P4[2], 'Member', 58.75, 100, 0), seq(P4[3], 'Member', 0, 1, 0)], { 'Actual Rows': 100, 'Actual Loops': 1 }),
      ], { 'Actual Rows': 1, 'Actual Loops': 1 }),
    },
  ],
};
/** pg_get_expr(relpartbound) → a short bound: two lines for a range, one otherwise. */
const boundLines = (b: string): string[] => {
  if (/^\s*DEFAULT\s*$/i.test(b)) return ['DEFAULT'];
  const q = [...b.matchAll(/'([^']*)'|\b(MINVALUE|MAXVALUE)\b/g)].map((x) => x[1] ?? x[2]);
  const hash = /modulus (\d+), remainder (\d+)/i.exec(b);
  if (hash) return [`hash ${hash[2]}/${hash[1]}`];
  if (/\bIN\s*\(/i.test(b)) return [`IN ${q.join(', ')}`];
  return q.length === 2 ? [`≥ ${q[0]}`, `< ${q[1]}`] : [b];
};
define<PruneModel>('pg-partition-prune', PRUNE_SAMPLE, (m, tr) => {
  const parts = m.parts.slice(0, 6);
  const n = parts.length || 1;
  const cases = m.cases.slice(0, 5);
  const PW = (320 - (n - 1) * 6) / n;
  const keyCol = /\(([^)]+)\)/.exec(m.key)?.[1]?.trim() ?? m.key;
  const esc = keyCol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  type St = 'kept' | 'pruned' | 'notrun' | 'idle';
  const stateOf = (plan: unknown): { st: St[]; analyzed: boolean; removed: number; shape: string } => {
    const nodes = planNodesOf(plan).filter((x) => !x.initPlan);
    const st = parts.map((p): St => {
      const scans = nodes.filter((x) => x.relation === p.name);
      if (!scans.length) return 'pruned';
      return scans.some((x) => x.loops === undefined || x.loops > 0) ? 'kept' : 'notrun';
    });
    const kinds = nodes.filter((x) => !x.relation).map((x) => x.type);
    const scans = nodes.filter((x) => x.relation);
    const shape = [...kinds, scans.length ? `${scans.length} × ${scans[0].type}` : ''].filter(Boolean).join(' → ');
    return { st, analyzed: nodes.some((x) => x.loops !== undefined), removed: nodes.reduce((a, x) => a + (x.removed ?? 0), 0), shape };
  };
  const TAG: Record<St, [string, 'live' | 'muted' | 'warm' | 'ink']> = {
    kept: [tr('đọc', 'read'), 'live'], pruned: [tr('bị bỏ', 'pruned'), 'muted'], notrun: [tr('không chạy', 'not run'), 'warm'], idle: ['', 'ink'],
  };
  const TONE: Record<St, Tone> = { kept: 'live', pruned: 'ghost', notrun: 'free', idle: 'cell' };
  const draw = (st: St[], sql?: string, shape?: string, removed = 0): Shape[] => {
    const out: Shape[] = [...box('par', 110, 8, 120, 34, cut(m.table, 18), 'cell', cut(m.key, 24))];
    parts.forEach((p, i) => {
      const x = 10 + i * (PW + 6);
      const s = st[i] ?? 'idle';
      out.push(line(`e${i}`, 170, 42, x + PW / 2, 70, { ink: s === 'kept' ? 'new' : 'edge', arrow: s === 'kept', w: s === 'kept' ? 1.8 : 1.2, dash: s === 'pruned' }));
      out.push(...box(`p${i}`, x, 70, PW, 30, cut(p.name, fitChars(PW)), TONE[s]));
      boundLines(p.bound).forEach((b, j) => out.push(text(`b${i}.${j}`, x + PW / 2, 110 + j * 11, cut(b, Math.floor(PW / 5.2)), { a: 'm', size: 8.5, mono: true, ink: 'muted' })));
      if (s !== 'idle') out.push(text(`g${i}`, x + PW / 2, 138, cut(TAG[s][0], Math.floor(PW / 5.2)), { a: 'm', size: 9.5, b: true, ink: TAG[s][1] }));
    });
    if (sql) wrap(sql, 54, 3).forEach((l, i) => out.push(text(`s${i}`, 10, 158 + i * 12, l, { size: 9, mono: true })));
    if (shape) out.push(text('pl', 10, 202, cut(`${tr('Kế hoạch', 'Plan')}: ${shape}`, 58), { size: 9.5, b: true }));
    if (removed) out.push(text('rm', 10, 218, `Subplans Removed: ${removed}`, { size: 9.5, mono: true, ink: 'warm' }));
    return out;
  };
  const names = (st: St[], want: St) => parts.filter((_, i) => st[i] === want).map((p) => p.name).join(', ');
  const sayCase = (sql: string, s: ReturnType<typeof stateOf>): string => {
    const kept = s.st.filter((x) => x !== 'pruned').length;
    const ran = s.st.filter((x) => x === 'kept').length;
    const where = /\bwhere\b([\s\S]*)$/i.exec(sql)?.[1] ?? '';
    if (s.analyzed && s.st.includes('notrun')) return fill(tr('Giá trị đến từ truy vấn con nên lúc lập kế hoạch chưa biết: kế hoạch giữ {k}/{n} phân vùng. Lúc chạy, khi đã có giá trị, {x} phân vùng không bao giờ chạy (never executed); chỉ đọc {r}.', 'The value comes from a sub-query, so it is unknown at plan time: the plan keeps {k} of {n} partitions. At run time, once the value is known, {x} partitions never execute; only {r} is read.'), { k: kept, n: parts.length, x: kept - ran, r: names(s.st, 'kept') });
    if (kept < parts.length) return fill(tr('Điều kiện trên khóa {c} là hằng: planner so với giới hạn từng phân vùng và bỏ {p} phân vùng ngay lúc lập kế hoạch. Chỉ đọc {r}.', 'The condition on the key {c} is a constant: the planner compares it with each partition\'s bounds and prunes {p} partitions at plan time. Only {r} is read.'), { c: keyCol, p: parts.length - kept, r: names(s.st, 'kept') });
    if (!where.trim()) return fill(tr('Không có điều kiện: Append đọc cả {n} phân vùng, như một bảng chia làm nhiều mảnh.', 'No condition: the Append reads all {n} partitions, like one table cut into pieces.'), { n: parts.length });
    if (new RegExp(`\\w+\\s*\\([^()]*\\b${esc}\\b`, 'i').test(where)) return fill(tr('Khóa {c} bị bọc trong hàm: planner không so được với giới hạn phân vùng, nên đọc cả {n}. Hãy viết điều kiện khoảng trên chính cột khóa.', 'The key {c} is wrapped in a function: the planner cannot compare it with the bounds, so it reads all {n}. Write a range condition on the key column itself.'), { c: keyCol, n: parts.length });
    if (!new RegExp(`\\b${esc}\\b`, 'i').test(where)) return fill(tr('Điều kiện không nằm trên khóa {c}: phân vùng nào cũng có thể có dòng khớp, nên đọc cả {n}.', 'The condition is not on the key {c}: any partition may hold matching rows, so all {n} are read.'), { c: keyCol, n: parts.length });
    return fill(tr('Kế hoạch giữ cả {n} phân vùng: giá trị trên khóa chưa biết lúc lập kế hoạch.', 'The plan keeps all {n} partitions: the key value is not known at plan time.'), { n: parts.length });
  };
  const src = m.recorded ? fill(tr('Kế hoạch ghi sẵn từ {p}.', 'Plans recorded from {p}.'), { p: m.recorded }) : tr('Kế hoạch là EXPLAIN thật của bài.', 'Plans are this lesson\'s real EXPLAIN.');
  return {
    title: 'Partition pruning', w: 340, h: 228,
    frames: [
      { say: fill(tr('Bảng {t} chia theo {k} thành {n} phân vùng; mỗi phân vùng là một bảng thật với giới hạn riêng. {s}', 'Table {t} is partitioned by {k} into {n} partitions; each is a real table with its own bounds. {s}'), { t: m.table, k: m.key, n: parts.length, s: src }), nodes: draw(parts.map(() => 'idle')) },
      ...cases.map((c) => {
        const s = stateOf(c.plan);
        return { say: sayCase(c.sql, s), nodes: draw(s.st, c.sql, s.shape, s.removed) };
      }),
      { say: tr('Tóm lại: pruning lúc lập kế hoạch cần điều kiện hằng trên khóa phân vùng. Giá trị chỉ biết lúc chạy thì kế hoạch giữ đủ rồi bỏ lúc chạy (never executed, hoặc Subplans Removed). Bọc khóa trong hàm thì mất pruning.', 'In short: plan-time pruning needs a constant condition on the partition key. A value known only at run time keeps every partition in the plan and skips them while running (never executed, or Subplans Removed). Wrapping the key in a function loses pruning.'), nodes: draw(parts.map(() => 'idle')) },
    ],
  };
});

// ── replication ─────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Streaming replication, slots and logical decoding. Diagram-only (spike-engine.md: one PGlite is one server, so no
 * standby can run in the browser); every frame says so and its LSNs are made up. What is real: the slots (rows of
 * pg_replication_slots, lesson e-pg-l5-13 creates them in PGlite) and `wal_level` (pg_settings).
 */
export interface ReplicationSlot { slot_name: string; slot_type?: unknown; active?: unknown; has_restart_lsn?: unknown; wal_status?: unknown }
export interface ReplicationModel { slots?: ReplicationSlot[]; wal_level?: string; recorded?: string }
/** Recorded from PGlite 0.5.16 after lesson e-pg-l5-13's setup; pinned in tests/enginePgViz.test.ts. */
export const REPLICATION_SAMPLE: ReplicationModel = {
  recorded: 'PGlite 0.5.16', wal_level: 'replica',
  slots: [
    { slot_name: 'standby_lazy', slot_type: 'physical', active: false, has_restart_lsn: false, wal_status: null },
    { slot_name: 'standby_reserved', slot_type: 'physical', active: false, has_restart_lsn: true, wal_status: 'reserved' },
  ],
};
define<ReplicationModel>('pg-replication', REPLICATION_SAMPLE, (m, tr) => {
  const slots = (m.slots ?? []).slice(0, 3);
  const held = (s: ReplicationSlot) => s.has_restart_lsn === true || s.has_restart_lsn === 't' || s.has_restart_lsn === 'true';
  type St = { on: string[]; lsn?: boolean; async?: boolean; sync?: boolean; slot?: boolean; real?: boolean; logical?: boolean };
  const LSN: [string, string, number][] = [['sent', '0/3000A8', 300], ['write', '0/300060', 250], ['flush', '0/300028', 205], ['replay', '0/2FFF90', 150]];
  const draw = (s: St): Shape[] => {
    const tone = (k: string): Tone => (s.on.includes(k) ? 'new' : 'cell');
    const out: Shape[] = [
      text('note', 330, 10, tr('Minh họa · không chạy trong trình duyệt', 'Illustration · not run in the browser'), { a: 'e', size: 9, ink: 'muted', b: true }),
      text('hp', 10, 26, 'Primary', { b: true, size: 11 }),
      text('hs', 180, 26, s.logical ? tr('Bên nhận (logical)', 'Subscriber (logical)') : 'Standby', { b: true, size: 11 }),
      ...box('be', 10, 36, 150, 28, 'backend', tone('be'), s.sync ? tr('COMMIT chờ ack', 'COMMIT waits for ack') : 'COMMIT'),
      ...box('wb', 10, 72, 150, 28, 'WAL buffers', tone('wb')),
      ...box('pw', 10, 108, 150, 28, 'pg_wal', s.slot ? 'warm' : tone('pw'), s.slot ? tr('giữ từ restart_lsn ↑', 'kept from restart_lsn ↑') : undefined),
      ...box('ws', 10, 144, 150, 28, 'walsender', tone('ws'), s.logical ? 'pgoutput' : undefined),
      ...box('wr', 180, 144, 150, 28, s.logical ? tr('subscription', 'subscription') : 'walreceiver', s.slot ? 'ghost' : tone('wr'), s.slot ? tr('đang tắt', 'offline') : undefined),
      ...box('sw', 180, 108, 150, 28, s.logical ? 'INSERT / UPDATE / DELETE' : 'pg_wal', s.slot ? 'ghost' : tone('sw')),
      ...box('st', 180, 72, 150, 28, s.logical ? tr('áp từng dòng', 'applies rows') : tr('startup (replay)', 'startup (replay)'), s.slot ? 'ghost' : tone('st')),
      ...box('sd', 180, 36, 150, 28, s.logical ? tr('bảng của bên nhận', 'subscriber tables') : tr('dữ liệu · chỉ đọc', 'data · read-only'), s.slot ? 'ghost' : tone('sd')),
      ...[0, 1, 2].map((i) => line(`pa${i}`, 85, 64 + i * 36, 85, 72 + i * 36, { ink: s.on.includes(['wb', 'pw', 'ws'][i]) ? 'new' : 'edge', arrow: true })),
      ...[0, 1, 2].map((i) => line(`sa${i}`, 255, 144 - i * 36, 255, 136 - i * 36, { ink: s.on.includes(['sw', 'st', 'sd'][i]) ? 'new' : 'edge', arrow: true })),
      line('net', 160, 164, 180, 164, { ink: s.on.includes('wr') ? 'new' : 'edge', arrow: true, dash: s.slot }),
      text('tcp', 170, 182, 'TCP', { a: 'm', size: 9, ink: 'muted' }),
    ];
    if (s.sync) out.push({ k: 'ack', t: 'p', d: 'M180 150 H170 V50 H162', ink: 'new', w: 1.8, arrow: true, dash: true }, text('ackt', 170, 190, tr('ack về primary', 'ack to the primary'), { a: 'm', size: 9, ink: 'new', b: true }));
    if (s.async) out.push(text('asy', 10, 190, tr('COMMIT xong khi pg_wal của primary đã ghi', 'COMMIT returns once the primary\'s pg_wal is written'), { size: 9, ink: 'warm', b: true }));
    if (s.lsn) {
      out.push(line('ax', 10, 214, 330, 214, { ink: 'edge', arrow: true }), text('axt', 10, 252, tr('LSN (số ví dụ) tăng →', 'LSN (made-up) grows →'), { size: 9, ink: 'muted' }));
      LSN.forEach(([k, v, x], i) => out.push({ k: `lm${k}`, t: 'c', x, y: 214, r: 4, tone: i ? 'ptr' : 'new' }, text(`lt${k}`, x, i % 2 ? 236 : 202, `${k} ${v}`, { a: 'm', size: 8.5, mono: true })));
    }
    if (s.real) {
      const W = (320 - (slots.length - 1) * 6) / Math.max(1, slots.length);
      slots.forEach((sl, i) => out.push(...box(`sl${i}`, 10 + i * (W + 6), 204, W, 40, cut(sl.slot_name, Math.floor((W - 6) / 4.8)), held(sl) ? 'warm' : 'cell',
        cut(`wal_status: ${sl.wal_status ?? 'NULL'}`, Math.floor((W - 6) / 4.4)))));
    }
    return out;
  };
  const slotText = slots.map((s) => `${s.slot_name} (${held(s) ? tr('đã giữ WAL', 'already holds WAL') : tr('chưa giữ WAL', 'holds no WAL yet')}, wal_status ${s.wal_status ?? 'NULL'})`).join('; ') || tr('không có slot nào', 'none');
  const src = m.recorded ? fill(tr('ghi từ {p}', 'recorded from {p}'), { p: m.recorded }) : tr('đọc thật trong bài', 'read live in the lesson');
  return {
    title: tr('Nhân bản: WAL tới standby (minh họa)', 'Replication: WAL to a standby (illustration)'), w: 340, h: 258,
    frames: [
      { say: tr('Sơ đồ minh họa: trình duyệt chỉ có một máy Postgres (PGlite), không có standby, nên phần streaming không chạy thật và LSN là số ví dụ. Trên primary, COMMIT ghi bản ghi WAL vào WAL buffers rồi xả xuống pg_wal.', 'An illustration: the browser has a single Postgres server (PGlite) and no standby, so streaming does not really run here and the LSNs are made up. On the primary, COMMIT writes a WAL record into the WAL buffers, then flushes it to pg_wal.'), nodes: draw({ on: ['be', 'wb', 'pw'] }) },
      { say: tr('Streaming (nhân bản vật lý): walsender đọc pg_wal và gửi byte WAL qua TCP tới walreceiver của standby, nơi chúng được ghi vào pg_wal của standby. Cả cluster được chép, không chọn bảng.', 'Streaming (physical replication): the walsender reads pg_wal and ships the WAL bytes over TCP to the standby\'s walreceiver, which writes them into the standby\'s pg_wal. The whole cluster is copied; no table is picked.'), nodes: draw({ on: ['pw', 'ws', 'wr', 'sw'] }) },
      { say: tr('Tiến trình startup của standby áp (replay) WAL vào file dữ liệu; standby phục vụ câu chỉ đọc (hot standby). pg_stat_replication cho sent ≥ write ≥ flush ≥ replay: khoảng cách giữa chúng là độ trễ.', 'The standby\'s startup process replays the WAL into its data files; the standby serves read-only queries (hot standby). pg_stat_replication shows sent ≥ write ≥ flush ≥ replay: the gaps between them are the lag.'), nodes: draw({ on: ['sw', 'st', 'sd'], lsn: true }) },
      { say: tr('Bất đồng bộ (mặc định, synchronous_standby_names rỗng): COMMIT trả về khi WAL đã nằm trên đĩa của primary. Primary sập trước khi gửi xong thì sau failover các giao dịch cuối bị mất.', 'Asynchronous (the default, synchronous_standby_names empty): COMMIT returns once the WAL is on the primary\'s disk. If the primary dies before shipping it, the last transactions are lost after a failover.'), nodes: draw({ on: ['be', 'pw'], async: true, lsn: true }) },
      { say: tr('Đồng bộ (đặt synchronous_standby_names): COMMIT chờ standby báo đã nhận. synchronous_commit = on chờ standby flush; remote_apply chờ standby replay xong. Không mất giao dịch, đổi lại COMMIT chậm thêm một vòng mạng.', 'Synchronous (synchronous_standby_names set): COMMIT waits for the standby\'s acknowledgement. synchronous_commit = on waits for the standby\'s flush; remote_apply waits until it has replayed. No transaction is lost, at the price of one network round trip per COMMIT.'), nodes: draw({ on: ['be', 'ws', 'wr', 'sw'], sync: true }) },
      { say: tr('Slot nhân bản nhớ restart_lsn của bên nhận; primary giữ mọi WAL từ đó. Standby tắt mà slot còn thì pg_wal cứ lớn tới đầy đĩa, trừ khi max_slot_wal_keep_size giới hạn (vượt thì wal_status = lost).', 'A replication slot remembers its consumer\'s restart_lsn, and the primary keeps all WAL from there. If the standby is off but the slot remains, pg_wal grows until the disk is full, unless max_slot_wal_keep_size caps it (past the cap, wal_status = lost).'), nodes: draw({ on: ['pw'], slot: true }) },
      { say: fill(tr('Phần này là thật: slot tạo được trong PGlite. Slot của bài ({s}): {l}.', 'This part is real: slots can be created in PGlite. The lesson\'s slots ({s}): {l}.'), { s: src, l: slotText }), nodes: draw({ on: ['pw'], real: true }) },
      { say: fill(tr('Logical decoding: slot logic với plugin (pgoutput) dịch WAL thành thay đổi từng dòng cho bên nhận. Cần wal_level = logical (ở đây là {w}). Sau khi sập, thay đổi từ vị trí đã xác nhận có thể được gửi lại, nên bên nhận phải chịu được bản trùng.', 'Logical decoding: a logical slot with an output plugin (pgoutput) turns WAL into row changes for a subscriber. It needs wal_level = logical (here it is {w}). After a crash, changes since the confirmed position may be sent again, so the subscriber must tolerate duplicates.'), { w: m.wal_level ?? '?' }), nodes: draw({ on: ['ws', 'wr', 'sw', 'st', 'sd'], logical: true }) },
    ],
  };
});
