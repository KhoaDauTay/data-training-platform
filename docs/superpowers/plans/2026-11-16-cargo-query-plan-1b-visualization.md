# Cargo Query — Plan 1b: Trực quan hóa (EXPLAIN, luồng dữ liệu, thứ tự thực thi, biểu đồ, ERD, bản đồ)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm các tab trực quan vào panel dưới (Biểu đồ, Thứ tự thực thi, EXPLAIN, Luồng dữ liệu, Sơ đồ ER) và dải bản đồ tuyến 2D, đúng spec §6b.

**Architecture:** Dữ liệu trực quan được tính bằng hàm thuần trong `src/viz/*` (có unit test chạy PGlite thật trong Node) rồi vẽ bằng DOM/SVG trong `src/ui/*View.ts`. EXPLAIN và "thứ tự thực thi" chạy trong worker DB (cùng sandbox `BEGIN … ROLLBACK`). Thư viện nặng (Mermaid, parser `libpg-query`) chỉ tải khi mở tab cần.

**Tech Stack:** như Plan 1, thêm `libpg-query` 18.2.4 + `pgsql-deparser` 18.4.5 (parser/deparser Postgres, WASM), `mermaid` 12.3.0, `d3-geo` + `topojson-client` + `world-atlas`.

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §6b. **Tiền đề:** Plan 1 đã xong (Task 1–11).

## Global Constraints

- Mọi ràng buộc của Plan 1 vẫn áp dụng (PGlite 0.5.16 pin, ngày cố định, không `innerHTML` với dữ liệu, try/catch `localStorage`, `npx tsc --noEmit` ở mọi bước xác nhận PASS).
- Ngoại lệ `innerHTML` duy nhất: SVG do Mermaid sinh từ tên bảng/cột của chính schema game, với `securityLevel: 'strict'`.
- Pin chính xác: `libpg-query@18.2.4`, `pgsql-deparser@18.4.5`, `mermaid@12.3.0` (`--save-exact`).
- File `libpg-query.wasm` phải được import qua `?url` và nạp bằng `loadModule({ wasm })` — Vite không tự đóng gói nó (đã xác nhận bằng spike).
- Mọi animation tắt khi `prefers-reduced-motion: reduce`.
- Màu lấy từ CSS token (`var(--accent)`, `var(--land)`…), không hard-code ngoài `:root`.

## File Structure

```
src/db/run.ts          + runExplain(db, sql)
src/db/worker.ts       nhận { id, kind: 'run' | 'explain' | 'steps', sql }
src/db/client.ts       + explain(sql), steps(sql); request<T>(kind, sql, timeoutMs)
src/viz/plan.ts        flattenPlan, nodeExplanation, isHeavyScan — từ EXPLAIN JSON
src/viz/parser.ts      ensureParser(): nạp wasm libpg-query trong trình duyệt
src/viz/steps.ts       buildSteps, clauseRanges, runSteps — thứ tự thực thi logic
src/viz/chart.ts       chartSpec — chọn kiểu biểu đồ theo OID cột
src/viz/erd.ts         ER_COLUMNS_SQL, ER_CONSTRAINTS_SQL, erDefinition, tablesInQuery
src/viz/ports.ts       PORTS, laneUnlocked
src/ui/dom.ts          + svg() helper
src/ui/explainView.ts  tab EXPLAIN
src/ui/flowView.ts     tab Luồng dữ liệu
src/ui/stepsView.ts    tab Thứ tự thực thi
src/ui/chartView.ts    tab Biểu đồ
src/ui/erdView.ts      tab Sơ đồ ER (Mermaid, tải lười)
src/ui/mapView.ts      dải bản đồ tuyến
tests/plan.test.ts, steps.test.ts, chart.test.ts, erd.test.ts, ports.test.ts
```

---

### Task 1: EXPLAIN trong worker + mô hình cây plan

**Files:**
- Modify: `src/db/run.ts`, `src/db/worker.ts`, `src/db/client.ts`
- Create: `src/viz/plan.ts`
- Test: `tests/plan.test.ts`

**Interfaces:**
- Consumes: `runSandboxed`, `QueryResult` (Plan 1); `seededDb` (tests/helpers.ts)
- Produces:
  - `runExplain(db: PGlite, sql: string): Promise<unknown>` — JSON của `EXPLAIN (ANALYZE, FORMAT JSON)`
  - `DbClient.request<T>(kind: 'run' | 'explain' | 'steps', sql: string, timeoutMs?: number): Promise<T>`; `run(sql)`, `explain(sql): Promise<unknown>`, `steps(sql): Promise<StepsResult>` (`StepsResult` từ Task 3)
  - `interface PlanNode { id: number; depth: number; parent: number | null; type: string; label: string; relation?: string; rows: number; scanned: number; estRows: number; ms: number; detail: string[] }`
  - `flattenPlan(json: unknown): { nodes: PlanNode[]; executionMs: number }`
  - `nodeExplanation(type: string): string`, `isHeavyScan(n: PlanNode): boolean`

- [ ] **Step 1: Viết test**

`tests/plan.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { runExplain } from '../src/db/run';
import { flattenPlan, isHeavyScan, nodeExplanation } from '../src/viz/plan';
import { seededDb } from './helpers';

const TEU_BY_CARRIER = `SELECT ca.name, SUM(ct.teu) FROM containers ct
  JOIN shipments s ON s.id = ct.shipment_id JOIN carriers ca ON ca.id = s.carrier_id
  WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01' AND s.status <> 'CANCELLED' GROUP BY ca.name`;

describe('flattenPlan với EXPLAIN thật', () => {
  it('cây plan có node gốc, Seq Scan containers đọc 25.677 dòng', async () => {
    const db = await seededDb();
    const { nodes, executionMs } = flattenPlan(await runExplain(db, TEU_BY_CARRIER));
    expect(nodes[0].depth).toBe(0);
    expect(nodes[0].parent).toBeNull();
    expect(nodes[0].label).toMatch(/Aggregate/);
    const scan = nodes.find((n) => n.type === 'Seq Scan' && n.relation === 'containers')!;
    expect(scan.rows).toBe(25677);
    expect(isHeavyScan(scan)).toBe(true);
    expect(executionMs).toBeGreaterThan(0);
    expect(nodes.every((n) => n.parent === null || n.parent < n.id)).toBe(true);
  });

  it('EXPLAIN ANALYZE của DML bị rollback', async () => {
    const db = await seededDb();
    await runExplain(db, "UPDATE ports SET name = 'x'");
    expect((await db.query<{ n: number }>("SELECT count(*) AS n FROM ports WHERE name = 'x'")).rows[0].n).toBe(0);
  });
});

describe('nhãn và giải thích node', () => {
  it('Aggregate theo strategy, join type, alias, rows × loops, dòng bị lọc', () => {
    const { nodes } = flattenPlan([{
      'Execution Time': 1.5,
      Plan: {
        'Node Type': 'Aggregate', Strategy: 'Hashed', 'Actual Rows': 3, 'Actual Loops': 1, 'Plan Rows': 4, 'Actual Total Time': 1.2, 'Group Key': ['a.x'],
        Plans: [{
          'Node Type': 'Nested Loop', 'Join Type': 'Left', 'Actual Rows': 10, 'Actual Loops': 1, 'Plan Rows': 9, 'Actual Total Time': 1,
          Plans: [
            { 'Node Type': 'Seq Scan', 'Relation Name': 'shipments', Alias: 's', 'Actual Rows': 5, 'Actual Loops': 1, 'Rows Removed by Filter': 20000, Filter: "(status = 'X')", 'Plan Rows': 5, 'Actual Total Time': 0.5 },
            { 'Node Type': 'Index Scan', 'Relation Name': 'customers', Alias: 'customers', 'Index Name': 'customers_pkey', 'Actual Rows': 1, 'Actual Loops': 5, 'Plan Rows': 1, 'Actual Total Time': 0.01 },
          ],
        }],
      },
    }]);
    expect(nodes.map((n) => n.label)).toEqual(['HashAggregate', 'Nested Loop (Left)', 'Seq Scan shipments s', 'Index Scan customers']);
    expect(nodes.map((n) => n.depth)).toEqual([0, 1, 2, 2]);
    expect(nodes[3].rows).toBe(5);
    expect(nodes[2].scanned).toBe(20005);
    expect(isHeavyScan(nodes[2])).toBe(true);
    expect(nodes[2].detail).toContain("Lọc: (status = 'X') — bỏ 20000 dòng");
    expect(nodes[0].detail).toContain('Nhóm theo: a.x');
    expect(nodeExplanation('Hash Join')).toMatch(/băm/);
    expect(nodeExplanation('Something New')).toMatch(/kế hoạch/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/plan.test.ts`
Expected: FAIL — `runExplain` / `../src/viz/plan` không tồn tại.

- [ ] **Step 3: Thêm `runExplain` vào cuối `src/db/run.ts`**

```ts
/** EXPLAIN ANALYZE executes the statement, so it gets the same BEGIN … ROLLBACK sandbox. */
export async function runExplain(db: PGlite, sql: string): Promise<unknown> {
  await db.exec('BEGIN');
  try {
    const r = await db.query<unknown[]>(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, [], { rowMode: 'array' });
    return r.rows[0][0];
  } finally {
    await db.exec('ROLLBACK');
  }
}
```

- [ ] **Step 4: Viết `src/viz/plan.ts`**

```ts
export interface PlanNode {
  id: number;
  depth: number;
  parent: number | null;
  type: string;
  label: string;
  relation?: string;
  /** Actual rows × loops: rows this node handed to its parent. */
  rows: number;
  /** rows + rows removed by filter: rows the node actually looked at. */
  scanned: number;
  estRows: number;
  ms: number;
  detail: string[];
}

interface RawNode {
  'Node Type': string;
  Strategy?: string;
  'Join Type'?: string;
  'Relation Name'?: string;
  Alias?: string;
  'Index Name'?: string;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Plan Rows'?: number;
  'Actual Total Time'?: number;
  Filter?: string;
  'Rows Removed by Filter'?: number;
  'Hash Cond'?: string;
  'Index Cond'?: string;
  'Join Filter'?: string;
  'Sort Key'?: string[];
  'Group Key'?: string[];
  Plans?: RawNode[];
}

const AGG: Record<string, string> = { Hashed: 'HashAggregate', Sorted: 'GroupAggregate', Mixed: 'MixedAggregate' };

function label(n: RawNode): string {
  const base = n['Node Type'] === 'Aggregate' ? (AGG[n.Strategy ?? ''] ?? 'Aggregate') : n['Node Type'];
  const join = n['Join Type'] && n['Join Type'] !== 'Inner' ? ` (${n['Join Type']})` : '';
  const rel = n['Relation Name'];
  const alias = n.Alias && n.Alias !== rel ? ` ${n.Alias}` : '';
  return `${base}${join}${rel ? ` ${rel}${alias}` : ''}`;
}

function detail(n: RawNode): string[] {
  const out: string[] = [];
  if (n['Index Name']) out.push(`Index: ${n['Index Name']}`);
  if (n['Index Cond']) out.push(`Điều kiện index: ${n['Index Cond']}`);
  if (n['Hash Cond']) out.push(`Điều kiện ghép: ${n['Hash Cond']}`);
  if (n['Join Filter']) out.push(`Lọc khi ghép: ${n['Join Filter']}`);
  if (n.Filter) out.push(`Lọc: ${n.Filter}${n['Rows Removed by Filter'] ? ` — bỏ ${n['Rows Removed by Filter']} dòng` : ''}`);
  if (n['Group Key']) out.push(`Nhóm theo: ${n['Group Key'].join(', ')}`);
  if (n['Sort Key']) out.push(`Sắp theo: ${n['Sort Key'].join(', ')}`);
  return out;
}

export function flattenPlan(json: unknown): { nodes: PlanNode[]; executionMs: number } {
  const root = (json as { Plan: RawNode; 'Execution Time'?: number }[])[0];
  const nodes: PlanNode[] = [];
  const walk = (n: RawNode, depth: number, parent: number | null) => {
    const id = nodes.length;
    const rows = (n['Actual Rows'] ?? 0) * (n['Actual Loops'] ?? 1);
    nodes.push({
      id, depth, parent,
      type: n['Node Type'],
      label: label(n),
      relation: n['Relation Name'],
      rows,
      scanned: rows + (n['Rows Removed by Filter'] ?? 0) * (n['Actual Loops'] ?? 1),
      estRows: n['Plan Rows'] ?? 0,
      ms: n['Actual Total Time'] ?? 0,
      detail: detail(n),
    });
    for (const child of n.Plans ?? []) walk(child, depth + 1, id);
  };
  walk(root.Plan, 0, null);
  return { nodes, executionMs: root['Execution Time'] ?? 0 };
}

const NODE_VI: Record<string, string> = {
  'Seq Scan': 'Đọc toàn bộ bảng từ đầu đến cuối và kiểm tra từng dòng. Chậm khi bảng lớn mà chỉ cần ít dòng.',
  'Index Scan': 'Dùng index để nhảy thẳng tới các dòng cần, rồi đọc các dòng đó trong bảng.',
  'Index Only Scan': 'Lấy dữ liệu ngay trong index, không cần đọc bảng.',
  'Bitmap Index Scan': 'Dùng index để đánh dấu các trang dữ liệu có dòng phù hợp.',
  'Bitmap Heap Scan': 'Đọc các trang bảng đã được đánh dấu bởi Bitmap Index Scan.',
  'Hash Join': 'Dựng bảng băm từ một phía (node Hash) rồi dò từng dòng của phía còn lại vào bảng băm.',
  Hash: 'Xây bảng băm trong bộ nhớ từ các dòng bên dưới để Hash Join dò tìm.',
  'Nested Loop': 'Với mỗi dòng phía ngoài, tìm các dòng khớp phía trong. Nhanh khi phía ngoài có ít dòng.',
  'Merge Join': 'Ghép hai đầu vào đã được sắp xếp theo khóa join, đi song song từ trên xuống.',
  Sort: 'Sắp xếp các dòng (cho ORDER BY, hoặc chuẩn bị cho Merge Join / GroupAggregate).',
  'Incremental Sort': 'Sắp xếp tiếp phần còn thiếu trên dữ liệu đã được sắp theo một phần khóa.',
  Aggregate: 'Gộp nhiều dòng thành giá trị tổng hợp (COUNT, SUM, AVG…), theo nhóm nếu có GROUP BY.',
  Limit: 'Dừng ngay khi đã đủ số dòng của LIMIT.',
  Unique: 'Bỏ các dòng trùng nhau liền kề (DISTINCT trên dữ liệu đã sắp xếp).',
  Materialize: 'Lưu tạm kết quả bên dưới để đọc lại nhiều lần.',
  Memoize: 'Ghi nhớ kết quả theo khóa để không tính lại cho cùng giá trị.',
  'Subquery Scan': 'Đọc kết quả của một truy vấn con như một bảng.',
  'CTE Scan': 'Đọc kết quả của một mệnh đề WITH.',
  WindowAgg: 'Tính hàm cửa sổ (RANK, LAG, SUM OVER…) trên từng dòng mà không gộp dòng.',
  Append: 'Nối kết quả của nhiều nhánh (UNION ALL, bảng phân vùng).',
  SetOp: 'Thực hiện INTERSECT / EXCEPT.',
  Result: 'Tính biểu thức không cần đọc bảng.',
  Gather: 'Gom kết quả từ các tiến trình chạy song song.',
};

export function nodeExplanation(type: string): string {
  return NODE_VI[type] ?? 'Một bước trong kế hoạch thực thi của Postgres.';
}

export function isHeavyScan(n: PlanNode): boolean {
  return n.type === 'Seq Scan' && n.scanned >= 10_000;
}
```

- [ ] **Step 5: Mở rộng worker và client cho nhiều loại request**

Thay toàn bộ `src/db/worker.ts`:
```ts
import { PGlite } from '@electric-sql/pglite';
import { initDb } from './init';
import { runExplain, runSandboxed } from './run';

type Kind = 'run' | 'explain' | 'steps';

const ready = (async () => {
  const db = new PGlite();
  await initDb(db);
  return db;
})();

ready.then(
  () => postMessage({ type: 'ready' }),
  (e: unknown) => postMessage({ type: 'initError', message: e instanceof Error ? e.message : String(e) }),
);

async function handle(db: PGlite, kind: Kind, sql: string): Promise<unknown> {
  if (kind === 'explain') return runExplain(db, sql);
  if (kind === 'steps') {
    const { runSteps } = await import('../viz/steps'); // loads the parser only when this tab is used
    return runSteps(db, sql);
  }
  return runSandboxed(db, sql);
}

// One request at a time: BEGIN … ROLLBACK pairs must never interleave.
let queue: Promise<void> = Promise.resolve();

onmessage = (e: MessageEvent<{ id: number; kind: Kind; sql: string }>) => {
  const { id, kind, sql } = e.data;
  queue = queue.then(async () => {
    try {
      postMessage({ type: 'result', id, result: await handle(await ready, kind, sql) });
    } catch (err) {
      postMessage({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
    }
  });
};
```

Trong `src/db/client.ts`:
1. Đổi kiểu message `result` thành `result: unknown`:
```ts
  | { type: 'result'; id: number; result: unknown }
```
2. Đổi `Pending.resolve` thành `resolve: (r: unknown) => void;`
3. Thay hàm `run` bằng:
```ts
  async request<T>(kind: 'run' | 'explain' | 'steps', sql: string, timeoutMs = this.timeoutMs): Promise<T> {
    await this.ready;
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.restart();
        reject(new QueryTimeoutError(`Query chạy quá ${timeoutMs / 1000} giây nên đã bị dừng. Database đang được nạp lại.`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (r) => { clearTimeout(timer); resolve(r as T); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.worker.postMessage({ id, kind, sql });
    });
  }

  run(sql: string): Promise<QueryResult> {
    return this.request<QueryResult>('run', sql);
  }

  explain(sql: string): Promise<unknown> {
    return this.request<unknown>('explain', sql);
  }

  /** Several sub-queries per call, so it gets a longer budget. */
  steps(sql: string): Promise<import('../viz/steps').StepsResult> {
    return this.request('steps', sql, this.timeoutMs * 3);
  }
```

`steps` tham chiếu `src/viz/steps.ts` (Task 3). Cho tới Task 3, tạo tạm file đó với đúng một dòng để typecheck qua:
```ts
export type StepsResult = { ok: false; reason: string };
export async function runSteps(): Promise<StepsResult> { return { ok: false, reason: 'Chưa hỗ trợ.' }; }
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/plan.test.ts && npx tsc --noEmit`
Expected: PASS, không lỗi kiểu.

- [ ] **Step 7: Commit**

```bash
git add src/db src/viz tests/plan.test.ts
git commit -m "feat: EXPLAIN ANALYZE in worker and plan tree model"
```

---

### Task 2: Tab EXPLAIN và tab Luồng dữ liệu

**Files:**
- Modify: `src/ui/dom.ts`, `src/main.ts`, `src/style.css`
- Create: `src/ui/explainView.ts`, `src/ui/flowView.ts`

**Interfaces:**
- Consumes: `flattenPlan`, `nodeExplanation`, `isHeavyScan`, `PlanNode` (Task 1); `DbClient.explain` (Task 1); `Tab`, `createPanel` (Plan 1)
- Produces:
  - `svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Record<string, string | number>, ...children: (Node | string)[]): SVGElementTagNameMap[K]`
  - `reducedMotion(): boolean`
  - `renderExplain(host: HTMLElement, plan: { nodes: PlanNode[]; executionMs: number }): void`
  - `renderFlow(host: HTMLElement, plan: { nodes: PlanNode[]; executionMs: number }): void`
  - trong `main.ts`: `planFor(sql: string): Promise<{ nodes: PlanNode[]; executionMs: number }>` (cache theo SQL), `currentSql(): string`

Giao diện kiểm thủ công; dữ liệu đã có test ở Task 1.

- [ ] **Step 1: Thêm `svg()` và `reducedMotion()` vào cuối `src/ui/dom.ts`**

```ts
const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  ...children: (Node | string)[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...children);
  return el;
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const fmt = (n: number) => n.toLocaleString('vi-VN');
```

- [ ] **Step 2: Viết `src/ui/explainView.ts`**

```ts
import { isHeavyScan, nodeExplanation, type PlanNode } from '../viz/plan';
import { fmt, h } from './dom';

export function renderExplain(host: HTMLElement, plan: { nodes: PlanNode[]; executionMs: number }): void {
  const max = Math.max(1, ...plan.nodes.map((n) => n.scanned));
  host.append(
    h('p', { class: 'muted' },
      `Giai đoạn Optimize chọn kế hoạch dưới đây; Execute chạy hết trong ${plan.executionMs.toFixed(1)} ms. `,
      'Thanh xanh = số dòng node xử lý. Bấm vào một node để đọc giải thích.'),
    h('div', { class: 'plan' }, ...plan.nodes.map((n) =>
      h('details', { class: `plan-node${isHeavyScan(n) ? ' heavy' : ''}`, style: `margin-left:${n.depth * 20}px` },
        h('summary', {},
          h('span', { class: 'plan-label' }, n.label),
          h('span', { class: 'meter', 'aria-hidden': 'true' }, h('i', { style: `width:${Math.max(2, (n.scanned / max) * 100)}%` })),
          h('span', { class: 'plan-rows' }, `${fmt(n.rows)} dòng`),
          h('span', { class: 'muted' }, `${n.ms.toFixed(2)} ms`),
          isHeavyScan(n) ? h('span', { class: 'warn', title: 'Đọc nhiều dòng' }, '⚠') : null),
        h('p', {}, nodeExplanation(n.type)),
        n.estRows !== n.rows ? h('p', { class: 'muted' }, `Ước tính ${fmt(n.estRows)} dòng, thực tế ${fmt(n.rows)}.`) : null,
        ...n.detail.map((d) => h('p', {}, h('code', {}, d)))))),
  );
}
```

- [ ] **Step 3: Viết `src/ui/flowView.ts`**

```ts
import type { PlanNode } from '../viz/plan';
import { fmt, h, reducedMotion, svg } from './dom';

const COL = 210;
const ROW = 64;
const BOX_W = 168;
const BOX_H = 40;

/** Leaves on the left, root on the right; edge width grows with log(rows). */
export function renderFlow(host: HTMLElement, plan: { nodes: PlanNode[]; executionMs: number }): void {
  const { nodes } = plan;
  const children = (id: number) => nodes.filter((n) => n.parent === id);
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  const maxRows = Math.max(1, ...nodes.map((n) => n.rows));
  const y = new Map<number, number>();
  let leaf = 0;
  const place = (n: PlanNode): number => {
    const kids = children(n.id);
    const pos = kids.length === 0 ? leaf++ * ROW : kids.map(place).reduce((a, b) => a + b, 0) / kids.length;
    y.set(n.id, pos);
    return pos;
  };
  place(nodes[0]);
  const x = (n: PlanNode) => (maxDepth - n.depth) * COL;
  const width = (maxDepth + 1) * COL;
  const height = Math.max(1, leaf) * ROW;
  const animate = !reducedMotion();

  const root = svg('svg', { viewBox: `-10 -10 ${width} ${height + 10}`, role: 'img', 'aria-label': 'Luồng dữ liệu qua kế hoạch thực thi', class: 'flow' });
  for (const n of nodes.slice(1)) {
    const p = nodes[n.parent!];
    const x1 = x(n) + BOX_W;
    const y1 = y.get(n.id)! + BOX_H / 2;
    const x2 = x(p);
    const y2 = y.get(p.id)! + BOX_H / 2;
    const d = `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
    const w = 1.5 + (8 * Math.log10(n.rows + 1)) / Math.log10(maxRows + 1);
    root.append(svg('path', { d, class: 'flow-edge', 'stroke-width': w.toFixed(1) }));
    if (animate && n.rows > 0) {
      root.append(svg('circle', { r: 4, class: 'flow-dot' },
        svg('animateMotion', { dur: '1.6s', repeatCount: 'indefinite', path: d, begin: `${(n.id % 4) * 0.4}s` })));
    }
  }
  for (const n of nodes) {
    const label = n.label.length > 24 ? `${n.label.slice(0, 23)}…` : n.label;
    root.append(svg('g', { transform: `translate(${x(n)},${y.get(n.id)})` },
      svg('title', {}, `${n.label}: ${fmt(n.rows)} dòng`),
      svg('rect', { width: BOX_W, height: BOX_H, rx: 6, class: 'flow-box' }),
      svg('text', { x: 8, y: 16, class: 'flow-label' }, label),
      svg('text', { x: 8, y: 32, class: 'flow-rows' }, `${fmt(n.rows)} dòng`)));
  }
  host.append(
    h('p', { class: 'muted' }, 'Dữ liệu chảy từ trái (đọc bảng) sang phải (kết quả). Đường càng dày càng nhiều dòng — số liệu thật từ EXPLAIN ANALYZE.'),
    h('div', { class: 'flow-wrap' }, root),
  );
}
```

- [ ] **Step 4: Gắn vào `src/main.ts`**

1. Thêm import (sau dòng `import { renderResult } from './ui/resultTable';`):
```ts
import { renderExplain } from './ui/explainView';
import { renderFlow } from './ui/flowView';
import { flattenPlan, type PlanNode } from './viz/plan';
```
2. Thêm sau dòng `let lastRun: …;`:
```ts
const planCache = new Map<string, Promise<{ nodes: PlanNode[]; executionMs: number }>>();
const currentSql = () => (editor?.getValue() ?? '').trim();
function planFor(sql: string): Promise<{ nodes: PlanNode[]; executionMs: number }> {
  let p = planCache.get(sql);
  if (!p) {
    p = db.explain(sql).then(flattenPlan);
    p.catch(() => planCache.delete(sql));
    planCache.set(sql, p);
  }
  return p;
}
async function withPlan(host: HTMLElement, draw: (host: HTMLElement, plan: { nodes: PlanNode[]; executionMs: number }) => void): Promise<void> {
  const sql = currentSql();
  if (!sql) return void host.append(h('p', { class: 'muted' }, 'Viết query trong editor trước.'));
  host.append(h('p', { class: 'muted' }, 'Đang chạy EXPLAIN ANALYZE…'));
  try {
    const plan = await planFor(sql);
    host.replaceChildren();
    draw(host, plan);
  } catch (e) {
    host.replaceChildren(h('pre', { class: 'error' }, errorMessage(e)));
  }
}
```
3. Trong `buildTabs()`, thêm hai tab ngay trước tab `columns`:
```ts
    { id: 'explain', label: 'EXPLAIN', render: (host) => withPlan(host, renderExplain) },
    { id: 'flow', label: 'Luồng dữ liệu', render: (host) => withPlan(host, renderFlow) },
```
4. Trong `renderTicket()`, thêm nút EXPLAIN — thay dòng:
```ts
    h('div', { class: 'actions' }, runBtn, isDone ? null : submitBtn),
```
bằng:
```ts
    h('div', { class: 'actions' }, runBtn, h('button', { type: 'button', onclick: () => panel.show('explain') }, 'EXPLAIN'), isDone ? null : submitBtn),
```

- [ ] **Step 5: Thêm CSS vào cuối `src/style.css`**

```css
.plan-node { border: 1px solid var(--border); border-radius: 6px; margin: 4px 0; padding: 4px 8px; background: var(--code); }
.plan-node summary { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; cursor: pointer; }
.plan-node.heavy { border-color: var(--warn); }
.plan-label { font-weight: 600; min-width: 200px; }
.plan-rows { min-width: 90px; }
.meter { flex: 1; min-width: 80px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.meter i { display: block; height: 100%; background: var(--accent); }
.warn { color: var(--warn); }
.flow-wrap { overflow: auto; }
.flow { min-width: 480px; width: 100%; height: auto; }
.flow-edge { fill: none; stroke: var(--accent); opacity: 0.45; }
.flow-dot { fill: var(--accent); }
.flow-box { fill: var(--panel); stroke: var(--border); }
.flow-label { font: 600 12px system-ui, sans-serif; fill: var(--text); }
.flow-rows { font: 12px system-ui, sans-serif; fill: var(--accent); }
```

- [ ] **Step 6: Kiểm tra kiểu, build và kiểm thủ công**

Run: `npx tsc --noEmit && npm run build`, rồi `npm run dev`.
Kiểm: mở `ch3-02` (hoặc gõ query TEU theo hãng tàu ở Task 1 test) → bấm **EXPLAIN** → tab EXPLAIN hiện cây có thụt lề, node `Seq Scan containers` có ⚠ và 25.677 dòng; bấm node → giải thích tiếng Việt. Sang tab **Luồng dữ liệu** → sơ đồ trái→phải, đường dày ở các scan lớn, chấm chạy dọc cạnh. Bật "Reduce motion" trong hệ điều hành → chấm không chạy. Query lỗi cú pháp → tab hiện lỗi Postgres.

- [ ] **Step 7: Commit**

```bash
git add src/ui src/main.ts src/style.css
git commit -m "feat: EXPLAIN tree and data-flow tabs"
```

---

### Task 3: Thứ tự thực thi logic — dựng các bước

**Files:**
- Create: `src/viz/parser.ts`; thay file tạm `src/viz/steps.ts`
- Test: `tests/steps.test.ts`

**Interfaces:**
- Consumes: `runSandboxed`, `QueryResult` (Plan 1); `seededDb` (tests)
- Produces:
  - `type StepKey = 'from' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit'`
  - `STEP_LABELS: Record<StepKey, string>`, `STEP_HELP: Record<StepKey, string>`
  - `ensureParser(): Promise<void>`
  - `buildSteps(sql: string): Promise<{ ok: true; steps: { key: StepKey; sql: string | null }[]; ranges: Partial<Record<StepKey, [number, number]>> } | { ok: false; reason: string }>`
  - `interface StepRun { key: StepKey; skipped: boolean; count?: number; sample?: QueryResult; sql?: string; error?: string }`
  - `type StepsResult = { ok: true; steps: StepRun[]; ranges: Partial<Record<StepKey, [number, number]>> } | { ok: false; reason: string }`
  - `runSteps(db: PGlite, sql: string): Promise<StepsResult>`

- [ ] **Step 1: Cài parser**

Run: `npm i --save-exact libpg-query@18.2.4 pgsql-deparser@18.4.5`

- [ ] **Step 2: Viết test**

`tests/steps.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildSteps, runSteps } from '../src/viz/steps';
import { seededDb } from './helpers';

const Q = `SELECT ca.name, SUM(ct.teu) AS teu
FROM containers ct
JOIN shipments s ON s.id = ct.shipment_id
JOIN carriers ca ON ca.id = s.carrier_id
WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01' AND s.status <> 'CANCELLED'
GROUP BY ca.name
HAVING SUM(ct.teu) > 900
ORDER BY teu DESC
LIMIT 3`;

describe('runSteps', () => {
  it('số dòng thật qua từng bước (đã đối chiếu bằng spike)', async () => {
    const r = await runSteps(await seededDb(), Q);
    if (!r.ok) throw new Error(r.reason);
    expect(r.steps.map((s) => [s.key, s.skipped ? 'skip' : s.count])).toEqual([
      ['from', 25677], ['where', 3167], ['group', 6], ['having', 5], ['select', 5], ['distinct', 'skip'], ['order', 5], ['limit', 3],
    ]);
    expect(r.steps[1].sample!.rows.length).toBe(5);
  });

  it('vị trí mệnh đề trong SQL gốc', async () => {
    const r = await buildSteps(Q);
    if (!r.ok) throw new Error(r.reason);
    const text = (k: keyof typeof r.ranges) => Q.slice(...r.ranges[k]!).trim();
    expect(text('where')).toMatch(/^WHERE s\.etd/);
    expect(text('from')).toMatch(/^FROM containers ct\s+JOIN shipments/);
    expect(text('group')).toBe('GROUP BY ca.name');
    expect(text('limit')).toBe('LIMIT 3');
  });

  it('chữ FROM trong chuỗi và trong truy vấn con không bị nhầm là mệnh đề', async () => {
    const head = "SELECT (SELECT max(p.name) FROM ports p WHERE p.code = s.pod), 'from' ";
    const r = await buildSteps(`${head}FROM shipments s WHERE status = 'from'`);
    if (!r.ok) throw new Error(r.reason);
    expect(r.ranges.from![0]).toBe(head.length);
  });

  it('GROUP BY số thứ tự và alias được quy về biểu thức', async () => {
    const db = await seededDb();
    for (const q of ['SELECT mode, count(*) FROM shipments GROUP BY 1', 'SELECT mode AS m, count(*) FROM shipments GROUP BY m']) {
      const r = await runSteps(db, q);
      if (!r.ok) throw new Error(r.reason);
      expect(r.steps.find((s) => s.key === 'group')!.count, q).toBe(2);
    }
  });

  it('không có FROM, không có GROUP BY', async () => {
    const r = await runSteps(await seededDb(), 'SELECT count(*) FROM ports');
    if (!r.ok) throw new Error(r.reason);
    expect(r.steps.filter((s) => !s.skipped).map((s) => s.key)).toEqual(['from', 'select']);
    const one = await runSteps(await seededDb(), 'SELECT 1');
    if (!one.ok) throw new Error(one.reason);
    expect(one.steps.filter((s) => !s.skipped).map((s) => s.key)).toEqual(['select']);
  });

  it('báo chưa hỗ trợ / lỗi cú pháp thay vì throw', async () => {
    for (const q of ['WITH x AS (SELECT 1) SELECT * FROM x', 'SELECT 1 UNION SELECT 2', 'SELECT id, rank() OVER (ORDER BY id) FROM ports', 'SELEC 1', "UPDATE ports SET name = 'x'"]) {
      expect((await buildSteps(q)).ok, q).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/steps.test.ts`
Expected: FAIL — `buildSteps` chưa tồn tại (file tạm chỉ có `runSteps` trả "Chưa hỗ trợ").

- [ ] **Step 4: Viết `src/viz/parser.ts`**

```ts
import { loadModule } from 'libpg-query';

let ready: Promise<void> | undefined;

/**
 * Node (tests) loads libpg-query.wasm from node_modules by itself. In the browser Vite does
 * not bundle that file, so it is imported as a URL and handed to loadModule (verified by spike).
 */
export function ensureParser(): Promise<void> {
  ready ??= (async () => {
    // No @types/node in this project: read process through globalThis.
    const isNode = !!(globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node;
    if (isNode) return;
    const { default: url } = await import('libpg-query/wasm/libpg-query.wasm?url');
    await loadModule({ wasm: await (await fetch(url)).arrayBuffer() });
  })();
  return ready;
}
```

- [ ] **Step 5: Viết `src/viz/steps.ts` (thay file tạm)**

```ts
import type { PGlite } from '@electric-sql/pglite';
import { parse, scan } from 'libpg-query';
import { deparse } from 'pgsql-deparser';
import { runSandboxed, type QueryResult } from '../db/run';
import { ensureParser } from './parser';

export type StepKey = 'from' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit';

export const STEP_LABELS: Record<StepKey, string> = {
  from: 'FROM + JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING',
  select: 'SELECT', distinct: 'DISTINCT', order: 'ORDER BY', limit: 'LIMIT',
};

export const STEP_HELP: Record<StepKey, string> = {
  from: 'Lấy dữ liệu từ các bảng và ghép chúng theo điều kiện JOIN. Đây là bước chạy đầu tiên.',
  where: 'Giữ lại từng dòng thỏa điều kiện. Chạy trước khi gom nhóm nên chưa dùng được hàm gộp hay alias của SELECT.',
  group: 'Gom các dòng có cùng giá trị khóa thành một nhóm (cột so_dong = số dòng trong nhóm).',
  having: 'Lọc các nhóm theo kết quả hàm gộp, ví dụ SUM(...) > 900.',
  select: 'Tính các cột đầu ra và đặt alias. Viết đầu tiên nhưng chạy sau GROUP BY / HAVING.',
  distinct: 'Bỏ các dòng trùng nhau trong kết quả.',
  order: 'Sắp xếp kết quả. Chạy sau SELECT nên dùng được alias.',
  limit: 'Chỉ giữ số dòng đầu tiên theo LIMIT / OFFSET. Chạy cuối cùng.',
};

export interface StepRun { key: StepKey; skipped: boolean; count?: number; sample?: QueryResult; sql?: string; error?: string }
type Ranges = Partial<Record<StepKey, [number, number]>>;
export type StepsResult = { ok: true; steps: StepRun[]; ranges: Ranges } | { ok: false; reason: string };
type Built = { ok: true; steps: { key: StepKey; sql: string | null }[]; ranges: Ranges } | { ok: false; reason: string };

// libpg-query's AST is a large tagged union; these helpers only touch a few well-known fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ast = any;

const STAR = [{ ResTarget: { val: { ColumnRef: { fields: [{ A_Star: {} }] } } } }];
const COUNT = { ResTarget: { name: 'so_dong', val: { FuncCall: { funcname: [{ String: { sval: 'count' } }], agg_star: true } } } };

// ponytail: an unqualified GROUP BY name that matches both an input column and a SELECT alias
// resolves to the column in Postgres, but to the alias here. Rare in tickets; fix if a player hits it.
function groupKeys(sel: Ast): Ast[] {
  const targets: Ast[] = sel.targetList ?? [];
  return (sel.groupClause ?? []).map((g: Ast) => {
    const ordinal = g.A_Const?.ival?.ival;
    if (typeof ordinal === 'number') return targets[ordinal - 1]?.ResTarget?.val ?? g;
    const fields = g.ColumnRef?.fields;
    if (fields?.length === 1 && fields[0].String) {
      const t = targets.find((x) => x.ResTarget?.name === fields[0].String.sval);
      if (t) return t.ResTarget.val;
    }
    return g;
  });
}

const CLAUSE: Record<string, StepKey> = {
  SELECT: 'select', FROM: 'from', WHERE: 'where', GROUP: 'group', HAVING: 'having', ORDER: 'order', LIMIT: 'limit', OFFSET: 'limit',
};

/** Top-level clause spans in the player's own text, using Postgres' scanner (strings and parentheses are safe). */
export async function clauseRanges(sql: string): Promise<Ranges> {
  const { tokens } = (await scan(sql)) as { tokens: { text: string; start: number; end: number; keywordName: string }[] };
  let depth = 0;
  const starts: { key: StepKey; start: number }[] = [];
  const ranges: Ranges = {};
  for (const t of tokens) {
    if (t.text === '(') depth++;
    else if (t.text === ')') depth--;
    else if (depth === 0 && t.keywordName === 'RESERVED_KEYWORD') {
      const word = t.text.toUpperCase();
      const key = CLAUSE[word];
      if (key && !(key === 'limit' && starts.at(-1)?.key === 'limit')) starts.push({ key, start: t.start });
      if (word === 'DISTINCT' && starts.at(-1)?.key === 'select') ranges.distinct = [t.start, t.end];
    }
  }
  starts.forEach((s, i) => {
    ranges[s.key] = [s.start, i + 1 < starts.length ? starts[i + 1].start : sql.trimEnd().replace(/;$/, '').length];
  });
  return ranges;
}

export async function buildSteps(sql: string): Promise<Built> {
  await ensureParser();
  let tree: Ast;
  try {
    tree = await parse(sql);
  } catch (e) {
    return { ok: false, reason: `Câu SQL chưa đúng cú pháp: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (tree.stmts?.length !== 1) return { ok: false, reason: 'Chỉ hỗ trợ đúng một câu lệnh.' };
  const sel: Ast = tree.stmts[0].stmt?.SelectStmt;
  if (!sel) return { ok: false, reason: 'Chỉ hỗ trợ câu SELECT.' };
  if (sel.withClause || (sel.op && sel.op !== 'SETOP_NONE')) return { ok: false, reason: 'Query có WITH hoặc UNION — xem tab EXPLAIN.' };
  if (JSON.stringify(sel.targetList ?? []).includes('"over"')) return { ok: false, reason: 'Query có window function — xem tab EXPLAIN.' };

  const wrap = async (o: Ast) =>
    deparse({ version: tree.version, stmts: [{ stmt: { SelectStmt: { limitOption: 'LIMIT_OPTION_DEFAULT', op: 'SETOP_NONE', ...o } } }] });
  const base = { fromClause: sel.fromClause, whereClause: sel.whereClause };
  const groupTargets = [...groupKeys(sel).map((val) => ({ ResTarget: { val } })), COUNT];
  const noTail = { limitCount: undefined, limitOffset: undefined };
  const plan: [StepKey, boolean, Ast][] = [
    ['from', !!sel.fromClause, { targetList: STAR, fromClause: sel.fromClause }],
    ['where', !!sel.fromClause && !!sel.whereClause, { targetList: STAR, ...base }],
    ['group', !!sel.groupClause, { targetList: groupTargets, ...base, groupClause: sel.groupClause }],
    ['having', !!sel.havingClause, { targetList: groupTargets, ...base, groupClause: sel.groupClause, havingClause: sel.havingClause }],
    ['select', true, { ...sel, distinctClause: undefined, sortClause: undefined, ...noTail }],
    ['distinct', !!sel.distinctClause, { ...sel, sortClause: undefined, ...noTail }],
    ['order', !!sel.sortClause, { ...sel, ...noTail }],
    ['limit', !!(sel.limitCount || sel.limitOffset), sel],
  ];
  const steps: { key: StepKey; sql: string | null }[] = [];
  for (const [key, present, o] of plan) {
    if (key === 'from' && !sel.fromClause) continue; // SELECT 1: no FROM/WHERE steps at all
    if (key === 'where' && !sel.fromClause) continue;
    steps.push({ key, sql: present ? String(await wrap(o)) : null });
  }
  return { ok: true, steps, ranges: await clauseRanges(sql) };
}

export async function runSteps(db: PGlite, sql: string): Promise<StepsResult> {
  const built = await buildSteps(sql);
  if (!built.ok) return built;
  const steps: StepRun[] = [];
  for (const s of built.steps) {
    if (!s.sql) {
      steps.push({ key: s.key, skipped: true });
      continue;
    }
    try {
      const count = await runSandboxed(db, `SELECT count(*) FROM (${s.sql}) AS t`);
      const sample = await runSandboxed(db, `SELECT * FROM (${s.sql}) AS t LIMIT 5`);
      steps.push({ key: s.key, skipped: false, count: Number(count.rows[0][0]), sample, sql: s.sql });
    } catch (e) {
      steps.push({ key: s.key, skipped: false, sql: s.sql, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: true, steps, ranges: built.ranges };
}
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/steps.test.ts && npx tsc --noEmit`
Expected: PASS. Nếu test "GROUP BY số thứ tự" fail, in `JSON.stringify(parse('SELECT 1 GROUP BY 1'))` để xem dạng `A_Const` của bản libpg-query đang cài và sửa `groupKeys` cho khớp.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/viz tests/steps.test.ts
git commit -m "feat: logical query order steps via Postgres parser"
```

---

### Task 4: Tab Thứ tự thực thi

**Files:**
- Create: `src/ui/stepsView.ts`
- Modify: `src/main.ts`, `src/style.css`

**Interfaces:**
- Consumes: `StepsResult`, `STEP_LABELS`, `STEP_HELP`, `StepKey` (Task 3); `DbClient.steps` (Task 1); `renderResult` (Plan 1); `fmt`, `h` (Task 2)
- Produces: `renderSteps(host: HTMLElement, sql: string, result: StepsResult, goExplain: () => void): void`

- [ ] **Step 1: Viết `src/ui/stepsView.ts`**

```ts
import { STEP_HELP, STEP_LABELS, type StepKey, type StepsResult } from '../viz/steps';
import { fmt, h } from './dom';
import { renderResult } from './resultTable';

const STAGES = ['1 · Parse', '2 · Transform', '3 · Optimize', '4 · Execute'];

export function renderSteps(host: HTMLElement, sql: string, result: StepsResult, goExplain: () => void): void {
  const stages = h('div', { class: 'stages' }, ...STAGES.map((s, i) =>
    i === 2
      ? h('button', { type: 'button', class: 'stage', onclick: goExplain, title: 'Xem kế hoạch Postgres đã chọn' }, `${s} → EXPLAIN`)
      : h('span', { class: `stage${i === 3 ? ' on' : ''}` }, s)));
  if (!result.ok) {
    host.append(stages, h('p', { class: 'muted' }, result.reason));
    return;
  }
  const { steps, ranges } = result;
  const live = steps.filter((s) => !s.skipped && s.error === undefined);
  let current = steps.indexOf(live[1] ?? live[0] ?? steps[0]);
  let timer: number | undefined;

  const pipe = h('div', { class: 'pipe', role: 'tablist', 'aria-label': 'Các bước thực thi' });
  const detail = h('div', { class: 'step-detail' });
  const playBtn = h('button', { type: 'button' }, '▶ Phát');

  const prevCount = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (steps[j].count !== undefined) return steps[j].count!;
    return undefined;
  };

  function highlighted(key: StepKey): HTMLElement {
    const r = ranges[key];
    if (!r) return h('pre', { class: 'sql' }, sql);
    return h('pre', { class: 'sql' },
      h('span', { class: 'dim' }, sql.slice(0, r[0])), h('mark', {}, sql.slice(r[0], r[1])), h('span', { class: 'dim' }, sql.slice(r[1])));
  }

  function draw(): void {
    pipe.replaceChildren(...steps.flatMap((s, i) => [
      i ? h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→') : null,
      h('button', {
        type: 'button', role: 'tab',
        class: `st${i === current ? ' on' : ''}${s.skipped ? ' skip' : ''}${s.error ? ' err' : ''}`,
        'aria-selected': i === current ? 'true' : 'false',
        onclick: () => { stop(); current = i; draw(); },
      },
        h('b', {}, STEP_LABELS[s.key]),
        s.skipped ? h('span', { class: 'muted' }, 'không dùng')
          : s.error ? h('span', {}, 'lỗi')
          : h('span', {}, h('span', { class: 'n' }, fmt(s.count!)), ` ${s.key === 'group' || s.key === 'having' ? 'nhóm' : 'dòng'}`)),
    ].filter((x): x is HTMLElement => x !== null)));

    const s = steps[current];
    const before = prevCount(current);
    detail.replaceChildren(
      h('h3', {}, `Bước ${current + 1} · ${STEP_LABELS[s.key]}`),
      h('p', {}, STEP_HELP[s.key]),
      s.count !== undefined && before !== undefined
        ? h('div', { class: 'compare', 'aria-label': `${fmt(before)} → ${fmt(s.count)}` },
            h('div', { class: 'bar-row' }, h('span', {}, 'Trước'), h('i', { style: 'width:100%' }), h('span', {}, fmt(before))),
            h('div', { class: 'bar-row' }, h('span', {}, 'Sau'), h('i', { style: `width:${before ? Math.max(1, (s.count / before) * 100) : 100}%` }), h('span', {}, fmt(s.count))))
        : null,
      highlighted(s.key),
      s.error ? h('pre', { class: 'error' }, s.error) : null,
      s.sample ? h('div', {}, h('p', { class: 'muted' }, 'Dòng mẫu sau bước này (tối đa 5):'), renderResult(s.sample)) : null,
      s.sql ? h('details', {}, h('summary', {}, 'SQL Postgres chạy cho bước này'), h('pre', { class: 'sql' }, s.sql)) : null,
    );
  }

  function stop(): void {
    clearInterval(timer);
    timer = undefined;
    playBtn.textContent = '▶ Phát';
  }
  playBtn.addEventListener('click', () => {
    if (timer) return stop();
    playBtn.textContent = '⏸ Dừng';
    current = 0;
    draw();
    timer = window.setInterval(() => {
      if (!host.isConnected || current >= steps.length - 1) return stop();
      current++;
      draw();
    }, 1500);
  });

  draw();
  host.append(stages, h('div', { class: 'actions' }, playBtn), pipe, detail);
}
```

- [ ] **Step 2: Gắn vào `src/main.ts`**

1. Import:
```ts
import { renderSteps } from './ui/stepsView';
```
2. Trong `buildTabs()`, thêm tab ngay sau tab `result`:
```ts
    {
      id: 'steps',
      label: 'Thứ tự thực thi',
      render: async (host) => {
        const sql = currentSql();
        if (!sql) return void host.append(h('p', { class: 'muted' }, 'Viết query trong editor trước.'));
        host.append(h('p', { class: 'muted' }, 'Đang chạy từng bước…'));
        try {
          const r = await db.steps(sql);
          host.replaceChildren();
          renderSteps(host, sql, r, () => panel.show('explain'));
        } catch (e) {
          host.replaceChildren(h('pre', { class: 'error' }, errorMessage(e)));
        }
      },
    },
```

- [ ] **Step 3: Thêm CSS vào cuối `src/style.css`**

```css
.stages { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; font-size: 13px; }
.stage { padding: 3px 10px; border-radius: 12px; background: var(--code); border: 1px solid var(--border); }
.stage.on { background: var(--bar); color: #fff; }
.pipe { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; }
.st { display: flex; flex-direction: column; align-items: flex-start; min-width: 96px; background: var(--code); }
.st .n { font-size: 16px; font-weight: 700; color: var(--accent); }
.st.on { border-color: var(--accent); background: var(--accent-soft); }
.st.skip { opacity: 0.5; }
.st.err { border-color: var(--bad); }
.arrow { color: var(--muted); }
pre.sql { background: #1e1e1e; color: #d4d4d4; padding: 8px; border-radius: 6px; font-size: 12px; overflow: auto; white-space: pre-wrap; }
pre.sql mark { background: #264f78; color: #fff; border-radius: 2px; }
pre.sql .dim { opacity: 0.4; }
.compare { margin: 8px 0; max-width: 520px; }
.bar-row { display: grid; grid-template-columns: 48px 1fr 80px; gap: 8px; align-items: center; font-size: 13px; }
.bar-row i { display: block; height: 10px; background: var(--accent); border-radius: 4px; }
@media (prefers-reduced-motion: no-preference) { .bar-row i { transition: width 0.4s ease; } }
```

- [ ] **Step 4: Kiểm tra kiểu, build, kiểm thủ công**

Run: `npx tsc --noEmit && npm run build` — xác nhận `dist/assets` có `libpg-query-*.wasm`. Rồi `npm run dev`:
1. Dán query `Q` của test Task 3 vào editor → tab **Thứ tự thực thi** → thấy 4 giai đoạn, chuỗi 8 bước với 25.677 → 3.167 → 6 → 5 → 5 → (DISTINCT mờ) → 5 → 3; bước WHERE được chọn sẵn, mệnh đề WHERE được tô trong SQL, có 5 dòng mẫu.
2. Bấm **▶ Phát** → tự chạy qua các bước mỗi 1,5 giây; bấm lại để dừng.
3. Bấm "3 · Optimize → EXPLAIN" → sang tab EXPLAIN.
4. Gõ `WITH x AS (SELECT 1) SELECT * FROM x` → tab báo "Query có WITH hoặc UNION — xem tab EXPLAIN".
5. DevTools → Network: `libpg-query-*.wasm` chỉ tải khi mở tab này lần đầu.

- [ ] **Step 5: Commit**

```bash
git add src/ui/stepsView.ts src/main.ts src/style.css
git commit -m "feat: logical execution order tab"
```

---

### Task 5: Biểu đồ kết quả

**Files:**
- Create: `src/viz/chart.ts`, `src/ui/chartView.ts`
- Modify: `src/main.ts`, `src/style.css`
- Test: `tests/chart.test.ts`

**Interfaces:**
- Consumes: `QueryResult` (Plan 1); `svg`, `fmt`, `h` (Task 2); `runner` (tests)
- Produces:
  - `type ChartSpec = { kind: 'bar' | 'line'; label: number; values: number[] }`
  - `chartSpec(r: QueryResult): ChartSpec | null`
  - `renderChart(host: HTMLElement, r: QueryResult): void`

- [ ] **Step 1: Viết test**

`tests/chart.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../src/db/run';
import { chartSpec } from '../src/viz/chart';
import { runner } from './helpers';

const r = (types: number[], rows: unknown[][]): QueryResult => ({ columns: types.map((_, i) => `c${i}`), types, rows });

describe('chartSpec', () => {
  it('nhãn chữ + số → cột; mọi cột số sau cột đầu đều là chuỗi giá trị', () => {
    expect(chartSpec(r([25, 20, 1700], [['a', 1, '2.5']]))).toEqual({ kind: 'bar', label: 0, values: [1, 2] });
  });
  it('ngày + số → đường', () => {
    expect(chartSpec(r([1082, 20], [[new Date(), 3]]))).toEqual({ kind: 'line', label: 0, values: [1] });
  });
  it('không vẽ khi: 1 cột, cột đầu là số, không có cột số, quá 60 dòng, rỗng', () => {
    expect(chartSpec(r([20], [[1]]))).toBeNull();
    expect(chartSpec(r([20, 20], [[1, 2]]))).toBeNull();
    expect(chartSpec(r([25, 25], [['a', 'b']]))).toBeNull();
    expect(chartSpec(r([25, 20], Array.from({ length: 61 }, () => ['a', 1])))).toBeNull();
    expect(chartSpec(r([25, 20], []))).toBeNull();
  });
  it('OID thật từ PGlite', async () => {
    const run = await runner();
    expect(chartSpec(await run('SELECT ca.name, count(*) FROM shipments s JOIN carriers ca ON ca.id = s.carrier_id GROUP BY ca.name'))?.kind).toBe('bar');
    expect(chartSpec(await run("SELECT date_trunc('month', booking_date)::date, count(*) FROM shipments GROUP BY 1 ORDER BY 1"))?.kind).toBe('line');
    expect(chartSpec(await run('SELECT mode, AVG(gross_weight_kg) FROM shipments GROUP BY mode'))?.kind).toBe('bar');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/chart.test.ts`
Expected: FAIL — không resolve `../src/viz/chart`.

- [ ] **Step 3: Viết `src/viz/chart.ts`**

```ts
import type { QueryResult } from '../db/run';

/** int2, int4, int8, float4, float8, numeric */
const NUMERIC = new Set([21, 23, 20, 700, 701, 1700]);
/** date, timestamp, timestamptz */
const TEMPORAL = new Set([1082, 1114, 1184]);
export const MAX_POINTS = 60;

export type ChartSpec = { kind: 'bar' | 'line'; label: number; values: number[] };

export function chartSpec(r: QueryResult): ChartSpec | null {
  if (r.rows.length === 0 || r.rows.length > MAX_POINTS || r.columns.length < 2) return null;
  const values = r.types.map((t, i) => (i > 0 && NUMERIC.has(t) ? i : -1)).filter((i) => i > 0);
  if (values.length === 0) return null;
  if (TEMPORAL.has(r.types[0])) return { kind: 'line', label: 0, values };
  if (NUMERIC.has(r.types[0])) return null;
  return { kind: 'bar', label: 0, values };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/chart.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Viết `src/ui/chartView.ts`**

```ts
import type { QueryResult } from '../db/run';
import { chartSpec, type ChartSpec } from '../viz/chart';
import { fmt, h, svg } from './dom';
import { formatCell } from './resultTable';

const W = 720;

function bars(r: QueryResult, spec: ChartSpec, col: number): SVGSVGElement {
  const rowH = 24;
  const labelW = 200;
  const vals = r.rows.map((row) => Number(row[col] ?? 0));
  const max = Math.max(1, ...vals.map(Math.abs));
  const height = r.rows.length * rowH + 8;
  return svg('svg', { viewBox: `0 0 ${W} ${height}`, class: 'chart', role: 'img', 'aria-label': `Biểu đồ cột theo ${r.columns[col]}` },
    ...r.rows.map((row, i) => {
      const label = formatCell(row[spec.label], r.types[spec.label]);
      const w = (Math.abs(vals[i]) / max) * (W - labelW - 90);
      return svg('g', { transform: `translate(0,${i * rowH + 4})` },
        svg('title', {}, `${label}: ${fmt(vals[i])}`),
        svg('text', { x: labelW - 8, y: 15, 'text-anchor': 'end', class: 'chart-label' }, label.length > 28 ? `${label.slice(0, 27)}…` : label),
        svg('rect', { x: labelW, y: 3, width: Math.max(1, w).toFixed(1), height: rowH - 8, rx: 3, class: 'chart-bar' }),
        svg('text', { x: labelW + w + 6, y: 15, class: 'chart-value' }, fmt(vals[i])));
    }));
}

function line(r: QueryResult, spec: ChartSpec, col: number): SVGSVGElement {
  const H = 260;
  const pad = { l: 64, r: 16, t: 12, b: 32 };
  const pts = r.rows
    .map((row) => ({ t: (row[spec.label] as Date | null)?.getTime(), v: row[col] === null ? null : Number(row[col]), raw: row[spec.label] }))
    .filter((p): p is { t: number; v: number; raw: unknown } => p.t !== undefined && p.v !== null)
    .sort((a, b) => a.t - b.t);
  const [t0, t1] = [pts[0]?.t ?? 0, pts.at(-1)?.t ?? 1];
  const vmax = Math.max(1, ...pts.map((p) => p.v));
  const vmin = Math.min(0, ...pts.map((p) => p.v));
  const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - vmin) / Math.max(1, vmax - vmin)) * (H - pad.t - pad.b);
  return svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Biểu đồ đường theo ${r.columns[col]}` },
    svg('line', { x1: pad.l, y1: y(vmin), x2: W - pad.r, y2: y(vmin), class: 'chart-axis' }),
    svg('text', { x: pad.l - 6, y: y(vmax) + 4, 'text-anchor': 'end', class: 'chart-label' }, fmt(vmax)),
    svg('text', { x: pad.l - 6, y: y(vmin) + 4, 'text-anchor': 'end', class: 'chart-label' }, fmt(vmin)),
    svg('text', { x: pad.l, y: H - 8, class: 'chart-label' }, pts[0] ? formatCell(pts[0].raw, r.types[spec.label]) : ''),
    svg('text', { x: W - pad.r, y: H - 8, 'text-anchor': 'end', class: 'chart-label' }, pts.at(-1) ? formatCell(pts.at(-1)!.raw, r.types[spec.label]) : ''),
    svg('polyline', { points: pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '), class: 'chart-line' }),
    ...pts.map((p) => svg('circle', { cx: x(p.t).toFixed(1), cy: y(p.v).toFixed(1), r: 3, class: 'chart-dot' },
      svg('title', {}, `${formatCell(p.raw, r.types[spec.label])}: ${fmt(p.v)}`))));
}

export function renderChart(host: HTMLElement, r: QueryResult): void {
  const spec = chartSpec(r);
  if (!spec) {
    host.append(h('p', { class: 'muted' }, 'Biểu đồ tự bật khi kết quả có dạng (nhãn, số…) hoặc (ngày, số…), tối đa 60 dòng.'));
    return;
  }
  const area = h('div', { class: 'chart-wrap' });
  const draw = (col: number) => area.replaceChildren(spec.kind === 'bar' ? bars(r, spec, col) : line(r, spec, col));
  const picker = spec.values.length > 1
    ? h('label', {}, 'Cột giá trị: ', (() => {
        const sel = h('select', {}, ...spec.values.map((i) => h('option', { value: String(i) }, r.columns[i])));
        sel.addEventListener('change', () => draw(Number(sel.value)));
        return sel;
      })())
    : null;
  host.append(picker ?? '', area);
  draw(spec.values[0]);
}
```

- [ ] **Step 6: Gắn vào `src/main.ts` và CSS**

1. Import: `import { renderChart } from './ui/chartView';`
2. Trong `buildTabs()`, thêm ngay sau tab `result`:
```ts
    {
      id: 'chart',
      label: 'Biểu đồ',
      render: (host) => {
        if (!lastRun?.result) host.append(h('p', { class: 'muted' }, 'Chạy query để vẽ biểu đồ.'));
        else renderChart(host, lastRun.result);
      },
    },
```
3. Cuối `src/style.css`:
```css
.chart-wrap { overflow: auto; }
.chart { width: 100%; max-width: 900px; height: auto; }
.chart-bar { fill: var(--accent); }
.chart-line { fill: none; stroke: var(--accent); stroke-width: 2; }
.chart-dot { fill: var(--accent); }
.chart-axis { stroke: var(--border); }
.chart-label, .chart-value { font: 12px system-ui, sans-serif; fill: var(--muted); }
.chart-value { fill: var(--text); }
```

- [ ] **Step 7: Kiểm thủ công và commit**

Run: `npx tsc --noEmit && npm run dev`. Chạy `ch3-02` → tab **Biểu đồ** → 6 cột ngang theo hãng tàu, rê chuột thấy số. Chạy `SELECT date_trunc('month', booking_date)::date, count(*), SUM(gross_weight_kg) FROM shipments GROUP BY 1 ORDER BY 1` → biểu đồ đường 24 điểm, có ô chọn "Cột giá trị". Chạy `SELECT * FROM ports` → thông báo không vẽ.

```bash
git add src/viz/chart.ts src/ui/chartView.ts src/main.ts src/style.css tests/chart.test.ts
git commit -m "feat: automatic bar/line chart for results"
```

---

### Task 6: Sơ đồ ER chuẩn (Mermaid, crow's foot)

**Files:**
- Create: `src/viz/erd.ts`, `src/ui/erdView.ts`
- Modify: `src/main.ts`, `src/style.css`
- Test: `tests/erd.test.ts`

**Interfaces:**
- Consumes: `tablesUnlocked` (Plan 1); `runner` (tests); `DbClient.run` (Plan 1)
- Produces:
  - `ER_COLUMNS_SQL: string`, `ER_CONSTRAINTS_SQL: string`
  - `interface ErColumn { table: string; name: string; type: string; nullable: boolean }`
  - `interface ErConstraint { table: string; column: string; kind: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY'; refTable: string | null }`
  - `toErColumns(r: QueryResult): ErColumn[]`, `toErConstraints(r: QueryResult): ErConstraint[]`
  - `erDefinition(cols: ErColumn[], cons: ErConstraint[], tables: string[], highlight: Set<string>): string`
  - `tablesInQuery(sql: string, known: string[]): Set<string>`
  - `renderErd(host: HTMLElement, definition: string): Promise<void>`

- [ ] **Step 1: Viết test**

`tests/erd.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ER_COLUMNS_SQL, ER_CONSTRAINTS_SQL, erDefinition, tablesInQuery, toErColumns, toErConstraints } from '../src/viz/erd';
import { runner } from './helpers';

async function meta() {
  const run = await runner();
  return { cols: toErColumns(await run(ER_COLUMNS_SQL)), cons: toErConstraints(await run(ER_CONSTRAINTS_SQL)) };
}

describe('erDefinition', () => {
  it('quan hệ crow\'s foot và khóa từ information_schema', async () => {
    const { cols, cons } = await meta();
    const def = erDefinition(cols, cons, ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'], new Set(['shipments']));
    expect(def.startsWith('erDiagram')).toBe(true);
    expect(def).toContain('customers ||--o{ shipments : "customer_id"');
    expect(def).toContain('employees |o--o{ employees : "manager_id"');
    expect(def).toContain('ports ||--o{ shipments : "pol"');
    expect(def).toContain('shipments ||--o{ containers : "shipment_id"');
    expect(def).toContain('integer id PK');
    expect(def).toContain('text ref UK');
    expect(def).toContain('integer customer_id FK');
    expect(def).toMatch(/style shipments /);
    expect(def).not.toMatch(/style customers /);
  });

  it('chỉ vẽ bảng đã mở khóa và quan hệ giữa chúng', async () => {
    const { cols, cons } = await meta();
    const def = erDefinition(cols, cons, ['ports', 'carriers', 'employees', 'customers', 'shipments'], new Set());
    expect(def).not.toContain('containers');
  });
});

describe('tablesInQuery', () => {
  it('nhận tên bảng, bỏ qua chuỗi ký tự và phân biệt hoa thường', () => {
    const known = ['shipments', 'customers', 'ports'];
    expect(tablesInQuery("SELECT * FROM Shipments s JOIN customers c ON c.id = s.customer_id WHERE s.note = 'ports'", known))
      .toEqual(new Set(['shipments', 'customers']));
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/erd.test.ts`
Expected: FAIL — không resolve `../src/viz/erd`.

- [ ] **Step 3: Viết `src/viz/erd.ts`**

```ts
import type { QueryResult } from '../db/run';

export const ER_COLUMNS_SQL = `SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position`;

export const ER_CONSTRAINTS_SQL = `SELECT tc.table_name, kcu.column_name, tc.constraint_type, ccu.table_name AS ref_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_type = 'FOREIGN KEY' AND ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')`;

export interface ErColumn { table: string; name: string; type: string; nullable: boolean }
export interface ErConstraint { table: string; column: string; kind: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY'; refTable: string | null }

export const toErColumns = (r: QueryResult): ErColumn[] =>
  r.rows.map(([table, name, type, nullable]) => ({ table: String(table), name: String(name), type: String(type), nullable: nullable === 'YES' }));

export const toErConstraints = (r: QueryResult): ErConstraint[] =>
  r.rows.map(([table, column, kind, ref]) => ({ table: String(table), column: String(column), kind: kind as ErConstraint['kind'], refTable: ref === null ? null : String(ref) }));

const KEY_TAG: Record<ErConstraint['kind'], string> = { 'PRIMARY KEY': 'PK', 'FOREIGN KEY': 'FK', UNIQUE: 'UK' };

/** Mermaid erDiagram (crow's foot): parent ||--o{ child, or |o--o{ when the FK column is nullable. */
export function erDefinition(cols: ErColumn[], cons: ErConstraint[], tables: string[], highlight: Set<string>): string {
  const shown = new Set(tables);
  const lines = ['erDiagram'];
  for (const c of cons) {
    if (c.kind !== 'FOREIGN KEY' || !c.refTable || !shown.has(c.table) || !shown.has(c.refTable)) continue;
    const nullable = cols.find((x) => x.table === c.table && x.name === c.column)?.nullable;
    lines.push(`  ${c.refTable} ${nullable ? '|o' : '||'}--o{ ${c.table} : "${c.column}"`);
  }
  for (const t of tables) {
    const tableCols = cols.filter((c) => c.table === t);
    if (tableCols.length === 0) continue;
    lines.push(`  ${t} {`);
    for (const c of tableCols) {
      const keys = [...new Set(cons.filter((k) => k.table === t && k.column === c.name).map((k) => KEY_TAG[k.kind]))];
      lines.push(`    ${c.type.replace(/\W+/g, '_')} ${c.name}${keys.length ? ` ${keys.join(', ')}` : ''}`);
    }
    lines.push('  }');
  }
  for (const t of tables) if (highlight.has(t)) lines.push(`  style ${t} stroke-width:3px`);
  return lines.join('\n');
}

export function tablesInQuery(sql: string, known: string[]): Set<string> {
  const words = new Set(sql.replace(/'(?:[^']|'')*'/g, ' ').toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []);
  return new Set(known.filter((t) => words.has(t)));
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/erd.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Cài Mermaid và viết `src/ui/erdView.ts`**

Run: `npm i --save-exact mermaid@12.3.0`

```ts
import { h } from './dom';

let seq = 0;
let initialized: Promise<typeof import('mermaid').default> | undefined;

function mermaid(): Promise<typeof import('mermaid').default> {
  initialized ??= import('mermaid').then(({ default: m }) => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    m.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default', er: { layoutDirection: 'LR' } });
    return m;
  });
  return initialized;
}

export async function renderErd(host: HTMLElement, definition: string): Promise<void> {
  host.append(h('p', { class: 'muted' }, 'Đang vẽ sơ đồ…'));
  const { svg } = await (await mermaid()).render(`erd-${++seq}`, definition);
  const figure = h('div', { class: 'erd' });
  // Only innerHTML in the app: SVG generated by Mermaid (strict mode) from our own schema identifiers.
  figure.innerHTML = svg;
  host.replaceChildren(
    h('p', { class: 'muted' },
      "Ký hiệu crow's foot: ", h('code', {}, '||'), ' đúng một · ', h('code', {}, '|o'), ' không hoặc một · ',
      h('code', {}, 'o{'), ' không hoặc nhiều. Bảng viền đậm đang được dùng trong query.'),
    figure,
  );
}
```

- [ ] **Step 6: Gắn vào `src/main.ts` và CSS**

1. Import:
```ts
import { renderErd } from './ui/erdView';
import { ER_COLUMNS_SQL, ER_CONSTRAINTS_SQL, erDefinition, tablesInQuery, toErColumns, toErConstraints, type ErColumn, type ErConstraint } from './viz/erd';
```
2. Sau `function planFor…` thêm:
```ts
let erMeta: Promise<{ cols: ErColumn[]; cons: ErConstraint[] }> | undefined;
function erMetadata(): Promise<{ cols: ErColumn[]; cons: ErConstraint[] }> {
  erMeta ??= (async () => ({ cols: toErColumns(await db.run(ER_COLUMNS_SQL)), cons: toErConstraints(await db.run(ER_CONSTRAINTS_SQL)) }))();
  erMeta.catch(() => (erMeta = undefined));
  return erMeta;
}
```
3. Trong `buildTabs()`, thay tab `columns` bằng:
```ts
    {
      id: 'erd',
      label: 'Sơ đồ ER',
      render: async (host) => {
        const tables = unlockedTables();
        const { cols, cons } = await erMetadata();
        await renderErd(host, erDefinition(cols, cons, tables, tablesInQuery(currentSql(), tables)));
      },
    },
    { id: 'columns', label: 'Cột', render: (host) => void host.append(schemaList()) },
```
4. Cuối `src/style.css`:
```css
.erd { overflow: auto; }
.erd svg { max-width: 100%; height: auto; }
```

- [ ] **Step 7: Kiểm thủ công và commit**

Run: `npx tsc --noEmit && npm run build && npm run dev`. Mở tab **Sơ đồ ER** ở chương 1 → 5 bảng, ký hiệu crow's foot, cột có PK/FK/UK, `employees` có quan hệ tự trỏ `manager_id`. Gõ query có `shipments` → mở lại tab → `shipments` viền đậm. Sang chương 2 → có `containers`. Bật dark mode → theme tối. DevTools Network: chunk `mermaid*`/`erDiagram*` chỉ tải khi mở tab.

```bash
git add package.json package-lock.json src/viz/erd.ts src/ui/erdView.ts src/main.ts src/style.css tests/erd.test.ts
git commit -m "feat: crow's foot ER diagram via Mermaid"
```

---

### Task 7: Dải bản đồ tuyến 2D

**Files:**
- Create: `src/viz/ports.ts`, `src/ui/mapView.ts`
- Modify: `tsconfig.json`, `src/main.ts`, `src/style.css`
- Test: `tests/ports.test.ts`

**Interfaces:**
- Consumes: `svg`, `h`, `fmt`, `reducedMotion` (Task 2); `currentChapter` (Plan 1)
- Produces:
  - `interface Port { code: string; name: string; lon: number; lat: number; region: string; kind: 'SEAPORT' | 'AIRPORT' }`
  - `PORTS: Port[]`, `HUB: Record<Port['kind'], string>`
  - `laneUnlocked(port: Port, chapter: number): boolean`
  - `createMap(host: HTMLElement, volumes: Map<string, number>): { update(chapter: number): void; celebrate(): void }`

- [ ] **Step 1: Viết test**

`tests/ports.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { HUB, laneUnlocked, PORTS } from '../src/viz/ports';
import { runner } from './helpers';

const port = (code: string) => PORTS.find((p) => p.code === code)!;

describe('ports', () => {
  it('khớp đúng 24 mã cảng trong seed', async () => {
    const run = await runner();
    const codes = (await run('SELECT code FROM ports ORDER BY code')).rows.map((r) => r[0]);
    expect(PORTS.map((p) => p.code).sort()).toEqual(codes);
  });

  it('tuyến mở dần theo chương', () => {
    expect(laneUnlocked(port('CNSHA'), 1)).toBe(true);
    expect(laneUnlocked(port('INNSA'), 1)).toBe(false);
    expect(laneUnlocked(port('INNSA'), 2)).toBe(true);
    expect(laneUnlocked(port('NLRTM'), 2)).toBe(false);
    expect(laneUnlocked(port('NLRTM'), 3)).toBe(true);
    expect(laneUnlocked(port('USLAX'), 4)).toBe(true);
    expect(laneUnlocked(port('AUSYD'), 5)).toBe(true);
    expect(laneUnlocked(port('FRA'), 5)).toBe(false);
    expect(laneUnlocked(port('FRA'), 6)).toBe(true);
  });

  it('hub Việt Nam không phải là tuyến', () => {
    expect(laneUnlocked(port(HUB.SEAPORT), 7)).toBe(false);
    expect(laneUnlocked(port('HAN'), 7)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/ports.test.ts`
Expected: FAIL — không resolve `../src/viz/ports`.

- [ ] **Step 3: Viết `src/viz/ports.ts`**

```ts
export interface Port { code: string; name: string; lon: number; lat: number; region: string; kind: 'SEAPORT' | 'AIRPORT' }

export const PORTS: Port[] = [
  { code: 'VNSGN', name: 'Cát Lái', lon: 106.75, lat: 10.76, region: 'Vietnam', kind: 'SEAPORT' },
  { code: 'VNHPH', name: 'Hải Phòng', lon: 106.69, lat: 20.86, region: 'Vietnam', kind: 'SEAPORT' },
  { code: 'VNDAD', name: 'Đà Nẵng', lon: 108.22, lat: 16.07, region: 'Vietnam', kind: 'SEAPORT' },
  { code: 'CNSHA', name: 'Shanghai', lon: 121.5, lat: 31.23, region: 'Asia', kind: 'SEAPORT' },
  { code: 'CNNGB', name: 'Ningbo', lon: 121.55, lat: 29.87, region: 'Asia', kind: 'SEAPORT' },
  { code: 'SGSIN', name: 'Singapore', lon: 103.82, lat: 1.26, region: 'Asia', kind: 'SEAPORT' },
  { code: 'KRPUS', name: 'Busan', lon: 129.04, lat: 35.1, region: 'Asia', kind: 'SEAPORT' },
  { code: 'JPTYO', name: 'Tokyo', lon: 139.77, lat: 35.62, region: 'Asia', kind: 'SEAPORT' },
  { code: 'THLCH', name: 'Laem Chabang', lon: 100.88, lat: 13.08, region: 'Asia', kind: 'SEAPORT' },
  { code: 'INNSA', name: 'Nhava Sheva', lon: 72.95, lat: 18.95, region: 'South Asia', kind: 'SEAPORT' },
  { code: 'NLRTM', name: 'Rotterdam', lon: 4.4, lat: 51.9, region: 'Europe', kind: 'SEAPORT' },
  { code: 'DEHAM', name: 'Hamburg', lon: 9.97, lat: 53.55, region: 'Europe', kind: 'SEAPORT' },
  { code: 'BEANR', name: 'Antwerp', lon: 4.4, lat: 51.22, region: 'Europe', kind: 'SEAPORT' },
  { code: 'USLAX', name: 'Los Angeles', lon: -118.27, lat: 33.74, region: 'North America', kind: 'SEAPORT' },
  { code: 'USNYC', name: 'New York', lon: -74.0, lat: 40.68, region: 'North America', kind: 'SEAPORT' },
  { code: 'AUSYD', name: 'Sydney', lon: 151.2, lat: -33.86, region: 'Oceania', kind: 'SEAPORT' },
  { code: 'SGN', name: 'Tân Sơn Nhất', lon: 106.65, lat: 10.82, region: 'Vietnam', kind: 'AIRPORT' },
  { code: 'HAN', name: 'Nội Bài', lon: 105.8, lat: 21.22, region: 'Vietnam', kind: 'AIRPORT' },
  { code: 'PVG', name: 'Pudong', lon: 121.8, lat: 31.14, region: 'Asia', kind: 'AIRPORT' },
  { code: 'ICN', name: 'Incheon', lon: 126.44, lat: 37.46, region: 'Asia', kind: 'AIRPORT' },
  { code: 'NRT', name: 'Narita', lon: 140.39, lat: 35.77, region: 'Asia', kind: 'AIRPORT' },
  { code: 'FRA', name: 'Frankfurt', lon: 8.57, lat: 50.04, region: 'Europe', kind: 'AIRPORT' },
  { code: 'LAX', name: 'Los Angeles (air)', lon: -118.41, lat: 33.94, region: 'North America', kind: 'AIRPORT' },
  { code: 'SYD', name: 'Sydney (air)', lon: 151.18, lat: -33.94, region: 'Oceania', kind: 'AIRPORT' },
];

export const HUB: Record<Port['kind'], string> = { SEAPORT: 'VNSGN', AIRPORT: 'SGN' };

/** Chapter from which each sea region's lanes light up; every air lane opens at chapter 6. */
const SEA_REGION_CHAPTER: Record<string, number> = { Asia: 1, 'South Asia': 2, Europe: 3, 'North America': 4, Oceania: 5 };
const AIR_CHAPTER = 6;

export function laneUnlocked(port: Port, chapter: number): boolean {
  if (port.region === 'Vietnam') return false;
  return chapter >= (port.kind === 'AIRPORT' ? AIR_CHAPTER : SEA_REGION_CHAPTER[port.region] ?? 99);
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/ports.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Cài thư viện bản đồ, bật JSON import**

Run:
```bash
npm i d3-geo topojson-client world-atlas
npm i -D @types/d3-geo @types/topojson-client
```
Trong `tsconfig.json`, thêm vào `compilerOptions`: `"resolveJsonModule": true`.

- [ ] **Step 6: Viết `src/ui/mapView.ts`**

```ts
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import { HUB, laneUnlocked, PORTS, type Port } from '../viz/ports';
import { fmt, h, reducedMotion, svg } from './dom';

const W = 960;
const H = 170;
const COLLAPSE_KEY = 'cargo-query/map-collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
  } catch {
    /* convenience only */
  }
}

export function createMap(host: HTMLElement, volumes: Map<string, number>): { update(chapter: number): void; celebrate(): void } {
  // Centred on the Pacific (150°E) so lanes to Europe go left and lanes to the Americas go right.
  const projection = geoNaturalEarth1().rotate([-150, 0])
    .fitExtent([[24, 14], [W - 24, H - 10]], { type: 'MultiPoint', coordinates: PORTS.map((p) => [p.lon, p.lat]) });
  const path = geoPath(projection);
  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
  const landD = path(feature(topo, topo.objects.land)) ?? '';
  const hub = (p: Port) => PORTS.find((x) => x.code === HUB[p.kind])!;
  const laneD = (p: Port) => path({ type: 'LineString', coordinates: [[hub(p).lon, hub(p).lat], [p.lon, p.lat]] }) ?? '';

  let chapter = 1;
  let collapsed = readCollapsed();
  const stage = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'map', role: 'img', 'aria-label': 'Bản đồ tuyến vận chuyển của công ty' });
  const caption = h('span', { class: 'map-caption' });
  const toggle = h('button', { type: 'button', class: 'map-toggle', 'aria-expanded': 'true' });

  function draw(): void {
    const open = PORTS.filter((p) => laneUnlocked(p, chapter));
    const lanes = PORTS.filter((p) => p.region !== 'Vietnam');
    stage.replaceChildren(
      svg('path', { d: landD, class: 'map-land' }),
      ...lanes.map((p) => svg('path', { d: laneD(p), class: `map-lane${laneUnlocked(p, chapter) ? ' open' : ''}${p.kind === 'AIRPORT' ? ' air' : ''}` })),
      ...PORTS.map((p) => {
        const [x, y] = projection([p.lon, p.lat]) ?? [0, 0];
        const isOpen = p.region === 'Vietnam' || laneUnlocked(p, chapter);
        return svg('g', { class: `map-port${isOpen ? ' open' : ''}${p.region === 'Vietnam' ? ' hub' : ''}` },
          svg('title', {}, `${p.name} (${p.code})${isOpen ? ` — ${fmt(volumes.get(p.code) ?? 0)} lô` : ' — chưa mở'}`),
          svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: p.region === 'Vietnam' ? 5 : 3.5 }));
      }),
    );
    const newest = open.at(-1);
    if (newest && !reducedMotion()) {
      stage.append(svg('text', { class: 'map-ship', 'font-size': 14 }, '🚢',
        svg('animateMotion', { dur: '14s', repeatCount: 'indefinite', path: laneD(newest), rotate: '0' })));
    }
    caption.textContent = `Tuyến đã mở: ${open.length}/${lanes.length}`;
  }

  function applyCollapsed(): void {
    host.classList.toggle('collapsed', collapsed);
    toggle.textContent = collapsed ? '▾ Bản đồ' : '▴ Thu gọn';
    toggle.setAttribute('aria-expanded', String(!collapsed));
  }
  toggle.addEventListener('click', () => {
    collapsed = !collapsed;
    writeCollapsed(collapsed);
    applyCollapsed();
  });

  host.replaceChildren(h('div', { class: 'map-bar' }, caption, toggle), stage);
  host.hidden = false;
  applyCollapsed();
  draw();

  return {
    update(next: number) {
      chapter = next;
      draw();
    },
    celebrate() {
      const open = PORTS.filter((p) => laneUnlocked(p, chapter));
      if (open.length === 0 || reducedMotion()) return;
      const lane = open[Math.floor(Math.random() * open.length)];
      const ship = svg('text', { class: 'map-ship', 'font-size': 18 }, '🚢',
        svg('animateMotion', { dur: '3s', repeatCount: '1', fill: 'freeze', path: laneD(lane), rotate: '0' }));
      stage.append(ship);
      setTimeout(() => ship.remove(), 3500);
    },
  };
}
```

Nếu `tsc` báo thiếu kiểu `topojson-specification`, chạy `npm i -D @types/topojson-specification`.

- [ ] **Step 7: Gắn vào `src/main.ts` và CSS**

1. Import: `import { createMap } from './ui/mapView';`
2. Sau `let lastRun …;` thêm: `let map: ReturnType<typeof createMap> | undefined;`
3. Trong `onDbStatus`, ngay sau dòng `columns = next;`, thêm:
```ts
      const vol = await db.run("SELECT CASE WHEN direction = 'EXPORT' THEN pod ELSE pol END, count(*) FROM shipments GROUP BY 1");
      map = createMap($('map'), new Map(vol.rows.map(([code, n]) => [String(code), Number(n)])));
      map.update(currentChapter(tickets, done()));
```
4. Trong `complete(t)`, ngay sau `persist(true);`, thêm:
```ts
  map?.update(currentChapter(tickets, done()));
  map?.celebrate();
```
5. Cuối `src/style.css`:
```css
.map-strip { position: relative; }
.map-bar { display: flex; justify-content: space-between; align-items: center; padding: 4px 16px; font-size: 13px; color: var(--muted); }
.map-strip.collapsed .map { display: none; }
.map { display: block; width: 100%; height: auto; max-height: 190px; }
.map-land { fill: var(--land); }
.map-lane { fill: none; stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 4; opacity: 0.5; }
.map-lane.open { stroke: var(--accent); stroke-width: 1.8; stroke-dasharray: none; opacity: 0.85; }
.map-lane.air.open { stroke-dasharray: 6 3; }
.map-port circle { fill: var(--muted); }
.map-port.open circle { fill: var(--good); }
.map-port.hub circle { fill: var(--bad); }
.map-toggle { padding: 2px 8px; font-size: 12px; }
```

- [ ] **Step 8: Kiểm thủ công và commit**

Run: `npx tsc --noEmit && npm run build && npm run dev`.
1. Dải bản đồ hiện dưới thanh trên: lục địa nhạt, Cát Lái chấm đỏ; chương 1 chỉ các tuyến châu Á sáng, còn lại nét đứt mờ; tàu chạy chậm trên tuyến mới nhất.
2. Rê chuột vào Shanghai → "Shanghai (CNSHA) — N lô"; vào Rotterdam (chương 1) → "chưa mở".
3. Đóng một ticket → tàu lớn chạy nhanh một lượt trên một tuyến đã mở.
4. Hoàn thành chương 2 (hoặc nhập save đã xong ch1–2) → tuyến Ấn Độ sáng thêm. Chương 3 → châu Âu.
5. Bấm "▴ Thu gọn" → còn một dòng; tải lại trang vẫn thu gọn.
6. Bật "Reduce motion" → không có tàu chạy.
7. Màn hình < 600px → bản đồ co theo chiều ngang, không cuộn ngang.

```bash
git add package.json package-lock.json tsconfig.json src/viz/ports.ts src/ui/mapView.ts src/main.ts src/style.css tests/ports.test.ts
git commit -m "feat: 2D route map strip with chapter-based lanes"
```

---

### Task 8: Cập nhật CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Thêm vào cuối mục `## Architecture`**

```markdown
- Visualizations (spec §6b) live in two layers: pure data builders in `src/viz/` (tested in Node against a real seeded PGlite) and DOM/SVG renderers in `src/ui/*View.ts`. The bottom panel (`src/ui/panel.ts`) re-renders the active tab from the current editor SQL or the last run.
- "Thứ tự thực thi" (`src/viz/steps.ts`) parses the player's SQL with `libpg-query` (Postgres' own parser, WASM), rebuilds one sub-query per logical clause with `pgsql-deparser`, and counts rows for each inside the sandbox. In the browser the `.wasm` must be imported via `?url` and passed to `loadModule` (`src/viz/parser.ts`); Vite does not bundle it otherwise.
- EXPLAIN uses `EXPLAIN (ANALYZE, FORMAT JSON)` inside `BEGIN … ROLLBACK` (`runExplain`); `src/viz/plan.ts` flattens it and holds the Vietnamese node glossary.
- The ER tab renders a Mermaid `erDiagram` built from `information_schema` (`src/viz/erd.ts`); it is the only place that uses `innerHTML` (Mermaid strict mode, schema identifiers only). Mermaid and the SQL parser are lazy-loaded.
- The route map (`src/ui/mapView.ts`) projects `PORTS` (`src/viz/ports.ts`, must match the `ports` seed rows) with d3-geo over world-atlas land; lanes open by chapter via `laneUnlocked`.
```

- [ ] **Step 2: Chạy toàn bộ test và build**

Run: `npm test && npm run build`
Expected: tất cả PASS; build xong.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document visualization architecture"
```
