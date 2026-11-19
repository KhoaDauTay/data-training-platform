import type { PlanNode } from '../../viz/plan';
import { arc, box, cut, define, fill, line, num, type Shape, text, type Tone } from './core';

// ENG-VIZ Postgres planner and concurrency diagrams (knowledge map P12, C4): plan tree, locks, isolation anomalies.

// ── planTree ────────────────────────────────────────────────────────────────────────────────────────────────────
/** A plan node: the fields of src/viz/plan.ts's PlanNode that a picture needs, plus the planner's total cost. */
export type PlanVizNode = Pick<PlanNode, 'id' | 'parent' | 'type'> & Partial<Pick<PlanNode, 'relation' | 'estRows'>> & { cost?: unknown; rows?: unknown };
const PLAN_SAMPLE: PlanVizNode[] = [
  { id: 1, parent: null, type: 'Limit', estRows: 10, cost: 118.6 },
  { id: 2, parent: 1, type: 'Sort', estRows: 480, cost: 118.4 },
  { id: 3, parent: 2, type: 'Hash Join', estRows: 480, cost: 96.2 },
  { id: 4, parent: 3, type: 'Seq Scan', relation: 'orders', estRows: 2000, cost: 41 },
  { id: 5, parent: 3, type: 'Hash', estRows: 120, cost: 3.2 },
  { id: 6, parent: 5, type: 'Index Scan', relation: 'customers', estRows: 120, cost: 3.2 },
];
define<PlanVizNode[]>('planTree', PLAN_SAMPLE, (nodes0, tr) => {
  const nodes = nodes0.slice(0, 9);
  const kids = (id: number) => nodes.filter((n) => n.parent === id);
  const root = nodes.find((n) => n.parent === null || !nodes.some((p) => p.id === n.parent)) ?? nodes[0];
  const depth = new Map<number, number>();
  const xs = new Map<number, number>();
  let leaf = 0;
  const walk = (n: PlanVizNode, d: number): void => {
    depth.set(n.id, d);
    const c = kids(n.id);
    c.forEach((k) => walk(k, d + 1));
    xs.set(n.id, c.length ? c.reduce((a, k) => a + xs.get(k.id)!, 0) / c.length : leaf++);
  };
  walk(root, 0);
  const leaves = Math.max(1, leaf);
  const maxD = Math.max(...depth.values());
  const BW = Math.min(124, 320 / leaves - 8);
  const slot = 320 / leaves;
  const bx = (n: PlanVizNode) => 10 + (xs.get(n.id)! + 0.5) * slot - BW / 2;
  const by = (n: PlanVizNode) => 14 + depth.get(n.id)! * 62;
  const post: PlanVizNode[] = [];
  const order = (n: PlanVizNode): void => { kids(n.id).forEach(order); post.push(n); };
  order(root);
  const label = (n: PlanVizNode) => cut(n.relation ? `${n.type} ${n.relation}` : n.type, Math.floor(BW / 6.2));
  const facts = (n: PlanVizNode) => {
    const cost = num(n.cost);
    const rows = num(n.estRows) ?? num(n.rows);
    return [cost !== undefined ? `cost ${cost}` : '', rows !== undefined ? tr(`${rows} dòng`, `${rows} rows`) : ''].filter(Boolean).join(' · ');
  };
  const draw = (done: number, cur?: PlanVizNode): Shape[] => {
    const out: Shape[] = [];
    nodes.forEach((n) => {
      const p = nodes.find((x) => x.id === n.parent);
      if (p && depth.has(n.id)) {
        const ran = post.indexOf(n) < done;
        out.push(line(`e${n.id}`, bx(n) + BW / 2, by(n), bx(p) + BW / 2, by(p) + 38, { ink: ran ? 'new' : 'edge', arrow: ran, w: ran ? 1.8 : 1.2 }));
      }
    });
    nodes.filter((n) => depth.has(n.id)).forEach((n) => {
      const i = post.indexOf(n);
      const tone: Tone = n === cur ? 'new' : i < done ? 'live' : 'cell';
      out.push(...box(`n${n.id}`, bx(n), by(n), BW, 38, label(n), tone, cut(facts(n), Math.floor(BW / 5))));
    });
    return out;
  };
  const say = (n: PlanVizNode) => fill(tr('{t}{r}: ước lượng {e} dòng, chi phí tổng {c} (gồm cả nút con). Nó chuyển dòng lên nút cha.', '{t}{r}: an estimated {e} rows at a total cost of {c} (children included). It hands its rows up to its parent.'),
    { t: n.type, r: n.relation ? tr(` trên ${n.relation}`, ` on ${n.relation}`) : '', e: num(n.estRows) ?? num(n.rows) ?? '?', c: num(n.cost) ?? '?' });
  return {
    title: tr('Cây kế hoạch EXPLAIN', 'The EXPLAIN plan tree'), w: 340, h: 14 + maxD * 62 + 46,
    frames: [
      { say: tr('EXPLAIN vẽ kế hoạch thành cây: nút gốc trả kết quả, lá đọc bảng. Thực thi kéo dòng từ dưới lên.', 'EXPLAIN draws the plan as a tree: the root returns the result and the leaves read tables. Execution pulls rows from the bottom up.'), nodes: draw(0) },
      ...post.map((n, i) => ({ say: say(n), nodes: draw(i, n) })),
      { say: fill(tr('Chi phí của gốc ({c}) là chi phí cả kế hoạch, tính bằng đơn vị planner (seq_page_cost = 1), không phải mili giây. Planner chọn kế hoạch rẻ nhất nó ước lượng được.', 'The root\'s cost ({c}) is the whole plan\'s cost, in planner units (seq_page_cost = 1), not milliseconds. The planner picks the cheapest plan it can estimate.'), { c: num(root.cost) ?? '?' }), nodes: draw(post.length) },
    ],
  };
});

// ── lockMatrix ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Table-level lock modes, weakest first, and which modes each one conflicts with (PostgreSQL docs, "Table-Level Locks"). */
export const LOCK_MODES = ['ACCESS SHARE', 'ROW SHARE', 'ROW EXCLUSIVE', 'SHARE UPDATE EXCLUSIVE', 'SHARE', 'SHARE ROW EXCLUSIVE', 'EXCLUSIVE', 'ACCESS EXCLUSIVE'];
const ABBR = ['AS', 'RS', 'RE', 'SUE', 'S', 'SRE', 'E', 'AE'];
/** Row i, column j = 1 when mode i conflicts with mode j. */
export const LOCK_CONFLICTS = ['00000001', '00000011', '00001111', '00011111', '00110111', '00111111', '01111111', '11111111'];
export interface LockModel { waits: [string, string][]; cycle?: [string, string][] }
define<LockModel>('lockMatrix', { waits: [['T2', 'T1'], ['T3', 'T1'], ['T3', 'T2']], cycle: [['T1', 'T2'], ['T2', 'T1']] }, (m, tr) => {
  const C = 22;
  const X0 = 46;
  const Y0 = 30;
  const matrix = (hlRow?: number, hlCol?: number): Shape[] => {
    const out: Shape[] = [];
    ABBR.forEach((a, i) => {
      out.push(text(`rl${i}`, X0 - 4, Y0 + i * C + C / 2, a, { a: 'e', size: 10, b: true, ink: i === hlRow ? 'new' : 'ink' }));
      out.push(text(`cl${i}`, X0 + i * C + C / 2, Y0 - 9, a, { a: 'm', size: 9, b: true, ink: i === hlCol ? 'new' : 'ink' }));
      ABBR.forEach((_, j) => {
        const bad = LOCK_CONFLICTS[i][j] === '1';
        const on = (hlRow === i && (hlCol === undefined || hlCol === j)) || (hlCol === j && hlRow === undefined);
        out.push({ k: `m${i}.${j}`, t: 'r', x: X0 + j * C, y: Y0 + i * C, w: C - 2, h: C - 2, rx: 2, tone: bad ? 'dead' : 'plain', bold: on, o: hlRow === undefined || on ? 1 : 0.45 });
      });
    });
    out.push(...box('lg1', 236, Y0, 94, 20, tr('xung đột', 'conflict'), 'dead'), ...box('lg2', 236, Y0 + 26, 94, 20, tr('cùng giữ được', 'compatible'), 'plain'));
    return out;
  };
  const NODES: Record<string, [number, number]> = { T1: [60, 262], T2: [170, 262], T3: [280, 262] };
  const graph = (edges: [string, string][], tone: 'warm' | 'dead', holds: Record<string, string>): Shape[] => {
    const out: Shape[] = [text('gh', 10, 222, tr('Đồ thị chờ (ai chờ ai)', 'Waits-for graph (who waits for whom)'), { size: 9.5, ink: 'muted' })];
    Object.entries(NODES).forEach(([n, [x, y]]) => {
      out.push({ k: `g${n}`, t: 'c', x, y, r: 16, tone: edges.some(([a]) => a === n) ? tone : 'live' }, text(`gt${n}`, x, y, n, { a: 'm', b: true }));
      if (holds[n]) out.push(text(`gh${n}`, x, y + 28, holds[n], { a: 'm', size: 9.5, mono: true }));
    });
    edges.forEach(([a, b], i) => {
      const [x1, y1] = NODES[a];
      const [x2, y2] = NODES[b];
      const dx = x2 > x1 ? 1 : -1;
      const lift = edges.some(([c, d]) => c === b && d === a) ? (x2 > x1 ? -10 : 10) : 0;
      const ink = tone === 'dead' ? 'dead' : 'warm';
      out.push(Math.abs(x2 - x1) > 150 // skip over the node in between
        ? arc(`w${i}`, x1, y1 - 17, x2, y2 - 18, -34, { ink, w: 1.8 })
        : line(`w${i}`, x1 + dx * 17, y1 + lift, x2 - dx * 19, y2 + lift, { ink, arrow: true, w: 1.8 }));
    });
    return out;
  };
  const re = LOCK_MODES.indexOf('ROW EXCLUSIVE');
  const sh = LOCK_MODES.indexOf('SHARE');
  return {
    title: tr('Khóa bảng: xung đột và chờ', 'Table locks: conflicts and waits'), w: 340, h: 300,
    frames: [
      { say: tr('Tám chế độ khóa bảng, từ yếu (AS) tới mạnh (AE). Ô đỏ: hai chế độ không cùng giữ được, nên người đến sau phải chờ. Bảng đối xứng.', 'Eight table lock modes, from weakest (AS) to strongest (AE). A red cell: the two modes cannot be held together, so the later one waits. The table is symmetric.'), nodes: matrix() },
      { say: tr('SELECT lấy ACCESS SHARE: chỉ xung đột với ACCESS EXCLUSIVE (ALTER TABLE, DROP, VACUUM FULL). Đọc gần như không bao giờ chặn ai.', 'SELECT takes ACCESS SHARE: it conflicts only with ACCESS EXCLUSIVE (ALTER TABLE, DROP, VACUUM FULL). Reads almost never block anyone.'), nodes: matrix(0) },
      { say: tr('UPDATE/INSERT/DELETE lấy ROW EXCLUSIVE; CREATE INDEX (không CONCURRENTLY) lấy SHARE. Hai chế độ này xung đột: tạo index chặn ghi.', 'UPDATE/INSERT/DELETE take ROW EXCLUSIVE; CREATE INDEX (without CONCURRENTLY) takes SHARE. These conflict: building an index blocks writes.'), nodes: matrix(re, sh) },
      { say: tr('T1 đang UPDATE (giữ RE). T2 muốn CREATE INDEX (S) nên chờ T1. T3 muốn ALTER TABLE (AE) nên chờ cả hai: hàng đợi khóa.', 'T1 is UPDATING (holds RE). T2 wants CREATE INDEX (S), so it waits for T1. T3 wants ALTER TABLE (AE) and waits for both: a lock queue.'), nodes: [...matrix(re, sh), ...graph(m.waits, 'warm', { T1: 'RE', T2: tr('chờ S', 'wants S'), T3: tr('chờ AE', 'wants AE') })] },
      ...(m.cycle ? [
        { say: tr('Deadlock (khóa dòng): T1 sửa dòng A rồi muốn dòng B; T2 sửa dòng B rồi muốn dòng A. Đồ thị chờ có vòng, không ai đi tiếp được.', 'A deadlock (row locks): T1 updated row A and wants row B; T2 updated row B and wants row A. The waits-for graph has a cycle; neither can go on.'), nodes: [...matrix(), ...graph(m.cycle, 'dead', { T1: tr('giữ A', 'holds A'), T2: tr('giữ B', 'holds B') })] },
        { say: tr('Sau deadlock_timeout (mặc định 1 s) Postgres tìm vòng và hủy một giao dịch (lỗi 40P01). Giao dịch còn lại chạy tiếp.', 'After deadlock_timeout (1 s by default) Postgres looks for the cycle and aborts one transaction (error 40P01). The other one goes on.'), nodes: [...matrix(), ...graph([], 'dead', { T1: tr('giữ A, B', 'holds A, B'), T2: tr('bị hủy', 'aborted') })] },
      ] : []),
    ],
  };
});

// ── isolationAnomalies ──────────────────────────────────────────────────────────────────────────────────────────
type Ev = [lane: 0 | 1, label: string, tone?: Tone];
define<Record<string, never>>('isolationAnomalies', {}, (_m, tr) => {
  const lanes: Shape[] = [text('l1', 10, 52, 'T1', { b: true }), text('l2', 10, 108, 'T2', { b: true }), line('r1', 34, 52, 330, 52, { ink: 'edge' }), line('r2', 34, 108, 330, 108, { ink: 'edge' })];
  const story = (id: string, head: string, evs: Ev[], verdict: string, ok: boolean): Shape[] => [
    ...lanes,
    text(`${id}h`, 10, 16, head, { b: true, size: 12 }),
    ...evs.flatMap(([l, s, tone], i) => box(`${id}${i}`, 38 + i * (292 / evs.length), l ? 94 : 38, 292 / evs.length - 6, 28, s, tone ?? 'cell')),
    ...box(`${id}v`, 10, 140, 320, 26, verdict, ok ? 'live' : 'dead'),
  ];
  const LEVELS = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'];
  // PostgreSQL docs, "Transaction Isolation" table: 1 = possible in PostgreSQL.
  const POSSIBLE = ['0111', '0111', '0001', '0000'];
  const cols = [tr('đọc bẩn', 'dirty'), tr('đọc lại', 'non-rep.'), 'phantom', tr('tuần tự', 'serial.')];
  const table: Shape[] = [
    ...cols.map((c, j) => text(`th${j}`, 160 + j * 46 + 22, 22, c, { a: 'm', size: 8.5, b: true })),
    ...LEVELS.flatMap((lv, i) => [
      text(`tl${i}`, 10, 48 + i * 30, cut(lv, 18), { size: 9.5, b: true, mono: true }),
      ...[0, 1, 2, 3].flatMap((j) => box(`tc${i}.${j}`, 160 + j * 46, 36 + i * 30, 42, 24, POSSIBLE[i][j] === '1' ? tr('có thể', 'yes') : tr('không', 'no'), POSSIBLE[i][j] === '1' ? 'dead' : 'live')),
    ]),
    text('tn', 10, 164, tr('Postgres: không đọc bẩn; RR không có phantom.', 'Postgres: no dirty reads; no phantoms in RR.'), { size: 9.5, ink: 'muted' }),
  ];
  return {
    title: tr('Mức cô lập và các bất thường', 'Isolation levels and anomalies'), w: 340, h: 176,
    frames: [
      { say: tr('Đọc bẩn: T2 ghi x = 2 nhưng chưa commit, T1 đọc x. Trong Postgres T1 vẫn thấy 1 ở mọi mức, kể cả READ UNCOMMITTED (chạy như READ COMMITTED).', 'Dirty read: T2 writes x = 2 without committing, T1 reads x. In Postgres T1 still sees 1 at every level, even READ UNCOMMITTED (it acts as READ COMMITTED).'),
        nodes: story('a', tr('Đọc bẩn', 'Dirty read'), [[1, 'x := 2', 'warm'], [0, tr('đọc x = 1', 'read x = 1'), 'live'], [1, 'ROLLBACK']], tr('Postgres: không bao giờ xảy ra', 'Postgres: never happens'), true) },
      { say: tr('Đọc không lặp lại: T1 đọc x = 1; T2 sửa x = 2 và commit; T1 đọc lại được 2. Có ở READ COMMITTED; REPEATABLE READ chặn được.', 'Non-repeatable read: T1 reads x = 1; T2 sets x = 2 and commits; T1 reads again and gets 2. Happens in READ COMMITTED; REPEATABLE READ prevents it.'),
        nodes: story('b', tr('Đọc không lặp lại', 'Non-repeatable read'), [[0, tr('đọc x = 1', 'read x = 1')], [1, 'x := 2', 'warm'], [1, 'COMMIT'], [0, tr('đọc x = 2', 'read x = 2'), 'dead']], tr('READ COMMITTED: có · REPEATABLE READ: không', 'READ COMMITTED: yes · REPEATABLE READ: no'), false) },
      { say: tr('Phantom: T1 đếm dòng có v > 10 được 3; T2 chèn dòng v = 15 và commit; T1 đếm lại được 4. REPEATABLE READ của Postgres chặn cả trường hợp này (chuẩn SQL thì cho phép).', 'Phantom: T1 counts rows with v > 10 and gets 3; T2 inserts v = 15 and commits; T1 counts again and gets 4. PostgreSQL\'s REPEATABLE READ prevents this too (the SQL standard allows it).'),
        nodes: story('c', 'Phantom', [[0, tr('đếm = 3', 'count = 3')], [1, 'INSERT 15', 'warm'], [1, 'COMMIT'], [0, tr('đếm = 4', 'count = 4'), 'dead']], tr('READ COMMITTED: có · REPEATABLE READ: không', 'READ COMMITTED: yes · REPEATABLE READ: no'), false) },
      { say: tr('Bất thường tuần tự (write skew): hai bác sĩ trực; T1 và T2 cùng thấy "còn 2 người trực", mỗi bên tự xin nghỉ và commit: còn 0 người. REPEATABLE READ để lọt; SERIALIZABLE hủy một bên với lỗi 40001.', 'Serialization anomaly (write skew): two doctors are on call; T1 and T2 both see "2 on call", each takes themselves off and commits: 0 left. REPEATABLE READ lets it through; SERIALIZABLE aborts one with error 40001.'),
        nodes: story('d', tr('Bất thường tuần tự', 'Serialization anomaly'), [[0, tr('thấy 2 trực', 'sees 2 on call')], [1, tr('thấy 2 trực', 'sees 2 on call')], [0, tr('A nghỉ', 'A off'), 'warm'], [1, tr('B nghỉ', 'B off'), 'warm']], tr('REPEATABLE READ: còn 0 · SERIALIZABLE: lỗi 40001', 'REPEATABLE READ: 0 left · SERIALIZABLE: error 40001'), false) },
      { say: tr('Tóm tắt theo tài liệu Postgres: mức càng cao càng chặn nhiều bất thường. SERIALIZABLE chặn hết, đổi lại ứng dụng phải sẵn sàng chạy lại giao dịch bị hủy.', 'Summary from the PostgreSQL docs: each higher level prevents more anomalies. SERIALIZABLE prevents them all, at the price that the application must retry aborted transactions.'), nodes: table },
    ],
  };
});
