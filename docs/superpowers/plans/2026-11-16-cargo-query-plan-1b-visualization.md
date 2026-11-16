# Cargo Query — Plan 1b: Trực quan hóa (EXPLAIN, luồng dữ liệu, thứ tự thực thi, biểu đồ, ERD, bản đồ)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm các tab trực quan vào panel dưới (Biểu đồ, Thứ tự thực thi, EXPLAIN, Luồng dữ liệu, Sơ đồ ER) và dải bản đồ tuyến 2D kiêm thanh tiến độ chương, đúng spec §6b, song ngữ VI/EN.

**Architecture:** Dữ liệu trực quan được tính bằng hàm thuần trong `src/viz/*` (có unit test chạy PGlite thật trong Node, không chứa chữ đã dịch) rồi vẽ bằng DOM/SVG trong `src/ui/*View.ts` (mọi chữ qua `t()`). EXPLAIN và "thứ tự thực thi" chạy trong worker DB (cùng sandbox `BEGIN … ROLLBACK`), đi qua hàng đợi request của `DbClient`. Các tab đăng ký qua `registerTab()` của `src/ui/tabs.ts` trong một file riêng `src/ui/vizTabs.ts`; mọi tab mô tả **lần chạy gần nhất** (`app.lastRun.sql` trong `src/state.ts`), không đọc editor. Kết quả EXPLAIN / thứ tự thực thi / metadata ERD được cache theo SQL (hoặc theo schema) bằng `memoByKey`. Thư viện nặng (Mermaid, parser `libpg-query`) chỉ tải khi mở tab cần.

**Tech Stack:** như Plan 1, thêm `libpg-query` 18.2.4 + `pgsql-deparser` 18.4.5 (parser/deparser Postgres, WASM), `mermaid` 12.3.0, `d3-geo` 3.1.2 + `topojson-client` 3.1.0 + `world-atlas` 2.0.2 (dev: `@types/d3-geo` 3.1.1, `@types/topojson-client` 3.1.5, `@types/topojson-specification` 1.0.5).

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §6b. **Tiền đề:** Plan 1 đã xong (Task 1–11), gồm cả bản sửa `src/db/{client,worker,run}.ts` của BE đã commit (Task 2: hàng đợi request trong `DbClient`, `SqlError`/`sqlErrorInfo` trong `run.ts`, `QueryTimeoutError`/`DbRestartError`/`DbFailedError` không kèm chữ, `MAX_ROWS_WORKER`) và Task 10 viết theo cấu trúc tách `src/state.ts` + `src/ui/{topbar,inbox,brief,work,tabs}.ts` + `src/i18n/*`. Quyết định nguồn: `docs/team/amendments.md` (B3, C1, C4, C5, C7, F10 và mục "Quyết định của user").

### Tên dùng từ Plan 1 (đã đối chiếu với văn bản Plan 1 Task 10)

Plan 1b chỉ dùng các tên dưới đây từ Plan 1. Tất cả đã có trong code mẫu của Plan 1 Task 10; nếu lúc chạy thấy khác, sửa ở chỗ gọi trong Plan 1b, không đổi Plan 1.

| File (Plan 1) | Tên Plan 1b dùng |
|---|---|
| `src/i18n/index.ts` | `type Lang = 'vi' \| 'en'`, `type Key`, `type Params = Record<string, string \| number>`, `type Msg = string \| ((p: Params) => string)`, `t(key: Key, p?: Params): string`, `getLang(): Lang`, `locale(): string` |
| `src/i18n/vi.ts`, `src/i18n/en.ts` | object literal `vi` (nguồn khóa) và `en: Record<Key, Msg>`; Plan 1b thêm khóa vào cả hai |
| `src/state.ts` | `app.lastRun: { sql: string; result?: QueryResult; error?: … } \| undefined`, `app.tickets`, `app.selectedId`, `done(): Set<string>`, `unlockedTables(): string[]` |
| `src/ui/tabs.ts` | `registerTab(spec: TabSpec): void` với `TabSpec { id: string; label: Key; group: 'output' \| 'query' \| 'schema'; order: number; newAt?: string; render(host: HTMLElement): void \| Promise<void> }`; panel sắp tab theo nhóm `output \| query \| schema` rồi theo `order`. Plan 1 đăng ký `result` (output, 10) và `columns` (schema, 20). `registerTab` phải được gọi trước khi panel được tạo. |
| `src/ui/work.ts` | trong `mountWork(host, deps)`: hàm cục bộ `run(): Promise<void>` (chạy SQL editor/vùng chọn, ghi `app.lastRun`), nút `runBtn`, hàng nút `h('div', { class: 'actions' }, runBtn, …)`, `deps.panel.show(id)`; `WorkArea.currentSql(): string` = đúng đoạn SQL mà Ctrl+Enter sẽ chạy lúc này (vùng chọn nếu có, không thì cả editor), để so được với `app.lastRun.sql` |
| `src/ui/dom.ts` | `h()` (Plan 1 Task 10) |
| `src/ui/resultTable.ts` | `renderResult(r: QueryResult, mark?: unknown[]): HTMLElement`, `formatCell(v: unknown, type?: number): string` |
| `src/main.ts` | `const db = new DbClient(onDbStatus)`, `registerCoreTabs(…)` ngay trước `const panel = createPanel(…)`, hàm `loadColumns()` (gọi một lần khi DB `ready`), hàm `rerender()`, hàm `complete(t: Ticket)` (đóng mọi ticket, kể cả boss qua `actions.complete`), biến `panel` và `work` |
| `src/progress.ts` | `currentChapter(tickets, completed): number` |

> **Sau Plan 1d (Tailwind, Trang chủ Tiên Sa, hoạt cảnh; L17–L31): điều chỉnh khi thực hiện:**
> - `registerTab`/`TabSpec` không đổi; tab tự có kiểu mới (gạch chân theo `aria-selected`). Hàng nút vẫn là `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)`, nay nằm trong một div bọc dính đáy: chèn `explainBtn` sau `runBtn` như cũ.
> - Các bước "Thêm CSS vào cuối `src/style.css`" vẫn dùng được: token `var(--…)` và class `.muted .stale .error pre.sql .actions button.primary .tag .warn` còn nguyên. Ưu tiên viết class Tailwind ngay trong `h()`; khi đó class phải là chuỗi nguyên vẹn (map tên đầy đủ, nối bằng `cx()` từ `src/theme.ts`). `tests/theme.test.ts` chặn `` class: `…${x}` ``. SVG dựng bằng `s()` của `src/ui/svg.ts` (Plan 1d) thay vì một builder thứ hai.
> - Preflight làm `svg` thành `display: block`: SVG nằm giữa dòng chữ cần class `inline`.
> - **Task 7 (dải bản đồ tuyến d3-geo):** Plan 1d đã có bản đồ tuyến từ Tiên Sa (`src/ui/routeMap.ts`, `ROUTES` trong `src/scene.ts`) trên Trang chủ và hoạt cảnh tàu chạy khi xong việc (`src/ui/stage.ts`).
>   - **Bỏ** `map.celebrate()` trong `complete()`: một lần xong việc chỉ có một hoạt cảnh (completion-animations §4).
>   - Nếu vẫn làm dải `#map` trong khu làm việc: dùng lại `routeMap(derive(app.tickets, done()))` thay vì vẽ bản đồ thứ hai, giữ `chapterDots` làm thanh tiến độ, và ẩn `#map` khi `currentRoute() !== 'play'` (import từ `./ui/router`).
>   - `laneUnlocked` phải khớp `derive().open` (`ROUTES[].opens`, hoặc đã có chuyến tàu tới cảng đó, L32). Laem Chabang (`THLCH`), không "Bangkok".
>   - Khóa i18n `map.*` của plan này không trùng `routes.*` của 1d. Đổi `'map.beat.boss'` thành `'đánh giá thăng tiến'` / `'promotion review'`: `tests/i18n.test.ts` (Plan 1d Task 5) chặn chữ "boss" (L22).
> - Màu biểu đồ theo chương lấy `CHAPTER_COLOR[n].bar` (12 chương).

## Global Constraints

- Mọi ràng buộc của Plan 1 vẫn áp dụng (PGlite 0.5.16 pin, ngày cố định, không `innerHTML` với dữ liệu, try/catch mọi truy cập `localStorage`/IndexedDB, `npx tsc --noEmit` ở mọi bước xác nhận PASS).
- Ngoại lệ `innerHTML` duy nhất: SVG do Mermaid sinh từ tên bảng/cột (schema game, hoặc tên đã sanitize về `[a-z0-9_]` của schema `sandbox`), với `securityLevel: 'strict'`.
- Pin chính xác (`--save-exact`): `libpg-query@18.2.4`, `pgsql-deparser@18.4.5`, `mermaid@12.3.0`, `d3-geo@3.1.2`, `topojson-client@3.1.0`, `world-atlas@2.0.2`, `@types/d3-geo@3.1.1`, `@types/topojson-client@3.1.5`, `@types/topojson-specification@1.0.5`.
- File `libpg-query.wasm` phải được import qua `?url` và nạp bằng `loadModule({ wasm })` — Vite không tự đóng gói nó (đã xác nhận bằng spike).
- Sau mỗi lần cài dependency: grep `SharedArrayBuffer` (F10). Không bật COOP/COEP; GitHub Pages (D6) không đặt được header này.
- **i18n:** mọi chữ hiển thị đi qua `t()`; khóa mới được thêm vào **cả** `src/i18n/vi.ts` và `src/i18n/en.ts` trong cùng task. `src/viz/*` chạy trong worker và Node nên chỉ được `import type` từ `src/i18n` (không gọi `t()`/`getLang()`). Dữ liệu được cache (`planFor`, `stepsFor`) không chứa chữ đã dịch: mã + giá trị thô, dịch lúc vẽ. Bảng chú thích theo ngôn ngữ (`NODE_HELP`, `STEP_LABELS`, `STEP_HELP`) là `Record<Lang, …>` cùng tập khóa (có test).
- Không dịch: tên bảng/cột, SQL, giá trị dữ liệu, lỗi gốc Postgres, tên cảng.
- Mọi tab trực quan đọc `app.lastRun.sql`; khi editor khác SQL đó thì hiện dải "SQL đã thay đổi — Ctrl+Enter để cập nhật".
- Số hiển thị qua `fmt()` (`toLocaleString(locale())`).
- Mọi animation tắt khi `prefers-reduced-motion: reduce`.
- Màu lấy từ CSS token (`var(--accent)`, `var(--land)`…), không hard-code ngoài `:root`. Trạng thái (bước bỏ qua, SQL mờ, tuyến chưa mở, cạnh luồng) thể hiện bằng **màu/nét**, không bằng `opacity`.

## File Structure

```
src/db/run.ts          + runExplain(db, sql)
src/db/worker.ts       nhận { id, kind: 'run' | 'explain' | 'steps', sql }
src/db/client.ts       + RequestKind; request<T>(kind, sql, timeoutMs) qua hàng đợi có sẵn; explain(sql), steps(sql)
src/viz/memo.ts        memoByKey — cache promise theo SQL / schema
src/viz/plan.ts        flattenPlan, NODE_HELP, nodeExplanation, isHeavyScan — từ EXPLAIN JSON
src/viz/parser.ts      ensureParser(): nạp wasm libpg-query trong trình duyệt
src/viz/steps.ts       STEP_LABELS, STEP_HELP, buildSteps, clauseRanges, runSteps
src/viz/chart.ts       chartSpec — chọn kiểu biểu đồ theo OID cột
src/viz/erd.ts         erColumnsSql(schema), erConstraintsSql(schema), loadErMetadata, erDefinition, tablesInQuery
src/viz/ports.ts       PORTS, HUB, laneUnlocked, VOLUMES_SQL, toVolumes, chapterDots, ticketPorts
src/i18n/vi.ts, en.ts  + khóa viz.*, plan.*, explain.*, flow.*, steps.*, chart.*, erd.*, map.*, tab.*
src/ui/dom.ts          + svg(), reducedMotion(), fmt()
src/ui/vizTabs.ts      registerVizTabs(deps): đăng ký 5 tab qua registerTab, cache planFor/stepsFor/erMetadata
src/ui/work.ts         + nút EXPLAIN
src/ui/explainView.ts  tab EXPLAIN
src/ui/flowView.ts     tab Luồng dữ liệu
src/ui/stepsView.ts    tab Thứ tự thực thi
src/ui/chartView.ts    tab Biểu đồ
src/ui/erdView.ts      tab Sơ đồ ER (Mermaid, tải lười)
src/ui/mapView.ts      dải bản đồ tuyến + thanh tiến độ chương
src/main.ts            + registerVizTabs(...), createMap/syncMap
tests/memo.test.ts, plan.test.ts, steps.test.ts, chart.test.ts, erd.test.ts, ports.test.ts
```

Thứ tự tab cuối cùng: [`result` · `chart`] | [`steps` · `explain` · `flow`] | [`erd` · `columns`].

---

### Task 1: EXPLAIN trong worker + mô hình cây plan

**Files:**
- Modify: `src/db/run.ts`, `src/db/worker.ts`, `src/db/client.ts`
- Create: `src/viz/plan.ts`, `src/viz/steps.ts` (file tạm, thay ở Task 3)
- Test: `tests/plan.test.ts`

**Interfaces:**
- Consumes: `runSandboxed`, `QueryResult`, `SqlError`, `SqlErrorInfo`, `sqlErrorInfo` (`src/db/run.ts`); `DbClient` (hàng đợi `queue`/`inFlight`/`pump()`, `failure`), `QueryTimeoutError(timeoutMs)`, `DbRestartError`, `DbFailedError(detail)` (`src/db/client.ts`) — Plan 1 Task 2, đã có code; `type Lang` (`src/i18n`, Plan 1 Task 10); `seededDb` (tests/helpers.ts)
- Produces:
  - `runExplain(db: PGlite, sql: string): Promise<unknown>` — JSON của `EXPLAIN (ANALYZE, FORMAT JSON)`
  - `type RequestKind = 'run' | 'explain' | 'steps'`
  - `DbClient.request<T>(kind: RequestKind, sql: string, timeoutMs?: number): Promise<T>`; `run(sql): Promise<QueryResult>`, `explain(sql): Promise<unknown>`, `steps(sql): Promise<StepsResult>` (ngân sách gấp 3)
  - `type PlanDetail = { kind: 'index' | 'indexCond' | 'hashCond' | 'joinFilter' | 'filter' | 'groupKey' | 'sortKey'; text: string; removed?: number }`
  - `interface PlanNode { id: number; depth: number; parent: number | null; type: string; label: string; relation?: string; rows: number; scanned: number; estRows: number; ms: number; detail: PlanDetail[] }`
  - `interface Plan { nodes: PlanNode[]; executionMs: number }`
  - `flattenPlan(json: unknown): Plan`
  - `NODE_HELP: Record<Lang, Record<string, string>>`, `nodeExplanation(type: string, lang: Lang): string`, `isHeavyScan(n: PlanNode): boolean`

- [ ] **Step 1: Viết test**

`tests/plan.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { runExplain } from '../src/db/run';
import { flattenPlan, isHeavyScan, NODE_HELP, nodeExplanation } from '../src/viz/plan';
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

  it('lỗi EXPLAIN là SqlError có SQLSTATE nhưng không có position (bị lệch bởi tiền tố EXPLAIN)', async () => {
    const db = await seededDb();
    await expect(runExplain(db, 'SELECT nope FROM ports')).rejects.toMatchObject({ name: 'SqlError', code: '42703', position: undefined });
  });
});

describe('nhãn và chi tiết node (không chứa chữ đã dịch)', () => {
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
    expect(nodes[2].detail).toContainEqual({ kind: 'filter', text: "(status = 'X')", removed: 20000 });
    expect(nodes[3].detail).toContainEqual({ kind: 'index', text: 'customers_pkey' });
    expect(nodes[0].detail).toContainEqual({ kind: 'groupKey', text: 'a.x' });
  });
});

describe('NODE_HELP theo ngôn ngữ', () => {
  it('VI và EN cùng tập khóa', () => {
    expect(Object.keys(NODE_HELP.en).sort()).toEqual(Object.keys(NODE_HELP.vi).sort());
  });
  it('tra theo ngôn ngữ, có câu mặc định cho node lạ', () => {
    expect(nodeExplanation('Hash Join', 'vi')).toMatch(/băm/);
    expect(nodeExplanation('Hash Join', 'en')).toMatch(/hash table/);
    expect(nodeExplanation('Something New', 'vi')).toMatch(/kế hoạch/);
    expect(nodeExplanation('Something New', 'en')).toMatch(/plan/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/plan.test.ts`
Expected: FAIL — `runExplain` / `../src/viz/plan` không tồn tại.

- [ ] **Step 3: Thêm `runExplain` vào cuối `src/db/run.ts`**

`run.ts` đã có `SqlError` và `sqlErrorInfo` (Plan 1 Task 2). Lỗi của EXPLAIN cũng được ném ra dạng `SqlError`, nhưng bỏ `position`: SQL thực chạy có thêm tiền tố `EXPLAIN (…) `, nên vị trí không khớp với editor.

```ts
/** EXPLAIN ANALYZE executes the statement, so it gets the same BEGIN … ROLLBACK sandbox. */
export async function runExplain(db: PGlite, sql: string): Promise<unknown> {
  await db.exec('BEGIN');
  try {
    const r = await db.query<unknown[]>(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, [], { rowMode: 'array' });
    return r.rows[0][0];
  } catch (e) {
    const info = sqlErrorInfo(e);
    throw info ? new SqlError({ ...info, position: undefined }) : e;
  } finally {
    await db.exec('ROLLBACK');
  }
}
```

- [ ] **Step 4: Viết `src/viz/plan.ts`**

```ts
import type { Lang } from '../i18n';

export type PlanDetail = {
  kind: 'index' | 'indexCond' | 'hashCond' | 'joinFilter' | 'filter' | 'groupKey' | 'sortKey';
  /** Raw Postgres text (expression, index name). Translated labels are added by the view. */
  text: string;
  removed?: number;
};

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
  detail: PlanDetail[];
}

export interface Plan {
  nodes: PlanNode[];
  executionMs: number;
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

function detail(n: RawNode): PlanDetail[] {
  const out: PlanDetail[] = [];
  if (n['Index Name']) out.push({ kind: 'index', text: n['Index Name'] });
  if (n['Index Cond']) out.push({ kind: 'indexCond', text: n['Index Cond'] });
  if (n['Hash Cond']) out.push({ kind: 'hashCond', text: n['Hash Cond'] });
  if (n['Join Filter']) out.push({ kind: 'joinFilter', text: n['Join Filter'] });
  if (n.Filter) {
    const removed = n['Rows Removed by Filter'];
    out.push(removed ? { kind: 'filter', text: n.Filter, removed } : { kind: 'filter', text: n.Filter });
  }
  if (n['Group Key']) out.push({ kind: 'groupKey', text: n['Group Key'].join(', ') });
  if (n['Sort Key']) out.push({ kind: 'sortKey', text: n['Sort Key'].join(', ') });
  return out;
}

export function flattenPlan(json: unknown): Plan {
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

export const NODE_HELP: Record<Lang, Record<string, string>> = {
  vi: {
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
  },
  en: {
    'Seq Scan': 'Reads the whole table from start to end and checks every row. Slow when the table is large but only a few rows are needed.',
    'Index Scan': 'Uses an index to jump straight to the matching rows, then reads those rows from the table.',
    'Index Only Scan': 'Gets the data from the index itself without reading the table.',
    'Bitmap Index Scan': 'Uses an index to mark the data pages that contain matching rows.',
    'Bitmap Heap Scan': 'Reads the table pages marked by the Bitmap Index Scan.',
    'Hash Join': 'Builds a hash table from one side (the Hash node), then probes it with every row from the other side.',
    Hash: 'Builds an in-memory hash table from the rows below so the Hash Join can probe it.',
    'Nested Loop': 'For each outer row, looks up the matching inner rows. Fast when the outer side has few rows.',
    'Merge Join': 'Joins two inputs that are already sorted on the join key, walking both from top to bottom.',
    Sort: 'Sorts the rows (for ORDER BY, or to prepare a Merge Join / GroupAggregate).',
    'Incremental Sort': 'Finishes sorting data that is already sorted on part of the key.',
    Aggregate: 'Collapses many rows into summary values (COUNT, SUM, AVG…), per group when there is a GROUP BY.',
    Limit: 'Stops as soon as it has the number of rows in LIMIT.',
    Unique: 'Removes adjacent duplicate rows (DISTINCT on sorted data).',
    Materialize: 'Keeps the rows below in memory so they can be read again.',
    Memoize: 'Remembers results per key so the same value is not computed twice.',
    'Subquery Scan': 'Reads the result of a subquery as if it were a table.',
    'CTE Scan': 'Reads the result of a WITH clause.',
    WindowAgg: 'Computes window functions (RANK, LAG, SUM OVER…) for each row without collapsing rows.',
    Append: 'Concatenates the results of several branches (UNION ALL, partitioned tables).',
    SetOp: 'Performs INTERSECT / EXCEPT.',
    Result: 'Computes expressions without reading a table.',
    Gather: 'Collects results from parallel worker processes.',
  },
};

const NODE_FALLBACK: Record<Lang, string> = {
  vi: 'Một bước trong kế hoạch thực thi của Postgres.',
  en: "A step in Postgres' execution plan.",
};

export function nodeExplanation(type: string, lang: Lang): string {
  return NODE_HELP[lang][type] ?? NODE_FALLBACK[lang];
}

export function isHeavyScan(n: PlanNode): boolean {
  return n.type === 'Seq Scan' && n.scanned >= 10_000;
}
```

- [ ] **Step 5: Thêm `kind` vào giao thức worker**

Sửa `src/db/worker.ts` (bản Plan 1 Task 2 + phần `countingFetch` của Plan 1 Task 10; giữ nguyên `ready`/`timings`, dòng `globalThis.fetch = countingFetch(…)`, hàng đợi tuần tự và nhánh `catch` gửi `error: SqlErrorInfo`):

1. Thay dòng `import { runSandboxed, sqlErrorInfo } from './run';` bằng:
```ts
import type { RequestKind } from './client';
import { runExplain, runSandboxed, sqlErrorInfo } from './run';
```
2. Thêm hàm này ngay trên dòng `// One query at a time: …`:
```ts
async function handle(db: PGlite, kind: RequestKind, sql: string): Promise<unknown> {
  if (kind === 'explain') return runExplain(db, sql);
  if (kind === 'steps') {
    const { runSteps } = await import('../viz/steps'); // loads the parser only when this tab is used
    return runSteps(db, sql);
  }
  return runSandboxed(db, sql);
}
```
3. Trong `onmessage`, thay hai dòng:
```ts
onmessage = (e: MessageEvent<{ id: number; sql: string }>) => {
  const { id, sql } = e.data;
```
bằng:
```ts
onmessage = (e: MessageEvent<{ id: number; kind?: RequestKind; sql: string }>) => {
  const { id, kind = 'run', sql } = e.data;
```
và thay dòng
```ts
      postMessage({ type: 'result', id, result: await runSandboxed(db, sql) });
```
bằng:
```ts
      postMessage({ type: 'result', id, result: await handle(db, kind, sql) });
```

- [ ] **Step 6: Đưa `kind` qua hàng đợi của `DbClient`**

Sửa `src/db/client.ts` (bản Plan 1 Task 2 + Plan 1 Task 10: hàng đợi `queue`/`inFlight`/`pump()`, `QueryTimeoutError`, `DbRestartError`, `DbFailedError`, import `LoadProgress`, nhánh `progress` của `WorkerMessage`, `onProgress` đều giữ nguyên):

1. Thêm ngay dưới dòng `import { SqlError, … } from './run';`:
```ts
import type { StepsResult } from '../viz/steps';
```
và ngay dưới `export type DbStatus = …;`:
```ts
export type RequestKind = 'run' | 'explain' | 'steps';
```
2. Trong `type WorkerMessage`, đổi nhánh `result` thành:
```ts
  | { type: 'result'; id: number; result: unknown }
```
3. Thay `interface Job { … }` bằng:
```ts
interface Job {
  kind: RequestKind;
  sql: string;
  timeoutMs: number;
  resolve: (r: unknown) => void;
  reject: (e: Error) => void;
}
```
4. Thay toàn bộ method `run(sql: string): Promise<QueryResult> { … }` (cùng comment JSDoc phía trên) bằng:
```ts
  /** One queued entry point for every kind of request. Rejects with SqlError, QueryTimeoutError, DbRestartError or DbFailedError. */
  request<T>(kind: RequestKind, sql: string, timeoutMs = this.timeoutMs): Promise<T> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ kind, sql, timeoutMs, resolve: (r) => resolve(r as T), reject });
      this.pump();
    });
  }

  run(sql: string): Promise<QueryResult> {
    return this.request<QueryResult>('run', sql);
  }

  explain(sql: string): Promise<unknown> {
    return this.request<unknown>('explain', sql);
  }

  /** Several sub-queries per call, so it gets a longer budget. */
  steps(sql: string): Promise<StepsResult> {
    return this.request<StepsResult>('steps', sql, this.timeoutMs * 3);
  }
```
5. Trong `pump()`, thay khối từ `const timer = setTimeout(() => {` tới `this.worker.postMessage({ id, sql: job.sql });` bằng:
```ts
    const timer = setTimeout(() => {
      this.inFlight = undefined;
      job.reject(new QueryTimeoutError(job.timeoutMs));
      this.restart();
    }, job.timeoutMs);
    this.inFlight = { id, job, timer };
    this.worker.postMessage({ id, kind: job.kind, sql: job.sql });
```

`steps` tham chiếu `src/viz/steps.ts` (Task 3). Tạo tạm file đó để typecheck qua:
```ts
import type { PGlite } from '@electric-sql/pglite';

export type StepsResult = { ok: false; reason: string; detail?: string };
export async function runSteps(_db: PGlite, _sql: string): Promise<StepsResult> {
  return { ok: false, reason: 'notSelect' };
}
```

- [ ] **Step 7: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/plan.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS (cả test cũ của Plan 1), không lỗi kiểu.

- [ ] **Step 8: Commit**

```bash
git add src/db src/viz tests/plan.test.ts
git commit -m "feat: EXPLAIN ANALYZE in worker and plan tree model"
```

---

### Task 2: Cache theo SQL, đăng ký tab, tab EXPLAIN và tab Luồng dữ liệu

**Files:**
- Create: `src/viz/memo.ts`, `src/ui/vizTabs.ts`, `src/ui/explainView.ts`, `src/ui/flowView.ts`
- Modify: `src/ui/dom.ts`, `src/ui/work.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `src/style.css`
- Test: `tests/memo.test.ts`

**Interfaces:**
- Consumes: `flattenPlan`, `nodeExplanation`, `isHeavyScan`, `Plan`, `PlanDetail` (Task 1); `DbClient.explain`, `QueryTimeoutError`, `DbRestartError` (Task 1); `registerTab` (`src/ui/tabs.ts`), `app.lastRun` (`src/state.ts`), `t`, `getLang`, `locale`, `Key` (`src/i18n`), `h` (`src/ui/dom.ts`), `errorMessage` (`src/grader.ts`) — Plan 1
- Produces:
  - `memoByKey<T>(load: (key: string) => Promise<T>, max?: number): (key: string) => Promise<T>`; `MEMO_MAX = 20`
  - `svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Record<string, string | number>, ...children: (Node | string)[]): SVGElementTagNameMap[K]`
  - `reducedMotion(): boolean`, `fmt(n: number, digits?: number): string`
  - `renderExplain(host: HTMLElement, plan: Plan): void`, `renderFlow(host: HTMLElement, plan: Plan): void`
  - `interface VizDeps { db: DbClient; show(id: string): void; editorSql(): string }`
  - `registerVizTabs(deps: VizDeps): void` — Task 2 đăng ký `explain` (query, 20, `newAt: 'ch3-01'`) và `flow` (query, 30)
  - khóa i18n: `viz.*`, `plan.*`, `explain.*`, `flow.*`, `tab.explain`, `tab.flow`

- [ ] **Step 1: Viết test cho cache**

`tests/memo.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { memoByKey } from '../src/viz/memo';

describe('memoByKey', () => {
  it('cùng key chỉ gọi load một lần', async () => {
    let calls = 0;
    const f = memoByKey(async (k) => { calls++; return k.length; });
    expect(await f('abc')).toBe(3);
    expect(await f('abc')).toBe(3);
    expect(calls).toBe(1);
  });

  it('promise bị reject thì không giữ lại, lần sau gọi lại', async () => {
    let calls = 0;
    const f = memoByKey(async () => {
      calls++;
      if (calls === 1) throw new Error('timeout');
      return 1;
    });
    await expect(f('a')).rejects.toThrow('timeout');
    expect(await f('a')).toBe(1);
    expect(calls).toBe(2);
  });

  it('giữ tối đa max key, bỏ key cũ nhất', async () => {
    let calls = 0;
    const f = memoByKey(async (k) => { calls++; return k; }, 2);
    await f('a');
    await f('b');
    await f('c');
    await f('a');
    expect(calls).toBe(4);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/memo.test.ts`
Expected: FAIL — không resolve `../src/viz/memo`.

- [ ] **Step 3: Viết `src/viz/memo.ts`**

```ts
export const MEMO_MAX = 20;

/**
 * Caches one promise per key (SQL text or schema name). A rejected promise is dropped so the
 * next call retries (timeouts, DB restarts). Oldest key is evicted past `max`.
 */
export function memoByKey<T>(load: (key: string) => Promise<T>, max = MEMO_MAX): (key: string) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
  return (key) => {
    const hit = cache.get(key);
    if (hit) return hit;
    const p = load(key);
    cache.set(key, p);
    p.catch(() => {
      if (cache.get(key) === p) cache.delete(key);
    });
    if (cache.size > max) cache.delete(cache.keys().next().value as string);
    return p;
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/memo.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Thêm `svg()`, `reducedMotion()`, `fmt()` vào cuối `src/ui/dom.ts`**

Plan 1 Task 10 chỉ có `h`, `nodes`, `richText`, `byId` trong file này. Thêm `import { locale } from '../i18n';` vào đầu file.

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

/** Number in the current UI language: 25.677 (vi) / 25,677 (en). */
export const fmt = (n: number, digits = 2): string => n.toLocaleString(locale(), { maximumFractionDigits: digits });
```

- [ ] **Step 6: Thêm khóa i18n**

Thêm vào object `vi` trong `src/i18n/vi.ts` (Plan 1 chỉ khai `tab.result`, `tab.columns`, `tab.list`, `tab.new`, nên không trùng):
```ts
  'tab.explain': 'EXPLAIN',
  'tab.flow': 'Luồng dữ liệu',
  'viz.runFirst': 'Chạy query trước (Ctrl+Enter).',
  'viz.stale': 'SQL đã thay đổi — Ctrl+Enter để cập nhật.',
  'viz.rows': '{n} dòng',
  'viz.timeout': 'Quá {s} giây nên đã dừng. Database đang được nạp lại.',
  'viz.restarted': 'Database vừa khởi động lại, mở lại tab này để thử lại.',
  'viz.dbFailed': 'Database không khởi động được.',
  'viz.explaining': 'Đang chạy EXPLAIN ANALYZE…',
  'explain.intro': 'Giai đoạn Optimize chọn kế hoạch dưới đây; Execute chạy hết trong {ms} ms. Thanh xanh = số dòng node xử lý. Bấm vào một node để đọc giải thích.',
  'explain.heavy': 'Đọc nhiều dòng',
  'explain.estimate': 'Ước tính {est} dòng, thực tế {actual}.',
  'plan.index': 'Dùng index: {v}',
  'plan.indexCond': 'Điều kiện index: {v}',
  'plan.hashCond': 'Điều kiện ghép: {v}',
  'plan.joinFilter': 'Lọc khi ghép: {v}',
  'plan.filter': 'Lọc: {v}',
  'plan.removed': ' — bỏ {n} dòng',
  'plan.groupKey': 'Nhóm theo: {v}',
  'plan.sortKey': 'Sắp theo: {v}',
  'flow.aria': 'Luồng dữ liệu qua kế hoạch thực thi',
  'flow.intro': 'Dữ liệu chảy từ trái (đọc bảng) sang phải (kết quả). Đường càng dày càng nhiều dòng — số liệu thật từ EXPLAIN ANALYZE.',
```

Thêm vào object `en` trong `src/i18n/en.ts`:
```ts
  'tab.explain': 'EXPLAIN',
  'tab.flow': 'Data flow',
  'viz.runFirst': 'Run a query first (Ctrl+Enter).',
  'viz.stale': 'The SQL has changed — press Ctrl+Enter to update.',
  'viz.rows': (p) => `${p.n} ${p.n === 1 || p.n === '1' ? 'row' : 'rows'}`,
  'viz.timeout': 'Stopped after {s} seconds. The database is reloading.',
  'viz.restarted': 'The database just restarted; open this tab again to retry.',
  'viz.dbFailed': 'The database failed to start.',
  'viz.explaining': 'Running EXPLAIN ANALYZE…',
  'explain.intro': 'The Optimize stage chose the plan below; Execute finished in {ms} ms. Blue bar = rows the node processed. Click a node to read what it does.',
  'explain.heavy': 'Reads many rows',
  'explain.estimate': 'Estimated {est} rows, actual {actual}.',
  'plan.index': 'Index: {v}',
  'plan.indexCond': 'Index condition: {v}',
  'plan.hashCond': 'Join condition: {v}',
  'plan.joinFilter': 'Join filter: {v}',
  'plan.filter': 'Filter: {v}',
  'plan.removed': ' — removed {n} rows',
  'plan.groupKey': 'Group key: {v}',
  'plan.sortKey': 'Sort key: {v}',
  'flow.aria': 'Data flow through the execution plan',
  'flow.intro': 'Data flows from the left (table reads) to the right (result). Thicker lines carry more rows — real numbers from EXPLAIN ANALYZE.',
```
`tab.explain` giống nhau ở hai ngôn ngữ; khóa này đã nằm trong `SAME_OK` của `tests/i18n.test.ts` (Plan 1 Task 10).

- [ ] **Step 7: Viết `src/ui/explainView.ts`**

```ts
import { getLang, t, type Key } from '../i18n';
import { isHeavyScan, nodeExplanation, type Plan, type PlanDetail } from '../viz/plan';
import { fmt, h } from './dom';

const DETAIL_KEY: Record<PlanDetail['kind'], Key> = {
  index: 'plan.index',
  indexCond: 'plan.indexCond',
  hashCond: 'plan.hashCond',
  joinFilter: 'plan.joinFilter',
  filter: 'plan.filter',
  groupKey: 'plan.groupKey',
  sortKey: 'plan.sortKey',
};

const detailText = (d: PlanDetail): string =>
  t(DETAIL_KEY[d.kind], { v: d.text }) + (d.removed ? t('plan.removed', { n: fmt(d.removed) }) : '');

export function renderExplain(host: HTMLElement, plan: Plan): void {
  const max = Math.max(1, ...plan.nodes.map((n) => n.scanned));
  const lang = getLang();
  host.append(
    h('p', { class: 'muted' }, t('explain.intro', { ms: fmt(plan.executionMs, 1) })),
    h('div', { class: 'plan' }, ...plan.nodes.map((n) =>
      h('details', { class: `plan-node${isHeavyScan(n) ? ' heavy' : ''}`, style: `margin-left:${n.depth * 20}px` },
        h('summary', {},
          h('span', { class: 'plan-label' }, n.label),
          h('span', { class: 'meter', 'aria-hidden': 'true' }, h('i', { style: `width:${Math.max(2, (n.scanned / max) * 100)}%` })),
          h('span', { class: 'plan-rows' }, t('viz.rows', { n: fmt(n.rows) })),
          h('span', { class: 'muted' }, `${fmt(n.ms, 2)} ms`),
          isHeavyScan(n) ? h('span', { class: 'warn', role: 'img', 'aria-label': t('explain.heavy'), title: t('explain.heavy') }, '⚠') : null),
        h('p', {}, nodeExplanation(n.type, lang)),
        n.estRows !== n.rows ? h('p', { class: 'muted' }, t('explain.estimate', { est: fmt(n.estRows), actual: fmt(n.rows) })) : null,
        ...n.detail.map((d) => h('p', {}, h('code', {}, detailText(d))))))),
  );
}
```

- [ ] **Step 8: Viết `src/ui/flowView.ts`**

```ts
import { t } from '../i18n';
import type { Plan, PlanNode } from '../viz/plan';
import { fmt, h, reducedMotion, svg } from './dom';

const COL = 210;
const ROW = 64;
const BOX_W = 168;
const BOX_H = 40;

/** Leaves on the left, root on the right; edge width grows with log(rows). */
export function renderFlow(host: HTMLElement, plan: Plan): void {
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

  const root = svg('svg', { viewBox: `-10 -10 ${width} ${height + 10}`, role: 'img', 'aria-label': t('flow.aria'), class: 'flow' });
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
    const rows = t('viz.rows', { n: fmt(n.rows) });
    root.append(svg('g', { transform: `translate(${x(n)},${y.get(n.id)})` },
      svg('title', {}, `${n.label}: ${rows}`),
      svg('rect', { width: BOX_W, height: BOX_H, rx: 6, class: 'flow-box' }),
      svg('text', { x: 8, y: 16, class: 'flow-label' }, label),
      svg('text', { x: 8, y: 32, class: 'flow-rows' }, rows)));
  }
  host.append(
    h('p', { class: 'muted' }, t('flow.intro')),
    h('div', { class: 'flow-wrap' }, root),
  );
}
```

- [ ] **Step 9: Viết `src/ui/vizTabs.ts`**

```ts
import { DbFailedError, DbRestartError, QueryTimeoutError, type DbClient } from '../db/client';
import { errorMessage } from '../grader';
import { t } from '../i18n';
import { app } from '../state';
import { memoByKey } from '../viz/memo';
import { flattenPlan, type Plan } from '../viz/plan';
import { h } from './dom';
import { renderExplain } from './explainView';
import { renderFlow } from './flowView';
import { registerTab } from './tabs';

export interface VizDeps {
  db: DbClient;
  /** Switches the bottom panel to a tab (Panel.show). */
  show(id: string): void;
  /** Current editor text — only used to flag that lastRun is out of date. */
  editorSql(): string;
}

function errorText(e: unknown): string {
  if (e instanceof QueryTimeoutError) return t('viz.timeout', { s: e.timeoutMs / 1000 });
  if (e instanceof DbRestartError) return t('viz.restarted');
  if (e instanceof DbFailedError) return `${t('viz.dbFailed')}\n${e.detail}`;
  return errorMessage(e); // Postgres' own message, never translated
}

/** Every viz tab describes the last run, not the editor. Returns its SQL, or undefined after drawing the empty state. */
function lastRunSql(host: HTMLElement, deps: VizDeps): string | undefined {
  const run = app.lastRun;
  if (!run) {
    host.append(h('p', { class: 'muted' }, t('viz.runFirst')));
    return undefined;
  }
  if (deps.editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('viz.stale')));
  return run.sql;
}

/** Shows a loading line, then replaces it with draw(value) or the error. The stale strip above stays. */
async function load<T>(host: HTMLElement, loading: string, data: Promise<T>, draw: (body: HTMLElement, value: T) => void): Promise<void> {
  const body = h('div', {}, h('p', { class: 'muted' }, loading));
  host.append(body);
  try {
    const value = await data;
    body.replaceChildren();
    draw(body, value);
  } catch (e) {
    body.replaceChildren(h('pre', { class: 'error' }, errorText(e)));
  }
}

function registerPlanTabs(deps: VizDeps): void {
  const planFor = memoByKey((sql) => deps.db.explain(sql).then(flattenPlan));
  const withPlan = (draw: (host: HTMLElement, plan: Plan) => void) => (host: HTMLElement) => {
    const sql = lastRunSql(host, deps);
    return sql === undefined ? undefined : load(host, t('viz.explaining'), planFor(sql), draw);
  };
  registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, newAt: 'ch3-01', render: withPlan(renderExplain) });
  registerTab({ id: 'flow', label: 'tab.flow', group: 'query', order: 30, render: withPlan(renderFlow) });
}

/** Called once from main.ts, before the panel is created. */
export function registerVizTabs(deps: VizDeps): void {
  registerPlanTabs(deps);
}
```

- [ ] **Step 10: Gắn vào `src/main.ts` và nút EXPLAIN trong `src/ui/work.ts`**

1. `src/main.ts` — thêm import:
```ts
import { registerVizTabs } from './ui/vizTabs';
```
và ngay sau dòng `const db = new DbClient(…);`, **trước** chỗ panel được tạo, thêm:
```ts
registerVizTabs({ db, show: (id) => panel.show(id), editorSql: () => work.currentSql() });
```
(`panel` và `work` chỉ được đọc khi tab render, lúc đó cả hai đã được tạo.)

2. `src/ui/work.ts` — trong `mountWork`, ngay sau khi tạo `runBtn`, thêm:
```ts
  // EXPLAIN always describes what was just run: run the editor SQL first, then open the tab.
  const explainBtn = h('button', { type: 'button', onclick: () => void run().then(() => deps.panel.show('explain')) }, t('tab.explain'));
```
và trong hàng `h('div', { class: 'actions' }, runBtn, …)` chèn `explainBtn` ngay sau `runBtn`. Nhãn `EXPLAIN` giống nhau ở hai ngôn ngữ nên `relabel()` không cần đổi nút này.

- [ ] **Step 11: Thêm CSS vào cuối `src/style.css`**

```css
:root {
  --sql-bg: #1e1e1e; --sql-text: #d4d4d4; --sql-dim: #9a9aa0; --sql-mark: #264f78; --on-dark: #ffffff;
  --edge: #9cc3e8; --lane-closed: #a9b4bf;
}
@media (prefers-color-scheme: dark) {
  :root { --edge: #2f5d8a; --lane-closed: #59636d; }
}
.plan-node { border: 1px solid var(--border); border-radius: 6px; margin: 4px 0; padding: 4px 8px; background: var(--code); }
.plan-node summary { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; cursor: pointer; }
.plan-node.heavy { border-color: var(--warn); }
.plan-label { font-weight: 600; min-width: 200px; }
.plan-rows { min-width: 90px; }
.meter { flex: 1; min-width: 80px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.meter i { display: block; height: 100%; background: var(--accent); }
.flow-wrap { overflow: auto; }
.flow { min-width: 480px; width: 100%; height: auto; }
.flow-edge { fill: none; stroke: var(--edge); }
.flow-dot { fill: var(--accent); }
.flow-box { fill: var(--panel); stroke: var(--border); }
.flow-label { font: 600 12px system-ui, sans-serif; fill: var(--text); }
.flow-rows { font: 12px system-ui, sans-serif; fill: var(--accent); }
```

- [ ] **Step 12: Kiểm tra kiểu, build và kiểm thủ công**

Run: `npx vitest run && npx tsc --noEmit && npm run build`, rồi `npm run dev`.
Kiểm:
1. Thanh tab có EXPLAIN và Luồng dữ liệu trong nhóm giữa. Mở EXPLAIN khi chưa chạy gì → "Chạy query trước (Ctrl+Enter)."
2. Gõ query TEU theo hãng tàu ở test Task 1 → bấm nút **EXPLAIN** cạnh nút Chạy → query chạy (tab Kết quả có dữ liệu nếu mở) rồi tab EXPLAIN hiện cây thụt lề; node `Seq Scan containers` có ⚠ và `25.677 dòng`; bấm node → giải thích tiếng Việt, dòng `Lọc: … — bỏ N dòng`.
3. Sang tab **Luồng dữ liệu** → sơ đồ trái→phải, đường dày ở các scan lớn, chấm chạy dọc cạnh. Tab hiện ngay, không qua dòng "Đang chạy EXPLAIN ANALYZE…" (đã cache theo SQL).
4. Sửa một ký tự trong editor (không chạy) → mở lại tab EXPLAIN → dải "SQL đã thay đổi — Ctrl+Enter để cập nhật" ở trên, cây vẫn là của SQL cũ. Ctrl+Enter → dải biến mất, cây theo SQL mới.
5. Bấm `EN` trên topbar → tab EXPLAIN vẽ lại bằng tiếng Anh, số thành `25,677 rows`, không chạy lại EXPLAIN; editor giữ nguyên con trỏ.
6. Bật "Reduce motion" trong hệ điều hành → chấm không chạy. Query lỗi cú pháp → Chạy → tab EXPLAIN hiện lỗi gốc Postgres.

- [ ] **Step 13: Commit**

```bash
git add src/viz/memo.ts src/ui src/main.ts src/i18n src/style.css tests/memo.test.ts
git commit -m "feat: EXPLAIN tree and data-flow tabs from the last run"
```

---

### Task 3: Thứ tự thực thi logic — dựng các bước

**Files:**
- Create: `src/viz/parser.ts`; thay file tạm `src/viz/steps.ts`
- Test: `tests/steps.test.ts`

**Interfaces:**
- Consumes: `runSandboxed`, `QueryResult` (Plan 1); `type Lang` (`src/i18n`); `seededDb` (tests)
- Produces:
  - `type StepKey = 'from' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit'`
  - `STEP_LABELS: Record<Lang, Record<StepKey, string>>`, `STEP_HELP: Record<Lang, Record<StepKey, string>>`
  - `type StepsFailure = 'syntax' | 'multi' | 'notSelect' | 'withUnion' | 'window'`
  - `ensureParser(): Promise<void>`
  - `clauseRanges(sql: string): Promise<Partial<Record<StepKey, [number, number]>>>`
  - `buildSteps(sql: string): Promise<{ ok: true; steps: { key: StepKey; sql: string | null }[]; ranges: Partial<Record<StepKey, [number, number]>> } | { ok: false; reason: StepsFailure; detail?: string }>`
  - `interface StepRun { key: StepKey; skipped: boolean; count?: number; sample?: QueryResult; sql?: string; error?: string }`
  - `type StepsResult = { ok: true; steps: StepRun[]; ranges: Partial<Record<StepKey, [number, number]>> } | { ok: false; reason: StepsFailure; detail?: string }`
  - `runSteps(db: PGlite, sql: string): Promise<StepsResult>`

- [ ] **Step 1: Cài parser và kiểm SharedArrayBuffer**

Run:
```bash
npm i --save-exact libpg-query@18.2.4 pgsql-deparser@18.4.5
grep -rl "SharedArrayBuffer" node_modules/libpg-query node_modules/pgsql-deparser --include=*.js --include=*.mjs
```
Expected: `package.json` có `"libpg-query": "18.2.4"`, `"pgsql-deparser": "18.4.5"` (không có `^`). Lệnh grep không in dòng nào. Nếu có file khớp: mở file, xem `SharedArrayBuffer` chỉ nằm trong nhánh kiểm tính năng (`typeof SharedArrayBuffer !== 'undefined'`) hay là bắt buộc; nếu bắt buộc thì dừng và báo user (cần COOP/COEP, GitHub Pages không đặt được — D6).

- [ ] **Step 2: Viết test**

`tests/steps.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildSteps, runSteps, STEP_HELP, STEP_LABELS } from '../src/viz/steps';
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
    expect(r.steps[2].sample!.columns).toContain('row_count');
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

  it('trả mã lý do (không phải chữ) thay vì throw', async () => {
    const cases: [string, string][] = [
      ['WITH x AS (SELECT 1) SELECT * FROM x', 'withUnion'],
      ['SELECT 1 UNION SELECT 2', 'withUnion'],
      ['SELECT id, rank() OVER (ORDER BY id) FROM ports', 'window'],
      ['SELEC 1', 'syntax'],
      ["UPDATE ports SET name = 'x'", 'notSelect'],
      ['SELECT 1; SELECT 2', 'multi'],
    ];
    for (const [q, reason] of cases) {
      const r = await buildSteps(q);
      expect(r.ok, q).toBe(false);
      if (!r.ok) expect(r.reason, q).toBe(reason);
    }
  });
});

describe('STEP_LABELS / STEP_HELP theo ngôn ngữ', () => {
  it('VI và EN cùng tập khóa', () => {
    expect(Object.keys(STEP_LABELS.en).sort()).toEqual(Object.keys(STEP_LABELS.vi).sort());
    expect(Object.keys(STEP_HELP.en).sort()).toEqual(Object.keys(STEP_HELP.vi).sort());
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/steps.test.ts`
Expected: FAIL — `buildSteps` / `STEP_LABELS` chưa tồn tại (file tạm chỉ có `runSteps`).

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
import type { Lang } from '../i18n';
import { ensureParser } from './parser';

export type StepKey = 'from' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit';
export type StepsFailure = 'syntax' | 'multi' | 'notSelect' | 'withUnion' | 'window';

const SQL_LABELS: Record<StepKey, string> = {
  from: 'FROM + JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING',
  select: 'SELECT', distinct: 'DISTINCT', order: 'ORDER BY', limit: 'LIMIT',
};

/** Clause names are SQL keywords, the same in both languages. */
export const STEP_LABELS: Record<Lang, Record<StepKey, string>> = { vi: SQL_LABELS, en: SQL_LABELS };

export const STEP_HELP: Record<Lang, Record<StepKey, string>> = {
  vi: {
    from: 'Lấy dữ liệu từ các bảng và ghép chúng theo điều kiện JOIN. Đây là bước chạy đầu tiên.',
    where: 'Giữ lại từng dòng thỏa điều kiện. Chạy trước khi gom nhóm nên chưa dùng được hàm gộp hay alias của SELECT.',
    group: 'Gom các dòng có cùng giá trị khóa thành một nhóm (cột row_count = số dòng trong nhóm).',
    having: 'Lọc các nhóm theo kết quả hàm gộp, ví dụ SUM(...) > 900.',
    select: 'Tính các cột đầu ra và đặt alias. Viết đầu tiên nhưng chạy sau GROUP BY / HAVING.',
    distinct: 'Bỏ các dòng trùng nhau trong kết quả.',
    order: 'Sắp xếp kết quả. Chạy sau SELECT nên dùng được alias.',
    limit: 'Chỉ giữ số dòng đầu tiên theo LIMIT / OFFSET. Chạy cuối cùng.',
  },
  en: {
    from: 'Reads the tables and joins them on the JOIN conditions. This step runs first.',
    where: 'Keeps each row that matches the condition. It runs before grouping, so aggregates and SELECT aliases are not available yet.',
    group: 'Collects rows with the same key values into one group (column row_count = rows in the group).',
    having: 'Filters groups on an aggregate result, for example SUM(...) > 900.',
    select: 'Computes the output columns and their aliases. Written first, but runs after GROUP BY / HAVING.',
    distinct: 'Removes duplicate rows from the result.',
    order: 'Sorts the result. It runs after SELECT, so aliases work here.',
    limit: 'Keeps only the first rows per LIMIT / OFFSET. Runs last.',
  },
};

export interface StepRun { key: StepKey; skipped: boolean; count?: number; sample?: QueryResult; sql?: string; error?: string }
type Ranges = Partial<Record<StepKey, [number, number]>>;
type Failure = { ok: false; reason: StepsFailure; detail?: string };
export type StepsResult = { ok: true; steps: StepRun[]; ranges: Ranges } | Failure;
type Built = { ok: true; steps: { key: StepKey; sql: string | null }[]; ranges: Ranges } | Failure;

// libpg-query's AST is a large tagged union; these helpers only touch a few well-known fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ast = any;

const STAR = [{ ResTarget: { val: { ColumnRef: { fields: [{ A_Star: {} }] } } } }];
// Language-neutral alias: results are cached across a VI/EN switch.
const COUNT = { ResTarget: { name: 'row_count', val: { FuncCall: { funcname: [{ String: { sval: 'count' } }], agg_star: true } } } };

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
    return { ok: false, reason: 'syntax', detail: e instanceof Error ? e.message : String(e) };
  }
  if (tree.stmts?.length !== 1) return { ok: false, reason: 'multi' };
  const sel: Ast = tree.stmts[0].stmt?.SelectStmt;
  if (!sel) return { ok: false, reason: 'notSelect' };
  if (sel.withClause || (sel.op && sel.op !== 'SETOP_NONE')) return { ok: false, reason: 'withUnion' };
  if (JSON.stringify(sel.targetList ?? []).includes('"over"')) return { ok: false, reason: 'window' };

  const wrap = async (o: Ast) =>
    deparse({ version: tree.version, stmts: [{ stmt: { SelectStmt: { limitOption: 'LIMIT_OPTION_DEFAULT', op: 'SETOP_NONE', ...o } } }] });
  const base = { fromClause: sel.fromClause, whereClause: sel.whereClause };
  // Group by the resolved expressions too: the sub-query has no SELECT alias or ordinal to refer to.
  const keys = groupKeys(sel);
  const groupTargets = [...keys.map((val) => ({ ResTarget: { val } })), COUNT];
  const noTail = { limitCount: undefined, limitOffset: undefined };
  const plan: [StepKey, boolean, Ast][] = [
    ['from', !!sel.fromClause, { targetList: STAR, fromClause: sel.fromClause }],
    ['where', !!sel.fromClause && !!sel.whereClause, { targetList: STAR, ...base }],
    ['group', !!sel.groupClause, { targetList: groupTargets, ...base, groupClause: keys }],
    ['having', !!sel.havingClause, { targetList: groupTargets, ...base, groupClause: keys, havingClause: sel.havingClause }],
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
Expected: PASS (đã chạy thử với libpg-query 18.2.4: `GROUP BY 1` cho dạng `{"A_Const":{"ival":{"ival":1}}}`; bước group/having nhóm theo biểu thức đã quy đổi `keys`, nếu không thì `GROUP BY m` lỗi vì truy vấn con không còn alias `m`).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/viz tests/steps.test.ts
git commit -m "feat: logical query order steps via Postgres parser"
```

---

### Task 4: Tab Thứ tự thực thi

**Files:**
- Create: `src/ui/stepsView.ts`
- Modify: `src/ui/vizTabs.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `src/style.css`

**Interfaces:**
- Consumes: `StepsResult`, `StepsFailure`, `STEP_LABELS`, `STEP_HELP`, `StepKey` (Task 3); `DbClient.steps` (Task 1); `memoByKey`, `registerVizTabs`, `lastRunSql`, `load` (Task 2); `renderResult` (Plan 1); `fmt`, `h` (Task 2); `t`, `getLang`, `Key` (Plan 1)
- Produces:
  - `renderSteps(host: HTMLElement, sql: string, result: StepsResult, goExplain: () => void): void`
  - tab `steps` (query, 10) với cache `stepsFor(sql)` trong `vizTabs.ts`
  - khóa i18n: `tab.steps`, `steps.*`

- [ ] **Step 1: Thêm khóa i18n**

`src/i18n/vi.ts`:
```ts
  'tab.steps': 'Thứ tự thực thi',
  'steps.running': 'Đang chạy từng bước…',
  'steps.syntax': 'Câu SQL chưa đúng cú pháp: {msg}',
  'steps.multi': 'Chỉ hỗ trợ đúng một câu lệnh.',
  'steps.notSelect': 'Chỉ hỗ trợ câu SELECT.',
  'steps.withUnion': 'Query có WITH hoặc UNION — xem tab EXPLAIN.',
  'steps.window': 'Query có window function — xem tab EXPLAIN.',
  'steps.seeExplain': 'Xem EXPLAIN',
  'steps.stage1': '1 · Phân tích (Parse)',
  'steps.stage2': '2 · Biến đổi (Transform)',
  'steps.stage3': '3 · Tối ưu (Optimize)',
  'steps.stage4': '4 · Thực thi (Execute)',
  'steps.toExplain': 'Xem kế hoạch Postgres đã chọn',
  'steps.play': '▶ Phát',
  'steps.pause': '⏸ Dừng',
  'steps.pipe': 'Các bước thực thi',
  'steps.unused': 'không dùng',
  'steps.error': 'lỗi',
  'steps.groups': '{n} nhóm',
  'steps.title': 'Bước {i} · {label}',
  'steps.before': 'Trước',
  'steps.after': 'Sau',
  'steps.sample': 'Dòng mẫu sau bước này (tối đa 5):',
  'steps.sql': 'SQL Postgres chạy cho bước này',
```

`src/i18n/en.ts`:
```ts
  'tab.steps': 'Execution order',
  'steps.running': 'Running each step…',
  'steps.syntax': 'The SQL has a syntax error: {msg}',
  'steps.multi': 'Only a single statement is supported.',
  'steps.notSelect': 'Only SELECT statements are supported.',
  'steps.withUnion': 'The query uses WITH or UNION — see the EXPLAIN tab.',
  'steps.window': 'The query uses a window function — see the EXPLAIN tab.',
  'steps.seeExplain': 'See EXPLAIN',
  'steps.stage1': '1 · Parse',
  'steps.stage2': '2 · Transform',
  'steps.stage3': '3 · Optimize',
  'steps.stage4': '4 · Execute',
  'steps.toExplain': 'See the plan Postgres chose',
  'steps.play': '▶ Play',
  'steps.pause': '⏸ Pause',
  'steps.pipe': 'Execution steps',
  'steps.unused': 'not used',
  'steps.error': 'error',
  'steps.groups': (p) => `${p.n} ${p.n === 1 || p.n === '1' ? 'group' : 'groups'}`,
  'steps.title': 'Step {i} · {label}',
  'steps.before': 'Before',
  'steps.after': 'After',
  'steps.sample': 'Sample rows after this step (up to 5):',
  'steps.sql': 'SQL Postgres ran for this step',
```

- [ ] **Step 2: Viết `src/ui/stepsView.ts`**

```ts
import { getLang, t, type Key } from '../i18n';
import { STEP_HELP, STEP_LABELS, type StepKey, type StepsFailure, type StepsResult } from '../viz/steps';
import { fmt, h } from './dom';
import { renderResult } from './resultTable';

const STAGES: Key[] = ['steps.stage1', 'steps.stage2', 'steps.stage3', 'steps.stage4'];
const REASON: Record<StepsFailure, Key> = {
  syntax: 'steps.syntax', multi: 'steps.multi', notSelect: 'steps.notSelect', withUnion: 'steps.withUnion', window: 'steps.window',
};

export function renderSteps(host: HTMLElement, sql: string, result: StepsResult, goExplain: () => void): void {
  const labels = STEP_LABELS[getLang()];
  const help = STEP_HELP[getLang()];
  const stages = h('div', { class: 'stages' }, ...STAGES.map((key, i) =>
    i === 2
      ? h('button', { type: 'button', class: 'stage', onclick: goExplain, title: t('steps.toExplain') }, `${t(key)} → EXPLAIN`)
      : h('span', { class: `stage${i === 3 ? ' on' : ''}` }, t(key))));
  if (!result.ok) {
    host.append(stages, h('p', { class: 'muted' }, t(REASON[result.reason], { msg: result.detail ?? '' })));
    if (result.reason === 'withUnion' || result.reason === 'window') {
      host.append(h('button', { type: 'button', onclick: goExplain }, t('steps.seeExplain')));
    }
    return;
  }
  const { steps, ranges } = result;
  const live = steps.filter((s) => !s.skipped && s.error === undefined);
  let current = steps.indexOf(live[1] ?? live[0] ?? steps[0]);
  let timer: number | undefined;

  const pipe = h('div', { class: 'pipe', role: 'group', 'aria-label': t('steps.pipe') });
  const detail = h('div', { class: 'step-detail' });
  const playBtn = h('button', { type: 'button' }, t('steps.play'));

  const prevCount = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (steps[j].count !== undefined) return steps[j].count!;
    return undefined;
  };
  const unit = (key: StepKey, n: number) =>
    key === 'group' || key === 'having' ? t('steps.groups', { n: fmt(n) }) : t('viz.rows', { n: fmt(n) });

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
        type: 'button',
        class: `st${i === current ? ' on' : ''}${s.skipped ? ' skip' : ''}${s.error ? ' err' : ''}`,
        'aria-current': i === current ? 'step' : false,
        onclick: () => { stop(); current = i; draw(); },
      },
        h('b', {}, labels[s.key]),
        s.skipped ? h('span', {}, t('steps.unused'))
          : s.error ? h('span', {}, t('steps.error'))
          : h('span', { class: 'n' }, unit(s.key, s.count!))),
    ].filter((x): x is HTMLElement => x !== null)));

    const s = steps[current];
    const before = prevCount(current);
    detail.replaceChildren(
      h('h3', {}, t('steps.title', { i: current + 1, label: labels[s.key] })),
      h('p', {}, help[s.key]),
      s.count !== undefined && before !== undefined
        ? h('div', { class: 'compare', 'aria-label': `${fmt(before)} → ${fmt(s.count)}` },
            h('div', { class: 'bar-row' }, h('span', {}, t('steps.before')), h('i', { style: 'width:100%' }), h('span', {}, fmt(before))),
            h('div', { class: 'bar-row' }, h('span', {}, t('steps.after')), h('i', { style: `width:${before ? Math.max(1, (s.count / before) * 100) : 100}%` }), h('span', {}, fmt(s.count))))
        : '',
      highlighted(s.key),
      s.error ? h('pre', { class: 'error' }, s.error) : '',
      s.sample ? h('div', {}, h('p', { class: 'muted' }, t('steps.sample')), renderResult(s.sample)) : '',
      s.sql ? h('details', {}, h('summary', {}, t('steps.sql')), h('pre', { class: 'sql' }, s.sql)) : '',
    );
  }

  function stop(): void {
    clearInterval(timer);
    timer = undefined;
    playBtn.textContent = t('steps.play');
  }
  playBtn.addEventListener('click', () => {
    if (timer) return stop();
    playBtn.textContent = t('steps.pause');
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

- [ ] **Step 3: Đăng ký tab trong `src/ui/vizTabs.ts`**

1. Thêm import:
```ts
import { renderSteps } from './stepsView';
```
2. Thêm hàm này ngay trên `export function registerVizTabs`:
```ts
function registerStepsTab(deps: VizDeps): void {
  // Same idea as planFor: re-rendering (language switch, tab switch) never re-runs the sub-queries.
  const stepsFor = memoByKey((sql) => deps.db.steps(sql));
  registerTab({
    id: 'steps',
    label: 'tab.steps',
    group: 'query',
    order: 10,
    render: (host) => {
      const sql = lastRunSql(host, deps);
      return sql === undefined
        ? undefined
        : load(host, t('steps.running'), stepsFor(sql), (body, r) => renderSteps(body, sql, r, () => deps.show('explain')));
    },
  });
}
```
3. Trong `registerVizTabs`, thêm dòng `registerStepsTab(deps);` ngay **trước** `registerPlanTabs(deps);`.

- [ ] **Step 4: Thêm CSS vào cuối `src/style.css`**

```css
.stages { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; font-size: 13px; }
.stage { padding: 3px 10px; border-radius: 12px; background: var(--code); border: 1px solid var(--border); }
.stage.on { background: var(--bar); color: var(--on-dark); }
.pipe { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; }
.st { display: flex; flex-direction: column; align-items: flex-start; min-width: 96px; background: var(--code); }
.st .n { font-size: 16px; font-weight: 700; color: var(--accent); }
.st.on { border-color: var(--accent); background: var(--accent-soft); }
.st.skip { border-style: dashed; color: var(--muted); }
.st.err { border-color: var(--bad); }
.arrow { color: var(--muted); }
pre.sql { background: var(--sql-bg); color: var(--sql-text); padding: 8px; border-radius: 6px; font-size: 12px; overflow: auto; white-space: pre-wrap; }
pre.sql mark { background: var(--sql-mark); color: var(--on-dark); border-radius: 2px; }
pre.sql .dim { color: var(--sql-dim); }
.compare { margin: 8px 0; max-width: 520px; }
.bar-row { display: grid; grid-template-columns: 48px 1fr 80px; gap: 8px; align-items: center; font-size: 13px; }
.bar-row i { display: block; height: 10px; background: var(--accent); border-radius: 4px; }
@media (prefers-reduced-motion: no-preference) { .bar-row i { transition: width 0.4s ease; } }
```

- [ ] **Step 5: Kiểm tra kiểu, build, kiểm thủ công**

Run: `npx vitest run && npx tsc --noEmit && npm run build` — xác nhận `dist/assets` có `libpg-query-*.wasm`. Rồi `npm run dev`:
1. Dán query `Q` của test Task 3 vào editor → Ctrl+Enter → tab **Thứ tự thực thi** → thấy 4 giai đoạn, chuỗi 8 bước với 25.677 → 3.167 → 6 → 5 → 5 → (DISTINCT nét đứt, "không dùng") → 5 → 3; bước WHERE được chọn sẵn, mệnh đề WHERE được tô trong SQL, phần còn lại màu xám (không mờ), có 5 dòng mẫu.
2. Bấm **▶ Phát** → tự chạy qua các bước mỗi 1,5 giây; bấm lại để dừng.
3. Bấm "3 · Tối ưu (Optimize) → EXPLAIN" → sang tab EXPLAIN.
4. Bấm `EN` → tab vẽ lại bằng tiếng Anh (`25,677 rows`, `6 groups`) **ngay**, không hiện "Running each step…" (đã cache).
5. Gõ `WITH x AS (SELECT 1) SELECT * FROM x` → Ctrl+Enter → tab báo "Query có WITH hoặc UNION — xem tab EXPLAIN" kèm nút **Xem EXPLAIN**.
6. DevTools → Network: `libpg-query-*.wasm` chỉ tải khi mở tab này lần đầu.

- [ ] **Step 6: Commit**

```bash
git add src/ui/stepsView.ts src/ui/vizTabs.ts src/i18n src/style.css
git commit -m "feat: logical execution order tab"
```

---

### Task 5: Biểu đồ kết quả

**Files:**
- Create: `src/viz/chart.ts`, `src/ui/chartView.ts`
- Modify: `src/ui/vizTabs.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `src/style.css`
- Test: `tests/chart.test.ts`

**Interfaces:**
- Consumes: `QueryResult` (Plan 1); `svg`, `fmt`, `h`, `lastRunSql`, `registerVizTabs` (Task 2); `formatCell` (Plan 1); `app.lastRun`, `t` (Plan 1); `runner` (tests)
- Produces:
  - `type ChartSpec = { kind: 'bar' | 'line'; label: number; values: number[] }`
  - `MAX_POINTS = 60`, `chartSpec(r: QueryResult): ChartSpec | null`
  - `renderChart(host: HTMLElement, r: QueryResult): void`
  - tab `chart` (output, 20, `newAt: 'ch2-01'`); khóa i18n `tab.chart`, `chart.*`

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

- [ ] **Step 5: Thêm khóa i18n**

`src/i18n/vi.ts`:
```ts
  'tab.chart': 'Biểu đồ',
  'chart.empty': 'Biểu đồ tự bật khi kết quả có dạng (nhãn, số…) hoặc (ngày, số…), tối đa {max} dòng.',
  'chart.runError': 'Lần chạy gần nhất bị lỗi — xem tab Kết quả.',
  'chart.valueCol': 'Cột giá trị: ',
  'chart.barAria': 'Biểu đồ cột theo {col}',
  'chart.lineAria': 'Biểu đồ đường theo {col}',
```
`src/i18n/en.ts`:
```ts
  'tab.chart': 'Chart',
  'chart.empty': 'The chart appears when the result looks like (label, number…) or (date, number…), up to {max} rows.',
  'chart.runError': 'The last run failed — see the Result tab.',
  'chart.valueCol': 'Value column: ',
  'chart.barAria': 'Bar chart of {col}',
  'chart.lineAria': 'Line chart of {col}',
```

- [ ] **Step 6: Viết `src/ui/chartView.ts`**

```ts
import type { QueryResult } from '../db/run';
import { t } from '../i18n';
import { chartSpec, MAX_POINTS, type ChartSpec } from '../viz/chart';
import { fmt, h, svg } from './dom';
import { formatCell } from './resultTable';

const W = 720;

function bars(r: QueryResult, spec: ChartSpec, col: number): SVGSVGElement {
  const rowH = 24;
  const labelW = 200;
  const vals = r.rows.map((row) => Number(row[col] ?? 0));
  const max = Math.max(1, ...vals.map(Math.abs));
  const height = r.rows.length * rowH + 8;
  return svg('svg', { viewBox: `0 0 ${W} ${height}`, class: 'chart', role: 'img', 'aria-label': t('chart.barAria', { col: r.columns[col] }) },
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
  const x = (tm: number) => pad.l + ((tm - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - vmin) / Math.max(1, vmax - vmin)) * (H - pad.t - pad.b);
  return svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': t('chart.lineAria', { col: r.columns[col] }) },
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
    host.append(h('p', { class: 'muted' }, t('chart.empty', { max: MAX_POINTS })));
    return;
  }
  const area = h('div', { class: 'chart-wrap' });
  const draw = (col: number) => area.replaceChildren(spec.kind === 'bar' ? bars(r, spec, col) : line(r, spec, col));
  const picker = spec.values.length > 1
    ? h('label', {}, t('chart.valueCol'), (() => {
        const sel = h('select', {}, ...spec.values.map((i) => h('option', { value: String(i) }, r.columns[i])));
        sel.addEventListener('change', () => draw(Number(sel.value)));
        return sel;
      })())
    : null;
  host.append(picker ?? '', area);
  draw(spec.values[0]);
}
```

- [ ] **Step 7: Đăng ký tab trong `src/ui/vizTabs.ts` và CSS**

1. Thêm import:
```ts
import { renderChart } from './chartView';
```
2. Thêm hàm ngay trên `export function registerVizTabs`:
```ts
function registerChartTab(deps: VizDeps): void {
  registerTab({
    id: 'chart',
    label: 'tab.chart',
    group: 'output',
    order: 20,
    newAt: 'ch2-01',
    render: (host) => {
      if (lastRunSql(host, deps) === undefined) return;
      const result = app.lastRun?.result;
      if (result) renderChart(host, result);
      else host.append(h('p', { class: 'muted' }, t('chart.runError')));
    },
  });
}
```
3. Trong `registerVizTabs`, thêm `registerChartTab(deps);` làm dòng đầu tiên.
4. Cuối `src/style.css`:
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

- [ ] **Step 8: Kiểm thủ công và commit**

Run: `npx vitest run && npx tsc --noEmit && npm run dev`.
1. Tab **Biểu đồ** nằm ngay sau Kết quả (nhóm đầu).
2. Chạy `ch3-02` → tab **Biểu đồ** → 6 cột ngang theo hãng tàu, rê chuột thấy số.
3. Chạy `SELECT date_trunc('month', booking_date)::date, count(*), SUM(gross_weight_kg) FROM shipments GROUP BY 1 ORDER BY 1` → biểu đồ đường 24 điểm, có ô chọn "Cột giá trị".
4. Chạy `SELECT * FROM ports` → thông báo không vẽ. Chạy SQL lỗi → "Lần chạy gần nhất bị lỗi — xem tab Kết quả."
5. Bấm `EN` → nhãn số đổi `1.234,5` → `1,234.5`.

```bash
git add src/viz/chart.ts src/ui/chartView.ts src/ui/vizTabs.ts src/i18n src/style.css tests/chart.test.ts
git commit -m "feat: automatic bar/line chart for the last run"
```

---

### Task 6: Sơ đồ ER chuẩn (Mermaid, crow's foot), theo schema

**Files:**
- Create: `src/viz/erd.ts`, `src/ui/erdView.ts`
- Modify: `src/ui/vizTabs.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `src/style.css`
- Test: `tests/erd.test.ts`

**Interfaces:**
- Consumes: `unlockedTables`, `app.lastRun` (`src/state.ts`, Plan 1); `runSandboxed`, `QueryResult` (Plan 1); `DbClient.run`; `memoByKey`, `registerVizTabs` (Task 2); `runner`, `freshDb` (tests)
- Produces:
  - `erColumnsSql(schema: string): string`, `erConstraintsSql(schema: string): string` — throw `Error` khi tên schema không khớp `/^[a-z_][a-z0-9_]*$/`
  - `interface ErColumn { table: string; name: string; type: string; nullable: boolean }`
  - `interface ErConstraint { table: string; column: string; kind: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY'; refTable: string | null }`
  - `interface ErMetadata { cols: ErColumn[]; cons: ErConstraint[] }`
  - `toErColumns(r: QueryResult): ErColumn[]`, `toErConstraints(r: QueryResult): ErConstraint[]`
  - `loadErMetadata(run: (sql: string) => Promise<QueryResult>, schema: string): Promise<ErMetadata>` — Plan Import gọi với `'sandbox'`
  - `erDefinition(cols: ErColumn[], cons: ErConstraint[], tables: string[], highlight: Set<string>): string`
  - `tablesInQuery(sql: string, known: string[]): Set<string>` — dùng lại cho content lint B6
  - `renderErd(host: HTMLElement, definition: string): Promise<void>`
  - tab `erd` (schema, 10); khóa i18n `tab.erd`, `erd.*`

- [ ] **Step 1: Viết test**

`tests/erd.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { runSandboxed } from '../src/db/run';
import { erColumnsSql, erDefinition, loadErMetadata, tablesInQuery } from '../src/viz/erd';
import { freshDb, runner } from './helpers';

const CH2 = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];

describe('erDefinition (schema public)', () => {
  it('quan hệ crow\'s foot và khóa từ information_schema', async () => {
    const { cols, cons } = await loadErMetadata(await runner(), 'public');
    const def = erDefinition(cols, cons, CH2, new Set(['shipments']));
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
    const { cols, cons } = await loadErMetadata(await runner(), 'public');
    const def = erDefinition(cols, cons, CH2.slice(0, 5), new Set());
    expect(def).not.toContain('containers');
  });
});

describe('schema khác (dữ liệu nạp vào sandbox)', () => {
  it('đọc đúng schema, bảng không có khóa thì chỉ có hộp bảng', async () => {
    const db = await freshDb();
    await db.exec('CREATE SCHEMA IF NOT EXISTS sandbox; CREATE TABLE sandbox.my_orders (order_no text, qty integer)');
    const { cols, cons } = await loadErMetadata((sql) => runSandboxed(db, sql), 'sandbox');
    expect(cols.map((c) => `${c.table}.${c.name}`)).toEqual(['my_orders.order_no', 'my_orders.qty']);
    expect(cons).toEqual([]);
    const def = erDefinition(cols, cons, ['my_orders'], new Set());
    expect(def).toContain('my_orders {');
    expect(def).toContain('integer qty');
    expect(def).not.toContain('--');
  });

  it('từ chối tên schema không phải định danh', () => {
    expect(() => erColumnsSql("public' OR '1'='1")).toThrow();
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

const IDENT = /^[a-z_][a-z0-9_]*$/;

/** runSandboxed takes no bind parameters, so the schema name is validated before it is inlined. */
function schemaLiteral(schema: string): string {
  if (!IDENT.test(schema)) throw new Error(`invalid schema name: ${schema}`);
  return `'${schema}'`;
}

export const erColumnsSql = (schema: string): string => `SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_schema = ${schemaLiteral(schema)}
ORDER BY table_name, ordinal_position`;

export const erConstraintsSql = (schema: string): string => `SELECT tc.table_name, kcu.column_name, tc.constraint_type, ccu.table_name AS ref_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_type = 'FOREIGN KEY' AND ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = ${schemaLiteral(schema)} AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')`;

export interface ErColumn { table: string; name: string; type: string; nullable: boolean }
export interface ErConstraint { table: string; column: string; kind: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY'; refTable: string | null }
export interface ErMetadata { cols: ErColumn[]; cons: ErConstraint[] }

export const toErColumns = (r: QueryResult): ErColumn[] =>
  r.rows.map(([table, name, type, nullable]) => ({ table: String(table), name: String(name), type: String(type), nullable: nullable === 'YES' }));

export const toErConstraints = (r: QueryResult): ErConstraint[] =>
  r.rows.map(([table, column, kind, ref]) => ({ table: String(table), column: String(column), kind: kind as ErConstraint['kind'], refTable: ref === null ? null : String(ref) }));

export async function loadErMetadata(run: (sql: string) => Promise<QueryResult>, schema: string): Promise<ErMetadata> {
  return { cols: toErColumns(await run(erColumnsSql(schema))), cons: toErConstraints(await run(erConstraintsSql(schema))) };
}

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

- [ ] **Step 5: Cài Mermaid, kiểm SharedArrayBuffer**

Run:
```bash
npm i --save-exact mermaid@12.3.0
grep -rho "new SharedArrayBuffer\|SharedArrayBufferCancellationToken" node_modules/mermaid/dist/chunks/mermaid.esm --include=*.mjs | sort | uniq -c
```
Expected: `package.json` có `"mermaid": "12.3.0"`. Grep chỉ thấy `SharedArrayBuffer` trong lớp `SharedArrayBufferCancellationToken` (của `vscode-jsonrpc`, đi kèm parser langium; chỉ chạy khi có người tạo token hủy, `erDiagram` không dùng) — chấp nhận, không cần COOP/COEP. Nếu thấy `SharedArrayBuffer` ở chỗ khác, xử lý như Task 3 Step 1.

- [ ] **Step 6: Thêm khóa i18n**

`src/i18n/vi.ts`:
```ts
  'tab.erd': 'Sơ đồ ER',
  'erd.drawing': 'Đang vẽ sơ đồ…',
  'erd.intro': "Ký hiệu crow's foot:",
  'erd.one': 'đúng một',
  'erd.zeroOne': 'không hoặc một',
  'erd.many': 'không hoặc nhiều',
  'erd.bold': 'Bảng viền đậm đang được dùng trong query.',
```
`src/i18n/en.ts`:
```ts
  'tab.erd': 'ER diagram',
  'erd.drawing': 'Drawing the diagram…',
  'erd.intro': "Crow's foot notation:",
  'erd.one': 'exactly one',
  'erd.zeroOne': 'zero or one',
  'erd.many': 'zero or many',
  'erd.bold': 'Tables with a bold border are used in the query.',
```

- [ ] **Step 7: Viết `src/ui/erdView.ts`**

```ts
import { t } from '../i18n';
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
  host.append(h('p', { class: 'muted' }, t('erd.drawing')));
  const { svg } = await (await mermaid()).render(`erd-${++seq}`, definition);
  const figure = h('div', { class: 'erd' });
  // Only innerHTML in the app: SVG generated by Mermaid (strict mode) from schema identifiers.
  figure.innerHTML = svg;
  host.replaceChildren(
    h('p', { class: 'muted' },
      `${t('erd.intro')} `, h('code', {}, '||'), ` ${t('erd.one')} · `, h('code', {}, '|o'), ` ${t('erd.zeroOne')} · `,
      h('code', {}, 'o{'), ` ${t('erd.many')}. ${t('erd.bold')}`),
    figure,
  );
}
```

- [ ] **Step 8: Đăng ký tab trong `src/ui/vizTabs.ts` và CSS**

1. Đổi dòng `import { app } from '../state';` thành:
```ts
import { app, unlockedTables } from '../state';
```
và thêm import:
```ts
import { erDefinition, loadErMetadata, tablesInQuery } from '../viz/erd';
import { renderErd } from './erdView';
```
2. Thêm hàm ngay trên `export function registerVizTabs`:
```ts
function registerErdTab(deps: VizDeps): void {
  // Keyed by schema: Plan Import reuses the same cache with 'sandbox'.
  const erMetadata = memoByKey((schema) => loadErMetadata((sql) => deps.db.run(sql), schema));
  registerTab({
    id: 'erd',
    label: 'tab.erd',
    group: 'schema',
    order: 10,
    render: async (host) => {
      const tables = unlockedTables();
      const { cols, cons } = await erMetadata('public');
      await renderErd(host, erDefinition(cols, cons, tables, tablesInQuery(app.lastRun?.sql ?? '', tables)));
    },
  });
}
```
3. Trong `registerVizTabs`, thêm `registerErdTab(deps);` làm dòng cuối.
4. Cuối `src/style.css`:
```css
.erd { overflow: auto; }
.erd svg { max-width: 100%; height: auto; }
```

- [ ] **Step 9: Kiểm thủ công và commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run dev`.
1. Thanh tab: [Kết quả · Biểu đồ] | [Thứ tự thực thi · EXPLAIN · Luồng dữ liệu] | [Sơ đồ ER · Cột].
2. Mở tab **Sơ đồ ER** ở chương 1 → 5 bảng, ký hiệu crow's foot, cột có PK/FK/UK, `employees` có quan hệ tự trỏ `manager_id`.
3. Chạy query có `shipments` → mở lại tab → `shipments` viền đậm. Sửa editor mà không chạy → viền đậm vẫn theo lần chạy trước.
4. Sang chương 2 → có `containers`. Bật dark mode → theme tối. Bấm `EN` → chú thích tiếng Anh.
5. DevTools Network: chunk `mermaid*`/`erDiagram*` chỉ tải khi mở tab.

```bash
git add package.json package-lock.json src/viz/erd.ts src/ui/erdView.ts src/ui/vizTabs.ts src/i18n src/style.css tests/erd.test.ts
git commit -m "feat: crow's foot ER diagram via Mermaid, per schema"
```

---

### Task 7: Dải bản đồ tuyến 2D kiêm thanh tiến độ chương

**Files:**
- Create: `src/viz/ports.ts`, `src/ui/mapView.ts`
- Modify: `tsconfig.json`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `src/style.css`
- Test: `tests/ports.test.ts`

**Interfaces:**
- Consumes: `svg`, `h`, `fmt`, `reducedMotion` (Task 2); `QueryResult` (Plan 1); `app`, `done` (`src/state.ts`), `currentChapter` (`src/progress.ts`), `t` (Plan 1); `runner` (tests)
- Produces:
  - `interface Port { code: string; name: string; lon: number; lat: number; region: string; kind: 'SEAPORT' | 'AIRPORT' }`
  - `PORTS: Port[]`, `HUB: Record<Port['kind'], string>`
  - `laneUnlocked(port: Port, chapter: number): boolean`
  - `VOLUMES_SQL: string`, `toVolumes(r: QueryResult): Map<string, number>`
  - `type BeatState = 'done' | 'current' | 'todo'`, `interface ChapterDot { id: string; state: BeatState; boss: boolean }`
  - `chapterDots(tickets: { id: string; chapter: number; beat: string }[], completed: Set<string>, selectedId: string, chapter: number): ChapterDot[]`
  - `ticketPorts(ticket: { body: string; steps: { solution: string }[] }): Set<string>`
  - `interface MapView { chapter: number; dots: ChapterDot[]; focus: Set<string> }`
  - `interface RouteMap { update(view: MapView): void; setVolumes(v: Map<string, number>): void; celebrate(): void }`
  - `createMap(host: HTMLElement): RouteMap`
  - trong `main.ts`: `syncMap(): void`; khóa i18n `map.*`

- [ ] **Step 1: Viết test**

`tests/ports.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { chapterDots, HUB, laneUnlocked, PORTS, ticketPorts, toVolumes, VOLUMES_SQL } from '../src/viz/ports';
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

  it('số lô theo cảng nước ngoài cộng lại bằng tổng số lô', async () => {
    const run = await runner();
    const volumes = toVolumes(await run(VOLUMES_SQL));
    const total = Number((await run('SELECT count(*) FROM shipments')).rows[0][0]);
    expect([...volumes.values()].reduce((a, b) => a + b, 0)).toBe(total);
    expect(volumes.get('CNSHA')).toBeGreaterThan(0);
  });
});

describe('thanh tiến độ chương', () => {
  const tickets = [
    { id: 'ch1-01', chapter: 1, beat: 'teach' },
    { id: 'ch1-02', chapter: 1, beat: 'develop' },
    { id: 'ch1-03', chapter: 1, beat: 'twist' },
    { id: 'ch1-05', chapter: 1, beat: 'boss' },
    { id: 'ch2-01', chapter: 2, beat: 'teach' },
  ];
  it('một chấm mỗi ticket của chương, theo thứ tự; boss được đánh dấu', () => {
    expect(chapterDots(tickets, new Set(['ch1-01']), 'ch1-02', 1)).toEqual([
      { id: 'ch1-01', state: 'done', boss: false },
      { id: 'ch1-02', state: 'current', boss: false },
      { id: 'ch1-03', state: 'todo', boss: false },
      { id: 'ch1-05', state: 'todo', boss: true },
    ]);
  });
  it('ticket đã xong vẫn là done dù đang được chọn', () => {
    expect(chapterDots(tickets, new Set(['ch1-01']), 'ch1-01', 1)[0].state).toBe('done');
  });
});

describe('cảng của ticket hiện tại', () => {
  it('chỉ lấy mã có trong cả Solution và đề bài', () => {
    const steps = [{ solution: "SELECT * FROM shipments WHERE pod = 'NLRTM' AND pol = 'VNSGN'" }];
    expect(ticketPorts({ body: 'Các lô đi `NLRTM` tháng này?', steps })).toEqual(new Set(['NLRTM']));
    expect(ticketPorts({ body: 'Các lô đi châu Âu?', steps })).toEqual(new Set());
    expect(ticketPorts({ body: 'NLRTM', steps: [{ solution: 'SELECT 1' }] })).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/ports.test.ts`
Expected: FAIL — không resolve `../src/viz/ports`.

- [ ] **Step 3: Viết `src/viz/ports.ts`**

```ts
import type { QueryResult } from '../db/run';

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

/** Shipments per foreign end of the lane (export → POD, import → POL). */
export const VOLUMES_SQL = "SELECT CASE WHEN direction = 'EXPORT' THEN pod ELSE pol END, count(*) FROM shipments GROUP BY 1";

export const toVolumes = (r: QueryResult): Map<string, number> =>
  new Map(r.rows.map(([code, n]) => [String(code), Number(n)]));

export type BeatState = 'done' | 'current' | 'todo';
export interface ChapterDot { id: string; state: BeatState; boss: boolean }

/** One dot per ticket of the chapter, in content order — the collapsed map strip's progress bar. */
export function chapterDots(
  tickets: { id: string; chapter: number; beat: string }[],
  completed: Set<string>,
  selectedId: string,
  chapter: number,
): ChapterDot[] {
  return tickets
    .filter((t) => t.chapter === chapter)
    .map((t) => ({
      id: t.id,
      state: completed.has(t.id) ? 'done' : t.id === selectedId ? 'current' : 'todo',
      boss: t.beat === 'boss',
    }));
}

/**
 * Ports the current ticket is about: quoted in a Solution AND named in the brief, so the map
 * never reveals a port the player has to find themselves.
 */
export function ticketPorts(ticket: { body: string; steps: { solution: string }[] }): Set<string> {
  const solutions = ticket.steps.map((s) => s.solution).join('\n');
  return new Set(PORTS.map((p) => p.code).filter((code) =>
    solutions.includes(`'${code}'`) && new RegExp(`\\b${code}\\b`).test(ticket.body)));
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/ports.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Cài thư viện bản đồ (pin), bật JSON import**

Run:
```bash
npm i --save-exact d3-geo@3.1.2 topojson-client@3.1.0 world-atlas@2.0.2
npm i -D --save-exact @types/d3-geo@3.1.1 @types/topojson-client@3.1.5 @types/topojson-specification@1.0.5
grep -rl "SharedArrayBuffer" node_modules/d3-geo/dist node_modules/topojson-client/dist
```
Expected: các version trong `package.json` không có `^`; grep không in dòng nào.

Trong `tsconfig.json`, thêm vào `compilerOptions`: `"resolveJsonModule": true`.

- [ ] **Step 6: Thêm khóa i18n**

`src/i18n/vi.ts`:
```ts
  'map.aria': 'Bản đồ tuyến vận chuyển của công ty',
  'map.chapter': 'Chương {n}',
  'map.progress': 'Tiến độ chương: xong {done}/{total} ticket',
  'map.lanes': 'Tuyến đã mở {n}/{total}',
  'map.hub': '{name} ({code}) — cảng nhà',
  'map.portOpen': '{name} ({code}) — {n} lô',
  'map.portClosed': '{name} ({code}) — chưa mở',
  'map.expand': '▾ Bản đồ',
  'map.collapse': '▴ Thu gọn',
  'map.list': 'Danh sách tuyến',
  'map.colPort': 'Cảng',
  'map.colShipments': 'Số lô',
  'map.colStatus': 'Trạng thái',
  'map.open': 'đã mở',
  'map.closed': 'chưa mở',
  'map.beat.done': 'đã xong',
  'map.beat.current': 'đang làm',
  'map.beat.todo': 'chưa làm',
  'map.beat.boss': 'ticket boss',
```
`src/i18n/en.ts`:
```ts
  'map.aria': "The company's shipping lanes",
  'map.chapter': 'Ch. {n}',
  'map.progress': 'Chapter progress: {done}/{total} tickets done',
  'map.lanes': 'Lanes open {n}/{total}',
  'map.hub': '{name} ({code}) — home port',
  'map.portOpen': (p) => `${p.name} (${p.code}) — ${p.n} ${p.n === 1 || p.n === '1' ? 'shipment' : 'shipments'}`,
  'map.portClosed': '{name} ({code}) — not open yet',
  'map.expand': '▾ Map',
  'map.collapse': '▴ Collapse',
  'map.list': 'Lane list',
  'map.colPort': 'Port',
  'map.colShipments': 'Shipments',
  'map.colStatus': 'Status',
  'map.open': 'open',
  'map.closed': 'not open',
  'map.beat.done': 'done',
  'map.beat.current': 'in progress',
  'map.beat.todo': 'to do',
  'map.beat.boss': 'boss ticket',
```

- [ ] **Step 7: Viết `src/ui/mapView.ts`**

```ts
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import { t, type Key } from '../i18n';
import { HUB, laneUnlocked, PORTS, type BeatState, type ChapterDot, type Port } from '../viz/ports';
import { fmt, h, reducedMotion, svg } from './dom';

const W = 960;
const H = 170;
const COLLAPSE_KEY = 'cargo-query/map-collapsed';
const BEAT_KEY: Record<BeatState, Key> = { done: 'map.beat.done', current: 'map.beat.current', todo: 'map.beat.todo' };
const BEAT_SYMBOL: Record<BeatState, string> = { done: '●', current: '◐', todo: '○' };

export interface MapView { chapter: number; dots: ChapterDot[]; focus: Set<string> }
export interface RouteMap {
  update(view: MapView): void;
  setVolumes(v: Map<string, number>): void;
  celebrate(): void;
}

/** Saved choice wins; otherwise collapsed on short screens (< 800px). */
function readCollapsed(): boolean {
  try {
    const v = window.localStorage.getItem(COLLAPSE_KEY);
    if (v !== null) return v === '1';
  } catch {
    /* convenience only */
  }
  return window.innerHeight < 800;
}
function writeCollapsed(v: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
  } catch {
    /* convenience only */
  }
}

export function createMap(host: HTMLElement): RouteMap {
  // Centred on the Pacific (150°E) so lanes to Europe go left and lanes to the Americas go right.
  const projection = geoNaturalEarth1().rotate([-150, 0])
    .fitExtent([[24, 14], [W - 24, H - 10]], { type: 'MultiPoint', coordinates: PORTS.map((p) => [p.lon, p.lat]) });
  const path = geoPath(projection);
  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
  const landD = path(feature(topo, topo.objects.land)) ?? '';
  const hub = (p: Port) => PORTS.find((x) => x.code === HUB[p.kind])!;
  const laneD = (p: Port) => path({ type: 'LineString', coordinates: [[hub(p).lon, hub(p).lat], [p.lon, p.lat]] }) ?? '';
  const lanes = PORTS.filter((p) => p.region !== 'Vietnam');

  let view: MapView = { chapter: 1, dots: [], focus: new Set() };
  let volumes = new Map<string, number>();
  let collapsed = readCollapsed();
  const stage = svg('svg', { id: 'map-stage', viewBox: `0 0 ${W} ${H}`, class: 'map', role: 'img' });
  const progress = h('span', { class: 'map-progress', role: 'img' });
  const caption = h('span', { class: 'map-caption' });
  const list = h('details', { class: 'map-list' });
  const toggle = h('button', { type: 'button', class: 'map-toggle', 'aria-controls': 'map-stage' });

  const shipments = (p: Port) => fmt(volumes.get(p.code) ?? 0);
  function portTitle(p: Port, open: boolean): string {
    if (p.region === 'Vietnam') return t('map.hub', { name: p.name, code: p.code });
    return open ? t('map.portOpen', { name: p.name, code: p.code, n: shipments(p) }) : t('map.portClosed', { name: p.name, code: p.code });
  }

  function draw(): void {
    const { chapter, dots, focus } = view;
    const open = lanes.filter((p) => laneUnlocked(p, chapter));

    progress.setAttribute('aria-label', t('map.progress', { done: dots.filter((d) => d.state === 'done').length, total: dots.length }));
    progress.replaceChildren(t('map.chapter', { n: chapter }), ...dots.map((d) =>
      h('span', {
        class: `beat ${d.state}${d.boss ? ' boss' : ''}`,
        title: `${d.id}: ${t(BEAT_KEY[d.state])}${d.boss ? ` · ${t('map.beat.boss')}` : ''}`,
        'aria-hidden': 'true',
      }, d.boss ? '◆' : BEAT_SYMBOL[d.state])));
    caption.textContent = t('map.lanes', { n: open.length, total: lanes.length });

    // Text alternative to the SVG tooltips (keyboard and screen reader).
    list.replaceChildren(
      h('summary', {}, t('map.list')),
      h('table', {},
        h('thead', {}, h('tr', {},
          h('th', { scope: 'col' }, t('map.colPort')), h('th', { scope: 'col' }, t('map.colShipments')), h('th', { scope: 'col' }, t('map.colStatus')))),
        h('tbody', {}, ...lanes.map((p) => {
          const isOpen = laneUnlocked(p, chapter);
          return h('tr', {},
            h('td', {}, `${p.name} (${p.code})`),
            h('td', {}, isOpen ? shipments(p) : '—'),
            h('td', {}, t(isOpen ? 'map.open' : 'map.closed')));
        }))));

    stage.setAttribute('aria-label', t('map.aria'));
    stage.replaceChildren(
      svg('path', { d: landD, class: 'map-land' }),
      ...lanes.map((p) => svg('path', { d: laneD(p), class: `map-lane${laneUnlocked(p, chapter) ? ' open' : ''}${p.kind === 'AIRPORT' ? ' air' : ''}` })),
      ...PORTS.map((p) => {
        const [x, y] = projection([p.lon, p.lat]) ?? [0, 0];
        const isHub = p.region === 'Vietnam';
        const isOpen = isHub || laneUnlocked(p, chapter);
        const isFocus = focus.has(p.code);
        return svg('g', { class: `map-port${isOpen ? ' open' : ''}${isHub ? ' hub' : ''}${isFocus ? ' focus' : ''}` },
          svg('title', {}, portTitle(p, isOpen)),
          svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: isHub || isFocus ? 5 : 3.5 }));
      }),
    );
    const newest = open.at(-1);
    if (newest && !reducedMotion()) {
      stage.append(svg('text', { class: 'map-ship', 'font-size': 14 }, '🚢',
        svg('animateMotion', { dur: '14s', repeatCount: 'indefinite', path: laneD(newest), rotate: '0' })));
    }
    applyCollapsed();
  }

  function applyCollapsed(): void {
    host.classList.toggle('collapsed', collapsed);
    toggle.textContent = t(collapsed ? 'map.expand' : 'map.collapse');
    toggle.setAttribute('aria-expanded', String(!collapsed));
  }
  toggle.addEventListener('click', () => {
    collapsed = !collapsed;
    writeCollapsed(collapsed);
    applyCollapsed();
  });

  host.replaceChildren(h('div', { class: 'map-bar' }, progress, caption, list, toggle), stage);
  host.hidden = false;
  draw();

  return {
    update(next) {
      view = next;
      draw();
    },
    setVolumes(next) {
      volumes = next;
      draw();
    },
    celebrate() {
      const open = lanes.filter((p) => laneUnlocked(p, view.chapter));
      if (open.length === 0 || collapsed || reducedMotion()) return;
      const lane = open[Math.floor(Math.random() * open.length)];
      const ship = svg('text', { class: 'map-ship', 'font-size': 18 }, '🚢',
        svg('animateMotion', { dur: '3s', repeatCount: '1', fill: 'freeze', path: laneD(lane), rotate: '0' }));
      stage.append(ship);
      setTimeout(() => ship.remove(), 3500);
    },
  };
}
```

- [ ] **Step 8: Gắn vào `src/main.ts`**

1. Thêm import (gộp vào import có sẵn nếu `main.ts` đã import cùng module):
```ts
import { createMap } from './ui/mapView';
import { chapterDots, ticketPorts, toVolumes, VOLUMES_SQL } from './viz/ports';
import { currentChapter } from './progress';
import { app, done } from './state';
```
2. Ngay sau dòng `registerVizTabs(…);` (Task 2), thêm:
```ts
// The strip renders before the DB is ready: progress dots and lanes need no query.
const map = createMap(document.getElementById('map')!);
function syncMap(): void {
  const chapter = currentChapter(app.tickets, done());
  const ticket = app.tickets.find((t) => t.id === app.selectedId); // undefined in Sandbox
  map.update({
    chapter,
    dots: chapterDots(app.tickets, done(), app.selectedId, chapter),
    focus: ticket ? ticketPorts(ticket) : new Set(),
  });
}
```
3. Trong `async function loadColumns()` (Plan 1 gọi nó một lần khi DB `ready`), ngay trên dòng `try {`, thêm:
```ts
  void db.run(VOLUMES_SQL).then((r) => map.setVolumes(toVolumes(r)), () => { /* tooltips show 0 until next ready */ });
```
4. Thêm `syncMap();` làm dòng cuối của `rerender()` (đổi ticket, đóng ticket, đổi ngôn ngữ, nhập tiến độ đều đi qua đây).
5. Trong `function complete(t: Ticket)`, ngay sau dòng `persist(true);`, thêm `map.celebrate();` (boss cũng đóng qua `complete`, nên tàu chạy cả khi xong boss).

- [ ] **Step 9: Thêm CSS vào cuối `src/style.css`**

```css
.map-strip { position: relative; }
.map-bar { display: flex; flex-wrap: wrap; gap: 2px 12px; align-items: center; min-height: 28px; padding: 2px 16px; font-size: 13px; color: var(--muted); }
.map-progress { color: var(--text); }
.map-progress .beat { margin-left: 4px; color: var(--muted); }
.map-progress .beat.done { color: var(--good); }
.map-progress .beat.current { color: var(--accent); }
.map-caption { margin-right: auto; }
.map-list summary { cursor: pointer; }
.map-list table { width: auto; font-size: 12px; }
.map-strip.collapsed .map, .map-strip.collapsed .map-list { display: none; }
.map { display: block; width: 100%; height: 120px; }
.map-land { fill: var(--land); }
.map-lane { fill: none; stroke: var(--lane-closed); stroke-width: 1; stroke-dasharray: 3 4; }
.map-lane.open { stroke: var(--accent); stroke-width: 1.8; stroke-dasharray: none; }
.map-lane.air.open { stroke-dasharray: 6 3; }
.map-port circle { fill: var(--muted); }
.map-port.open circle { fill: var(--good); }
.map-port.hub circle { fill: var(--accent); }
.map-port.focus circle { stroke: var(--warn); stroke-width: 2.5; }
.map-toggle { padding: 2px 8px; font-size: 12px; }
```

- [ ] **Step 10: Kiểm thủ công và commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run dev`.
1. Dải dưới thanh trên hiện ngay khi tải trang (trước khi DB sẵn sàng): `Chương 1 ◐ ○ ○ ○ ◆ · Tuyến đã mở 6/19` + nút. Mở rộng: lục địa nhạt, Cát Lái chấm màu accent (không đỏ); chương 1 chỉ các tuyến châu Á sáng, còn lại nét đứt xám; tàu chạy chậm trên tuyến mới nhất.
2. Rê chuột vào Shanghai → "Shanghai (CNSHA) — N lô" (N > 0 sau khi DB sẵn sàng); vào Rotterdam (chương 1) → "chưa mở". Mở "Danh sách tuyến" → bảng 19 tuyến, dùng được bằng bàn phím.
3. Mở `ch1-05` (boss): nếu đề có nhắc mã cảng có trong Solution (ví dụ `NLRTM`) thì chấm cảng đó có viền cam.
4. Đóng một ticket → chấm thành `●`, tàu lớn chạy nhanh một lượt trên một tuyến đã mở (khi bản đồ đang mở).
5. Hoàn thành chương 2 (hoặc nhập save đã xong ch1–2) → tuyến Ấn Độ sáng thêm, chấm đổi sang ticket chương 3. Chương 3 → châu Âu.
6. Bấm "▴ Thu gọn" → còn một dòng 28px vẫn có chấm tiến độ; tải lại trang vẫn thu gọn. Xóa key `cargo-query/map-collapsed`, thu cửa sổ cao < 800px, tải lại → mặc định thu gọn.
7. Bấm `EN` → `Ch. 1`, `Lanes open 6/19`, tooltip "— N shipments"; editor không mất con trỏ.
8. Bật "Reduce motion" → không có tàu chạy. Màn hình < 600px → bản đồ co theo chiều ngang, không cuộn ngang.

```bash
git add package.json package-lock.json tsconfig.json src/viz/ports.ts src/ui/mapView.ts src/main.ts src/i18n src/style.css tests/ports.test.ts
git commit -m "feat: route map strip doubling as chapter progress bar"
```

---

### Task 8: Cập nhật CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Thêm vào cuối mục `## Architecture`**

```markdown
- Visualizations (spec §6b) live in two layers: pure data builders in `src/viz/` (tested in Node against a real seeded PGlite; no translated text, only `import type` from `src/i18n`) and DOM/SVG renderers in `src/ui/*View.ts` (all text through `t()`). `src/ui/vizTabs.ts` registers the five viz tabs through `registerTab()` of `src/ui/tabs.ts`. Every viz tab describes `app.lastRun.sql` (the last run, never the live editor) and shows a "SQL changed" strip when the editor differs. EXPLAIN, execution steps and ER metadata are cached per SQL / schema with `memoByKey` (`src/viz/memo.ts`), so a language switch never re-runs them.
- Worker requests carry `kind: 'run' | 'explain' | 'steps'` and go through `DbClient.request()` (one queued request at a time; `steps` gets 3× the timeout).
- "Thứ tự thực thi" (`src/viz/steps.ts`) parses the player's SQL with `libpg-query` (Postgres' own parser, WASM), rebuilds one sub-query per logical clause with `pgsql-deparser`, and counts rows for each inside the sandbox. In the browser the `.wasm` must be imported via `?url` and passed to `loadModule` (`src/viz/parser.ts`); Vite does not bundle it otherwise. Failures are codes (`StepsFailure`), translated in the view.
- EXPLAIN uses `EXPLAIN (ANALYZE, FORMAT JSON)` inside `BEGIN … ROLLBACK` (`runExplain`); `src/viz/plan.ts` flattens it into nodes with typed `detail` and holds the VI/EN node glossary `NODE_HELP`.
- The ER tab renders a Mermaid `erDiagram` built from `information_schema` for a given schema (`loadErMetadata(run, schema)` in `src/viz/erd.ts`; `'public'` for the game, `'sandbox'` for imported data); it is the only place that uses `innerHTML` (Mermaid strict mode, schema identifiers only). Mermaid and the SQL parser are lazy-loaded.
- The route map (`src/ui/mapView.ts`) projects `PORTS` (`src/viz/ports.ts`, must match the `ports` seed rows) with d3-geo over world-atlas land; lanes open by chapter via `laneUnlocked`. Its collapsed 28px bar is the chapter progress bar (`chapterDots`), and ports named in both the brief and the Solution are ringed (`ticketPorts`). `main.ts` keeps it in sync via `syncMap()` from `rerender()`.
```

- [ ] **Step 2: Chạy toàn bộ test và build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: tất cả PASS; build xong.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document visualization architecture"
```
