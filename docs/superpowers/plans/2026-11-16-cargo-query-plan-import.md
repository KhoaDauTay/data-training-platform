# Cargo Query — Plan Import: "Dữ liệu của tôi" (nạp CSV vào schema `sandbox`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trong chế độ Sandbox, người học nạp file CSV của mình (≤ 20 MB / 200.000 dòng / 50 cột mỗi file, ≤ 5 bảng) vào schema `sandbox` của PGlite, rồi dùng Chạy, Biểu đồ, EXPLAIN, Luồng dữ liệu, Thứ tự thực thi và Sơ đồ ER trên dữ liệu đó. File gốc được lưu trong IndexedDB và tự nạp lại khi mở trang và sau mỗi `DbClient.restart()`. Có nút xóa từng bảng và xóa toàn bộ. Không hỗ trợ SQL dump.

**Architecture:** Main thread kiểm mọi giới hạn và sanitize tên bằng hàm thuần (`src/import/csv.ts`) trước khi gửi gì xuống worker. Worker nhận request `kind: 'import'` (kèm `Blob`) và chạy `importCsv()` (`src/db/import.ts`) **ngoài** `runSandboxed`, trong một transaction riêng: `CREATE UNLOGGED TABLE` toàn cột `text` → `COPY … FROM '/dev/blob'` (parser CSV của Postgres) → suy kiểu bằng một lượt quét SQL → `ALTER COLUMN … TYPE`. `DbClient` giữ danh sách bảng đã nạp (kèm kiểu đã suy) và nạp lại ngay sau khi worker khởi động lại. `MyData` (`src/import/myData.ts`) điều phối inspect → import → lưu IndexedDB (`src/import/store.ts`). Giao diện là một mục trong khung trái của Sandbox (`src/ui/myDataView.ts`). Truy vấn của người chơi trên bảng nạp vẫn đi qua `runSandboxed` (BEGIN … ROLLBACK, chỉ đọc).

**Tech Stack:** như Plan 1, 1b, 1c. **Không thêm dependency** (không thư viện CSV, không `fake-indexeddb`).

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §1, §6b (Sandbox), §7, **§7b**, §8. **Nguồn quyết định:** `docs/team/amendments.md` mục "Quyết định của user (2026-11-16)" **D3** (ghi đè đề xuất D3-A ở trên nó), cùng `docs/team/product-design.md` §4. **Tiền đề:** Plan 1 (Task 1–11), Plan 1b (Task 1–8) và Plan 1c (Task 0–10) đã xong.

## Kết quả spike (2026-11-16, trước khi viết plan)

Đo bằng Node 24 + `@electric-sql/pglite` 0.5.16 trên main thread của laptop Windows (không phải worker trong trình duyệt), với code đúng như trong plan này. Trình duyệt thường chậm hơn, nên Task 6 đo lại trong trình duyệt.

| # | Câu hỏi | Kết quả |
|---|---|---|
| 1 | `COPY … FROM '/dev/blob'` với `db.query(sql, [], { blob })` | **Chạy được.** `affectedRows` = số dòng. Chạy được trong `BEGIN … COMMIT`, lỗi thì `ROLLBACK` không để lại gì. Xử lý đúng BOM, CRLF, phân cách `;`, ô có ngoặc kép chứa dấu phẩy. Lỗi trả SQLSTATE: dòng thiếu cột / thừa cột `22P04`, byte không phải UTF-8 `22021`. |
| 1a | Thời gian, CSV 18,7 MB / 200.000 dòng / 10 cột (chữ, ngày, timestamp, số, bool) | đọc + kiểm giới hạn ở main ~0,3 s; nạp đủ (COPY + suy kiểu + ALTER) **~3,0–3,3 s**/bảng; nạp lại khi đã biết kiểu **~0,9 s** |
| 1b | Thời gian, trường hợp xấu nhất 19,1 MB / 200.000 dòng / **50 cột** số ngắn | nạp đủ **~5,9–6,5 s**/bảng (COPY ~0,8 s, suy kiểu ~3–4 s, ALTER ~1,9 s); nạp lại khi đã biết kiểu **~3,4 s**. Timeout 30 s còn dư khoảng 4 lần. |
| 1c | Bộ nhớ (`arrayBuffers` của Node, tính từ sau seed; seed ≈ 94 MB) | 5 × 10 cột: **+137 MB** với `UNLOGGED` so với **+355 MB** khi bảng thường (WAL). → **Quyết định: bảng `UNLOGGED`.** 5 × 50 cột (UNLOGGED): **+364 MB** (có gc) đến +463 MB (không gc). Cộng seed, trường hợp xấu nhất khoảng **460–560 MB, vượt ngân sách tab 400 MB (F4)**. Theo spec §7b: **không tự hạ giới hạn**. Task 6 đo lại trong trình duyệt; nếu vẫn vượt thì báo user quyết. |
| 2 | Suy kiểu | Cách đầu tiên là 5 lần `pg_input_is_valid` cho mỗi ô: chậm (10,2 s với 50 cột) và **quá dễ dãi**, vì `'0901234567'`, `'007'`, `'0x1F'`, `'1_000'` đều thành bigint (số 0 đầu của số điện thoại/mã bưu chính sẽ mất), còn `'NaN'`, `'Infinity'`, `'1e5'`, `'.5'` đều thành numeric. **Chọn:** một lượt quét `bit_and(CASE <regex> …)` cho mọi cột (bigint ≤ 18 chữ số, không có số 0 đầu; numeric dạng `-?d+(.d+)?`; date `YYYY-MM-DD`; timestamp `YYYY-MM-DD[ T]HH:MM[:SS[.f]]`; boolean `true/false`), sau đó chỉ cột ứng viên date/timestamp mới qua `pg_input_is_valid` (để bắt `2026-02-30`). Nhanh gấp đôi. Chỉ nhận ngày ISO, vì `DateStyle` là `ISO, MDY` nên `11/12/2026` sẽ bị đọc thành ngày 12/11. Ô rỗng → `NULL`. |
| 3 | `search_path` + schema `sandbox` | `SET search_path = public, sandbox` ở cấp phiên **giữ nguyên** qua mọi `BEGIN … ROLLBACK`. Người chơi gọi `set_config('search_path', …, false)` bên trong sandbox thì bị rollback. Trùng tên thì bảng game thắng. `DELETE` / `DROP SCHEMA sandbox` / `CREATE TABLE` của người chơi đều bị rollback. `DROP SCHEMA sandbox CASCADE; CREATE SCHEMA sandbox` reset sạch trong ~3 ms, `public` không đổi, `search_path` vẫn đúng. EXPLAIN, `information_schema` (ERD) và Biểu đồ chạy được trên bảng `sandbox` (có test ở Task 5). |
| 3a | Thứ tự thực thi (`runSteps`) trên bảng `sandbox` | **Chưa chạy được trong spike** vì `libpg-query` chưa cài (Plan 1b Task 3 cài). Về lý thuyết là chạy được: `runSteps` chỉ chạy các câu con qua `runSandboxed`, mà tên bảng được phân giải qua `search_path` (đã kiểm ở #3). Task 5 có test thật cho phần này. |
| 4 | IndexedDB | Chỉ có trong trình duyệt, Node không có (`indexedDB` undefined). Thiết kế: DB `cargo-query`, object store `imports`, keyPath `table`, bản ghi `{ table, fileName, delimiter, columns, types, rows, file: Blob }`. Lưu **kiểu đã suy** để lúc nạp lại bỏ qua bước suy kiểu. Mọi lời gọi bọc try/catch và trả `[]`/`false` khi lỗi (Node, chế độ riêng tư, hết quota). Test Node chỉ kiểm được nhánh "không có IndexedDB"; nhánh có IndexedDB **phải kiểm tay trong trình duyệt** (Task 6). Không dùng chế độ lưu IndexedDB của PGlite (seed game phải luôn tất định). |
| — | Từ khóa | `pg_get_keywords()` có 101 từ loại R + T. Từ loại T (`left`, `join`…) cũng không dùng trần làm tên cột được (`SELECT left FROM t` lỗi cú pháp). Tên cột/bảng sau khi sanitize mà trùng các từ này thì **thêm `_` ở cuối** (`order` → `order_`), để người chơi không phải đặt ngoặc kép. |

## Tên dùng từ Plan 1 / 1b / 1c (Task 0 và Task 6 Step 0 kiểm bằng grep)

Đã đối chiếu với văn bản Plan 1 (Task 1–11, gồm Task 10 tách `state.ts` + `ui/*`), Plan 1b và Plan 1c. Nếu Task 0 thấy thiếu tên nào: **dừng lại và báo**, không tự chế tên khác.

| File | Tên dùng trong plan này |
|---|---|
| `src/db/client.ts` | `DbClient` có hàng đợi `queue: Job[]`, `inFlight`, `pump()`, `rejectAll()`, `restart()`; `RequestKind = 'run' \| 'explain' \| 'steps'`; `request<T>(kind, sql, timeoutMs?)`, `run`, `explain`, `steps`; `QueryTimeoutError(timeoutMs)`, `DbRestartError`, `DbFailedError(detail)`; `onProgress` + message `progress` (Plan 1 Task 2 đã commit + Plan 1 Task 10 + Plan 1b Task 1) |
| `src/db/worker.ts` | `ready` trả `{ db, timings }`; `handle(db, kind, sql)`; hàng đợi `queue`; message lỗi `{ type: 'error', id, error: SqlErrorInfo }` |
| `src/db/run.ts` | `runSandboxed`, `runExplain`, `sqlErrorInfo`, `SqlError`, `QueryResult` |
| `src/db/init.ts` | `initDb(db)` chạy `schema` rồi `seed` |
| `src/viz/memo.ts` | `memoByKey`, `MEMO_MAX` (Plan 1b Task 2) |
| `src/viz/erd.ts` | `loadErMetadata(run, schema)`, `erDefinition`, `tablesInQuery` (Plan 1b Task 6) |
| `src/viz/plan.ts`, `steps.ts`, `chart.ts` | `flattenPlan`, `runSteps`, `chartSpec` (Plan 1b Task 1, 3, 5) |
| `src/ui/vizTabs.ts` | hàm `registerErdTab(deps)` có `const erMetadata = memoByKey(…)` và trong `render` dòng `const tables = unlockedTables();` (Plan 1b Task 6 Step 8) |
| `src/i18n/index.ts`, `vi.ts`, `en.ts` | `t(key, params?)`, `Key`, `Msg`; dòng mở `export const vi = {` và `export const en: Record<Key, Msg> = {` |
| `src/state.ts` | `unlockedTables(): string[]`, `editorSchema(): SQLNamespace`, `interface Column { name: string; type: string }`, `app.columns` (Plan 1 Task 10). Task 6 Step 2b của plan này thêm tham số `extra` cho `editorSchema`. |
| `src/ui/work.ts` | `WorkArea.setSchema(ns)` (Plan 1 Task 10, C14) |
| `src/ui/dom.ts` | `h()` |
| `src/grader.ts` | `errorMessage(e)` (đã có trong repo) |
| `src/session.ts` | `session.mode.kind` có `'sandbox'` (Plan 1c Task 6) |
| `src/ui/modes.ts` | `function enter(mode: Mode)` có dòng `ctx?.work.setTicket(activeTicket(), activeStep());`; `function sandboxPane(host)` có dòng `h('p', {}, t('sbx.intro')),` (Plan 1c Task 7) |
| `src/main.ts` | `const db = new DbClient(…)`, các biến `work`, `panel`, hàm `rerender()`, `panel.refresh()`, các lời gọi `editorSchema(` |
| `tests/helpers.ts` | `freshDb()`, `seededDb()` (đã có trong repo) |

> **Sau Plan 1d (Tailwind + Trang chủ, L17): điều chỉnh khi thực hiện:**
> - Task 6 Step 5: ở khối cuối `main.ts` thêm card "Dữ liệu của tôi": `registerMode({ id: 'mydata', order: 20, icon: '📂', tint: 'bg-cyan-100 dark:bg-cyan-950', title: 'mode.mydata', desc: 'mode.mydataDesc', open: () => { startSandbox(); go('play'); } })`. Import `registerMode` từ `./ui/homeView`, `go` từ `./ui/router`, `startSandbox` từ `./ui/modes`; khóa `mode.mydata*` thêm vào vi/en.
> - Task 6 Step 6: bỏ rule `.visually-hidden`, dùng class Tailwind `sr-only` cho ô `input[type=file]`. Các rule `.mydata*` còn lại vẫn dùng được (token còn nguyên); ưu tiên chuyển thành class Tailwind nguyên vẹn trong `myDataView.ts`.

## Global Constraints

- Mọi ràng buộc của Plan 1, 1b, 1c vẫn áp dụng: PGlite **0.5.16** pin; không đưa dữ liệu vào `innerHTML` (ngoại lệ duy nhất: SVG Mermaid ở tab ER, tên bảng/cột `sandbox` đã sanitize về `[a-z0-9_]`); mọi truy cập `localStorage`/IndexedDB bọc try/catch; mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit` và phải không lỗi.
- **Giới hạn D3:** file ≤ 20 MB, ≤ 200.000 dòng dữ liệu, ≤ 50 cột, ≤ 5 bảng. Kiểm ở main thread **trước khi** gửi xuống worker. Vượt thì từ chối cả file và nói rõ giới hạn nào (không cắt ngầm). Không tự hạ giới hạn vì lý do bộ nhớ: báo user.
- Nội dung CSV **chỉ là dữ liệu**: không bao giờ ghép giá trị vào SQL (chỉ đi qua `COPY` + `blob`), không render bằng `innerHTML`, không gửi ra mạng. Định danh chỉ được ghép vào SQL sau khi qua `ident()` (regex `^[a-z_][a-z0-9_]{0,62}$`).
- Import chạy **ngoài** `runSandboxed`, trong transaction riêng, timeout riêng **30 s** (`IMPORT_TIMEOUT_MS`). Nạp lại sau restart mà lỗi hoặc quá hạn → bỏ bảng đó, báo người dùng, không đưa vào lượt nạp lại sau (không có vòng lặp terminate → nạp lại → terminate).
- Bảng nạp là `UNLOGGED` (spike: bộ nhớ chỉ bằng khoảng một nửa).
- i18n: mọi chữ mới đi qua `t()`; khóa thêm vào **cả** `vi.ts` và `en.ts` trong cùng task. Lỗi có kiểu, không kèm chữ; message gốc của Postgres hiển thị nguyên văn.
- `src/ui/*`, `src/session.ts`, `src/state.ts` không có unit test (Vitest chạy Node, không DOM). Kiểm tay theo checklist ở Task 6.
- Mỗi task một commit (bước cuối của task).

## File Structure

```
src/db/import.ts         SANDBOX_SETUP_SQL, Delimiter, ColumnType, ImportRequest, ImportedTable, inferTypes, importCsv, dropImport (worker + Node)
src/db/init.ts           + chạy SANDBOX_SETUP_SQL sau seed                                          (sửa)
src/db/client.ts         + WorkerBody, IMPORT_TIMEOUT_MS, importCsv, dropImport, importedTables, onImportDropped, nạp lại sau restart (sửa)
src/db/worker.ts         handle(db, body): run | explain | steps | import | dropImport              (sửa)
src/import/csv.ts        IMPORT_LIMITS, RESERVED, sanitizeIdent, uniqueNames, tableNameFor, detectDelimiter, splitCsvLine, scanRecords, inspectCsv
src/import/store.ts      StoredImport, ImportStore, idbStore (IndexedDB), memoryStore, isStoredImport
src/import/myData.ts     ImportDb, AddOutcome, MyData (restore / add / remove / clear / dropped)
src/viz/memo.ts          + clearMemos()                                                              (sửa)
src/ui/vizTabs.ts        tab ER vẽ thêm bảng sandbox trong chế độ Sandbox                            (sửa)
src/ui/myDataView.ts     renderMyData, initMyData, setMyDataStatus, sandboxTables, visibleTables, sandboxColumns, importErrorText
src/ui/modes.ts          Sandbox pane có mục "Dữ liệu của tôi"; đổi chế độ cập nhật schema editor   (sửa)
src/main.ts              tạo MyData + idbStore, restore khi mở trang, onImportDropped                (sửa)
src/i18n/vi.ts, en.ts    + khóa mydata.*                                                              (sửa)
src/style.css            + .mydata*, .visually-hidden                                                 (sửa)
tests/import.test.ts, csv.test.ts, clientImport.test.ts, myData.test.ts, importViz.test.ts
tests/memo.test.ts       + test clearMemos                                                            (sửa)
CLAUDE.md                + mục "Imported data"                                                        (sửa)
```

---

### Task 0: Kiểm tiền đề (không sửa file)

**Files:** không có.

**Interfaces:**
- Consumes: toàn bộ bảng "Giả định về tên" ở trên.
- Produces: không có.

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS, `tsc` không in lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
grep -c "export type RequestKind\|request<T>(kind: RequestKind\|private pump(): void\|private rejectAll(e: Error)\|restart(): void {\|steps(sql: string)" src/db/client.ts
grep -c "async function handle(db: PGlite, kind: RequestKind, sql: string)" src/db/worker.ts
grep -c "export function memoByKey" src/viz/memo.ts
grep -c "export async function loadErMetadata\|export function erDefinition\|export function tablesInQuery" src/viz/erd.ts
grep -c "export async function runSteps\|export function chartSpec\|export function flattenPlan" src/viz/steps.ts src/viz/chart.ts src/viz/plan.ts
grep -c "export async function freshDb\|export function seededDb" tests/helpers.ts
```
Expected: `client.ts` → `6`, `worker.ts` → `1`, `memo.ts` → `1`, `erd.ts` → `3`, ba file viz mỗi file `1`, `helpers.ts` → `2`.

Nếu có dòng ra `0`: **dừng plan và báo** tên thiếu cho người điều phối. Các điểm neo giao diện (Task 6) được kiểm riêng ở Task 6 Step 0, nên Task 1–5 vẫn chạy được khi phần UI của Plan 1/1c chưa khớp.

- [ ] **Step 3: Không có test nào của người khác đang dùng tên mới**

Run: `grep -rn "importCsv\|SANDBOX_SETUP_SQL\|clearMemos" src tests`
Expected: không in dòng nào.

Task này không commit.

---

### Task 1: Pipeline nạp CSV trong PGlite (`src/db/import.ts`) + schema `sandbox` lúc init

**Files:**
- Create: `src/db/import.ts`
- Modify: `src/db/init.ts`
- Test: `tests/import.test.ts`

**Interfaces:**
- Consumes: `runSandboxed` (`src/db/run.ts`); `freshDb` (`tests/helpers.ts`)
- Produces:
  - `SANDBOX_SETUP_SQL: string`
  - `type Delimiter = ',' | ';'`
  - `type ColumnType = 'bigint' | 'numeric' | 'date' | 'timestamp' | 'boolean' | 'text'`
  - `interface ImportRequest { table: string; columns: string[]; delimiter: Delimiter; types?: ColumnType[] }`
  - `interface ImportedTable { table: string; columns: { name: string; type: ColumnType }[]; rows: number }`
  - `inferTypes(db: PGlite, table: string, columns: string[]): Promise<ColumnType[]>`
  - `importCsv(db: PGlite, req: ImportRequest, file: Blob): Promise<ImportedTable>` — ném lỗi gốc của PGlite (có `code`) hoặc `Error('invalid identifier: …')`
  - `dropImport(db: PGlite, table?: string): Promise<void>`
  - `initDb` chạy thêm `SANDBOX_SETUP_SQL` (idempotent nhờ `IF NOT EXISTS`)

- [ ] **Step 1: Viết test**

`tests/import.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { dropImport, importCsv, inferTypes } from '../src/db/import';
import { runSandboxed } from '../src/db/run';
import { freshDb } from './helpers';

const csv = (...lines: string[]) => new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
const COLS = ['ref', 'qty', 'amount', 'phone', 'eta', 'booked_at', 'paid', 'note'];
const ORDERS = csv(
  'ref,qty,amount,phone,eta,booked_at,paid,note',
  'A-1,3,12.50,0901234567,2026-11-01,2026-10-01 08:30,true,"có dấu phẩy, trong ô"',
  'A-2,,7,0912000000,2026-11-02,2026-10-02T09:00:00,FALSE,',
  'A-3,-4,0,0987654321,,2026-10-03 10:15:30.5,,x',
);

describe('importCsv', () => {
  it('nạp vào sandbox, suy kiểu, ô rỗng thành NULL, số có 0 đầu giữ text', async () => {
    const db = await freshDb();
    const t = await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',' }, ORDERS);
    expect(t.rows).toBe(3);
    expect(t.columns.map((c) => c.type)).toEqual(['text', 'bigint', 'numeric', 'text', 'date', 'timestamp', 'boolean', 'text']);
    const r = await runSandboxed(db, 'SELECT sum(qty), sum(amount), count(eta), count(paid), max(phone) FROM orders_csv');
    expect(r.rows).toEqual([['-1', '19.50', 2, 2, '0987654321']]);
    expect(r.types).toEqual([1700, 1700, 20, 20, 25]);
  });

  it('chỉ nhận số viết chuẩn: 1e5, NaN, 0x1F, 1_000, 007, ngày sai giữ text; số > 18 chữ số thành numeric', async () => {
    const db = await freshDb();
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    await importCsv(db, { table: 'nums', columns: cols, delimiter: ';', types: cols.map(() => 'text') },
      csv('a;b;c;d;e;f;g', '1e5;NaN;0x1F;1_000;007;99999999999999999999;2026-02-30', '1;1;1;1;1;1;2026-02-28'));
    expect(await inferTypes(db, 'nums', cols)).toEqual(['text', 'text', 'text', 'text', 'text', 'numeric', 'text']);
  });

  it('dùng kiểu được truyền vào (nạp lại) thay vì suy kiểu', async () => {
    const db = await freshDb();
    const t = await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',', types: COLS.map(() => 'text') }, ORDERS);
    expect(t.columns.every((c) => c.type === 'text')).toBe(true);
  });

  it('COPY lỗi thì không để lại gì, bảng cũ cùng tên còn nguyên', async () => {
    const db = await freshDb();
    await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',' }, ORDERS);
    await expect(importCsv(db, { table: 'orders_csv', columns: ['a', 'b'], delimiter: ',' }, csv('a,b', '1')))
      .rejects.toMatchObject({ code: '22P04' });
    expect((await runSandboxed(db, 'SELECT count(*) FROM orders_csv')).rows).toEqual([[3]]);
  });

  it('từ chối định danh chưa sanitize', async () => {
    const db = await freshDb();
    await expect(importCsv(db, { table: 'x"; DROP TABLE ports; --', columns: ['a'], delimiter: ',' }, csv('a', '1')))
      .rejects.toThrow('invalid identifier');
    await expect(importCsv(db, { table: 'ok', columns: ['Bad Name'], delimiter: ',' }, csv('a', '1')))
      .rejects.toThrow('invalid identifier');
  });

  it('bảng game thắng khi trùng tên; dropImport xóa một bảng hoặc cả schema, public không đổi', async () => {
    const db = await freshDb();
    await importCsv(db, { table: 'ports', columns: ['a'], delimiter: ',' }, csv('a', '1'));
    expect((await runSandboxed(db, 'SELECT count(*) > 1 FROM ports')).rows).toEqual([[true]]);
    await importCsv(db, { table: 'b', columns: ['a'], delimiter: ',' }, csv('a', '1'));
    await dropImport(db, 'ports');
    expect((await runSandboxed(db, 'SELECT count(*) FROM sandbox.b')).rows).toEqual([[1]]);
    await dropImport(db);
    const left = await runSandboxed(db, "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'sandbox'");
    expect(left.rows).toEqual([[0]]);
    expect((await runSandboxed(db, 'SHOW search_path')).rows).toEqual([['public, sandbox']]);
    expect((await runSandboxed(db, 'SELECT count(*) FROM shipments')).rows).toEqual([[20000]]);
  });

  it('query của người chơi trên bảng nạp vẫn bị ROLLBACK, kể cả đổi search_path', async () => {
    const db = await freshDb();
    await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',' }, ORDERS);
    await runSandboxed(db, 'DELETE FROM orders_csv');
    await runSandboxed(db, "SELECT set_config('search_path', 'sandbox', false)");
    expect((await runSandboxed(db, 'SELECT count(*) FROM orders_csv')).rows).toEqual([[3]]);
    expect((await runSandboxed(db, 'SHOW search_path')).rows).toEqual([['public, sandbox']]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/import.test.ts`
Expected: FAIL — `Failed to resolve import "../src/db/import"`.

- [ ] **Step 3: Viết `src/db/import.ts`**

```ts
import type { PGlite } from '@electric-sql/pglite';

/** Run once per session at init: imported tables live in `sandbox`; game tables win on name clashes. */
export const SANDBOX_SETUP_SQL = 'CREATE SCHEMA IF NOT EXISTS sandbox; SET search_path = public, sandbox;';

export type Delimiter = ',' | ';';
export type ColumnType = 'bigint' | 'numeric' | 'date' | 'timestamp' | 'boolean' | 'text';

export interface ImportRequest {
  table: string;
  columns: string[];
  delimiter: Delimiter;
  /** Known types (replay from IndexedDB): skips inference. */
  types?: ColumnType[];
}

export interface ImportedTable {
  table: string;
  columns: { name: string; type: ColumnType }[];
  rows: number;
}

const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;

/** Names are sanitised on the main thread; this is the second line of defence before inlining. */
function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`invalid identifier: ${name}`);
  return `"${name}"`;
}

// Bit flags per non-empty cell; bit_and over the column keeps the types every value fits.
// 18 digits always fit in bigint; leading zeros ('007', phone numbers) stay text.
const classify = (c: string) => `bit_and(CASE
  WHEN ${c} ~ '^-?(0|[1-9][0-9]{0,17})$' THEN 3
  WHEN ${c} ~ '^-?(0|[1-9][0-9]*)([.][0-9]+)?$' THEN 2
  WHEN ${c} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 4
  WHEN ${c} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2}([.][0-9]+)?)?$' THEN 8
  WHEN lower(${c}) IN ('true', 'false') THEN 16
  ELSE 0 END) FILTER (WHERE ${c} <> '')`;

const TYPE_OF_MASK = (m: number | null): ColumnType =>
  m === null ? 'text' : m & 1 ? 'bigint' : m & 2 ? 'numeric' : m & 4 ? 'date' : m & 8 ? 'timestamp' : m & 16 ? 'boolean' : 'text';

/** One scan classifies every column; date/timestamp candidates are then checked for real (2026-02-30). */
export async function inferTypes(db: PGlite, table: string, columns: string[]): Promise<ColumnType[]> {
  const from = `sandbox.${ident(table)}`;
  const masks = (await db.query<(number | null)[]>(`SELECT ${columns.map((c) => classify(ident(c))).join(', ')} FROM ${from}`, [], { rowMode: 'array' })).rows[0];
  const types = masks.map(TYPE_OF_MASK);
  const temporal = types.flatMap((ty, i) => (ty === 'date' || ty === 'timestamp' ? [i] : []));
  if (temporal.length) {
    const checks = temporal.map((i) => `bool_and(pg_input_is_valid(${ident(columns[i])}, '${types[i]}')) FILTER (WHERE ${ident(columns[i])} <> '')`);
    const ok = (await db.query<boolean[]>(`SELECT ${checks.join(', ')} FROM ${from}`, [], { rowMode: 'array' })).rows[0];
    temporal.forEach((i, k) => {
      if (!ok[k]) types[i] = 'text';
    });
  }
  return types;
}

/**
 * CSV → sandbox.<table>, outside the player's BEGIN … ROLLBACK and atomic: on any error nothing is left behind.
 * A table with the same name is replaced. UNLOGGED: no WAL, about half the memory (spike).
 */
export async function importCsv(db: PGlite, req: ImportRequest, file: Blob): Promise<ImportedTable> {
  const table = `sandbox.${ident(req.table)}`;
  const cols = req.columns.map(ident);
  const delimiter = req.delimiter === ';' ? ';' : ',';
  await db.exec('BEGIN');
  try {
    await db.exec(`DROP TABLE IF EXISTS ${table}; CREATE UNLOGGED TABLE ${table} (${cols.map((c) => `${c} text`).join(', ')})`);
    const copied = await db.query(`COPY ${table} FROM '/dev/blob' WITH (FORMAT csv, HEADER true, DELIMITER '${delimiter}')`, [], { blob: file });
    const types = req.types ?? (await inferTypes(db, req.table, req.columns));
    const alters = cols.flatMap((c, i) => (types[i] === 'text' ? [] : [`ALTER COLUMN ${c} TYPE ${types[i]} USING NULLIF(${c}, '')::${types[i]}`]));
    if (alters.length) await db.exec(`ALTER TABLE ${table} ${alters.join(', ')}`);
    await db.exec('COMMIT');
    return { table: req.table, columns: req.columns.map((name, i) => ({ name, type: types[i] })), rows: copied.affectedRows ?? 0 };
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

/** Drops one imported table, or every imported table when `table` is omitted. */
export async function dropImport(db: PGlite, table?: string): Promise<void> {
  await db.exec(table === undefined
    ? 'DROP SCHEMA IF EXISTS sandbox CASCADE; CREATE SCHEMA sandbox;'
    : `DROP TABLE IF EXISTS sandbox.${ident(table)}`);
}
```

- [ ] **Step 4: Tạo schema `sandbox` lúc init**

Trong `src/db/init.ts`:
1. Ngay dưới dòng `import seed from './seed.sql?raw';` thêm:
```ts
import { SANDBOX_SETUP_SQL } from './import';
```
2. Ngay dưới dòng `  await db.exec(seed);` thêm:
```ts
  await db.exec(SANDBOX_SETUP_SQL);
```
Plan 1/1b không tạo schema `sandbox`; dòng trên là nguồn duy nhất.

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/import.test.ts tests/seed.test.ts && npx tsc --noEmit`
Expected: PASS (7 test của `import.test.ts` và các test seed cũ), `tsc` không lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/db/import.ts src/db/init.ts tests/import.test.ts
git commit -m "feat: CSV import pipeline into sandbox schema (COPY from blob, type inference)"
```

---

### Task 2: Kiểm giới hạn và sanitize tên ở main thread (`src/import/csv.ts`)

**Files:**
- Create: `src/import/csv.ts`
- Test: `tests/csv.test.ts`

**Interfaces:**
- Consumes: `Delimiter` (Task 1); `seededDb` (tests)
- Produces:
  - `IMPORT_LIMITS = { maxBytes: 20971520, maxRows: 200000, maxColumns: 50, maxTables: 5 }`
  - `RESERVED: Set<string>` (101 từ khóa R + T của Postgres 18)
  - `withSuffix(base: string, suffix: string): string`, `sanitizeIdent(raw: string, fallback: string): string`, `uniqueNames(names: string[]): string[]`, `tableNameFor(fileName: string, gameTables: ReadonlySet<string>): string`
  - `detectDelimiter(header: string): Delimiter`, `splitCsvLine(line: string, delimiter: Delimiter): string[]`, `scanRecords(bytes: Uint8Array): { records: number; headerEnd: number }`
  - `interface ImportSpec { table; fileName; delimiter; headers: string[]; columns: string[]; rows: number; bytes: number }`
  - `type ImportProblem = { kind: 'empty' } | { kind: 'tooLarge'; bytes } | { kind: 'tooManyRows'; rows } | { kind: 'tooManyColumns'; columns } | { kind: 'tooManyTables' }`
  - `type CsvInspection = { ok: true; spec: ImportSpec } | { ok: false; problem: ImportProblem }`
  - `inspectCsv(file: Blob, fileName: string, gameTables: ReadonlySet<string>, imported: readonly string[]): Promise<CsvInspection>`

Luật tên (spec §7b + từ khóa): bỏ dấu tiếng Việt (`đ` → `d`), chữ thường, ký tự ngoài `[a-z0-9_]` → `_`, gộp `_`, bỏ `_` ở đầu/cuối; rỗng → tên dự phòng (`col_N`, `my_data`); bắt đầu bằng số → `c_`; cắt 63 ký tự; trùng từ khóa → thêm `_`; cột trùng → `_2`, `_3`… (vẫn ≤ 63); bảng trùng bảng game → `_my`. Nạp file có cùng tên bảng với bảng đã nạp = **thay** bảng đó (không tính thêm vào giới hạn 5).

- [ ] **Step 1: Viết test**

`tests/csv.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { IMPORT_LIMITS, RESERVED, inspectCsv, sanitizeIdent, scanRecords, splitCsvLine, tableNameFor, uniqueNames } from '../src/import/csv';
import { seededDb } from './helpers';

const GAME = new Set(['ports', 'shipments', 'customers']);
const bytes = (s: string) => new TextEncoder().encode(s);
const file = (s: string) => new Blob([s]);

describe('sanitize tên', () => {
  it('bỏ dấu tiếng Việt, chữ thường, ký tự lạ thành _, số đầu thêm c_', () => {
    expect(sanitizeIdent('Mã Lô (VNĐ)', 'x')).toBe('ma_lo_vnd');
    expect(sanitizeIdent('  Đơn  giá/kg ', 'x')).toBe('don_gia_kg');
    expect(sanitizeIdent('2026 Sales', 'x')).toBe('c_2026_sales');
    expect(sanitizeIdent('!!!', 'col_3')).toBe('col_3');
    expect(sanitizeIdent('a'.repeat(80), 'x')).toHaveLength(63);
  });

  it('từ khóa dành riêng của Postgres thêm _ ở cuối', () => {
    expect(sanitizeIdent('Order', 'x')).toBe('order_');
    expect(sanitizeIdent('LEFT', 'x')).toBe('left_');
    expect(sanitizeIdent('year', 'x')).toBe('year');
  });

  it('RESERVED khớp pg_get_keywords() của PGlite đang dùng', async () => {
    const db = await seededDb();
    const r = await db.query<{ word: string }>("SELECT word FROM pg_get_keywords() WHERE catcode IN ('R', 'T')");
    expect(new Set(r.rows.map((x) => x.word))).toEqual(RESERVED);
  });

  it('trùng tên thêm _2, _3 và vẫn ≤ 63 ký tự', () => {
    expect(uniqueNames(['a', 'a', 'a_2', 'a'])).toEqual(['a', 'a_2', 'a_2_2', 'a_3']);
    const long = 'b'.repeat(63);
    expect(uniqueNames([long, long])[1]).toBe(`${'b'.repeat(61)}_2`);
  });

  it('tên bảng từ tên file; trùng bảng game thêm _my', () => {
    expect(tableNameFor('Đơn hàng 2026.csv', GAME)).toBe('don_hang_2026');
    expect(tableNameFor('Shipments.CSV', GAME)).toBe('shipments_my');
    expect(tableNameFor('.csv', GAME)).toBe('my_data');
    expect(tableNameFor(`${'p'.repeat(70)}.csv`, new Set(['p'.repeat(63)]))).toBe(`${'p'.repeat(60)}_my`);
  });
});

describe('đọc CSV', () => {
  it('tách dòng tiêu đề có ngoặc kép', () => {
    expect(splitCsvLine('"Mã, lô";"He said ""hi""";x', ';')).toEqual(['Mã, lô', 'He said "hi"', 'x']);
  });

  it('đếm bản ghi: xuống dòng trong ngoặc kép không tính, dòng cuối không có \\n vẫn tính', () => {
    expect(scanRecords(bytes('a,b\n1,"x\ny"\n2,z'))).toEqual({ records: 3, headerEnd: 3 });
    expect(scanRecords(bytes('a,b\r\n1,2\r\n'))).toEqual({ records: 2, headerEnd: 4 });
  });

  it('inspectCsv: BOM, CRLF, phân cách ;, tên cột sanitize', async () => {
    const r = await inspectCsv(file('﻿"Mã lô";Số tiền;order\r\nA;1;x\r\nB;2;y\r\n'), 'Lô hàng.csv', GAME, []);
    expect(r).toEqual({
      ok: true,
      spec: { table: 'lo_hang', fileName: 'Lô hàng.csv', delimiter: ';', headers: ['Mã lô', 'Số tiền', 'order'], columns: ['ma_lo', 'so_tien', 'order_'], rows: 2, bytes: expect.any(Number) },
    });
  });

  it('từ chối theo từng giới hạn, trước khi gửi tới worker', async () => {
    const big = { size: IMPORT_LIMITS.maxBytes + 1 } as Blob; // không đọc nội dung khi quá dung lượng
    expect(await inspectCsv(big, 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'tooLarge', bytes: IMPORT_LIMITS.maxBytes + 1 } });
    expect(await inspectCsv(file('a\n' + '1\n'.repeat(IMPORT_LIMITS.maxRows + 1)), 'a.csv', GAME, []))
      .toEqual({ ok: false, problem: { kind: 'tooManyRows', rows: IMPORT_LIMITS.maxRows + 1 } });
    expect(await inspectCsv(file('a\n' + '1\n'.repeat(IMPORT_LIMITS.maxRows)), 'a.csv', GAME, [])).toMatchObject({ ok: true });
    const wide = Array.from({ length: 51 }, (_, i) => `c${i}`).join(',');
    expect(await inspectCsv(file(`${wide}\n${wide}\n`), 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'tooManyColumns', columns: 51 } });
    expect(await inspectCsv(file('a\n'), 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'empty' } });
    expect(await inspectCsv(file(''), 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'empty' } });
    const five = ['t1', 't2', 't3', 't4', 't5'];
    expect(await inspectCsv(file('a\n1\n'), 'new.csv', GAME, five)).toEqual({ ok: false, problem: { kind: 'tooManyTables' } });
    expect(await inspectCsv(file('a\n1\n'), 't3.csv', GAME, five)).toMatchObject({ ok: true, spec: { table: 't3' } });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/csv.test.ts`
Expected: FAIL — `Failed to resolve import "../src/import/csv"`.

- [ ] **Step 3: Viết `src/import/csv.ts`**

```ts
import type { Delimiter } from '../db/import';

export const IMPORT_LIMITS = { maxBytes: 20 * 1024 * 1024, maxRows: 200_000, maxColumns: 50, maxTables: 5 } as const;

/**
 * Postgres 18 keywords that cannot be a bare column name (pg_get_keywords() catcode R and T).
 * A sanitised name in this set gets a trailing `_` so players never have to quote it.
 */
export const RESERVED = new Set(('all analyse analyze and any array as asc asymmetric authorization binary both case cast check ' +
  'collate collation column concurrently constraint create cross current_catalog current_date current_role current_schema ' +
  'current_time current_timestamp current_user default deferrable desc distinct do else end except false fetch for foreign ' +
  'freeze from full grant group having ilike in initially inner intersect into is isnull join lateral leading left like limit ' +
  'localtime localtimestamp natural not notnull null offset on only or order outer overlaps placing primary references ' +
  'returning right select session_user similar some symmetric system_user table tablesample then to trailing true union ' +
  'unique user using variadic verbose when where window with').split(' '));

const MAX_IDENT = 63;

/** Appends a suffix, cutting the base so the result stays within Postgres' 63-byte identifier limit. */
export const withSuffix = (base: string, suffix: string): string => base.slice(0, MAX_IDENT - suffix.length) + suffix;

/** "Mã Lô (VNĐ)" → "ma_lo_vnd". Output always matches /^[a-z_][a-z0-9_]{0,62}$/. */
export function sanitizeIdent(raw: string, fallback: string): string {
  let s = raw.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `c_${s}`;
  s = s.slice(0, MAX_IDENT);
  return RESERVED.has(s) ? `${s}_` : s;
}

/** Duplicates get _2, _3, … in order of appearance. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.map((n) => {
    let out = n;
    for (let i = 2; seen.has(out); i++) out = withSuffix(n, `_${i}`);
    seen.add(out);
    return out;
  });
}

/** "Đơn hàng 2026.csv" → "don_hang_2026"; a game table name gets the `_my` suffix. */
export function tableNameFor(fileName: string, gameTables: ReadonlySet<string>): string {
  let s = sanitizeIdent(fileName.replace(/\.[^.]*$/, ''), 'my_data');
  while (gameTables.has(s)) s = withSuffix(s, '_my');
  return s;
}

export const detectDelimiter = (header: string): Delimiter =>
  header.split(';').length > header.split(',').length ? ';' : ',';

/** Splits one CSV line (RFC 4180 quoting, `""` inside quotes). Used for the header only. */
export function splitCsvLine(line: string, delimiter: Delimiter): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch !== '"') cur += ch;
      else if (line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Records in the file (header included) and where the header ends. Newlines inside quotes do not count. */
export function scanRecords(bytes: Uint8Array): { records: number; headerEnd: number } {
  let records = 0;
  let headerEnd = -1;
  let quoted = false;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x22) quoted = !quoted;
    else if (b === 0x0a && !quoted) {
      if (headerEnd < 0) headerEnd = i;
      records++;
    }
  }
  if (bytes.length > 0 && bytes[bytes.length - 1] !== 0x0a) records++;
  return { records, headerEnd: headerEnd < 0 ? bytes.length : headerEnd };
}

export interface ImportSpec {
  table: string;
  fileName: string;
  delimiter: Delimiter;
  /** Original header cells, for display. */
  headers: string[];
  /** Sanitised, unique column names, same order as `headers`. */
  columns: string[];
  rows: number;
  bytes: number;
}

export type ImportProblem =
  | { kind: 'empty' }
  | { kind: 'tooLarge'; bytes: number }
  | { kind: 'tooManyRows'; rows: number }
  | { kind: 'tooManyColumns'; columns: number }
  | { kind: 'tooManyTables' };

export type CsvInspection = { ok: true; spec: ImportSpec } | { ok: false; problem: ImportProblem };

/**
 * Every D3 limit is checked here, on the main thread, before anything reaches the worker.
 * Importing a file whose table name already exists replaces that table (it does not count as a new one).
 */
export async function inspectCsv(file: Blob, fileName: string, gameTables: ReadonlySet<string>, imported: readonly string[]): Promise<CsvInspection> {
  if (file.size > IMPORT_LIMITS.maxBytes) return { ok: false, problem: { kind: 'tooLarge', bytes: file.size } };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { records, headerEnd } = scanRecords(bytes);
  const header = new TextDecoder().decode(bytes.subarray(0, headerEnd)).replace(/^﻿/, '').replace(/\r$/, '');
  const rows = records - 1;
  if (!header.trim() || rows < 1) return { ok: false, problem: { kind: 'empty' } };
  if (rows > IMPORT_LIMITS.maxRows) return { ok: false, problem: { kind: 'tooManyRows', rows } };
  const delimiter = detectDelimiter(header);
  const headers = splitCsvLine(header, delimiter);
  if (headers.length > IMPORT_LIMITS.maxColumns) return { ok: false, problem: { kind: 'tooManyColumns', columns: headers.length } };
  const table = tableNameFor(fileName, gameTables);
  if (!imported.includes(table) && imported.length >= IMPORT_LIMITS.maxTables) return { ok: false, problem: { kind: 'tooManyTables' } };
  const columns = uniqueNames(headers.map((h, i) => sanitizeIdent(h, `col_${i + 1}`)));
  return { ok: true, spec: { table, fileName, delimiter, headers, columns, rows, bytes: file.size } };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/csv.test.ts && npx tsc --noEmit`
Expected: PASS (9 test), `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/import/csv.ts tests/csv.test.ts
git commit -m "feat: CSV limits, header parsing and identifier sanitising on the main thread"
```

---

### Task 3: Request `kind: 'import'` trong worker và `DbClient` (timeout 30 s, nạp lại sau restart)

**Files:**
- Modify: `src/db/client.ts`, `src/db/worker.ts`
- Test: `tests/clientImport.test.ts`

**Interfaces:**
- Consumes: `ImportRequest`, `ImportedTable`, `importCsv`, `dropImport` (Task 1); hàng đợi `DbClient` (Plan 1 Task 2 + Plan 1b Task 1); `runExplain`, `runSteps` (Plan 1b)
- Produces:
  - `IMPORT_TIMEOUT_MS = 30000`
  - `type WorkerBody = { kind: RequestKind; sql: string } | { kind: 'import'; req: ImportRequest; file: Blob } | { kind: 'dropImport'; table?: string }`
  - `DbClient.importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable>` — chỉ ghi vào danh sách nạp lại khi thành công
  - `DbClient.dropImport(table?: string): Promise<void>` — bỏ khỏi danh sách nạp lại **trước khi** gửi
  - `DbClient.importedTables(): string[]`
  - `DbClient.onImportDropped: (table: string, error: Error) => void` — gọi khi nạp lại sau restart bị lỗi/quá hạn
  - `restart()` nạp lại mọi bảng đã đăng ký (kèm `types` đã suy), xếp trước mọi request gửi sau đó
  - worker nhận `{ id } & WorkerBody`

Luật nạp lại: (1) import do người dùng bấm chỉ được đăng ký khi thành công; (2) lượt nạp lại bị **quá hạn** thì bảng bị xóa khỏi danh sách **đồng bộ, trước** `restart()`, nên lần restart đó không nạp lại nó nữa (không lặp); (3) nạp lại bị lỗi SQL thì xóa khỏi danh sách và báo; (4) nạp lại bị một restart khác cắt ngang (`DbRestartError`) thì giữ lại, vì restart đó đã xếp lượt nạp lại cho nó.

- [ ] **Step 1: Viết test**

`tests/clientImport.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DbClient, DbRestartError, IMPORT_TIMEOUT_MS, QueryTimeoutError } from '../src/db/client';
import type { ImportRequest } from '../src/db/import';

type Posted = { id: number; kind: string; sql?: string; req?: ImportRequest; file?: Blob; table?: string };

/** Stand-in for the PGlite worker: records posted requests, the test answers them by hand. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  posted: Posted[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: Posted) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  ready() {
    this.onmessage?.({ data: { type: 'ready', timings: { bootMs: 1, seedMs: 2 } } });
  }
  answer(i: number, result: unknown) {
    this.onmessage?.({ data: { type: 'result', id: this.posted[i].id, result } });
  }
  fail(i: number, message: string) {
    this.onmessage?.({ data: { type: 'error', id: this.posted[i].id, error: { message, code: '22P04' } } });
  }
}

const last = () => FakeWorker.all[FakeWorker.all.length - 1];
const REQ: ImportRequest = { table: 'orders', columns: ['ref', 'qty'], delimiter: ',' };
const FILE = new Blob(['ref,qty\nA,1\n']);
const TABLE = { table: 'orders', columns: [{ name: 'ref', type: 'text' }, { name: 'qty', type: 'bigint' }], rows: 1 };

beforeEach(() => {
  FakeWorker.all = [];
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function withImportedTable() {
  const db = new DbClient(() => {}, 5000);
  const dropped: [string, Error][] = [];
  db.onImportDropped = (t, e) => dropped.push([t, e]);
  last().ready();
  const p = db.importCsv(REQ, FILE);
  last().answer(0, TABLE);
  await expect(p).resolves.toEqual(TABLE);
  return { db, dropped };
}

/** Times out a query on the current worker, so the client restarts and replays. */
async function timeoutQuery(db: DbClient) {
  const q = db.run('SELECT slow()').catch((e: unknown) => e);
  await vi.advanceTimersByTimeAsync(5000);
  expect(await q).toBeInstanceOf(QueryTimeoutError);
}

describe('DbClient import', () => {
  it('gửi kind import kèm Blob, dùng timeout 30s thay vì 5s', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    const p = db.importCsv(REQ, FILE);
    expect(last().posted[0]).toMatchObject({ kind: 'import', req: REQ, file: FILE });
    await vi.advanceTimersByTimeAsync(IMPORT_TIMEOUT_MS - 1);
    expect(FakeWorker.all).toHaveLength(1);
    last().answer(0, TABLE);
    await expect(p).resolves.toEqual(TABLE);
    expect(db.importedTables()).toEqual(['orders']);
  });

  it('sau restart: nạp lại bảng đã nhập với kiểu đã biết, trước query gửi sau', async () => {
    const { db } = await withImportedTable();
    await timeoutQuery(db);
    const q = db.run('SELECT 1');
    last().ready();
    expect(last().posted.map((p) => p.kind)).toEqual(['import']);
    expect(last().posted[0].req).toEqual({ ...REQ, types: ['text', 'bigint'] });
    last().answer(0, TABLE);
    expect(last().posted.map((p) => p.kind)).toEqual(['import', 'run']);
    last().answer(1, { columns: [], types: [], rows: [] });
    await expect(q).resolves.toBeDefined();
  });

  it('nạp lại quá hạn: bỏ bảng, báo, restart đúng một lần rồi không nạp lại nữa', async () => {
    const { db, dropped } = await withImportedTable();
    await timeoutQuery(db);
    last().ready();
    await vi.advanceTimersByTimeAsync(IMPORT_TIMEOUT_MS);
    expect(dropped.map(([t, e]) => [t, e instanceof QueryTimeoutError])).toEqual([['orders', true]]);
    expect(FakeWorker.all).toHaveLength(3);
    last().ready();
    expect(last().posted).toEqual([]);
    expect(db.importedTables()).toEqual([]);
  });

  it('nạp lại lỗi SQL: bỏ bảng và báo, không restart', async () => {
    const { db, dropped } = await withImportedTable();
    await timeoutQuery(db);
    last().ready();
    last().fail(0, 'missing data for column "qty"');
    await vi.advanceTimersByTimeAsync(0);
    expect(dropped.map(([t, e]) => [t, e.message])).toEqual([['orders', 'missing data for column "qty"']]);
    expect(FakeWorker.all).toHaveLength(2);
  });

  it('nạp lại bị restart khác cắt ngang: vẫn giữ và nạp lại lần sau', async () => {
    const { db, dropped } = await withImportedTable();
    await timeoutQuery(db);
    db.restart(); // trước khi worker mới kịp ready
    await vi.advanceTimersByTimeAsync(0);
    last().ready();
    expect(last().posted.map((p) => p.kind)).toEqual(['import']);
    expect(dropped).toEqual([]);
  });

  it('import lần đầu lỗi thì không được ghi để nạp lại', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    const p = db.importCsv(REQ, FILE).catch((e: unknown) => e);
    last().fail(0, 'boom');
    expect(await p).toBeInstanceOf(Error);
    expect(db.importedTables()).toEqual([]);
  });

  it('dropImport bỏ bảng khỏi danh sách nạp lại; không tham số = xóa hết', async () => {
    const { db } = await withImportedTable();
    const d = db.dropImport('orders');
    expect(last().posted[1]).toMatchObject({ kind: 'dropImport', table: 'orders' });
    last().answer(1, undefined);
    await d;
    expect(db.importedTables()).toEqual([]);
    const all = db.dropImport();
    expect(last().posted[2]).toMatchObject({ kind: 'dropImport', table: undefined });
    last().answer(2, undefined);
    await all;
  });

  it('import đang chờ khi restart nhận DbRestartError', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    const slow = db.run('SELECT slow()').catch((e: unknown) => e);
    const imp = db.importCsv(REQ, FILE).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await slow).toBeInstanceOf(QueryTimeoutError);
    expect(await imp).toBeInstanceOf(DbRestartError);
    expect(db.importedTables()).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/clientImport.test.ts`
Expected: FAIL — `IMPORT_TIMEOUT_MS` không được export / `db.importCsv is not a function`.

- [ ] **Step 3: Sửa `src/db/client.ts`**

Sau sửa, file phải có đúng hình dạng dưới đây. Các dòng có chú thích `// import` là của plan này; phần còn lại là bản trên đĩa sau Plan 1 Task 2 + Plan 1 Task 10 (tiến độ tải: `LoadProgress`, `progress`, `onProgress`) + Plan 1b Task 1. Nếu file trên đĩa khác ở những dòng **không** đánh dấu (ví dụ thêm `performance.mark`, đổi tên biến cục bộ) thì **giữ bản trên đĩa** và chỉ áp các dòng `// import` vào đúng chỗ tương ứng: import kiểu, `IMPORT_TIMEOUT_MS`, `WorkerBody`, `Job.body` (thay hai trường `kind` + `sql`), `onImportDropped`, `imports`, `request()` gọi `enqueue()`, `importCsv`, `dropImport`, `importedTables`, dòng `replayImports()` trong `restart()`, `replayImports`, `enqueue`, nhánh xóa import trong timer của `pump()`, và `postMessage({ id, ...job.body })`.

```ts
import type { StepsResult } from '../viz/steps';
import type { ImportedTable, ImportRequest } from './import'; // import
import type { LoadProgress } from './loadProgress';
import { SqlError, type QueryResult, type SqlErrorInfo } from './run';

export type DbStatus = 'loading' | 'ready' | 'failed';
export interface DbTimings { bootMs: number; seedMs: number }
export type RequestKind = 'run' | 'explain' | 'steps';

/** Worst case in the spike (20 MB, 200k rows, 50 columns) took ~6.5 s in Node; the browser is slower. */ // import
export const IMPORT_TIMEOUT_MS = 30_000; // import

/** Everything the worker accepts, minus the request id. */ // import
export type WorkerBody = // import
  | { kind: RequestKind; sql: string } // import
  | { kind: 'import'; req: ImportRequest; file: Blob } // import
  | { kind: 'dropImport'; table?: string }; // import

// Errors carry no user-facing text: the UI translates them by class (instanceof).
export class QueryTimeoutError extends Error {
  name = 'QueryTimeoutError';
  constructor(readonly timeoutMs: number) {
    super();
  }
}
/** The query was waiting or running when the worker was restarted. */
export class DbRestartError extends Error {
  name = 'DbRestartError';
}
/** The worker failed to boot or crashed. `detail` is the raw technical message (not translated). */
export class DbFailedError extends Error {
  name = 'DbFailedError';
  constructor(readonly detail: string) {
    super();
  }
}

type WorkerMessage =
  | { type: 'ready'; timings: DbTimings }
  | { type: 'initError'; message: string }
  | ({ type: 'progress' } & LoadProgress)
  | { type: 'result'; id: number; result: unknown }
  | { type: 'error'; id: number; error: SqlErrorInfo };

interface Job {
  body: WorkerBody; // import: replaces `kind` + `sql`
  timeoutMs: number;
  resolve: (r: unknown) => void;
  reject: (e: Error) => void;
}

/**
 * Owns the PGlite worker. statement_timeout does not work in PGlite, so a runaway query
 * is stopped by terminating the worker and booting a fresh one (re-seeds, ~3s).
 * Requests are queued here and posted one at a time, so the timeout measures only the request
 * that is actually executing.
 */
export class DbClient {
  timings?: DbTimings;
  /** PGlite asset download progress while booting (bytes). */
  onProgress?: (p: LoadProgress) => void;
  /** Called when an imported table could not be re-imported after a restart; it is no longer replayed. */ // import
  onImportDropped: (table: string, error: Error) => void = () => {}; // import
  private worker!: Worker;
  private status: DbStatus = 'loading';
  private failure?: DbFailedError;
  private queue: Job[] = [];
  private inFlight?: { id: number; job: Job; timer: ReturnType<typeof setTimeout> };
  private nextId = 1;
  /** Imported tables (with their inferred types), replayed after every restart. */ // import
  private imports = new Map<string, { req: ImportRequest; file: Blob }>(); // import

  constructor(
    private readonly onStatus: (s: DbStatus, detail?: string) => void,
    private readonly timeoutMs = 5000,
  ) {
    this.start();
  }

  request<T>(kind: RequestKind, sql: string, timeoutMs = this.timeoutMs): Promise<T> {
    return this.enqueue<T>({ kind, sql }, timeoutMs); // import: via enqueue()
  }

  /** Rejects with SqlError, QueryTimeoutError, DbRestartError or DbFailedError. */
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

  /** CSV → sandbox.<req.table>. Only a successful import is registered for replay. */ // import
  async importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable> { // import
    const t = await this.enqueue<ImportedTable>({ kind: 'import', req, file }, IMPORT_TIMEOUT_MS); // import
    this.imports.set(req.table, { req: { ...req, types: t.columns.map((c) => c.type) }, file }); // import
    return t; // import
  } // import

  /** Drops one imported table, or every imported table when `table` is omitted. */ // import
  dropImport(table?: string): Promise<void> { // import
    if (table === undefined) this.imports.clear(); // import
    else this.imports.delete(table); // import
    return this.enqueue<void>({ kind: 'dropImport', table }, this.timeoutMs); // import
  } // import

  importedTables(): string[] { // import
    return [...this.imports.keys()]; // import
  } // import

  /** Kills the worker, rejects every waiting request with DbRestartError, boots a fresh worker, replays imports. */
  restart(): void {
    performance.mark('db:restart');
    this.worker.terminate();
    this.rejectAll(new DbRestartError());
    this.start();
    this.replayImports(); // import
  }

  /** // import
   * Queued right after start(), so replays run before anything sent later. A replay that fails
   * or times out is forgotten and reported (no restart loop); one cut short by another restart
   * stays registered and that restart replays it.
   */
  private replayImports(): void { // import
    for (const [table, { req, file }] of this.imports) { // import
      this.enqueue<ImportedTable>({ kind: 'import', req, file }, IMPORT_TIMEOUT_MS).catch((e: Error) => { // import
        if (e instanceof DbRestartError) return; // import
        this.imports.delete(table); // import
        this.onImportDropped(table, e); // import
      }); // import
    } // import
  } // import

  private enqueue<T>(body: WorkerBody, timeoutMs: number): Promise<T> { // import: was the body of request()
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ body, timeoutMs, resolve: (r) => resolve(r as T), reject });
      this.pump();
    });
  }

  private start(): void {
    this.failure = undefined;
    this.setStatus('loading');
    performance.mark('db:spawn');
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker = w;
    // Ignore anything a terminated worker still delivers.
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (w === this.worker) this.receive(e.data);
    };
    w.onerror = (e) => {
      if (w === this.worker) this.fail(e.message || 'worker error');
    };
  }

  private receive(m: WorkerMessage): void {
    if (m.type === 'ready') {
      this.timings = m.timings;
      performance.mark('db:ready');
      performance.measure('db:time-to-ready', 'db:spawn', 'db:ready');
      this.setStatus('ready');
      this.pump();
    } else if (m.type === 'initError') {
      this.fail(m.message);
    } else if (m.type === 'progress') {
      this.onProgress?.({ loaded: m.loaded, total: m.total });
    } else {
      const f = this.inFlight;
      if (!f || f.id !== m.id) return;
      clearTimeout(f.timer);
      this.inFlight = undefined;
      if (m.type === 'result') f.job.resolve(m.result);
      else f.job.reject(new SqlError(m.error));
      this.pump();
    }
  }

  /** Posts the next queued request when the worker is ready and idle; its timer starts now. */
  private pump(): void {
    if (this.status !== 'ready' || this.inFlight) return;
    const job = this.queue.shift();
    if (!job) return;
    const id = this.nextId++;
    const timer = setTimeout(() => {
      this.inFlight = undefined;
      // Forget a timed-out import before restart() replays the others, or it would loop. // import
      // Only the registered entry: a timed-out *replacement* keeps the old file replayable. // import
      const b = job.body; // import
      if (b.kind === 'import' && this.imports.get(b.req.table)?.file === b.file) this.imports.delete(b.req.table); // import
      job.reject(new QueryTimeoutError(job.timeoutMs));
      this.restart();
    }, job.timeoutMs);
    this.inFlight = { id, job, timer };
    this.worker.postMessage({ id, ...job.body }); // import: kind + payload
  }

  private fail(detail: string): void {
    this.worker.terminate();
    this.failure = new DbFailedError(detail);
    this.rejectAll(this.failure);
    this.setStatus('failed', detail);
  }

  private rejectAll(e: Error): void {
    if (this.inFlight) {
      clearTimeout(this.inFlight.timer);
      this.inFlight.job.reject(e);
      this.inFlight = undefined;
    }
    for (const job of this.queue.splice(0)) job.reject(e);
  }

  private setStatus(s: DbStatus, detail?: string): void {
    this.status = s;
    this.onStatus(s, detail);
  }
}
```

- [ ] **Step 4: Sửa `src/db/worker.ts`**

1. Thêm hai dòng import (giữ các import đang có):
```ts
import type { WorkerBody } from './client';
import { dropImport, importCsv } from './import';
```
Nếu file đang có `import type { RequestKind } from './client';` thì xóa dòng đó (không còn dùng).

2. Thay toàn bộ hàm `handle` của Plan 1b bằng:
```ts
async function handle(db: PGlite, body: WorkerBody): Promise<unknown> {
  if (body.kind === 'import') return importCsv(db, body.req, body.file);
  if (body.kind === 'dropImport') return dropImport(db, body.table);
  if (body.kind === 'explain') return runExplain(db, body.sql);
  if (body.kind === 'steps') {
    const { runSteps } = await import('../viz/steps'); // loads the parser only when this tab is used
    return runSteps(db, body.sql);
  }
  return runSandboxed(db, body.sql);
}
```

3. Trong `onmessage`: đổi kiểu tham số thành `MessageEvent<{ id: number } & WorkerBody>`, thay dòng lấy dữ liệu `const { id, kind = 'run', sql } = e.data;` (Plan 1b Task 1) bằng:
```ts
  const { id, ...body } = e.data;
```
và thay lời gọi `handle(db, kind, sql)` bằng `handle(db, body)`. Phần gửi lỗi (`sqlErrorInfo(err) ?? { message: … }`) giữ nguyên: lỗi `COPY` mang theo `code` (`22P04`, `22021`) giống lỗi query.

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/clientImport.test.ts tests/client.test.ts && npx tsc --noEmit`
Expected: PASS (8 test mới + toàn bộ test client cũ: tin nhắn cũ vẫn có `sql`), `tsc` không lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/db/client.ts src/db/worker.ts tests/clientImport.test.ts
git commit -m "feat: worker import request with 30s timeout and replay after restart"
```

---

### Task 4: Lưu file gốc (IndexedDB) và điều phối "Dữ liệu của tôi" (`src/import/store.ts`, `src/import/myData.ts`)

**Files:**
- Create: `src/import/store.ts`, `src/import/myData.ts`
- Test: `tests/myData.test.ts`

**Interfaces:**
- Consumes: `ColumnType`, `Delimiter`, `ImportRequest`, `ImportedTable`, `importCsv`, `dropImport` (Task 1); `inspectCsv`, `ImportProblem` (Task 2); `DbRestartError` (`src/db/client.ts`); `runSandboxed`, `QueryResult`; `freshDb` (tests)
- Produces:
  - `interface StoredImport { table: string; fileName: string; delimiter: Delimiter; columns: string[]; types: ColumnType[]; rows: number; file: Blob }`
  - `interface ImportStore { list(): Promise<StoredImport[]>; put(r: StoredImport): Promise<boolean>; remove(table: string): Promise<boolean>; clear(): Promise<boolean> }` — không bao giờ reject
  - `IDB_NAME = 'cargo-query'`, `IDB_STORE = 'imports'`, `isStoredImport(x: unknown): x is StoredImport`
  - `idbStore(): ImportStore`, `memoryStore(initial?: StoredImport[]): ImportStore & { records: Map<string, StoredImport> }`
  - `interface ImportDb { run(sql): Promise<QueryResult>; importCsv(req, file): Promise<ImportedTable>; dropImport(table?): Promise<void> }` — `DbClient` khớp theo cấu trúc
  - `type AddOutcome = { ok: true; table: ImportedTable; persisted: boolean } | { ok: false; problem: ImportProblem } | { ok: false; error: unknown }`
  - `class MyData { tables: ImportedTable[]; constructor(db: ImportDb, store: ImportStore, onChange: (tables: ImportedTable[]) => void); restore(): Promise<{ table: string; error: unknown }[]>; add(file: Blob, fileName: string): Promise<AddOutcome>; remove(table: string): Promise<void>; clear(): Promise<void>; dropped(table: string): Promise<void> }`

Bản ghi IndexedDB: DB `cargo-query` version 1, store `imports`, `keyPath: 'table'`, giá trị là `StoredImport` (Blob/File lưu trực tiếp nhờ structured clone). Lưu cả `types` để lúc nạp lại không phải suy kiểu (spike: 0,9–3,4 s thay vì 3,0–6,5 s mỗi bảng). `restore()` nạp **tuần tự**, nên nếu một file làm worker quá hạn thì các file sau không bị `DbRestartError` hàng loạt.

- [ ] **Step 1: Viết test**

`tests/myData.test.ts`:
```ts
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { DbRestartError } from '../src/db/client';
import { dropImport, importCsv } from '../src/db/import';
import { runSandboxed } from '../src/db/run';
import { MyData, type ImportDb } from '../src/import/myData';
import { idbStore, memoryStore, type StoredImport } from '../src/import/store';
import { freshDb } from './helpers';

const adapter = (pg: PGlite): ImportDb => ({
  run: (sql) => runSandboxed(pg, sql),
  importCsv: (req, file) => importCsv(pg, req, file),
  dropImport: (table) => dropImport(pg, table),
});

const CSV = new Blob(['Mã lô,Số lượng\nA,3\nB,4\n']);

async function setup(initial: StoredImport[] = []) {
  const pg = await freshDb();
  const store = memoryStore(initial);
  const changes: string[][] = [];
  const my = new MyData(adapter(pg), store, (ts) => changes.push(ts.map((t) => t.table)));
  return { pg, store, my, changes };
}

const count = async (pg: PGlite, table: string) => (await runSandboxed(pg, `SELECT count(*) FROM ${table}`)).rows[0][0];

describe('MyData', () => {
  it('add: nạp, lưu file gốc + kiểu cột vào store, báo thay đổi', async () => {
    const { pg, store, my, changes } = await setup();
    const r = await my.add(CSV, 'Lô hàng.csv');
    expect(r).toMatchObject({ ok: true, persisted: true, table: { table: 'lo_hang', rows: 2 } });
    expect(await count(pg, 'lo_hang')).toBe(2);
    expect(store.records.get('lo_hang')).toMatchObject({ fileName: 'Lô hàng.csv', delimiter: ',', columns: ['ma_lo', 'so_luong'], types: ['text', 'bigint'], rows: 2, file: CSV });
    expect(changes).toEqual([['lo_hang']]);
  });

  it('add: tên trùng bảng game thêm _my; cùng tên file thì thay bảng cũ', async () => {
    const { pg, my } = await setup();
    await my.add(CSV, 'shipments.csv');
    expect(await count(pg, 'shipments_my')).toBe(2);
    await my.add(new Blob(['a\n1\n']), 'shipments.csv');
    expect(my.tables.map((t) => [t.table, t.rows])).toEqual([['shipments_my', 1]]);
  });

  it('add: vượt giới hạn trả problem, lỗi COPY trả error; cả hai không đụng store', async () => {
    const { store, my } = await setup();
    for (const n of ['a', 'b', 'c', 'd', 'e']) await my.add(new Blob(['x\n1\n']), `${n}.csv`);
    expect(await my.add(CSV, 'f.csv')).toEqual({ ok: false, problem: { kind: 'tooManyTables' } });
    const bad = await my.add(new Blob(['a,b\n1\n']), 'a.csv');
    expect(bad).toMatchObject({ ok: false, error: { code: '22P04' } });
    expect([...store.records.keys()]).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('restore: nạp lại với kiểu đã lưu (không suy lại), bỏ bản ghi hỏng khỏi store', async () => {
    const good: StoredImport = { table: 'orders', fileName: 'orders.csv', delimiter: ',', columns: ['ref', 'qty'], types: ['text', 'text'], rows: 2, file: new Blob(['ref,qty\nA,1\nB,2\n']) };
    const broken: StoredImport = { ...good, table: 'broken', file: new Blob(['ref,qty\nA\n']) };
    const { pg, store, my, changes } = await setup([good, broken]);
    const failed = await my.restore();
    expect(failed.map((f) => f.table)).toEqual(['broken']);
    expect([...store.records.keys()]).toEqual(['orders']);
    expect(changes).toEqual([['orders']]);
    expect((await runSandboxed(pg, 'SELECT max(qty) FROM orders')).types).toEqual([25]); // text: types from the store
  });

  it('restore: DbRestartError giữ bản ghi để thử lại lần tải trang sau', async () => {
    const rec: StoredImport = { table: 'orders', fileName: 'o.csv', delimiter: ',', columns: ['a'], types: ['text'], rows: 1, file: new Blob(['a\n1\n']) };
    const store = memoryStore([rec]);
    const db: ImportDb = { run: async () => ({ columns: [], types: [], rows: [] }), importCsv: async () => { throw new DbRestartError(); }, dropImport: async () => {} };
    const my = new MyData(db, store, () => {});
    expect((await my.restore()).map((f) => f.error instanceof DbRestartError)).toEqual([true]);
    expect(store.records.has('orders')).toBe(true);
  });

  it('remove / clear / dropped: xóa khỏi DB, store và danh sách', async () => {
    const { pg, store, my } = await setup();
    await my.add(CSV, 'a.csv');
    await my.add(CSV, 'b.csv');
    await my.add(CSV, 'c.csv');
    await my.remove('a');
    expect(await runSandboxed(pg, "SELECT to_regclass('sandbox.a') IS NULL")).toMatchObject({ rows: [[true]] });
    await my.dropped('b');
    expect(my.tables.map((t) => t.table)).toEqual(['c']);
    expect([...store.records.keys()]).toEqual(['c']);
    await my.clear();
    expect(my.tables).toEqual([]);
    expect(store.records.size).toBe(0);
    expect((await runSandboxed(pg, "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'sandbox'")).rows).toEqual([[0]]);
  });
});

describe('idbStore', () => {
  it('không có IndexedDB (Node, chế độ riêng tư bị chặn) thì không ném lỗi', async () => {
    const s = idbStore();
    expect(await s.list()).toEqual([]);
    expect(await s.put({ table: 'a', fileName: 'a.csv', delimiter: ',', columns: [], types: [], rows: 0, file: new Blob([]) })).toBe(false);
    expect(await s.remove('a')).toBe(false);
    expect(await s.clear()).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/myData.test.ts`
Expected: FAIL — `Failed to resolve import "../src/import/myData"`.

- [ ] **Step 3: Viết `src/import/store.ts`**

```ts
import type { ColumnType, Delimiter } from '../db/import';

/** One imported CSV as kept in IndexedDB: the original file plus everything needed to replay it. */
export interface StoredImport {
  table: string;
  fileName: string;
  delimiter: Delimiter;
  columns: string[];
  types: ColumnType[];
  rows: number;
  file: Blob;
}

/** Every method resolves (never rejects): [] / false when storage is unavailable. */
export interface ImportStore {
  list(): Promise<StoredImport[]>;
  put(r: StoredImport): Promise<boolean>;
  remove(table: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

export const IDB_NAME = 'cargo-query';
export const IDB_STORE = 'imports';

const TYPES = new Set<string>(['bigint', 'numeric', 'date', 'timestamp', 'boolean', 'text']);

/** IndexedDB content is outside our control (old versions, devtools edits): keep only well-formed records. */
export function isStoredImport(x: unknown): x is StoredImport {
  const r = x as StoredImport;
  return !!r && typeof r === 'object'
    && typeof r.table === 'string' && /^[a-z_][a-z0-9_]{0,62}$/.test(r.table)
    && typeof r.fileName === 'string'
    && (r.delimiter === ',' || r.delimiter === ';')
    && Array.isArray(r.columns) && r.columns.every((c) => typeof c === 'string')
    && Array.isArray(r.types) && r.types.length === r.columns.length && r.types.every((t) => TYPES.has(t))
    && typeof r.rows === 'number'
    && r.file instanceof Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'table' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const req = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  } finally {
    db.close();
  }
}

/** Browser store. Private windows, blocked storage or a full quota make every call a no-op. */
export function idbStore(): ImportStore {
  return {
    async list() {
      try {
        return (await withStore<unknown[]>('readonly', (s) => s.getAll())).filter(isStoredImport);
      } catch {
        return [];
      }
    },
    async put(r) {
      try {
        await withStore('readwrite', (s) => s.put(r));
        return true;
      } catch {
        return false;
      }
    },
    async remove(table) {
      try {
        await withStore('readwrite', (s) => s.delete(table));
        return true;
      } catch {
        return false;
      }
    },
    async clear() {
      try {
        await withStore('readwrite', (s) => s.clear());
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Same contract in memory: tests, and a stand-in when nothing should persist. */
export function memoryStore(initial: StoredImport[] = []): ImportStore & { records: Map<string, StoredImport> } {
  const records = new Map(initial.map((r) => [r.table, r]));
  return {
    records,
    list: async () => [...records.values()],
    put: async (r) => (records.set(r.table, r), true),
    remove: async (table) => (records.delete(table), true),
    clear: async () => (records.clear(), true),
  };
}
```

- [ ] **Step 4: Viết `src/import/myData.ts`**

```ts
import { DbRestartError } from '../db/client';
import type { ImportedTable, ImportRequest } from '../db/import';
import type { QueryResult } from '../db/run';
import { inspectCsv, type ImportProblem } from './csv';
import type { ImportStore, StoredImport } from './store';

/** The part of DbClient that "Dữ liệu của tôi" needs (a PGlite adapter in tests). */
export interface ImportDb {
  run(sql: string): Promise<QueryResult>;
  importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable>;
  dropImport(table?: string): Promise<void>;
}

export type AddOutcome =
  | { ok: true; table: ImportedTable; persisted: boolean }
  | { ok: false; problem: ImportProblem }
  | { ok: false; error: unknown };

/** A restart already forgot the table (DbClient drops it from the replay list before sending). */
function ignoreRestart(e: unknown): void {
  if (!(e instanceof DbRestartError)) throw e;
}

const GAME_TABLES_SQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";

/**
 * Owns the list of imported tables: inspect → import in the worker → keep the original file in the store.
 * `onChange` gets the new list after every change (add, remove, clear, restore, a table lost on replay).
 */
export class MyData {
  tables: ImportedTable[] = [];

  constructor(
    private readonly db: ImportDb,
    private readonly store: ImportStore,
    private readonly onChange: (tables: ImportedTable[]) => void,
  ) {}

  private set(tables: ImportedTable[]): void {
    this.tables = tables;
    this.onChange(tables);
  }

  /**
   * Page load: replays the stored files one by one (sequentially, so a timeout restart cannot
   * reject the ones after it). A file that fails is removed from the store; one that only hit a
   * DbRestartError stays stored and is tried again on the next page load.
   */
  async restore(): Promise<{ table: string; error: unknown }[]> {
    const failed: { table: string; error: unknown }[] = [];
    for (const r of await this.store.list()) {
      try {
        const t = await this.db.importCsv({ table: r.table, columns: r.columns, delimiter: r.delimiter, types: r.types }, r.file);
        // Incremental, so a file the player adds while restore is still running is not wiped from the list.
        this.set([...this.tables.filter((x) => x.table !== t.table), t]);
      } catch (error) {
        if (!(error instanceof DbRestartError)) await this.store.remove(r.table);
        failed.push({ table: r.table, error });
      }
    }
    return failed;
  }

  async add(file: Blob, fileName: string): Promise<AddOutcome> {
    let imported: ImportedTable;
    let record: StoredImport;
    try {
      const game = new Set((await this.db.run(GAME_TABLES_SQL)).rows.map((r) => String(r[0])));
      const inspection = await inspectCsv(file, fileName, game, this.tables.map((t) => t.table));
      if (!inspection.ok) return inspection;
      const { table, columns, delimiter } = inspection.spec;
      imported = await this.db.importCsv({ table, columns, delimiter }, file);
      record = { table, fileName, delimiter, columns, types: imported.columns.map((c) => c.type), rows: imported.rows, file };
    } catch (error) {
      return { ok: false, error };
    }
    const persisted = await this.store.put(record);
    this.set([...this.tables.filter((t) => t.table !== imported.table), imported]);
    return { ok: true, table: imported, persisted };
  }

  /** Store first: the delete must survive a reload even if the worker is restarting right now. */
  async remove(table: string): Promise<void> {
    await this.store.remove(table);
    this.set(this.tables.filter((t) => t.table !== table));
    await this.db.dropImport(table).catch(ignoreRestart);
  }

  async clear(): Promise<void> {
    await this.store.clear();
    this.set([]);
    await this.db.dropImport().catch(ignoreRestart);
  }

  /** DbClient.onImportDropped: the worker lost this table on a replay after restart. */
  async dropped(table: string): Promise<void> {
    await this.store.remove(table);
    this.set(this.tables.filter((t) => t.table !== table));
  }
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/myData.test.ts && npx tsc --noEmit`
Expected: PASS (7 test), `tsc` không lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/import/store.ts src/import/myData.ts tests/myData.test.ts
git commit -m "feat: keep imported CSV files in IndexedDB and replay them on load"
```

---

### Task 5: Tab trực quan trên bảng `sandbox` + xóa cache khi dữ liệu nạp đổi

**Files:**
- Modify: `src/viz/memo.ts`, `tests/memo.test.ts`
- Test: `tests/importViz.test.ts`

**Interfaces:**
- Consumes: `importCsv` (Task 1); `runExplain`, `runSandboxed`; `flattenPlan`, `runSteps`, `chartSpec`, `loadErMetadata`, `erDefinition`, `memoByKey` (Plan 1b); `seededDb` (tests)
- Produces: `clearMemos(): void` trong `src/viz/memo.ts` — xóa cache của mọi `memoByKey` (EXPLAIN, Thứ tự thực thi, metadata ERD theo schema)

Lý do cần `clearMemos`: cache của Plan 1b theo **chuỗi SQL** (và metadata ERD theo **tên schema**). Khi người dùng thay một bảng nạp bằng file khác cùng tên, cùng một câu SQL sẽ cho plan và số dòng khác, nên cache phải bị xóa ở mỗi lần dữ liệu nạp thay đổi (Task 6 gọi hàm này).

- [ ] **Step 1: Viết test**

`tests/importViz.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { importCsv } from '../src/db/import';
import { runExplain, runSandboxed } from '../src/db/run';
import { chartSpec } from '../src/viz/chart';
import { erDefinition, loadErMetadata } from '../src/viz/erd';
import { flattenPlan } from '../src/viz/plan';
import { runSteps } from '../src/viz/steps';
import { seededDb } from './helpers';

const LINES = ['ref,customer,eta,teu'];
for (let i = 1; i <= 300; i++) LINES.push(`R${i},KH ${i % 7},2026-${String((i % 12) + 1).padStart(2, '0')}-01,${i % 4}`);
const FILE = new Blob([LINES.join('\n') + '\n']);

async function db() {
  const pg = await seededDb();
  await importCsv(pg, { table: 'my_orders', columns: ['ref', 'customer', 'eta', 'teu'], delimiter: ',' }, FILE);
  return pg;
}

describe('tính năng trực quan trên bảng ở schema sandbox (không ghi tên schema trong SQL)', () => {
  it('EXPLAIN: Seq Scan trên my_orders', async () => {
    const { nodes } = flattenPlan(await runExplain(await db(), 'SELECT customer, sum(teu) FROM my_orders GROUP BY customer'));
    expect(nodes.find((n) => n.type === 'Seq Scan')).toMatchObject({ relation: 'my_orders', rows: 300 });
  });

  it('Biểu đồ: OID của cột suy kiểu (text + numeric → cột, date + bigint → đường)', async () => {
    const pg = await db();
    expect(chartSpec(await runSandboxed(pg, 'SELECT customer, sum(teu) FROM my_orders GROUP BY customer ORDER BY 1'))?.kind).toBe('bar');
    expect(chartSpec(await runSandboxed(pg, 'SELECT eta, count(*) FROM my_orders GROUP BY eta ORDER BY 1'))?.kind).toBe('line');
  });

  it('Thứ tự thực thi: số dòng thật từng bước', async () => {
    const r = await runSteps(await db(), 'SELECT customer, count(*) FROM my_orders WHERE teu > 0 GROUP BY customer ORDER BY customer LIMIT 3');
    if (!r.ok) throw new Error(r.reason);
    expect(r.steps.map((s) => [s.key, s.skipped ? 'skip' : s.count])).toEqual([
      ['from', 300], ['where', 225], ['group', 7], ['having', 'skip'], ['select', 7], ['distinct', 'skip'], ['order', 7], ['limit', 3],
    ]);
  });

  it('ERD: hộp bảng của schema sandbox, không có quan hệ', async () => {
    const pg = await db();
    const { cols, cons } = await loadErMetadata((sql) => runSandboxed(pg, sql), 'sandbox');
    const def = erDefinition(cols, cons, ['my_orders'], new Set(['my_orders']));
    expect(def).toContain('my_orders {');
    expect(def).toContain('bigint teu');
    expect(def).toContain('date eta');
    expect(def).not.toContain('--');
  });
});
```

Thêm vào **cuối** `tests/memo.test.ts`, và sửa dòng import đầu file thành `import { clearMemos, memoByKey } from '../src/viz/memo';`:
```ts
describe('clearMemos', () => {
  it('xóa cache của mọi memoByKey, lần gọi sau nạp lại', async () => {
    let a = 0;
    let b = 0;
    const fa = memoByKey(async (k) => { a++; return k; });
    const fb = memoByKey(async (k) => { b++; return k; });
    await fa('sandbox');
    await fb('SELECT 1');
    clearMemos();
    await fa('sandbox');
    await fb('SELECT 1');
    expect([a, b]).toEqual([2, 2]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận trạng thái**

Run: `npx vitest run tests/importViz.test.ts tests/memo.test.ts`
Expected: `memo.test.ts` FAIL — `clearMemos` không được export. `importViz.test.ts` nên PASS ngay (search_path đã có từ Task 1). Nếu test "Thứ tự thực thi" FAIL thì dừng và báo: spike chưa kiểm được `runSteps` trên schema `sandbox` (mục 3a ở đầu plan). Không sửa `src/viz/steps.ts` trong plan này.

- [ ] **Step 3: Thêm `clearMemos` vào `src/viz/memo.ts`**

1. Ngay dưới dòng `export const MEMO_MAX = 20;` thêm:
```ts

/** Every cache made by memoByKey, so imported data changes can drop them all at once. */
const caches = new Set<Map<string, unknown>>();

/** Drops every cached value: plans, steps and ER metadata are stale once imported tables change. */
export function clearMemos(): void {
  for (const c of caches) c.clear();
}
```
2. Trong `memoByKey`, ngay dưới dòng `const cache = new Map<string, Promise<T>>();` thêm:
```ts
  caches.add(cache);
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/importViz.test.ts tests/memo.test.ts && npx tsc --noEmit`
Expected: PASS (4 test `importViz` + test `memo` cũ và mới), `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/viz/memo.ts tests/memo.test.ts tests/importViz.test.ts
git commit -m "feat: viz tabs on sandbox tables; clearMemos for imported data changes"
```

---

### Task 6: Giao diện "Dữ liệu của tôi" trong Sandbox + nối vào app

**Files:**
- Create: `src/ui/myDataView.ts`
- Modify: `src/state.ts`, `src/ui/modes.ts`, `src/ui/vizTabs.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `src/style.css`

**Interfaces:**
- Consumes: `MyData`, `AddOutcome` (Task 4); `idbStore` (Task 4); `IMPORT_LIMITS`, `ImportProblem` (Task 2); `QueryTimeoutError`, `DbRestartError`, `DbFailedError`, `DbClient.onImportDropped` (Task 3); `clearMemos` (Task 5); `errorMessage` (`src/grader.ts`); `t` (`src/i18n`); `h` (`src/ui/dom.ts`); `session` (Plan 1c); `unlockedTables`, `editorSchema` (`src/state.ts`); `WorkArea.setSchema`, `panel.refresh`, `rerender` (Plan 1); `loadErMetadata`, `erDefinition`, `tablesInQuery`, `registerErdTab` (Plan 1b)
- Produces:
  - `initMyData(m: MyData, onRerender: () => void): void`, `setMyDataStatus(text: string): void`
  - `sandboxTables(): ImportedTable[]` — bảng nạp, **chỉ** khi đang ở Sandbox (ngoài Sandbox trả `[]`)
  - `visibleTables(): string[]` — `unlockedTables()` + bảng nạp trong Sandbox
  - `sandboxColumns(): Record<string, { name: string; type: string }[]>` — tham số `extra` cho `editorSchema`
  - `src/state.ts` (sửa Plan 1): `editorSchema(extra: Record<string, Column[]> = {}): SQLNamespace` — gọi không tham số vẫn y như cũ
  - `importErrorText(e: unknown): string`, `renderMyData(): HTMLElement`
  - khóa i18n `mydata.*`

Vị trí trên giao diện (spec §6b: "sidebar chỉ có bảng đã mở và bảng trong `sandbox`"): mục "Dữ liệu của tôi" nằm trong khung trái của Sandbox, ngay dưới phần giới thiệu. Mục này liệt kê từng bảng nạp kèm cột và kiểu, có nút Xóa. Tab **Cột** giữ nguyên (bảng game đã mở). Tab **ER** trong Sandbox vẽ thêm các bảng nạp. Autocomplete của editor trong Sandbox có thêm các bảng nạp. Ngoài Sandbox, bảng nạp vẫn truy vấn được (cùng `search_path`) nhưng không hiện ở đâu, và không ảnh hưởng chấm điểm vì bảng game luôn thắng khi trùng tên.

- [ ] **Step 0: Kiểm điểm neo giao diện**

Run:
```bash
grep -c "function registerErdTab\|const tables = unlockedTables();" src/ui/vizTabs.ts
grep -c "export function editorSchema(): SQLNamespace {" src/state.ts
grep -c "export function unlockedTables\|export const unlockedTables" src/state.ts
grep -c "setSchema(" src/ui/work.ts
grep -c "kind: 'sandbox'" src/session.ts
grep -c "ctx?.work.setTicket(activeTicket(), activeStep());\|h('p', {}, t('sbx.intro'))," src/ui/modes.ts
grep -c "new DbClient(\|function rerender\|panel.refresh()" src/main.ts
grep -c "export const vi = {" src/i18n/vi.ts
grep -c "export const en: Record<Key, Msg> = {" src/i18n/en.ts
```
Expected: `vizTabs.ts` → `2`, `modes.ts` → `2`, `main.ts` → `≥ 3`, các dòng còn lại `≥ 1`.
Nếu có dòng ra `0`: **dừng Task 6 và báo** tên thiếu (Task 1–5 đã commit vẫn giữ). Kiểm thêm: nếu `t()` của Plan 1 **không** format số trong params trước khi gọi message dạng hàm, thì ở mục 12 của Step 9 chữ sẽ là "1000 rows" thay vì "1,000 rows". Đó là hành vi của `t()`, không sửa trong plan này.

- [ ] **Step 1: Thêm khóa i18n**

Trong `src/i18n/vi.ts`, ngay sau dòng `export const vi = {`:
```ts
  'mydata.title': 'Dữ liệu của tôi',
  'mydata.intro': 'Nạp file CSV (UTF-8, phân cách , hoặc ;, có dòng tiêu đề) để thử Chạy, Biểu đồ, EXPLAIN, Luồng, Thứ tự thực thi và Sơ đồ ER trên dữ liệu của bạn. Tối đa {mb} MB, {rows} dòng, {cols} cột mỗi file và {tables} bảng. File chỉ nằm trong trình duyệt này, không gửi đi đâu, và được tự nạp lại khi mở trang.',
  'mydata.drop': 'Chọn file CSV hoặc kéo thả vào đây',
  'mydata.loading': 'Đang nạp {name}…',
  'mydata.done': 'đã nạp bảng {table} ({rows} dòng, {cols} cột). Gõ SELECT * FROM {table} để xem.',
  'mydata.notPersisted': 'Trình duyệt không cho lưu file, nên bảng sẽ mất khi tải lại trang.',
  'mydata.rows': '{n} dòng',
  'mydata.delete': 'Xóa',
  'mydata.deleteAria': 'Xóa bảng {table}',
  'mydata.clear': 'Xóa toàn bộ dữ liệu đã nhập',
  'mydata.clearConfirm': 'Xóa mọi bảng đã nhập và file đã lưu trong trình duyệt?',
  'mydata.none': 'Chưa có bảng nào.',
  'mydata.empty': 'File không có dòng tiêu đề hoặc không có dòng dữ liệu nào.',
  'mydata.tooLarge': 'File khoảng {mb} MB, vượt giới hạn {max} MB.',
  'mydata.tooManyRows': 'File có {n} dòng dữ liệu, vượt giới hạn {max} dòng.',
  'mydata.tooManyColumns': 'File có {n} cột, vượt giới hạn {max} cột.',
  'mydata.tooManyTables': 'Đã có {max} bảng, là số tối đa. Xóa bớt một bảng rồi nạp lại.',
  'mydata.timeout': 'Nạp quá {s} giây nên đã dừng. Database đang được khởi động lại.',
  'mydata.restarted': 'Database vừa khởi động lại giữa chừng. Hãy nạp lại file.',
  'mydata.dbFailed': 'Database không chạy được nên không nạp được file.',
  'mydata.copyError': 'Postgres không đọc được file (lỗi gốc bên dưới). Kiểm tra mọi dòng có cùng số cột với dòng tiêu đề và file được lưu dạng UTF-8.',
  'mydata.lost': 'Bảng {table} không nạp lại được sau khi database khởi động lại, nên đã bị bỏ.',
  'mydata.restoreFailed': 'Không nạp lại được: {tables}.',
```
Trong `src/i18n/en.ts`, ngay sau dòng `export const en: Record<Key, Msg> = {`:
```ts
  'mydata.title': 'My data',
  'mydata.intro': 'Load a CSV file (UTF-8, comma or semicolon separated, with a header row) to try Run, Chart, EXPLAIN, Flow, Execution order and the ER diagram on your own data. Up to {mb} MB, {rows} rows and {cols} columns per file, {tables} tables in total. Files stay in this browser, are never uploaded, and are reloaded when you open the page.',
  'mydata.drop': 'Choose a CSV file or drop it here',
  'mydata.loading': 'Loading {name}…',
  'mydata.done': (p) => `loaded table ${p.table} (${p.rows} row${p.rows === 1 ? '' : 's'}, ${p.cols} column${p.cols === 1 ? '' : 's'}). Type SELECT * FROM ${p.table} to see it.`,
  'mydata.notPersisted': 'This browser does not allow saving files, so the table will be gone after a reload.',
  'mydata.rows': (p) => `${p.n} row${p.n === 1 ? '' : 's'}`,
  'mydata.delete': 'Delete',
  'mydata.deleteAria': 'Delete table {table}',
  'mydata.clear': 'Delete all imported data',
  'mydata.clearConfirm': 'Delete every imported table and the files saved in this browser?',
  'mydata.none': 'No tables yet.',
  'mydata.empty': 'The file has no header row or no data rows.',
  'mydata.tooLarge': 'The file is about {mb} MB, over the {max} MB limit.',
  'mydata.tooManyRows': 'The file has {n} data rows, over the {max}-row limit.',
  'mydata.tooManyColumns': 'The file has {n} columns, over the {max}-column limit.',
  'mydata.tooManyTables': 'You already have {max} tables, the maximum. Delete one and try again.',
  'mydata.timeout': 'Loading took more than {s} seconds and was stopped. The database is restarting.',
  'mydata.restarted': 'The database restarted in the middle of loading. Please load the file again.',
  'mydata.dbFailed': 'The database is not running, so the file could not be loaded.',
  'mydata.copyError': 'Postgres could not read the file (original error below). Check that every row has as many columns as the header and that the file is saved as UTF-8.',
  'mydata.lost': 'Table {table} could not be reloaded after the database restarted, so it was dropped.',
  'mydata.restoreFailed': 'Could not reload: {tables}.',
```

- [ ] **Step 2: Viết `src/ui/myDataView.ts`**

```ts
import { DbFailedError, DbRestartError, QueryTimeoutError } from '../db/client';
import type { ImportedTable } from '../db/import';
import { errorMessage } from '../grader';
import { t } from '../i18n';
import { IMPORT_LIMITS, type ImportProblem } from '../import/csv';
import type { AddOutcome, MyData } from '../import/myData';
import { session } from '../session';
import { unlockedTables } from '../state';
import { h } from './dom';

let my: MyData | undefined;
let rerender: () => void = () => {};
let status = '';
let busy = false;

/** Called once from main.ts after the MyData instance exists. */
export function initMyData(m: MyData, onRerender: () => void): void {
  my = m;
  rerender = onRerender;
}

export function setMyDataStatus(text: string): void {
  status = text;
  rerender();
}

/** Imported tables count only in Sandbox (spec §6b: sidebar = unlocked tables + sandbox tables). */
export const sandboxTables = (): ImportedTable[] => (session.mode.kind === 'sandbox' && my ? my.tables : []);

/** Unlocked game tables, plus imported ones in Sandbox: what the ER tab draws. */
export const visibleTables = (): string[] => [...unlockedTables(), ...sandboxTables().map((x) => x.table)];

/** `extra` argument for editorSchema(): imported columns with their types, Sandbox only. */
export const sandboxColumns = (): Record<string, { name: string; type: string }[]> =>
  Object.fromEntries(sandboxTables().map((x) => [x.table, x.columns]));

function problemText(p: ImportProblem): string {
  switch (p.kind) {
    case 'empty': return t('mydata.empty');
    case 'tooLarge': return t('mydata.tooLarge', { mb: Math.ceil(p.bytes / 1048576), max: IMPORT_LIMITS.maxBytes / 1048576 });
    case 'tooManyRows': return t('mydata.tooManyRows', { n: p.rows, max: IMPORT_LIMITS.maxRows });
    case 'tooManyColumns': return t('mydata.tooManyColumns', { n: p.columns, max: IMPORT_LIMITS.maxColumns });
    case 'tooManyTables': return t('mydata.tooManyTables', { max: IMPORT_LIMITS.maxTables });
  }
}

export function importErrorText(e: unknown): string {
  if (e instanceof QueryTimeoutError) return t('mydata.timeout', { s: e.timeoutMs / 1000 });
  if (e instanceof DbRestartError) return t('mydata.restarted');
  if (e instanceof DbFailedError) return `${t('mydata.dbFailed')}\n${e.detail}`;
  return `${t('mydata.copyError')}\n${errorMessage(e)}`; // Postgres' own message, never translated
}

function outcomeText(r: AddOutcome): string {
  if (!r.ok) return 'problem' in r ? problemText(r.problem) : importErrorText(r.error);
  const done = t('mydata.done', { table: r.table.table, rows: r.table.rows, cols: r.table.columns.length });
  return r.persisted ? done : `${done} ${t('mydata.notPersisted')}`;
}

async function addFiles(files: FileList | null | undefined): Promise<void> {
  if (!my || busy || !files || files.length === 0) return;
  busy = true;
  const lines: string[] = [];
  for (const f of Array.from(files)) {
    setMyDataStatus(t('mydata.loading', { name: f.name }));
    lines.push(`${f.name}: ${outcomeText(await my.add(f, f.name))}`);
  }
  busy = false;
  setMyDataStatus(lines.join('\n'));
}

async function act(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    setMyDataStatus(importErrorText(e));
  }
}

function tableItem(x: ImportedTable): HTMLElement {
  return h('li', {},
    h('details', {},
      h('summary', {}, h('code', {}, x.table), ' ', h('span', { class: 'muted' }, t('mydata.rows', { n: x.rows }))),
      h('ul', { class: 'mydata-cols' }, ...x.columns.map((c) => h('li', {}, h('code', {}, c.name), ' ', h('span', { class: 'muted' }, c.type))))),
    h('button', {
      type: 'button',
      class: 'mydata-del',
      'aria-label': t('mydata.deleteAria', { table: x.table }),
      onclick: () => void act(() => my!.remove(x.table)),
    }, t('mydata.delete')));
}

/** "Dữ liệu của tôi" section of the Sandbox pane. Everything from the file is rendered as text. */
export function renderMyData(): HTMLElement {
  const input = h('input', { type: 'file', accept: '.csv,text/csv', multiple: true, class: 'visually-hidden', id: 'mydata-file' });
  input.disabled = busy;
  input.addEventListener('change', () => void addFiles(input.files).finally(() => (input.value = '')));
  const drop = h('label', { class: 'mydata-drop', for: 'mydata-file' }, t('mydata.drop'));
  drop.addEventListener('dragover', (e) => e.preventDefault());
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    void addFiles(e.dataTransfer?.files);
  });
  const tables = my?.tables ?? [];
  return h('section', { class: 'mydata', 'aria-labelledby': 'mydata-title' },
    h('h3', { id: 'mydata-title' }, t('mydata.title')),
    h('p', { class: 'muted' }, t('mydata.intro', { mb: IMPORT_LIMITS.maxBytes / 1048576, rows: IMPORT_LIMITS.maxRows, cols: IMPORT_LIMITS.maxColumns, tables: IMPORT_LIMITS.maxTables })),
    input,
    drop,
    h('p', { class: 'mydata-status', role: 'status' }, status),
    tables.length
      ? h('ul', { class: 'mydata-list' }, ...tables.map(tableItem))
      : h('p', { class: 'muted' }, t('mydata.none')),
    tables.length
      ? h('button', {
          type: 'button',
          onclick: () => {
            if (window.confirm(t('mydata.clearConfirm'))) void act(() => my!.clear());
          },
        }, t('mydata.clear'))
      : null,
  );
}
```

- [ ] **Step 2b: Cho `editorSchema` nhận bảng nạp (`src/state.ts`)**

Plan 1 Task 10 viết `editorSchema()` không tham số. Thay toàn bộ hàm đó (cùng comment JSDoc phía trên) bằng:
```ts
/** Autocomplete: only unlocked tables (spec §4), with column types as detail; `extra` = imported tables (Sandbox only). */
export function editorSchema(extra: Record<string, Column[]> = {}): SQLNamespace {
  const tables: Record<string, Column[]> = {};
  for (const table of unlockedTables()) {
    const cols = app.columns[table];
    if (cols) tables[table] = cols;
  }
  const out: Record<string, SQLNamespace> = {};
  for (const [table, cols] of Object.entries({ ...tables, ...extra })) {
    out[table] = {
      self: { label: table, type: 'type', detail: 'table' },
      children: cols.map((c) => ({ label: c.name, type: 'property', detail: c.type })),
    };
  }
  return out;
}
```
Tên bảng nạp không trùng bảng game (hậu tố `_my`, Task 2), nên `extra` không ghi đè bảng nào. Chạy `npx tsc --noEmit`: không lỗi (các lời gọi `editorSchema()` cũ vẫn hợp lệ).

- [ ] **Step 3: Gắn vào khung Sandbox (`src/ui/modes.ts`)**

1. Thêm import:
```ts
import { editorSchema } from '../state';
import { renderMyData, sandboxColumns } from './myDataView';
```
(Nếu `modes.ts` đã import từ `'../state'` thì thêm `editorSchema` vào dòng import đó, không tạo dòng thứ hai.)
2. Trong `function sandboxPane`, ngay dưới dòng `    h('p', {}, t('sbx.intro')),` thêm:
```ts
    renderMyData(),
```
3. Trong `function enter`, ngay dưới dòng `  ctx?.work.setTicket(activeTicket(), activeStep());` thêm:
```ts
  ctx?.work.setSchema(editorSchema(sandboxColumns())); // imported tables autocomplete only in Sandbox
```

- [ ] **Step 4: Tab ER vẽ bảng nạp trong Sandbox (`src/ui/vizTabs.ts`)**

1. Thêm import:
```ts
import { sandboxTables, visibleTables } from './myDataView';
```
2. Trong `registerErdTab`, thay ba dòng:
```ts
      const tables = unlockedTables();
      const { cols, cons } = await erMetadata('public');
      await renderErd(host, erDefinition(cols, cons, tables, tablesInQuery(app.lastRun?.sql ?? '', tables)));
```
bằng:
```ts
      const tables = visibleTables();
      const pub = await erMetadata('public');
      const own = sandboxTables().length ? await erMetadata('sandbox') : { cols: [], cons: [] };
      const cols = [...pub.cols, ...own.cols];
      const cons = [...pub.cons, ...own.cons];
      await renderErd(host, erDefinition(cols, cons, tables, tablesInQuery(app.lastRun?.sql ?? '', tables)));
```
3. Nếu `unlockedTables` không còn được dùng trong file, đổi dòng import về `import { app } from '../state';` (tsc báo lỗi "declared but never read" chỉ khi bật `noUnusedLocals`; vẫn sửa cho gọn).

Tên bảng nạp không bao giờ trùng tên bảng game (hậu tố `_my`), nên ghép hai danh sách cột theo tên bảng là an toàn.

- [ ] **Step 5: Nối vào `src/main.ts`**

1. Thêm import:
```ts
import { MyData } from './import/myData';
import { idbStore } from './import/store';
import { initMyData, sandboxColumns, setMyDataStatus } from './ui/myDataView';
import { clearMemos } from './viz/memo';
```
2. Thay **mọi** lời gọi `editorSchema()` trong `src/main.ts` bằng `editorSchema(sandboxColumns())`. Kiểm bằng:
```bash
grep -n "editorSchema()" src/main.ts
```
Expected: không in dòng nào.
3. Thêm vào **cuối** `src/main.ts` (lúc đó `db`, `work`, `panel`, `rerender` đều đã có):
```ts
// "Dữ liệu của tôi" (Plan Import): imported CSVs live in IndexedDB and are replayed into the sandbox schema.
const myData = new MyData(db, idbStore(), () => {
  clearMemos(); // cached plans / steps / ER metadata describe the old data
  work.setSchema(editorSchema(sandboxColumns()));
  panel.refresh();
  rerender();
});
initMyData(myData, rerender);
db.onImportDropped = (table) => {
  void myData.dropped(table);
  setMyDataStatus(t('mydata.lost', { table }));
};
void myData.restore().then((failed) => {
  if (failed.length) setMyDataStatus(t('mydata.restoreFailed', { tables: failed.map((f) => f.table).join(', ') }));
});
```
Nếu `main.ts` chưa import `t` hoặc `editorSchema` thì thêm chúng vào dòng import sẵn có từ `'./i18n'` / `'./state'`.

- [ ] **Step 6: CSS, thêm vào cuối `src/style.css`**

```css
.mydata { border-top: 1px solid var(--border); margin-top: 12px; padding-top: 8px; }
.mydata h3 { margin: 0 0 4px; }
.mydata-drop { display: block; border: 2px dashed var(--border); border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; }
.mydata-drop:hover, .mydata:focus-within .mydata-drop { border-color: var(--accent); }
.mydata-status { white-space: pre-wrap; min-height: 1.4em; }
.mydata-list { list-style: none; padding: 0; margin: 8px 0; }
.mydata-list > li { display: flex; gap: 8px; align-items: flex-start; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); }
.mydata-cols { margin: 4px 0 0; padding-left: 16px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
```
(`style.css` của Plan 1/1b/1c chưa có `.visually-hidden`.)

- [ ] **Step 7: Kiểm kiểu, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: `tsc` không lỗi (kể cả `en.ts` đủ khóa `mydata.*`); mọi test PASS (gồm `tests/i18n.test.ts` của Plan 1: placeholder `{x}` của VI và EN khớp nhau với các khóa dạng chuỗi); build OK.

- [ ] **Step 8: Tạo file CSV mẫu để kiểm tay (ngoài repo)**

Run:
```bash
mkdir -p "$TMPDIR/cq-csv" && node -e "
const fs=require('fs');const d=process.argv[1];
let s='Mã lô,Khách hàng,Ngày ETA,TEU,Đã thanh toán\n';
for(let i=1;i<=1000;i++)s+='R'+i+',\"KH '+(i%7)+', CN\",2026-'+String(i%12+1).padStart(2,'0')+'-01,'+(i%4)+','+(i%3?'true':'false')+'\n';
fs.writeFileSync(d+'/don_hang.csv',s);
let w='order_ref,customer,city,order_date,created_at,amount,qty,is_paid,note,weight_kg\n';
for(let i=0;i<200000;i++){const t=new Date(Date.UTC(2026,0,1)+(i%300)*864e5).toISOString();w+=['ORD-'+String(i).padStart(7,'0'),'\"KH '+(i%997)+', CN\"','HCM',t.slice(0,10),t.slice(0,19).replace('T',' '),(i*37%100000)/100,i%50,i%3?'false':'true',i%10?'ghi chu':'',i%7?(i%997)+'.5':''].join(',')+'\n';}
fs.writeFileSync(d+'/big_10col.csv',w);
const c=Array.from({length:50},(_,i)=>'c'+i);let x=c.join(',')+'\n';
for(let r=0;r<200000;r++){const a=[];for(let k=0;k<50;k++)a.push((r+k)%10);x+=a.join(',')+'\n';}
fs.writeFileSync(d+'/wide_50col.csv',x);
fs.writeFileSync(d+'/shipments.csv','a;b\n1;2\n');
fs.writeFileSync(d+'/bad.csv','a,b\n1\n');
" "$TMPDIR/cq-csv" && ls -la "$TMPDIR/cq-csv"
```
Expected: 5 file; `big_10col.csv` khoảng 18–19 MB, `wide_50col.csv` khoảng 19 MB. (Nếu `$TMPDIR` rỗng thì dùng một thư mục tạm bất kỳ ngoài repo.)

- [ ] **Step 9: Kiểm tay trong trình duyệt (bắt buộc: IndexedDB và số đo trình duyệt không kiểm được trong Node)**

Run: `npm run dev`, mở Chrome. Vào Hộp thư → "Sandbox: SQL tự do".
1. Khung trái có mục **Dữ liệu của tôi**, ô kéo thả, dòng "Chưa có bảng nào." Dùng Tab: focus vào ô chọn file thì viền ô đổi màu; Enter/Space mở hộp chọn file.
2. Nạp `don_hang.csv` → trạng thái "don_hang.csv: đã nạp bảng don_hang (1.000 dòng, 5 cột)…". Mở `<details>` của bảng → cột `ma_lo text`, `khach_hang text`, `ngay_eta date`, `teu bigint`, `da_thanh_toan boolean`.
3. Gõ `SELECT khach_hang, sum(teu) FROM don_hang GROUP BY 1 ORDER BY 1` → Chạy: tab Kết quả có 7 dòng; **Biểu đồ** vẽ cột; **EXPLAIN** và **Luồng dữ liệu** có `Seq Scan don_hang`; **Thứ tự thực thi** có số dòng từng bước (1.000 → … → 7); **Sơ đồ ER** có hộp `don_hang` cạnh các bảng game đã mở, viền đậm. Autocomplete gợi ý `don_hang` và các cột của nó.
4. Nạp `shipments.csv` → bảng tên `shipments_my`; `SELECT count(*) FROM shipments` vẫn ra 20.000.
5. Nạp `bad.csv` → trạng thái là câu giải thích + lỗi gốc `missing data for column "b"`; danh sách không có `bad`.
6. **IndexedDB:** DevTools → Application → IndexedDB → `cargo-query` → `imports` có 2 bản ghi (`don_hang`, `shipments_my`), mỗi bản ghi có `file` (Blob) và `types`. **Tải lại trang** → vào Sandbox → 2 bảng vẫn còn, `SELECT count(*) FROM don_hang` = 1000.
7. Bấm **Xóa** ở `shipments_my` → bảng biến mất khỏi danh sách và khỏi IndexedDB; tải lại → vẫn không còn. Bấm "Xóa toàn bộ dữ liệu đã nhập" → hộp xác nhận → OK → danh sách rỗng, store rỗng, `SELECT * FROM don_hang` báo lỗi `42P01`.
8. **Timeout + nạp lại:** nạp lại `don_hang.csv`, chạy `SELECT count(*) FROM shipments a, shipments b` → sau 5 s báo quá hạn, database khởi động lại → ngay sau đó `SELECT count(*) FROM don_hang` vẫn ra 1000 (đã được nạp lại trước query này).
9. **Thời gian và bộ nhớ (ghi số đo vào mô tả commit):** nạp `big_10col.csv` và đo bằng đồng hồ từ lúc chọn file tới lúc có dòng "đã nạp". Mong đợi < 30 s; spike Node là ~3 s. Xóa toàn bộ, tải lại trang, rồi nạp `wide_50col.csv` 5 lần, mỗi lần đổi tên file (`w1.csv` … `w5.csv`). Mở Chrome Task Manager (Shift+Esc) và đọc cột "Memory footprint" của tab cộng với dedicated worker. **Nếu > 400 MB: không đổi giới hạn trong code; ghi số đo và báo user quyết** (spec §7b). Sau đó tải lại trang và đo thời gian từ lúc trang mở tới lúc 5 bảng nạp lại xong (spike Node: ~3,4 s mỗi bảng).
10. Nạp file thứ 6 (`don_hang.csv` khi đã có `w1`…`w5`) → "Đã có 5 bảng, là số tối đa…". Nạp `big_10col.csv` sau khi đổi tên thành `w3.csv` → thay bảng `w3`, không báo vượt.
11. **Chế độ riêng tư:** mở cửa sổ ẩn danh của Firefox, vào Sandbox, nạp `don_hang.csv`. Nếu trình duyệt chặn IndexedDB thì trạng thái có thêm "Trình duyệt không cho lưu file…" và bảng vẫn dùng được. Console không có lỗi chưa bắt.
12. Bấm `EN` → mọi chữ trong mục chuyển sang tiếng Anh ("My data", "1,000 rows"…); tên bảng/cột và lỗi Postgres giữ nguyên.
13. "Về Học chính" → tab ER và autocomplete không còn bảng nạp; ticket chấm điểm như cũ.

- [ ] **Step 10: Commit**

```bash
git add src/ui/myDataView.ts src/ui/modes.ts src/ui/vizTabs.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts src/style.css
git commit -m "feat: My data panel in Sandbox (CSV import, IndexedDB persistence, delete)"
```

---

### Task 7: Ghi chú dự án (`CLAUDE.md`)

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: không có.
- Produces: mục "Imported data" trong `CLAUDE.md`.

- [ ] **Step 1: Thêm vào cuối `CLAUDE.md`**

```markdown
## Imported data (Plan Import)

- Player CSVs go to schema `sandbox` (`search_path = public, sandbox`, set once in `initDb`; game tables win on name clashes). Tables are `UNLOGGED`.
- Flow: `inspectCsv` (main thread, every D3 limit: 20 MB / 200k rows / 50 columns / 5 tables, names sanitised to `[a-z0-9_]`, reserved words get `_`, game names get `_my`) → `DbClient.importCsv` (worker `kind: 'import'`, 30 s timeout, `COPY … FROM '/dev/blob'`, type inference in SQL) → `idbStore().put` (IndexedDB `cargo-query` / `imports`, original file + inferred types).
- `DbClient` replays imported tables after every `restart()`; a replay that fails or times out is dropped and reported (`onImportDropped`), never retried in a loop. `MyData.restore()` replays IndexedDB on page load, one file at a time.
- CSV content is data only: never concatenated into SQL, never rendered with `innerHTML`, never sent over the network. Identifiers are inlined only through `ident()` in `src/db/import.ts`.
- When imported data changes, call `clearMemos()` (EXPLAIN / steps / ER caches are keyed by SQL text and schema name).
- IndexedDB code has no Node test beyond "no IndexedDB → no throw"; check it by hand (Plan Import Task 6 Step 9).
```

- [ ] **Step 2: Kiểm tổng**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: mọi test PASS, `tsc` không lỗi, build OK.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: imported data notes in CLAUDE.md"
```
