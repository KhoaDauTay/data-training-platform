# Cargo Query — Plan 1b: Trực quan hóa (EXPLAIN, luồng dữ liệu, thứ tự thực thi, biểu đồ, ERD, bản đồ)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm các tab trực quan vào panel dưới (Biểu đồ, Thứ tự thực thi, EXPLAIN, Luồng dữ liệu, Sơ đồ ER) và dải tiến độ chương trong khu làm việc (L35), đúng spec §6b, song ngữ VI/EN.

**Architecture:** Dữ liệu trực quan được tính bằng hàm thuần trong `src/viz/*` (có unit test chạy PGlite thật trong Node, không chứa chữ đã dịch) rồi vẽ bằng DOM/SVG trong `src/ui/*View.ts` (mọi chữ qua `t()`, class Tailwind nguyên vẹn, SVG dựng bằng `s()` của `src/ui/svg.ts`). EXPLAIN và "thứ tự thực thi" chạy trong worker DB (cùng sandbox `BEGIN … ROLLBACK`), đi qua hàng đợi request của `DbClient`. Các tab đăng ký qua `registerTab()` của `src/ui/tabs.ts` trong một file riêng `src/ui/vizTabs.ts`; mọi tab mô tả **lần chạy gần nhất** (`app.lastRun.sql` trong `src/state.ts`), không đọc editor. Kết quả EXPLAIN / thứ tự thực thi / metadata ERD được cache theo SQL (hoặc theo schema) bằng `memoByKey`. Thư viện nặng (Mermaid, parser `libpg-query`) chỉ tải khi mở tab cần. Bản đồ tuyến là bản đồ Tiên Sa của Plan 1d (Trang chủ + hoạt cảnh); khu làm việc chỉ có dải tiến độ một dòng, số tuyến lấy từ `derive()` (L35).

**Tech Stack:** như Plan 1 + Plan 1d (Tailwind v4), thêm `libpg-query` 18.2.4 + `pgsql-deparser` 18.4.5 (parser/deparser Postgres, WASM), `mermaid` 12.3.0. Không thêm thư viện bản đồ (xem "Đã bỏ vì Plan 1d").

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §6b. **Tiền đề:** Plan 1 và Plan 1d đã xong (code ở HEAD). Quyết định nguồn: `docs/team/amendments.md` (B3, C1, C4, C5, C7, F10 và mục "Quyết định của user"), `docs/team/decision-log.md` (L17, L22, L23, L26, L30–L34 thắng chữ cũ của plan này). **Code trên đĩa thắng listing trong plan** (L7): mọi điểm neo dưới đây đã đối chiếu với HEAD; nếu lúc chạy thấy khác, sửa ở chỗ gọi trong Plan 1b.

> **Đã bỏ vì Plan 1d** (đã áp vào thân plan, không áp lại):
> - Task 7 cũ "dải bản đồ d3-geo": bỏ `d3-geo`, `topojson-client`, `world-atlas` (+ `@types/*`), `resolveJsonModule`, `PORTS`/`HUB`/`laneUnlocked`/`SEA_REGION_CHAPTER` (tuyến biển ch1–5 + đường hàng không ch6), `VOLUMES_SQL`/`setVolumes`, tàu chạy thường trực trên dải và `map.celebrate()` trong `complete()`. Plan 1d đã có bản đồ tuyến tỏa từ Tiên Sa (`routeMap()`, `ROUTES`, `derive().open` mở tuyến theo chương **và** theo chuyến tàu, L32) và hoạt cảnh tàu khi xong việc (`playCompletion` trong `src/ui/stage.ts`; mỗi lần xong việc chỉ một hoạt cảnh). L35: Task 7 mới chỉ còn dải tiến độ thu gọn (chấm chương + `Tuyến đã mở n/7` + liên kết về Trang chủ); bỏ nút mở rộng, bản đồ 120px, vòng khoanh cảng (`ticketPorts`) và key `cargo-query/map-collapsed`.
> - `newAt: 'ch3-01'` của tab EXPLAIN (L35): EXPLAIN được dạy ở chương 11 (L30), chưa có ticket. Bỏ badge; Plan 4 thêm `newAt` khi có ticket ch11.
> - Hàm `svg()` mới trong `src/ui/dom.ts`: dùng `s()` của `src/ui/svg.ts`.
> - Mọi bước "Thêm CSS vào cuối `src/style.css`": class Tailwind viết thẳng trong `h()`/`s()` (chuỗi nguyên vẹn, nối bằng `cx()`; `tests/theme.test.ts` chặn `` class: `…${x}` ``). Plan 1b không sửa `src/style.css`; không định nghĩa lại `pre.sql` (class dùng chung).
> - Khóa `viz.runFirst`, `viz.stale` (ghi cứng "Ctrl", `tests/i18n.test.ts` chặn), `viz.timeout`, `viz.restarted`, `viz.dbFailed`: dùng `res.runFirst`/`res.stale` và `errorView()`/`errorText()` của `src/ui/feedback.ts`.
> - Khóa `map.beat.boss` ("ticket boss", L22 chặn): dùng `beat.boss` có sẵn ("Đánh giá thăng tiến" / "Promotion review"). Khóa `map.aria`, `map.hub`, `map.portOpen`, `map.portClosed`, `map.colShipments`, `map.open`, `map.closed`: thay bằng `top.map`, `routes.*` và `routeItems()` có sẵn.

### Tên có sẵn ở HEAD mà Plan 1b dùng (đã grep)

| File | Tên Plan 1b dùng |
|---|---|
| `src/i18n/index.ts` | `type Lang`, `type Key`, `type Params`, `type Msg`, `t(key, p?)` (số trong `p` tự định dạng theo `locale()`; `{mod}`/`{alt}` tự điền), `getLang()`, `locale()` |
| `src/i18n/vi.ts`, `src/i18n/en.ts` | object `vi` (nguồn khóa, kết thúc bằng `} satisfies Record<string, Msg>;`) và `en: Record<Key, Msg>`; trong `en.ts` có helper `num(v)` và `count(one, many)` cho số nhiều (nhận **số**, không nhận chuỗi đã định dạng). Khóa có sẵn dùng lại: `res.runFirst`, `res.stale`, `top.map`, `beat.boss`, `routes.*` |
| `src/state.ts` | `app.lastRun: LastRun \| undefined` với `LastRun { key; sql; offset; result?; error?; mark? }`, `app.tickets`, `app.selectedId`, `done(): Set<string>`, `unlockedTables(): string[]` |
| `src/ui/tabs.ts` | `registerTab(spec: TabSpec)` với `TabSpec { id; label: Key; group: 'output' \| 'query' \| 'schema'; order; newAt?; render(host): void \| Promise<void> }`, gọi trước `createPanel()`; `registerCoreTabs(editorSql)` đăng ký `result` (output, 10) và `columns` (schema, 20); `Panel { show(id); refresh(); readonly active }`. `createPanel` tự bắt lỗi render và hiện `errorText(e)` |
| `src/ui/work.ts` | trong `mountWork(host, deps: WorkDeps)`: hàm cục bộ `run(): Promise<void>`, nút `runBtn`, hàng nút `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)` (nằm trong một div bọc dính đáy), `deps.panel.show(id)`, `SCHEMA_TABS = new Set(['erd', 'columns'])` (đã có `erd`); `WorkArea.currentSql()` |
| `src/ui/dom.ts` | `h()`, `nodes()`, `richText()`, `byId()` |
| `src/ui/svg.ts` | `s(tag, attrs: Record<string, string \| number \| false>, ...children: (SVGElement \| string \| null \| undefined \| false)[])` |
| `src/ui/feedback.ts` | `errorText(e): string`, `errorView(e): HTMLElement` (lỗi Postgres nguyên văn + HINT + giải thích theo SQLSTATE) |
| `src/ui/resultTable.ts` | `renderResult(r: QueryResult, mark?: unknown[]): HTMLElement`, `formatCell(v: unknown, type?: number): string` |
| `src/theme.ts` | `cx(...)`, `chapterColor(n): ChapterColor` (`bar` là class `bg-*`; cho SVG dùng `fill`/`stroke`) |
| `src/scene.ts` | `ROUTES: RouteInfo[]` (7 tuyến từ Tiên Sa `VNDAD`), `derive(tickets, completed): Harbor` (`open: Set<string>` = tuyến đã mở) |
| `src/ui/router.ts` | `currentRoute()`; `main.ts` có `showRoute(r, initial)` bật/tắt `#home`/`#shell` |
| `src/route.ts` | `hashOf(r: Route)` (`'home'` → `#/`) |
| `src/main.ts` | `const db = new DbClient(onDbStatus)`, dòng `registerCoreTabs(() => work.currentSql());` ngay trước `const panel = createPanel(byId('panel'));`, `const work = mountWork(…)`, `rerender()`, `showRoute()`, `complete(t)` (đã gọi `playCompletion` và `panel.refresh()`) |
| `src/progress.ts` | `currentChapter(tickets, completed): number` |
| `index.html` | `<div id="map" class="map-strip border-b border-line bg-sea" data-i18n-aria="top.map" … hidden>` ngay dưới topbar |
| `tests/helpers.ts` | `freshDb()`, `seededDb()`, `runner()` |

## Global Constraints

- Mọi ràng buộc của Plan 1 vẫn áp dụng (PGlite 0.5.16 pin, ngày cố định, không `innerHTML` với dữ liệu, try/catch mọi truy cập `localStorage`/IndexedDB, `npx tsc --noEmit` ở mọi bước xác nhận PASS).
- Ngoại lệ `innerHTML` duy nhất: SVG do Mermaid sinh từ tên bảng/cột (schema game, hoặc tên đã sanitize về `[a-z0-9_]` của schema `sandbox`), với `securityLevel: 'strict'`.
- Pin chính xác (`--save-exact`): `libpg-query@18.2.4`, `pgsql-deparser@18.4.5`, `mermaid@12.3.0`.
- File `libpg-query.wasm` phải được import qua `?url` và nạp bằng `loadModule({ wasm })` — Vite không tự đóng gói nó (đã xác nhận bằng spike). `vite.config.ts` đã có `worker: { format: 'es' }` nên `import()` động trong worker build được.
- Sau mỗi lần cài dependency: grep `SharedArrayBuffer` (F10). Không bật COOP/COEP; GitHub Pages (D6) không đặt được header này.
- **i18n:** mọi chữ hiển thị đi qua `t()`; khóa mới được thêm vào **cả** `src/i18n/vi.ts` và `src/i18n/en.ts` trong cùng task. `src/viz/*` chạy trong worker và Node nên chỉ được `import type` từ `src/i18n` (không gọi `t()`/`getLang()`). Dữ liệu được cache (`planFor`, `stepsFor`) không chứa chữ đã dịch: mã + giá trị thô, dịch lúc vẽ. Bảng chú thích theo ngôn ngữ (`NODE_HELP`, `STEP_LABELS`, `STEP_HELP`) là `Record<Lang, …>` cùng tập khóa (có test). Không chuỗi nào ghi cứng `Ctrl`/`Alt` (dùng `{mod}`), không chữ "boss"/"sự cố" (L22); EN khác VI trừ `SAME_OK` (`tests/i18n.test.ts`).
- Không dịch: tên bảng/cột, SQL, giá trị dữ liệu, lỗi gốc Postgres, tên cảng.
- Mọi tab trực quan đọc `app.lastRun.sql`; khi editor khác SQL đó thì hiện dải `res.stale` ("SQL đã thay đổi — {mod}+Enter để cập nhật.").
- Số trong `t()` truyền dạng **number** (tự định dạng theo ngôn ngữ, và `count()` của EN cần số). `fmt()` chỉ cho số ngoài `t()` (ms có phần lẻ, nhãn biểu đồ, `<title>`).
- Mọi animation tắt khi `prefers-reduced-motion: reduce` (`<animateMotion>` không theo CSS nên kiểm bằng `reducedMotion()`).
- **Giao diện (L17, L23):** class Tailwind là chuỗi nguyên vẹn, nối bằng `cx()` từ `src/theme.ts`; màu lấy từ token đã map trong `@theme inline` (`bg-code`, `bg-accent-soft`, `text-muted`, `text-ink`, `ring-line`, `fill-accent`, `fill-panel`, `fill-ink`, `fill-muted`, `stroke-line`, `border-accent`, `border-bad`, `ring-warn`…), không hard-code hex. Số dùng `tabular-nums`, màu chỉ cho nhãn/badge/thanh nhỏ, không tô màu số lớn. Trạng thái (bước bỏ qua, SQL mờ, tuyến chưa mở, cạnh luồng) thể hiện bằng **màu/nét**, không bằng `opacity`. Preflight làm `svg` thành `display: block`: SVG giữa dòng chữ cần class `inline`.

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
src/viz/progressDots.ts chapterDots (thanh tiến độ chương)
src/i18n/vi.ts, en.ts  + khóa viz.rows, plan.*, explain.*, flow.*, steps.*, chart.*, erd.*, map.*, tab.*
src/ui/dom.ts          + reducedMotion(), fmt()
src/ui/vizTabs.ts      registerVizTabs(deps): đăng ký 5 tab qua registerTab, cache planFor/stepsFor/erMetadata
src/ui/work.ts         + nút EXPLAIN
src/ui/explainView.ts  tab EXPLAIN
src/ui/flowView.ts     tab Luồng dữ liệu
src/ui/stepsView.ts    tab Thứ tự thực thi
src/ui/chartView.ts    tab Biểu đồ
src/ui/erdView.ts      tab Sơ đồ ER (Mermaid, tải lười)
src/ui/mapStrip.ts     dải #map: một dòng tiến độ chương + số tuyến + liên kết về Trang chủ
src/main.ts            + registerVizTabs(...), createMapStrip/syncMap, ẩn #map ngoài #/play
tests/memo.test.ts, plan.test.ts, steps.test.ts, chart.test.ts, erd.test.ts, progressDots.test.ts
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
- Modify: `src/ui/dom.ts`, `src/ui/work.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/memo.test.ts`

**Interfaces:**
- Consumes: `flattenPlan`, `nodeExplanation`, `isHeavyScan`, `Plan`, `PlanDetail` (Task 1); `DbClient.explain` (Task 1); `registerTab` (`src/ui/tabs.ts`), `app.lastRun` (`src/state.ts`), `t`, `getLang`, `locale`, `Key` (`src/i18n`), `h` (`src/ui/dom.ts`), `s` (`src/ui/svg.ts`), `errorView` (`src/ui/feedback.ts`), `cx` (`src/theme.ts`) — có sẵn ở HEAD
- Produces:
  - `memoByKey<T>(load: (key: string) => Promise<T>, max?: number): (key: string) => Promise<T>`; `MEMO_MAX = 20`
  - `reducedMotion(): boolean`, `fmt(n: number, digits?: number): string`
  - `renderExplain(host: HTMLElement, plan: Plan): void`, `renderFlow(host: HTMLElement, plan: Plan): void`
  - `interface VizDeps { db: DbClient; show(id: string): void; editorSql(): string }`
  - `lastRunSql(host, deps)`, `load(host, loading, data, draw)` (cục bộ trong `vizTabs.ts`, Task 4–5 dùng lại)
  - `registerVizTabs(deps: VizDeps): void` — Task 2 đăng ký `explain` (query, 20, không `newAt`: L35, Plan 4 thêm khi có ticket ch11) và `flow` (query, 30)
  - khóa i18n: `viz.rows`, `viz.explaining`, `plan.*`, `explain.*`, `flow.*`, `tab.explain`, `tab.flow`

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

- [ ] **Step 5: Thêm `reducedMotion()`, `fmt()` vào cuối `src/ui/dom.ts`**

File này hiện có `h`, `nodes`, `richText`, `byId`. SVG dùng `s()` có sẵn trong `src/ui/svg.ts`, không thêm builder thứ hai. Thêm `import { locale } from '../i18n';` vào đầu file.

```ts
/** `<animateMotion>` ignores the CSS reduced-motion rule in style.css, so SVG animations check this. */
export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Number in the current UI language: 25.677 (vi) / 25,677 (en). */
export const fmt = (n: number, digits = 2): string => n.toLocaleString(locale(), { maximumFractionDigits: digits });
```

- [ ] **Step 6: Thêm khóa i18n**

Thêm vào object `vi` trong `src/i18n/vi.ts`, ngay trên dòng `} satisfies Record<string, Msg>;` (HEAD chỉ có `tab.list`, `tab.result`, `tab.columns`, `tab.new` trong nhóm `tab.*` và chưa có `viz.*`/`plan.*`/`explain.*`/`flow.*`, nên không trùng). Câu "chạy trước" và "SQL đã thay đổi" dùng lại `res.runFirst`/`res.stale` (có `{mod}`); lỗi timeout/khởi động lại dùng `errorView()`, nên không thêm khóa cho chúng:
```ts
  'tab.explain': 'EXPLAIN',
  'tab.flow': 'Luồng dữ liệu',
  'viz.rows': '{n} dòng',
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

Thêm vào object `en` trong `src/i18n/en.ts`, ngay trên dòng `};` cuối file (`count` là helper có sẵn đầu file, nhận số):
```ts
  'tab.explain': 'EXPLAIN',
  'tab.flow': 'Data flow',
  'viz.rows': count('row', 'rows'),
  'viz.explaining': 'Running EXPLAIN ANALYZE…',
  'explain.intro': 'The Optimize stage chose the plan below; Execute finished in {ms} ms. Blue bar = rows the node processed. Click a node to read what it does.',
  'explain.heavy': 'Reads many rows',
  'explain.estimate': 'Estimated {est} rows, actual {actual}.',
  'plan.index': 'Index: {v}',
  'plan.indexCond': 'Index condition: {v}',
  'plan.hashCond': 'Join condition: {v}',
  'plan.joinFilter': 'Join filter: {v}',
  'plan.filter': 'Filter: {v}',
  'plan.removed': (p) => ` — removed ${count('row', 'rows')(p)}`,
  'plan.groupKey': 'Group key: {v}',
  'plan.sortKey': 'Sort key: {v}',
  'flow.aria': 'Data flow through the execution plan',
  'flow.intro': 'Data flows from the left (table reads) to the right (result). Thicker lines carry more rows — real numbers from EXPLAIN ANALYZE.',
```
`tab.explain` giống nhau ở hai ngôn ngữ; khóa này đã nằm trong `SAME_OK` của `tests/i18n.test.ts`. Mọi `{n}` ở trên nhận **số** (`t()` tự định dạng `25.677` / `25,677`; `count()` của EN cần số để chọn số ít/nhiều).

- [ ] **Step 7: Viết `src/ui/explainView.ts`**

```ts
import { getLang, t, type Key } from '../i18n';
import { cx } from '../theme';
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
  t(DETAIL_KEY[d.kind], { v: d.text }) + (d.removed ? t('plan.removed', { n: d.removed }) : '');

export function renderExplain(host: HTMLElement, plan: Plan): void {
  const max = Math.max(1, ...plan.nodes.map((n) => n.scanned));
  const lang = getLang();
  host.append(
    h('p', { class: 'muted' }, t('explain.intro', { ms: fmt(plan.executionMs, 1) })),
    h('div', { class: 'space-y-1' }, ...plan.nodes.map((n) =>
      // Indent is per node data, so it is an inline style, not a class.
      h('details', { class: cx('rounded-md bg-code px-2 py-1 ring-1', isHeavyScan(n) ? 'ring-warn' : 'ring-line'), style: `margin-left:${n.depth * 20}px` },
        h('summary', { class: 'flex cursor-pointer flex-wrap items-center gap-2' },
          h('span', { class: 'min-w-[200px] font-semibold' }, n.label),
          h('span', { class: 'h-2 min-w-20 flex-1 overflow-hidden rounded bg-line', 'aria-hidden': 'true' },
            h('i', { class: 'block h-full bg-accent', style: `width:${Math.max(2, (n.scanned / max) * 100)}%` })),
          h('span', { class: 'min-w-[90px] tabular-nums' }, t('viz.rows', { n: n.rows })),
          h('span', { class: 'muted tabular-nums' }, `${fmt(n.ms, 2)} ms`),
          isHeavyScan(n) ? h('span', { class: 'warn', role: 'img', 'aria-label': t('explain.heavy'), title: t('explain.heavy') }, '⚠') : null),
        h('p', { class: 'my-1' }, nodeExplanation(n.type, lang)),
        n.estRows !== n.rows ? h('p', { class: 'muted my-1' }, t('explain.estimate', { est: n.estRows, actual: n.rows })) : null,
        ...n.detail.map((d) => h('p', { class: 'my-1' }, h('code', {}, detailText(d))))))),
  );
}
```

- [ ] **Step 8: Viết `src/ui/flowView.ts`**

```ts
import { t } from '../i18n';
import type { Plan, PlanNode } from '../viz/plan';
import { h, reducedMotion } from './dom';
import { s } from './svg';

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

  const root = s('svg', { viewBox: `-10 -10 ${width} ${height + 10}`, role: 'img', 'aria-label': t('flow.aria'), class: 'h-auto w-full min-w-[480px]' });
  for (const n of nodes.slice(1)) {
    const p = nodes[n.parent!];
    const x1 = x(n) + BOX_W;
    const y1 = y.get(n.id)! + BOX_H / 2;
    const x2 = x(p);
    const y2 = y.get(p.id)! + BOX_H / 2;
    const d = `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
    const w = 1.5 + (8 * Math.log10(n.rows + 1)) / Math.log10(maxRows + 1);
    root.append(s('path', { d, class: 'fill-none stroke-sky-300 dark:stroke-sky-800', 'stroke-width': w.toFixed(1) }));
    if (animate && n.rows > 0) {
      root.append(s('circle', { r: 4, class: 'fill-accent' },
        s('animateMotion', { dur: '1.6s', repeatCount: 'indefinite', path: d, begin: `${(n.id % 4) * 0.4}s` })));
    }
  }
  for (const n of nodes) {
    const label = n.label.length > 24 ? `${n.label.slice(0, 23)}…` : n.label;
    const rows = t('viz.rows', { n: n.rows });
    root.append(s('g', { transform: `translate(${x(n)},${y.get(n.id)})` },
      s('title', {}, `${n.label}: ${rows}`),
      s('rect', { width: BOX_W, height: BOX_H, rx: 6, class: 'fill-panel stroke-line' }),
      s('text', { x: 8, y: 16, class: 'fill-ink text-xs font-semibold' }, label),
      s('text', { x: 8, y: 32, class: 'fill-ink text-xs tabular-nums' }, rows)));
  }
  host.append(
    h('p', { class: 'muted' }, t('flow.intro')),
    h('div', { class: 'overflow-auto' }, root),
  );
}
```

- [ ] **Step 9: Viết `src/ui/vizTabs.ts`**

```ts
import type { DbClient } from '../db/client';
import { t } from '../i18n';
import { app } from '../state';
import { memoByKey } from '../viz/memo';
import { flattenPlan, type Plan } from '../viz/plan';
import { h } from './dom';
import { renderExplain } from './explainView';
import { errorView } from './feedback';
import { renderFlow } from './flowView';
import { registerTab } from './tabs';

export interface VizDeps {
  db: DbClient;
  /** Switches the bottom panel to a tab (Panel.show). */
  show(id: string): void;
  /** What Ctrl+Enter would run now — only used to flag that lastRun is out of date. */
  editorSql(): string;
}

/** Every viz tab describes the last run, not the editor (same strip as the Result tab). Returns its SQL, or undefined after drawing the empty state. */
function lastRunSql(host: HTMLElement, deps: VizDeps): string | undefined {
  const run = app.lastRun;
  if (!run) {
    host.append(h('p', { class: 'muted' }, t('res.runFirst')));
    return undefined;
  }
  if (deps.editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('res.stale')));
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
    // Postgres' message unchanged + teaching note; timeout/restart/DB failure translated by class (src/ui/feedback.ts).
    body.replaceChildren(errorView(e));
  }
}

function registerPlanTabs(deps: VizDeps): void {
  const planFor = memoByKey((sql) => deps.db.explain(sql).then(flattenPlan));
  const withPlan = (draw: (host: HTMLElement, plan: Plan) => void) => (host: HTMLElement) => {
    const sql = lastRunSql(host, deps);
    return sql === undefined ? undefined : load(host, t('viz.explaining'), planFor(sql), draw);
  };
  registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, render: withPlan(renderExplain) }); // newAt: Plan 4 (EXPLAIN is taught in ch11, L30/L35)
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
và thay dòng
```ts
registerCoreTabs(() => work.currentSql());
```
(ngay trước `const panel = createPanel(byId('panel'));`) bằng:
```ts
registerCoreTabs(() => work.currentSql());
registerVizTabs({ db, show: (id) => panel.show(id), editorSql: () => work.currentSql() });
```
(`panel` và `work` chỉ được đọc khi tab render, lúc đó cả hai đã được tạo.)

2. `src/ui/work.ts` — trong `mountWork`, ngay sau dòng `const runBtn = h('button', { type: 'button', onclick: () => void run() });`, thêm:
```ts
  // EXPLAIN always describes what was just run: run the editor SQL first, then open the tab.
  const explainBtn = h('button', { type: 'button', onclick: () => void run().then(() => deps.panel.show('explain')) }, t('tab.explain'));
```
và trong `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)` (nằm trong div bọc dính đáy) chèn `explainBtn` ngay sau `runBtn`. Nhãn `EXPLAIN` giống nhau ở hai ngôn ngữ nên `setButtons()`/`relabel()` không cần đổi nút này. `run()` tự bỏ qua khi `busy`; khi lần chạy lỗi, tab EXPLAIN hiện lỗi đó (cùng SQL).

- [ ] **Step 11: Không thêm CSS**

Mọi class ở Step 7–9 là utility Tailwind (`@source "./**/*.ts"` trong `src/style.css` đã quét `src/ui/*.ts`) hoặc class dùng chung có sẵn trong `@layer components` (`.muted`, `.stale`, `.warn`, `.error`). Không sửa `src/style.css`.

- [ ] **Step 12: Kiểm tra kiểu, build và kiểm thủ công**

Run: `npx vitest run && npx tsc --noEmit && npm run build`, rồi `npm run dev`.
Kiểm:
1. Thanh tab có EXPLAIN và Luồng dữ liệu trong nhóm giữa. Mở EXPLAIN khi chưa chạy gì → "Chạy query (Ctrl+Enter) để xem kết quả." (`res.runFirst`; trên macOS là ⌘).
2. Gõ query TEU theo hãng tàu ở test Task 1 → bấm nút **EXPLAIN** cạnh nút Chạy → query chạy (tab Kết quả có dữ liệu nếu mở) rồi tab EXPLAIN hiện cây thụt lề; node `Seq Scan containers` có ⚠ và `25.677 dòng`; bấm node → giải thích tiếng Việt, dòng `Lọc: … — bỏ N dòng`.
3. Sang tab **Luồng dữ liệu** → sơ đồ trái→phải, đường dày ở các scan lớn, chấm chạy dọc cạnh. Tab hiện ngay, không qua dòng "Đang chạy EXPLAIN ANALYZE…" (đã cache theo SQL).
4. Sửa một ký tự trong editor (không chạy) → mở lại tab EXPLAIN → dải "SQL đã thay đổi — Ctrl+Enter để cập nhật" ở trên, cây vẫn là của SQL cũ. Ctrl+Enter → dải biến mất, cây theo SQL mới.
5. Bấm `EN` trên topbar → tab EXPLAIN vẽ lại bằng tiếng Anh, số thành `25,677 rows`, không chạy lại EXPLAIN; editor giữ nguyên con trỏ.
6. Bật "Reduce motion" trong hệ điều hành → chấm không chạy. Query lỗi cú pháp → Chạy → tab EXPLAIN hiện lỗi gốc Postgres kèm dòng giải thích (như tab Kết quả, qua `errorView`).
7. Bật dark mode → hộp node, cạnh luồng và chữ đều đọc được (token `bg-code`, `fill-panel`, `stroke-sky-800`…).

- [ ] **Step 13: Commit**

```bash
git add src/viz/memo.ts src/ui src/main.ts src/i18n tests/memo.test.ts
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
- Modify: `src/ui/vizTabs.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `StepsResult`, `StepsFailure`, `STEP_LABELS`, `STEP_HELP`, `StepKey` (Task 3); `DbClient.steps` (Task 1); `memoByKey`, `registerVizTabs`, `lastRunSql`, `load` (Task 2); `renderResult` (`src/ui/resultTable.ts`); `h`, `fmt` (`src/ui/dom.ts`, `fmt` từ Task 2); `cx` (`src/theme.ts`); `t`, `getLang`, `Key` (`src/i18n`)
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
  'steps.groups': count('group', 'groups'),
  'steps.title': 'Step {i} · {label}',
  'steps.before': 'Before',
  'steps.after': 'After',
  'steps.sample': 'Sample rows after this step (up to 5):',
  'steps.sql': 'SQL Postgres ran for this step',
```

- [ ] **Step 2: Viết `src/ui/stepsView.ts`**

```ts
import { getLang, t, type Key } from '../i18n';
import { cx } from '../theme';
import { STEP_HELP, STEP_LABELS, type StepKey, type StepsFailure, type StepsResult } from '../viz/steps';
import { fmt, h } from './dom';
import { renderResult } from './resultTable';

const STAGES: Key[] = ['steps.stage1', 'steps.stage2', 'steps.stage3', 'steps.stage4'];
const REASON: Record<StepsFailure, Key> = {
  syntax: 'steps.syntax', multi: 'steps.multi', notSelect: 'steps.notSelect', withUnion: 'steps.withUnion', window: 'steps.window',
};
const PILL = 'rounded-full px-2.5 py-0.5';
/** Execute is the stage this tab shows: dark pill (white on --bar ≥ 10:1 in both themes). */
const STAGE_ON = 'bg-[var(--bar)] text-white';
const STAGE_OFF = 'bg-code ring-1 ring-line';
const STEP_BTN = 'flex min-w-24 flex-col items-start';

export function renderSteps(host: HTMLElement, sql: string, result: StepsResult, goExplain: () => void): void {
  const labels = STEP_LABELS[getLang()];
  const help = STEP_HELP[getLang()];
  const stages = h('div', { class: 'mb-2 flex flex-wrap gap-1.5 text-sm' }, ...STAGES.map((key, i) =>
    i === 2
      ? h('button', { type: 'button', class: PILL, onclick: goExplain, title: t('steps.toExplain') }, `${t(key)} → EXPLAIN`)
      : h('span', { class: cx(PILL, i === 3 ? STAGE_ON : STAGE_OFF) }, t(key))));
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

  const pipe = h('div', { class: 'my-2 flex flex-wrap items-center gap-1.5', role: 'group', 'aria-label': t('steps.pipe') });
  const detail = h('div');
  const playBtn = h('button', { type: 'button' }, t('steps.play'));

  const prevCount = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (steps[j].count !== undefined) return steps[j].count!;
    return undefined;
  };
  const unit = (key: StepKey, n: number) => t(key === 'group' || key === 'having' ? 'steps.groups' : 'viz.rows', { n });

  function highlighted(key: StepKey): HTMLElement {
    const r = ranges[key];
    if (!r) return h('pre', { class: 'sql' }, sql);
    // The rest of the SQL is grey text, not faded (no opacity).
    return h('pre', { class: 'sql' },
      h('span', { class: 'text-muted' }, sql.slice(0, r[0])),
      h('mark', { class: 'rounded-sm bg-accent-soft text-ink' }, sql.slice(r[0], r[1])),
      h('span', { class: 'text-muted' }, sql.slice(r[1])));
  }

  function draw(): void {
    pipe.replaceChildren(...steps.flatMap((s, i) => [
      i ? h('span', { class: 'text-muted', 'aria-hidden': 'true' }, '→') : null,
      h('button', {
        type: 'button',
        class: cx(STEP_BTN, i === current ? 'border-accent bg-accent-soft' : 'bg-code', s.skipped && 'border-dashed text-muted', s.error && 'border-bad'),
        'aria-current': i === current ? 'step' : false,
        onclick: () => { stop(); current = i; draw(); },
      },
        h('b', {}, labels[s.key]),
        s.skipped ? h('span', {}, t('steps.unused'))
          : s.error ? h('span', {}, t('steps.error'))
          : h('span', { class: 'text-base font-bold tabular-nums' }, unit(s.key, s.count!))),
    ].filter((x): x is HTMLElement => x !== null)));

    const s = steps[current];
    const before = prevCount(current);
    const bar = (label: Key, n: number, width: number) =>
      h('div', { class: 'grid grid-cols-[48px_1fr_80px] items-center gap-2 text-sm' },
        h('span', {}, t(label)), h('i', { class: 'block h-2.5 rounded bg-accent', style: `width:${width}%` }), h('span', { class: 'text-right tabular-nums' }, fmt(n)));
    detail.replaceChildren(
      h('h3', {}, t('steps.title', { i: current + 1, label: labels[s.key] })),
      h('p', {}, help[s.key]),
      s.count !== undefined && before !== undefined
        ? h('div', { class: 'my-2 max-w-[520px]' },
            bar('steps.before', before, 100),
            bar('steps.after', s.count, before ? Math.max(1, (s.count / before) * 100) : 100))
        : '',
      highlighted(s.key),
      s.error ? h('pre', { class: 'error' }, s.error) : '',
      s.sample ? h('div', {}, h('p', { class: 'muted' }, t('steps.sample')), renderResult(s.sample)) : '',
      s.sql ? h('details', { class: 'mt-2' }, h('summary', { class: 'cursor-pointer' }, t('steps.sql')), h('pre', { class: 'sql' }, s.sql)) : '',
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

- [ ] **Step 4: Không thêm CSS**

Class ở Step 2 là utility Tailwind hoặc class dùng chung (`pre.sql`, `.muted`, `.error`, `.actions`). **Không** định nghĩa lại `pre.sql` (Recap và các plan khác dùng chung): đoạn đang xét tô bằng `mark` `bg-accent-soft`, phần còn lại `text-muted` (xám, không mờ).

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
git add src/ui/stepsView.ts src/ui/vizTabs.ts src/i18n
git commit -m "feat: logical execution order tab"
```

---

### Task 5: Biểu đồ kết quả

**Files:**
- Create: `src/viz/chart.ts`, `src/ui/chartView.ts`
- Modify: `src/ui/vizTabs.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/chart.test.ts`

**Interfaces:**
- Consumes: `QueryResult` (`src/db/run.ts`); `fmt`, `lastRunSql`, `registerVizTabs` (Task 2); `h` (`src/ui/dom.ts`), `s` (`src/ui/svg.ts`), `formatCell` (`src/ui/resultTable.ts`); `app.lastRun`, `app.selectedId`, `app.tickets` (`src/state.ts`); `chapterColor`, `type ChapterColor` (`src/theme.ts`); `t`; `runner` (tests)
- Produces:
  - `type ChartSpec = { kind: 'bar' | 'line'; label: number; values: number[] }`
  - `MAX_POINTS = 60`, `chartSpec(r: QueryResult): ChartSpec | null`
  - `renderChart(host: HTMLElement, r: QueryResult, color: ChapterColor): void` — cột/đường tô màu chương của ticket đang mở (`color.fill`/`color.stroke`; `bar` là class `bg-*`, không tô được SVG)
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
import { cx, type ChapterColor } from '../theme';
import { chartSpec, MAX_POINTS, type ChartSpec } from '../viz/chart';
import { fmt, h } from './dom';
import { formatCell } from './resultTable';
import { s } from './svg';

const W = 720;
const SVG = 'h-auto w-full max-w-[900px]';
const LABEL = 'fill-muted text-xs';
const VALUE = 'fill-ink text-xs tabular-nums';

function bars(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
  const rowH = 24;
  const labelW = 200;
  const vals = r.rows.map((row) => Number(row[col] ?? 0));
  const max = Math.max(1, ...vals.map(Math.abs));
  const height = r.rows.length * rowH + 8;
  return s('svg', { viewBox: `0 0 ${W} ${height}`, class: SVG, role: 'img', 'aria-label': t('chart.barAria', { col: r.columns[col] }) },
    ...r.rows.map((row, i) => {
      const label = formatCell(row[spec.label], r.types[spec.label]);
      const w = (Math.abs(vals[i]) / max) * (W - labelW - 90);
      return s('g', { transform: `translate(0,${i * rowH + 4})` },
        s('title', {}, `${label}: ${fmt(vals[i])}`),
        s('text', { x: labelW - 8, y: 15, 'text-anchor': 'end', class: LABEL }, label.length > 28 ? `${label.slice(0, 27)}…` : label),
        s('rect', { x: labelW, y: 3, width: Math.max(1, w).toFixed(1), height: rowH - 8, rx: 3, class: color.fill }),
        s('text', { x: labelW + w + 6, y: 15, class: VALUE }, fmt(vals[i])));
    }));
}

function line(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
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
  return s('svg', { viewBox: `0 0 ${W} ${H}`, class: SVG, role: 'img', 'aria-label': t('chart.lineAria', { col: r.columns[col] }) },
    s('line', { x1: pad.l, y1: y(vmin), x2: W - pad.r, y2: y(vmin), class: 'stroke-line' }),
    s('text', { x: pad.l - 6, y: y(vmax) + 4, 'text-anchor': 'end', class: LABEL }, fmt(vmax)),
    s('text', { x: pad.l - 6, y: y(vmin) + 4, 'text-anchor': 'end', class: LABEL }, fmt(vmin)),
    s('text', { x: pad.l, y: H - 8, class: LABEL }, pts[0] ? formatCell(pts[0].raw, r.types[spec.label]) : ''),
    s('text', { x: W - pad.r, y: H - 8, 'text-anchor': 'end', class: LABEL }, pts.at(-1) ? formatCell(pts.at(-1)!.raw, r.types[spec.label]) : ''),
    s('polyline', { points: pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '), 'stroke-width': 2, class: cx('fill-none', color.stroke) }),
    ...pts.map((p) => s('circle', { cx: x(p.t).toFixed(1), cy: y(p.v).toFixed(1), r: 3, class: color.fill },
      s('title', {}, `${formatCell(p.raw, r.types[spec.label])}: ${fmt(p.v)}`))));
}

export function renderChart(host: HTMLElement, r: QueryResult, color: ChapterColor): void {
  const spec = chartSpec(r);
  if (!spec) {
    host.append(h('p', { class: 'muted' }, t('chart.empty', { max: MAX_POINTS })));
    return;
  }
  const area = h('div', { class: 'overflow-auto' });
  const draw = (col: number) => area.replaceChildren(spec.kind === 'bar' ? bars(r, spec, col, color) : line(r, spec, col, color));
  const picker = spec.values.length > 1
    ? h('label', { class: 'mb-2 inline-flex items-center gap-2 text-sm' }, t('chart.valueCol'), (() => {
        const sel = h('select', { class: 'rounded-md bg-panel px-2 py-1 ring-1 ring-line' }, ...spec.values.map((i) => h('option', { value: String(i) }, r.columns[i])));
        sel.addEventListener('change', () => draw(Number(sel.value)));
        return sel;
      })())
    : null;
  host.append(picker ?? '', area);
  draw(spec.values[0]);
}
```

- [ ] **Step 7: Đăng ký tab trong `src/ui/vizTabs.ts`**

1. Thêm import:
```ts
import { chapterColor } from '../theme';
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
      // Chapter colour of the open ticket; chapterColor(0) is the neutral slate (no ticket).
      const chapter = app.tickets.find((x) => x.id === app.selectedId)?.chapter ?? 0;
      if (result) renderChart(host, result, chapterColor(chapter));
      else host.append(h('p', { class: 'muted' }, t('chart.runError')));
    },
  });
}
```
3. Trong `registerVizTabs`, thêm `registerChartTab(deps);` làm dòng đầu tiên.
4. Không thêm CSS: màu cột/đường là `fill-*`/`stroke-*` của `CHAPTER_COLOR` (12 chương, `src/theme.ts`), chữ dùng `fill-muted`/`fill-ink`.

- [ ] **Step 8: Kiểm thủ công và commit**

Run: `npx vitest run && npx tsc --noEmit && npm run dev`.
1. Tab **Biểu đồ** nằm ngay sau Kết quả (nhóm đầu).
2. Chạy Solution của `ch3-02` → tab **Biểu đồ** → 6 cột ngang theo hãng tàu, màu hổ phách (chương 3, `fill-amber-600`), rê chuột thấy số. Mở ticket chương 1 rồi chạy lại → cột màu sky.
3. Chạy `SELECT date_trunc('month', booking_date)::date, count(*), SUM(gross_weight_kg) FROM shipments GROUP BY 1 ORDER BY 1` → biểu đồ đường 24 điểm, có ô chọn "Cột giá trị".
4. Chạy `SELECT * FROM ports` → thông báo không vẽ. Chạy SQL lỗi → "Lần chạy gần nhất bị lỗi — xem tab Kết quả."
5. Bấm `EN` → nhãn số đổi `1.234,5` → `1,234.5`.

```bash
git add src/viz/chart.ts src/ui/chartView.ts src/ui/vizTabs.ts src/i18n tests/chart.test.ts
git commit -m "feat: automatic bar/line chart for the last run"
```

---

### Task 6: Sơ đồ ER chuẩn (Mermaid, crow's foot), theo schema

**Files:**
- Create: `src/viz/erd.ts`, `src/ui/erdView.ts`
- Modify: `src/ui/vizTabs.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/erd.test.ts`

**Interfaces:**
- Consumes: `unlockedTables`, `app.lastRun` (`src/state.ts`; `unlockedTables()` theo `CHAPTER_TABLES` 1–12); `runSandboxed`, `QueryResult` (`src/db/run.ts`); `DbClient.run`; `memoByKey`, `registerVizTabs` (Task 2); `runner`, `freshDb` (tests). `SCHEMA_TABS` trong `src/ui/work.ts` đã chứa `'erd'` (chạy query khi đang mở tab ER thì chuyển sang Kết quả), không cần sửa.
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
  // Mermaid sets its own width/max-width inline; the wrapper scrolls instead of squeezing the diagram.
  const figure = h('div', { class: 'overflow-auto [&_svg]:h-auto' });
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
4. Không thêm CSS (khung ER dùng utility Tailwind ở Step 7).

- [ ] **Step 9: Kiểm thủ công và commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run dev`.
1. Thanh tab: [Kết quả · Biểu đồ] | [Thứ tự thực thi · EXPLAIN · Luồng dữ liệu] | [Sơ đồ ER · Cột].
2. Mở tab **Sơ đồ ER** ở chương 1 → 5 bảng, ký hiệu crow's foot, cột có PK/FK/UK, `employees` có quan hệ tự trỏ `manager_id`.
3. Chạy query có `shipments` → mở lại tab → `shipments` viền đậm. Sửa editor mà không chạy → viền đậm vẫn theo lần chạy trước.
4. Sang chương 2 → có `containers`. Bật dark mode → theme tối. Bấm `EN` → chú thích tiếng Anh.
5. DevTools Network: chunk `mermaid*`/`erDiagram*` chỉ tải khi mở tab.

```bash
git add package.json package-lock.json src/viz/erd.ts src/ui/erdView.ts src/ui/vizTabs.ts src/i18n tests/erd.test.ts
git commit -m "feat: crow's foot ER diagram via Mermaid, per schema"
```

---

### Task 7: Dải tiến độ chương trong khu làm việc

L35: bản đồ tuyến chỉ có một, là bản đồ Tiên Sa của Plan 1d (`routeMap()` trên Trang chủ và trong hoạt cảnh khi xong việc). Khu làm việc **không** vẽ bản đồ. Dải `#map` (đã có trong `index.html`, đang `hidden`) chỉ là một dòng thu gọn: tiến độ chương (một chấm mỗi việc của chương, ◆ = đánh giá thăng tiến) + `Tuyến đã mở n/7` + liên kết về bản đồ trên Trang chủ. Số tuyến mở lấy từ `derive().open` (theo chương **và** theo chuyến tàu, L32). Không có nút mở rộng, không lưu trạng thái thu gọn, không khoanh cảng.

**Files:**
- Create: `src/viz/progressDots.ts`, `src/ui/mapStrip.ts`
- Modify: `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/progressDots.test.ts`

**Interfaces:**
- Consumes: `ROUTES`, `derive` (`src/scene.ts`); `hashOf` (`src/route.ts`); `cx` (`src/theme.ts`); `h` (`src/ui/dom.ts`); `app`, `done` (`src/state.ts`); `currentChapter` (`src/progress.ts`); `t`, `Key`; khóa có sẵn `top.map` (aria của `#map`), `beat.boss`
- Produces:
  - `type BeatState = 'done' | 'current' | 'todo'`, `interface ChapterDot { id: string; state: BeatState; review: boolean }`
  - `chapterDots(tickets: Pick<Ticket, 'id' | 'chapter' | 'beat'>[], completed: Set<string>, selectedId: string, chapter: number): ChapterDot[]`
  - `interface StripView { chapter: number; dots: ChapterDot[]; tickets: Ticket[]; completed: Set<string> }`
  - `createMapStrip(host: HTMLElement): { update(view: StripView): void }`
  - trong `main.ts`: `syncMap(): void`; khóa i18n `map.*`

- [ ] **Step 1: Viết test**

`tests/progressDots.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { chapterDots } from '../src/viz/progressDots';

describe('thanh tiến độ chương', () => {
  const tickets = [
    { id: 'ch1-01', chapter: 1, beat: 'teach' },
    { id: 'ch1-02', chapter: 1, beat: 'develop' },
    { id: 'ch1-03', chapter: 1, beat: 'twist' },
    { id: 'ch1-05', chapter: 1, beat: 'boss' },
    { id: 'ch2-01', chapter: 2, beat: 'teach' },
  ] as const;
  it('một chấm mỗi việc của chương, theo thứ tự; đánh giá thăng tiến được đánh dấu', () => {
    expect(chapterDots([...tickets], new Set(['ch1-01']), 'ch1-02', 1)).toEqual([
      { id: 'ch1-01', state: 'done', review: false },
      { id: 'ch1-02', state: 'current', review: false },
      { id: 'ch1-03', state: 'todo', review: false },
      { id: 'ch1-05', state: 'todo', review: true },
    ]);
  });
  it('việc đã xong vẫn là done dù đang được chọn', () => {
    expect(chapterDots([...tickets], new Set(['ch1-01']), 'ch1-01', 1)[0].state).toBe('done');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/progressDots.test.ts`
Expected: FAIL — không resolve `../src/viz/progressDots`.

- [ ] **Step 3: Viết `src/viz/progressDots.ts`**

```ts
import type { Ticket } from '../tickets';

export type BeatState = 'done' | 'current' | 'todo';
/** `review`: the chapter's promotion review (beat: boss; the UI never says "boss", L22). */
export interface ChapterDot { id: string; state: BeatState; review: boolean }

/** One dot per ticket of the chapter, in content order: the workspace strip's progress bar. */
export function chapterDots(
  tickets: Pick<Ticket, 'id' | 'chapter' | 'beat'>[],
  completed: Set<string>,
  selectedId: string,
  chapter: number,
): ChapterDot[] {
  return tickets
    .filter((t) => t.chapter === chapter)
    .map((t) => ({
      id: t.id,
      state: completed.has(t.id) ? 'done' : t.id === selectedId ? 'current' : 'todo',
      review: t.beat === 'boss',
    }));
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/progressDots.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Thêm khóa i18n**

Nhãn đánh giá dùng `beat.boss` có sẵn ("Đánh giá thăng tiến" / "Promotion review"); aria của `#map` là `top.map` có sẵn.

`src/i18n/vi.ts`:
```ts
  'map.chapter': 'Chương {n}',
  'map.progress': 'Tiến độ chương: xong {done}/{total} việc',
  'map.lanes': 'Tuyến đã mở {n}/{total}',
  'map.toHome': 'Xem bản đồ',
  'map.beat.done': 'đã xong',
  'map.beat.current': 'đang làm',
  'map.beat.todo': 'chưa làm',
```
`src/i18n/en.ts`:
```ts
  'map.chapter': 'Ch. {n}',
  'map.progress': (p) => `Chapter progress: ${num(p.done)}/${count('task', 'tasks')({ n: p.total })} done`,
  'map.lanes': 'Lanes open {n}/{total}',
  'map.toHome': 'See the map',
  'map.beat.done': 'done',
  'map.beat.current': 'in progress',
  'map.beat.todo': 'to do',
```

- [ ] **Step 6: Viết `src/ui/mapStrip.ts`**

```ts
import { t, type Key } from '../i18n';
import { hashOf } from '../route';
import { derive, ROUTES } from '../scene';
import { cx } from '../theme';
import type { Ticket } from '../tickets';
import type { BeatState, ChapterDot } from '../viz/progressDots';
import { h } from './dom';

const BEAT_KEY: Record<BeatState, Key> = { done: 'map.beat.done', current: 'map.beat.current', todo: 'map.beat.todo' };
const BEAT_SYMBOL: Record<BeatState, string> = { done: '●', current: '◐', todo: '○' };
/** Colour only on the small dots (L23). */
const BEAT_CLASS: Record<BeatState, string> = { done: 'text-good', current: 'text-accent', todo: 'text-muted' };

export interface StripView { chapter: number; dots: ChapterDot[]; tickets: Ticket[]; completed: Set<string> }

/**
 * #map under the top bar (index.html), shown only on #/play by main.ts. One line (L35): the chapter's dots,
 * the open-lane count (derive().open, L32) and a link to the Tien Sa map on Home. No map is drawn here.
 */
export function createMapStrip(host: HTMLElement): { update(view: StripView): void } {
  const progress = h('span', { class: 'text-ink', role: 'img' });
  const caption = h('span', { class: 'mr-auto' });
  const link = h('a', { href: hashOf('home'), class: 'text-accent' });
  host.replaceChildren(h('div', { class: 'flex min-h-7 flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-0.5 text-sm text-muted' }, progress, caption, link));

  return {
    update({ chapter, dots, tickets, completed }) {
      progress.setAttribute('aria-label', t('map.progress', { done: dots.filter((d) => d.state === 'done').length, total: dots.length }));
      progress.replaceChildren(t('map.chapter', { n: chapter }), ...dots.map((d) =>
        h('span', {
          class: cx('ml-1', BEAT_CLASS[d.state]),
          title: `${d.id}: ${t(BEAT_KEY[d.state])}${d.review ? ` · ${t('beat.boss')}` : ''}`,
          'aria-hidden': 'true',
        }, d.review ? '◆' : BEAT_SYMBOL[d.state])));
      caption.textContent = t('map.lanes', { n: derive(tickets, completed).open.size, total: ROUTES.length });
      link.textContent = t('map.toHome');
    },
  };
}
```

- [ ] **Step 7: Gắn vào `src/main.ts`**

1. Thêm `currentChapter` vào import có sẵn:
```ts
import { contentProblems, currentChapter, nextTicket, SKILLS, xpFor } from './progress';
```
và thêm hai import:
```ts
import { createMapStrip } from './ui/mapStrip';
import { chapterDots } from './viz/progressDots';
```
2. Ngay sau khối `const work = mountWork(byId('work'), { … });`, thêm:
```ts
// Progress dots and lane count need no query: the strip is drawn before the DB is ready.
const mapStrip = createMapStrip(byId('map'));
function syncMap(): void {
  const completed = done();
  const chapter = currentChapter(app.tickets, completed);
  mapStrip.update({ chapter, completed, tickets: app.tickets, dots: chapterDots(app.tickets, completed, app.selectedId, chapter) });
}
```
3. Thêm dòng cuối của `rerender()` (đổi việc, xong việc, đổi ngôn ngữ, nhập tiến độ, đổi route đều đi qua đây):
```ts
  if (!byId('map').hidden) syncMap(); // like Home: the hidden strip is redrawn by showRoute()
```
4. Trong `showRoute()`, ngay sau dòng `byId('shell').hidden = r !== 'play';`, thêm:
```ts
  byId('map').hidden = r !== 'play'; // Home has the route map itself
```
5. **Không** sửa `complete()`: `playCompletion(t, before, done())` đã chạy hoạt cảnh (tàu chạy trên bản đồ trong `#stage`), rồi `rerender()` vẽ lại dải với chấm và số tuyến mới.

- [ ] **Step 8: Kiểm thủ công và commit**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run dev`.
1. Ở `#/play`, dải dưới thanh trên hiện ngay khi tải trang (trước khi DB sẵn sàng): `Chương 1 ◐ ○ ○ ○ ◆ … Tuyến đã mở 2/7 · Xem bản đồ`, cao một dòng (≥ 28px). Về Trang chủ (`#/`) → dải ẩn.
2. Bấm "Xem bản đồ" → về Trang chủ, thấy bản đồ tuyến Tiên Sa.
3. Xong `ch1-05` (hoặc nhập save đã xong chương 1) → chỉ có **một** hoạt cảnh (thẻ thăng tiến + tàu tới Rotterdam ở góc dưới phải). Sau đó dải: `Tuyến đã mở 4/7` (Singapore mở theo chương, Rotterdam mở theo chuyến tàu, L32), chấm chuyển sang 5 việc của chương 2.
4. Bấm `EN` → `Ch. 1`, `Lanes open 2/7`, `See the map`, tooltip chấm cuối "… · Promotion review"; editor không mất con trỏ.
5. Màn hình < 600px → dải xuống dòng, không cuộn ngang.

```bash
git add src/viz/progressDots.ts src/ui/mapStrip.ts src/main.ts src/i18n tests/progressDots.test.ts
git commit -m "feat: chapter progress strip in the workspace (lanes from derive)"
```

---

### Task 8: Cập nhật CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Thêm vào mục `## Architecture`, ngay sau gạch đầu dòng bắt đầu bằng `- Bottom-panel tabs register through`** (gạch đó đã nói "mọi tab mô tả `app.lastRun` + dải SQL changed", không lặp lại)

```markdown
- Visualizations (spec §6b) live in two layers: pure data builders in `src/viz/` (tested in Node against a real seeded PGlite; no translated text, only `import type` from `src/i18n`) and DOM/SVG renderers in `src/ui/*View.ts` (all text through `t()`, Tailwind classes, SVG via `s()`). `src/ui/vizTabs.ts` registers the five viz tabs (`chart`, `steps`, `explain`, `flow`, `erd`); load errors go through `errorView()`. EXPLAIN, execution steps and ER metadata are cached per SQL / schema with `memoByKey` (`src/viz/memo.ts`), so a language switch never re-runs them.
- Worker requests carry `kind: 'run' | 'explain' | 'steps'` and go through `DbClient.request()` (one queued request at a time; `steps` gets 3× the timeout).
- "Thứ tự thực thi" (`src/viz/steps.ts`) parses the player's SQL with `libpg-query` (Postgres' own parser, WASM), rebuilds one sub-query per logical clause with `pgsql-deparser`, and counts rows for each inside the sandbox. In the browser the `.wasm` must be imported via `?url` and passed to `loadModule` (`src/viz/parser.ts`); Vite does not bundle it otherwise. Failures are codes (`StepsFailure`), translated in the view. WITH/UNION/window are not supported (curriculum §5.6).
- EXPLAIN uses `EXPLAIN (ANALYZE, FORMAT JSON)` inside `BEGIN … ROLLBACK` (`runExplain`); `src/viz/plan.ts` flattens it into nodes with typed `detail` and holds the VI/EN node glossary `NODE_HELP`.
- The ER tab renders a Mermaid `erDiagram` built from `information_schema` for a given schema (`loadErMetadata(run, schema)` in `src/viz/erd.ts`; `'public'` for the game, `'sandbox'` for imported data); it is the only place that uses `innerHTML` (Mermaid strict mode, schema identifiers only). Mermaid and the SQL parser are lazy-loaded.
- The workspace strip (`#map`, `src/ui/mapStrip.ts`, shown only on `#/play`) is one line (L35): the chapter's progress dots (`chapterDots`, `src/viz/progressDots.ts`), the open-lane count from `derive().open` and a link to Home. It draws no map: the Tien Sa route map lives on Home and in `playCompletion`. `main.ts` redraws it via `syncMap()` from `rerender()`.
```

Trong gạch đầu dòng `- Dependencies are pinned exactly: …`, thêm trước câu `Add new ones with`: `` `libpg-query` 18.2.4 and `pgsql-deparser` 18.4.5 (lazy, loaded in the worker by the Execution order tab), `mermaid` 12.3.0 (lazy chunk, ER tab). ``

- [ ] **Step 2: Chạy toàn bộ test và build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: tất cả PASS; build xong.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document visualization architecture"
```
