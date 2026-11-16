# Cargo Query — Plan Import: "Dữ liệu của tôi" (nạp CSV vào schema `sandbox`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trong chế độ Sandbox, người học nạp file CSV của mình vào schema `sandbox` của PGlite. Giới hạn: ≤ 20 MB, ≤ 200.000 dòng, ≤ 50 cột mỗi file, ≤ 5 bảng. Sau đó họ dùng Chạy, Biểu đồ, EXPLAIN, Luồng dữ liệu, Thứ tự thực thi và Sơ đồ ER trên dữ liệu đó. File gốc được lưu trong IndexedDB và **không bao giờ rời trình duyệt**. File tự nạp lại khi mở trang và sau mỗi `DbClient.restart()`. Có nút xóa từng bảng và xóa toàn bộ. Không hỗ trợ SQL dump.

**Architecture:**
- Main thread kiểm mọi giới hạn và sanitize tên bằng hàm thuần (`src/import/csv.ts`) trước khi gửi gì xuống worker.
- Worker nhận request `kind: 'import'` (kèm `Blob`) và chạy `importCsv()` (`src/db/import.ts`) **ngoài** `runSandboxed`, trong một transaction riêng: `CREATE UNLOGGED TABLE` toàn cột `text` → `COPY … FROM '/dev/blob'` (parser CSV của Postgres) → suy kiểu bằng một lượt quét SQL → `ALTER COLUMN … TYPE`.
- `DbClient` giữ danh sách bảng đã nạp (kèm kiểu đã suy) và nạp lại ngay sau khi worker khởi động lại. Import đi qua **hàng đợi query** (không đi đường riêng như `parser`), nên không bao giờ chạy xen với `BEGIN … ROLLBACK` của người chơi.
- `MyData` (`src/import/myData.ts`) điều phối inspect → import → lưu IndexedDB (`src/import/store.ts`).
- Giao diện là một mục trong khung trái của Sandbox (`src/ui/myDataView.ts`, Tailwind), cộng một card "Dữ liệu của tôi" trên Trang chủ.
- Truy vấn của người chơi trên bảng nạp vẫn đi qua `runSandboxed` (BEGIN … ROLLBACK, chỉ đọc).

**Tech Stack:** như HEAD. **Không thêm dependency** (không thư viện CSV, không `fake-indexeddb`).

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §1, §6b (Sandbox), §7, **§7b**, §8.

**Nguồn quyết định:**
- `docs/team/amendments.md`, mục "Quyết định của user (2026-11-16)", **D3** (ghi đè đề xuất D3-A ở trên nó).
- `docs/team/decision-log.md`: **L5** (giữ giới hạn D3, đo bộ nhớ trên Edge, vượt thì cảnh báo trong UI + cần user xem), L7 (code trên đĩa thắng listing), L16 (Sandbox không có lịch sử), L17 (card chế độ trên Trang chủ), L22 (không dùng chữ "boss"), **L36** (tên vào Mermaid đã được `mermaidName()` escape), L37.
- Quyết định sản phẩm mới của plan này: I1–I8 (mục dưới).

**Tiền đề:** Plan 1, 1d, 1b và 1c đã xong. Plan này viết lại trên HEAD `2f917b5`: áp toàn bộ plan lên bản sao HEAD thì `tsc`, 491 test và `npm run build` đều sạch. Chạy sau Plan 1c, trước Plan 2.

## Đã bỏ / đổi vì Plans 1d/1b/1c

So với bản viết trước khi có Plan 1d/1b/1c:
1. **Task 3 không còn listing cả file `client.ts`** (L7). HEAD đã có `'parser'`, `WorkerTaskError`, message `fault`, hàng phụ `side`/`waitingSide`/`postSide`/`loadParser` và `steps<T>` generic. Listing cũ sẽ xóa mất chúng. Task 3 nay chỉ gồm các bước "Sửa" nhỏ. `Job` đổi `kind`+`sql` thành `body: WorkerBody`, kể cả job `parser`. Worker vẫn tách `parser` ra trước hàng đợi và vẫn gửi `error`/`fault` như cũ.
2. **Ba điểm neo giao diện đã đổi:**
   - tab ER (`vizTabs.ts`) giờ là `erMetadata('public').then(… erdSvg(erDefinition(…, ticketColor().hex)))`, được truyền vào `load(…, drawErd)`;
   - `enter()` (`modes.ts`) gọi `setTicket(…, true)`;
   - đoạn giới thiệu Sandbox có class Tailwind.
3. **`editorSchema()` không thêm tham số `extra`.** `work.ts` gọi `editorSchema()` mỗi lần tạo editor, còn `selectTicket()` (main.ts) đổi chế độ mà không qua `enter()`. Vì vậy `state.ts` có hook `schemaHooks.extra`, do `initMyData` gắn (I1). Không phải sửa lời gọi nào, `modes.ts`/`main.ts` không phải gọi `setSchema` khi đổi chế độ, và `work.ts` (được test mock DOM nạp) không thêm import.
4. **Bỏ bước CSS trong `style.css`** (`.mydata*`, `.visually-hidden`). Plan 1c đã chốt không thêm CSS: `myDataView.ts` dùng class Tailwind nguyên vẹn, ô file dùng `sr-only` + `peer`.
5. **Bỏ khóa `mydata.dbFailed`.** `importErrorText` dùng lại `errorText()` (`src/ui/feedback.ts`) cho `DbFailedError` và `WorkerTaskError` (lỗi không phải Postgres trong worker, ví dụ `invalid identifier`). Chỉ giữ `mydata.timeout` (30 s, không nhắc JOIN như `err.timeout`), `mydata.restarted` ("nạp lại file") và `mydata.copyError`.
6. **Checklist kiểm tay sửa theo Plan 1c:** vào Sandbox bằng nav "Sandbox" hoặc card Trang chủ (Sandbox không nằm trong Hộp thư, P6). Nút thoát là "Về Làm việc" (`prac.exit`). Đo bộ nhớ trên **Edge** (L5), không phải Chrome.
7. **Bỏ Task 6 Step 0 riêng.** Mọi điểm neo được Task 0 kiểm một lần, và mỗi bước "Sửa" tự báo khi điểm neo không khớp đúng một lần.
8. **`clearMemos()` chỉ xóa cache dữ liệu.** `once()` (Mermaid, parser) trước đây dựng trên `memoByKey`, nay có cache riêng nên không bị xóa.
9. Ghi chú Plan 1d cũ ("Sau Plan 1d: điều chỉnh khi thực hiện") đã được đưa vào Task 6: card Trang chủ đăng ký trong `modes.ts` cạnh card Sandbox (I2), class `sr-only`.
10. Ràng buộc `innerHTML` nay dựa vào `mermaidName()` (L36), không dựa vào giả định "tên đã sanitize". `importViz.test.ts` thêm một test cho tên cột `class`/`style`: hai tên này qua được `sanitizeIdent` nhưng là từ khóa của Mermaid.
11. Thêm hai chỗ phòng thủ. Trong worker, `importCsv` kiểm `types` trước khi ghép vào `ALTER … TYPE`. Khi đọc, `isStoredImport` kiểm tên cột theo regex định danh (luật "mọi giá trị lưu trữ đều được kiểm khi đọc").
12. `restore()` giữ bản ghi IndexedDB cả khi gặp `DbFailedError`, không chỉ `DbRestartError`. Lý do: PGlite boot hỏng thì `retryDb` cứu được, và file của người dùng không được mất vì lỗi đó.

## Quyết định sản phẩm của plan này (I1–I8)

| # | Quyết định | Lý do |
|---|---|---|
| I1 | Autocomplete lấy bảng nạp qua hook `schemaHooks.extra` trong `state.ts`. `initMyData` gắn hook, hook trả `{}` ngoài Sandbox. | Đơn giản nhất: không sửa lời gọi `editorSchema()` nào. Editor được dựng lại mỗi lần đổi chế độ (`force`), nên tự đúng. |
| I2 | Card "Dữ liệu của tôi" (📂, order 20, cyan) trên Trang chủ mở **Sandbox**. Mục nạp CSV nằm trong khung trái của Sandbox, không có route riêng. | Spec §7b: mục con của Sandbox. L17: card chế độ. |
| I3 | **Cảnh báo bộ nhớ** (L5) là một dòng `mydata.memoryWarn`. Dòng này hiện khi tổng `dòng × cột` của các bảng nạp ≥ `MEMORY_WARN_CELLS` = **20 triệu ô**. Giới hạn D3 giữ nguyên. **Cần user xem:** spike Node đo được 5 × 50 cột (50 triệu ô) = +364–463 MB, cộng seed thì vượt ngân sách 400 MB. Task 6 Step 9 đo trên Edge và ghi số vào `decision-log.md`. | L5: không tự hạ giới hạn, chỉ cảnh báo và báo user. Ngưỡng 20 triệu ô (khoảng 2 file 50 cột lớn nhất) lấy từ spike: 10 triệu ô ≈ +137 MB. |
| I4 | Bảng nạp chỉ hiện trong Sandbox (mục "Dữ liệu của tôi", tab ER, autocomplete). Luyện tập và Làm việc không thấy chúng. Tab **Cột** giữ nguyên (chỉ bảng game đã mở). | Spec §7b "Hiển thị". Danh sách cột của bảng nạp đã có trong mục "Dữ liệu của tôi". |
| I5 | Nạp nhiều file một lượt: chạy **tuần tự**, mỗi file một dòng trạng thái. Đang nạp thì ô chọn file bị khóa. | Hàng đợi worker vốn tuần tự. Tránh hai lượt nạp chạy chồng nhau. |
| I6 | Dòng trạng thái chỉ nằm trong bộ nhớ (không lưu, tải lại trang thì mất). Bảng nạp lại thất bại khi mở trang được báo bằng **một** dòng `mydata.restoreFailed`. | Không thêm khóa lưu trữ nào. |
| I7 | Lúc mở trang, bản ghi IndexedDB có tên trùng một bảng game (ví dụ Plan 2 thêm bảng mới trùng tên) bị **bỏ** và báo trong `restoreFailed`. | Bảng game luôn thắng. Nếu giữ lại, tab ER sẽ trộn cột của hai bảng cùng tên. |
| I8 | Lượt nạp lại lúc mở trang đi trước các query xếp sau nó trong hàng đợi. Người chơi bấm Chạy ngay khi mở trang có thể phải chờ vài giây (spike: ~0,9–3,4 s mỗi bảng). | Hàng đợi một query mỗi lần (CLAUDE.md). Chấp nhận; trạng thái DB vẫn là `ready`. |

## Kết quả spike (2026-11-16, trước khi viết plan)

Đo bằng Node 24 + `@electric-sql/pglite` 0.5.16 trên main thread của laptop Windows (không phải worker trong trình duyệt), với code đúng như trong plan này. Trình duyệt thường chậm hơn, nên Task 6 đo lại trong trình duyệt.

| # | Câu hỏi | Kết quả |
|---|---|---|
| 1 | `COPY … FROM '/dev/blob'` với `db.query(sql, [], { blob })` | **Chạy được.** `affectedRows` = số dòng. Chạy được trong `BEGIN … COMMIT`, lỗi thì `ROLLBACK` không để lại gì. Xử lý đúng BOM, CRLF, phân cách `;`, ô có ngoặc kép chứa dấu phẩy. Lỗi trả SQLSTATE: dòng thiếu cột / thừa cột `22P04`, byte không phải UTF-8 `22021`. |
| 1a | Thời gian, CSV 18,7 MB / 200.000 dòng / 10 cột (chữ, ngày, timestamp, số, bool) | đọc + kiểm giới hạn ở main ~0,3 s; nạp đủ (COPY + suy kiểu + ALTER) **~3,0–3,3 s**/bảng; nạp lại khi đã biết kiểu **~0,9 s** |
| 1b | Thời gian, trường hợp xấu nhất 19,1 MB / 200.000 dòng / **50 cột** số ngắn | nạp đủ **~5,9–6,5 s**/bảng (COPY ~0,8 s, suy kiểu ~3–4 s, ALTER ~1,9 s); nạp lại khi đã biết kiểu **~3,4 s**. Timeout 30 s còn dư khoảng 4 lần. |
| 1c | Bộ nhớ (`arrayBuffers` của Node, tính từ sau seed; seed ≈ 94 MB) | 5 × 10 cột: **+137 MB** với `UNLOGGED` so với **+355 MB** khi bảng thường (WAL). → **Quyết định: bảng `UNLOGGED`.** 5 × 50 cột (UNLOGGED): **+364 MB** (có gc) đến +463 MB (không gc). Cộng seed, trường hợp xấu nhất khoảng **460–560 MB, vượt ngân sách tab 400 MB (F4)**. Theo spec §7b và L5: **không tự hạ giới hạn**; cảnh báo trong UI (I3) và báo user. |
| 2 | Suy kiểu | Cách đầu tiên là 5 lần `pg_input_is_valid` cho mỗi ô. Cách này chậm (10,2 s với 50 cột) và **quá dễ dãi**: `'0901234567'`, `'007'`, `'0x1F'`, `'1_000'` đều thành bigint (số 0 đầu của số điện thoại/mã bưu chính sẽ mất), còn `'NaN'`, `'Infinity'`, `'1e5'`, `'.5'` đều thành numeric. **Chọn:** một lượt quét `bit_and(CASE <regex> …)` cho mọi cột, với các dạng: bigint ≤ 18 chữ số, không có số 0 đầu; numeric dạng `-?d+(.d+)?`; date `YYYY-MM-DD`; timestamp `YYYY-MM-DD[ T]HH:MM[:SS[.f]]`; boolean `true/false`. Sau đó chỉ cột ứng viên date/timestamp mới qua `pg_input_is_valid` (để bắt `2026-02-30`). Cách này nhanh gấp đôi. Chỉ nhận ngày ISO, vì `DateStyle` là `ISO, MDY` nên `11/12/2026` sẽ bị đọc thành ngày 12/11. Ô rỗng → `NULL`. |
| 3 | `search_path` + schema `sandbox` | `SET search_path = public, sandbox` ở cấp phiên **giữ nguyên** qua mọi `BEGIN … ROLLBACK`. Người chơi gọi `set_config('search_path', …, false)` bên trong sandbox thì bị rollback. Trùng tên thì bảng game thắng. `DELETE` / `DROP SCHEMA sandbox` / `CREATE TABLE` của người chơi đều bị rollback. `DROP SCHEMA sandbox CASCADE; CREATE SCHEMA sandbox` reset sạch trong ~3 ms; `public` không đổi, `search_path` vẫn đúng. EXPLAIN, `information_schema` (ERD) và Biểu đồ chạy được trên bảng `sandbox` (có test ở Task 5). |
| 3a | Thứ tự thực thi (`runSteps`) trên bảng `sandbox` | Spike chưa chạy được vì lúc đó chưa có parser. Nay HEAD đã có `runSteps`, và Task 5 có test thật cho phần này. |
| 4 | IndexedDB | Chỉ có trong trình duyệt, Node không có (`indexedDB` undefined). Thiết kế: DB `cargo-query`, object store `imports`, keyPath `table`, bản ghi `{ table, fileName, delimiter, columns, types, rows, file: Blob }`. Lưu **kiểu đã suy** để lúc nạp lại bỏ qua bước suy kiểu. Mọi lời gọi bọc try/catch và trả `[]`/`false` khi lỗi (Node, chế độ riêng tư, hết quota). Test Node chỉ kiểm được nhánh "không có IndexedDB"; nhánh có IndexedDB **phải kiểm tay trong trình duyệt** (Task 6). Không dùng chế độ lưu IndexedDB của PGlite (seed game phải luôn tất định). |
| — | Từ khóa | `pg_get_keywords()` có 101 từ loại R + T. Từ loại T (`left`, `join`…) cũng không dùng trần làm tên cột được (`SELECT left FROM t` lỗi cú pháp). Tên cột/bảng sau khi sanitize mà trùng các từ này thì **thêm `_` ở cuối** (`order` → `order_`), để người chơi không phải đặt ngoặc kép. |

## Tên dùng từ HEAD (Task 0 kiểm bằng grep)

| File | Tên dùng trong plan này |
|---|---|
| `src/db/client.ts` | `RequestKind = 'run' \| 'explain' \| 'steps' \| 'parser'`; `PARSER_TIMEOUT_MS`; `interface Job { kind; sql; timeoutMs; resolve; reject }`; `DbClient` có `queue`, `inFlight`, `side`, `waitingSide`, `postSide`, `loadParser`, `pump()`, `rejectAll()`, `restart()`, `request<T>(kind, sql, timeoutMs?)`, `run`, `explain`, `steps<T>`; lỗi `QueryTimeoutError(timeoutMs)`, `DbRestartError`, `WorkerTaskError(detail?)`, `DbFailedError(detail)`; message `fault` |
| `src/db/worker.ts` | `ready` trả `{ db, timings }`; `handle(db, kind, sql)`; `loadParser(id)` chạy ngoài hàng đợi; `onmessage` nhận `{ id, kind, sql }`; lỗi Postgres → `error`, lỗi khác → `fault` |
| `src/db/run.ts` | `runSandboxed`, `runExplain`, `sqlErrorInfo`, `SqlError`, `QueryResult { columns, types, rows }` |
| `src/db/init.ts` | `initDb(db)` chạy `schema` rồi `seed` |
| `src/viz/memo.ts` | `MEMO_MAX`, `memoByKey`, `once` |
| `src/viz/erd.ts` | `loadErMetadata(run, schema)`, `erDefinition(cols, cons, tables, highlight, color?)`, `tablesInQuery`, `mermaidName` (L36) |
| `src/viz/plan.ts`, `steps.ts`, `chart.ts` | `flattenPlan` (`nodes[].type/relation/rows`), `runSteps(db, sql)` (`{ ok, steps[].key/skipped/count }` hoặc `{ ok: false, reason }`), `chartSpec` |
| `src/ui/vizTabs.ts` | `registerErdTab` có `const erMetadata = memoByKey(…)` và trong `render` dòng `const tables = unlockedTables();`, `ticketColor()`, `load`, `erdSvg`, `drawErd` |
| `src/state.ts` | `unlockedTables()`, `editorSchema(): SQLNamespace`, `interface Column`, `app.columns` |
| `src/session.ts` | `session.mode.kind` có `'sandbox'` |
| `src/ui/modes.ts` | `sandboxPane(host)` có dòng `h('p', { class: 'text-[15px] leading-relaxed' }, t('sbx.intro')),`; `startSandbox`; `registerMode` (card `sandbox`, order 10) |
| `src/ui/homeView.ts` | `registerMode(m: ModeCard)` với `{ id, order, icon, tint, title, desc, open }` |
| `src/ui/feedback.ts` | `errorText(e)` |
| `src/ui/dom.ts`, `src/theme.ts` | `h()`, `cx()` |
| `src/i18n/*` | `t(key, params?)` (số trong message dạng chuỗi được format theo locale; message dạng hàm nhận số thô); `en.ts` có `num()` và `count(one, many)`; dòng mở `export const vi = {` và `export const en: Record<Key, Msg> = {` |
| `src/main.ts` | `const db = new DbClient(onDbStatus);`, `work`, `panel.refresh()`, `rerender()`, `editorSchema` đã import, dòng `import { applyStatic, setLang, type Lang } from './i18n';` |
| `tests/helpers.ts` | `freshDb()`, `seededDb()` |

**Cách đọc các bước sửa code.** Mỗi bước dùng một trong ba dạng dưới đây, áp đúng thứ tự trong plan.
- **Tạo `path`:** ghi cả file, ghi đè nếu file đã có.
- **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần** trong file. Thay nó bằng khối sau chữ "bằng:".
- **Thêm vào cuối `path`:** nối khối vào cuối file.

Nếu một khối "thay" không khớp đúng một lần (HEAD đã đổi), thì áp ý của bước vào code trên đĩa (L7) và ghi lại chỗ lệch trong mô tả commit.

## Global Constraints

- Mọi ràng buộc của Plan 1, 1d, 1b, 1c vẫn áp dụng: PGlite **0.5.16** pin. Không đưa dữ liệu vào `innerHTML`. Ngoại lệ duy nhất là SVG Mermaid ở tab ER: mọi tên bảng/cột/kiểu đi vào văn bản Mermaid qua `mermaidName()` (L36), nên tên `sandbox` nào cũng không thêm được cú pháp. Mọi truy cập `localStorage`/IndexedDB bọc try/catch, và mọi giá trị đọc ra đều được kiểm (`isStoredImport`). Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit` và phải không lỗi.
- **Giới hạn D3:** file ≤ 20 MB, ≤ 200.000 dòng dữ liệu, ≤ 50 cột, ≤ 5 bảng. Kiểm ở main thread **trước khi** gửi xuống worker. Vượt thì từ chối cả file và nói rõ vượt giới hạn nào (không cắt ngầm). Không tự hạ giới hạn vì lý do bộ nhớ (L5): cảnh báo (I3) và báo user.
- Nội dung CSV **chỉ là dữ liệu và không rời trình duyệt**:
  - không bao giờ ghép giá trị vào SQL (chỉ đi qua `COPY` + `blob`);
  - không render bằng `innerHTML`;
  - không gửi ra mạng; nút "Sao chép thông tin chẩn đoán" (Plan 1c Task 11, chưa có trên HEAD) cũng không được chép tên hay nội dung file.
  
  Định danh chỉ được ghép vào SQL sau khi qua `ident()` (regex `^[a-z_][a-z0-9_]{0,62}$`), và kiểu cột chỉ sau khi qua `COLUMN_TYPES`.
- Import chạy **ngoài** `runSandboxed`, trong transaction riêng, với timeout riêng **30 s** (`IMPORT_TIMEOUT_MS`). Nạp lại sau restart mà lỗi hoặc quá hạn thì bỏ bảng đó, báo người dùng, và không đưa nó vào lượt nạp lại sau. Không có vòng lặp terminate → nạp lại → terminate.
- Bảng nạp là `UNLOGGED` (spike: bộ nhớ chỉ bằng khoảng một nửa).
- i18n: mọi chữ mới đi qua `t()`; khóa thêm vào **cả** `vi.ts` và `en.ts` trong cùng task; message EN dạng hàm dùng `num()`/`count()`. Không dùng chữ "boss" (L22). Lỗi có kiểu, không kèm chữ; message gốc của Postgres hiển thị nguyên văn.
- `src/ui/*`, `src/session.ts`, `src/state.ts` không có unit test mới (Vitest chạy Node, không DOM). Kiểm tay theo checklist ở Task 6.
- Mỗi task một commit (bước cuối của task). Chỉ `git add` đúng các file của task.

## File Structure

```
src/db/import.ts         SANDBOX_SETUP_SQL, Delimiter, ColumnType, COLUMN_TYPES, ImportRequest, ImportedTable, inferTypes, importCsv, dropImport (worker + Node)
src/db/init.ts           + chạy SANDBOX_SETUP_SQL sau seed                                          (sửa)
src/db/client.ts         + WorkerBody, IMPORT_TIMEOUT_MS, Job.body, enqueue, importCsv, dropImport, importedTables, onImportDropped, nạp lại sau restart (sửa)
src/db/worker.ts         handle(db, body): run | explain | steps | import | dropImport; parser vẫn ngoài hàng đợi (sửa)
src/import/csv.ts        IMPORT_LIMITS, MEMORY_WARN_CELLS, RESERVED, sanitizeIdent, uniqueNames, tableNameFor, detectDelimiter, splitCsvLine, scanRecords, inspectCsv
src/import/store.ts      StoredImport, ImportStore, idbStore (IndexedDB), memoryStore, isStoredImport
src/import/myData.ts     ImportDb, AddOutcome, importedCells, MyData (restore / add / remove / clear / dropped)
src/viz/memo.ts          + clearMemos(); once() có cache riêng                                      (sửa)
src/state.ts             + schemaHooks.extra cho editorSchema()                                      (sửa)
src/ui/myDataView.ts     initMyData, setMyDataStatus, sandboxTables, visibleTables, importErrorText, renderMyData
src/ui/vizTabs.ts        tab ER vẽ thêm bảng sandbox trong chế độ Sandbox                            (sửa)
src/ui/modes.ts          Sandbox pane có mục "Dữ liệu của tôi"; card Trang chủ `mydata`             (sửa)
src/main.ts              tạo MyData + idbStore, restore khi mở trang, onImportDropped                (sửa)
src/i18n/vi.ts, en.ts    + khóa mode.mydata*, mydata.*                                               (sửa)
tests/import.test.ts, csv.test.ts, clientImport.test.ts, myData.test.ts, importViz.test.ts
tests/memo.test.ts       + test clearMemos                                                            (sửa)
CLAUDE.md                + mục "Imported data"                                                        (sửa)
```

---

### Task 0: Kiểm tiền đề (không sửa file)

**Files:** không có.

**Interfaces:**
- Consumes: toàn bộ bảng "Tên dùng từ HEAD" ở trên.
- Produces: không có.

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS, `tsc` không in lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
grep -c "export type RequestKind = 'run' | 'explain' | 'steps' | 'parser';\|export const PARSER_TIMEOUT_MS\|private postSide(job: Job)\|const job: Job = { kind: 'parser'\|restart(): void {" src/db/client.ts
grep -c "async function handle(db: PGlite, kind: RequestKind, sql: string)\|if (kind === 'parser') return void loadParser(id);" src/db/worker.ts
grep -c "export function memoByKey\|export function once" src/viz/memo.ts
grep -c "export async function loadErMetadata\|export function erDefinition\|export function tablesInQuery\|export function mermaidName" src/viz/erd.ts
grep -c "export async function freshDb\|export function seededDb" tests/helpers.ts
grep -c "const tables = unlockedTables();\|erdSvg(erDefinition(cols, cons, tables" src/ui/vizTabs.ts
grep -c "export function editorSchema(): SQLNamespace {" src/state.ts
grep -c "t('sbx.intro')),\|export const startSandbox" src/ui/modes.ts
grep -c "export function errorText" src/ui/feedback.ts
grep -c "const db = new DbClient(onDbStatus);\|import { applyStatic, setLang, type Lang } from './i18n';" src/main.ts
```
Expected (theo thứ tự): `5`, `2`, `2`, `4`, `2`, `2`, `1`, `2`, `1`, `2`.

Nếu có dòng ra số khác: đối chiếu với các bước "Sửa" liên quan, áp ý của bước vào code trên đĩa (L7) và ghi lại chỗ lệch.

- [ ] **Step 3: Không có code nào đang dùng tên mới**

Run: `grep -rn "importCsv\|SANDBOX_SETUP_SQL\|clearMemos\|schemaHooks\|mydata" src tests`
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
  - `type ColumnType = 'bigint' | 'numeric' | 'date' | 'timestamp' | 'boolean' | 'text'`, `COLUMN_TYPES: readonly ColumnType[]`
  - `interface ImportRequest { table: string; columns: string[]; delimiter: Delimiter; types?: ColumnType[] }`
  - `interface ImportedTable { table: string; columns: { name: string; type: ColumnType }[]; rows: number }`
  - `inferTypes(db: PGlite, table: string, columns: string[]): Promise<ColumnType[]>`
  - `importCsv(db: PGlite, req: ImportRequest, file: Blob): Promise<ImportedTable>`. Lỗi ném ra là lỗi gốc của PGlite (có `code`), hoặc `Error('invalid identifier: …')` / `Error('invalid column types')`.
  - `dropImport(db: PGlite, table?: string): Promise<void>`
  - `initDb` chạy thêm `SANDBOX_SETUP_SQL` (idempotent nhờ `IF NOT EXISTS`)

- [ ] **Step 1: Viết test**

**Tạo `tests/import.test.ts`:**
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

  it('từ chối định danh chưa sanitize và kiểu lạ trước khi ghép vào SQL', async () => {
    const db = await freshDb();
    await expect(importCsv(db, { table: 'x"; DROP TABLE ports; --', columns: ['a'], delimiter: ',' }, csv('a', '1')))
      .rejects.toThrow('invalid identifier');
    await expect(importCsv(db, { table: 'ok', columns: ['Bad Name'], delimiter: ',' }, csv('a', '1')))
      .rejects.toThrow('invalid identifier');
    const evil = ['text; DROP TABLE ports'] as unknown as ('text')[];
    await expect(importCsv(db, { table: 'ok', columns: ['a'], delimiter: ',', types: evil }, csv('a', '1')))
      .rejects.toThrow('invalid column types');
    expect((await runSandboxed(db, 'SELECT count(*) > 0 FROM ports')).rows).toEqual([[true]]);
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

**Tạo `src/db/import.ts`:**
```ts
import type { PGlite } from '@electric-sql/pglite';

/** Run once per session at init: imported tables live in `sandbox`; game tables win on name clashes. */
export const SANDBOX_SETUP_SQL = 'CREATE SCHEMA IF NOT EXISTS sandbox; SET search_path = public, sandbox;';

export type Delimiter = ',' | ';';
export type ColumnType = 'bigint' | 'numeric' | 'date' | 'timestamp' | 'boolean' | 'text';
/** Every type inference can produce; the only type names ever inlined into SQL. */
export const COLUMN_TYPES: readonly ColumnType[] = ['bigint', 'numeric', 'date', 'timestamp', 'boolean', 'text'];

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
  if (req.types && (req.types.length !== cols.length || !req.types.every((ty) => COLUMN_TYPES.includes(ty)))) {
    throw new Error('invalid column types');
  }
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

**Sửa `src/db/init.ts`** — thay:
```ts
import seed from './seed.sql?raw';
```
bằng:
```ts
import seed from './seed.sql?raw';
import { SANDBOX_SETUP_SQL } from './import';
```

**Sửa `src/db/init.ts`** — thay:
```ts
  await db.exec(seed);
```
bằng:
```ts
  await db.exec(seed);
  await db.exec(SANDBOX_SETUP_SQL);
```
Plan 1/1b/1c không tạo schema `sandbox`; dòng trên là nguồn duy nhất.

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
  - `MEMORY_WARN_CELLS = 20_000_000` (I3)
  - `RESERVED: Set<string>` (101 từ khóa R + T của Postgres 18)
  - `withSuffix(base: string, suffix: string): string`, `sanitizeIdent(raw: string, fallback: string): string`, `uniqueNames(names: string[]): string[]`, `tableNameFor(fileName: string, gameTables: ReadonlySet<string>): string`
  - `detectDelimiter(header: string): Delimiter`, `splitCsvLine(line: string, delimiter: Delimiter): string[]`, `scanRecords(bytes: Uint8Array): { records: number; headerEnd: number }`
  - `interface ImportSpec { table; fileName; delimiter; headers: string[]; columns: string[]; rows: number; bytes: number }`
  - `type ImportProblem = { kind: 'empty' } | { kind: 'tooLarge'; bytes } | { kind: 'tooManyRows'; rows } | { kind: 'tooManyColumns'; columns } | { kind: 'tooManyTables' }`
  - `type CsvInspection = { ok: true; spec: ImportSpec } | { ok: false; problem: ImportProblem }`
  - `inspectCsv(file: Blob, fileName: string, gameTables: ReadonlySet<string>, imported: readonly string[]): Promise<CsvInspection>`

Luật tên (spec §7b + từ khóa):
- bỏ dấu tiếng Việt (`đ` → `d`), chuyển chữ thường;
- ký tự ngoài `[a-z0-9_]` → `_`, gộp các `_` liền nhau, bỏ `_` ở đầu/cuối;
- rỗng → tên dự phòng (`col_N`, `my_data`); bắt đầu bằng số → thêm `c_`;
- cắt còn 63 ký tự; trùng từ khóa → thêm `_`;
- cột trùng tên → `_2`, `_3`… (vẫn ≤ 63 ký tự); bảng trùng bảng game → `_my`.

Nạp file có cùng tên bảng với bảng đã nạp = **thay** bảng đó (không tính thêm vào giới hạn 5).

- [ ] **Step 1: Viết test**

**Tạo `tests/csv.test.ts`:**
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

**Tạo `src/import/csv.ts`:**
```ts
import type { Delimiter } from '../db/import';

export const IMPORT_LIMITS = { maxBytes: 20 * 1024 * 1024, maxRows: 200_000, maxColumns: 50, maxTables: 5 } as const;

/**
 * Imported rows × columns from which the My data panel warns about memory (L5, I3). The D3 limits stay:
 * the spike measured +137 MB for 10M cells and +364–463 MB for 50M cells, over the 400 MB tab budget with the seed.
 */
export const MEMORY_WARN_CELLS = 20_000_000;

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
Lưu ý: `TextDecoder` mặc định đã bỏ BOM, nên `.replace(/^﻿/, '')` chỉ là lớp phòng thủ thứ hai. Không viết ký tự BOM hay dấu kết hợp trực tiếp trong code: dùng escape `﻿`, `̀-ͯ`.

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
- Consumes: `ImportRequest`, `ImportedTable`, `importCsv`, `dropImport` (Task 1); hàng đợi và hàng phụ `parser` của `DbClient` (HEAD)
- Produces:
  - `IMPORT_TIMEOUT_MS = 30000`
  - `type WorkerBody = { kind: RequestKind; sql: string } | { kind: 'import'; req: ImportRequest; file: Blob } | { kind: 'dropImport'; table?: string }`
  - `Job.body: WorkerBody` (thay hai trường `kind` + `sql`; job `parser` dùng `{ kind: 'parser', sql: '' }`)
  - `DbClient.importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable>`: chỉ ghi vào danh sách nạp lại khi thành công
  - `DbClient.dropImport(table?: string): Promise<void>`: bỏ khỏi danh sách nạp lại **trước khi** gửi
  - `DbClient.importedTables(): string[]`
  - `DbClient.onImportDropped: (table: string, error: Error) => void`: gọi khi nạp lại sau restart bị lỗi/quá hạn
  - `restart()` nạp lại mọi bảng đã đăng ký (kèm `types` đã suy), xếp trước mọi request gửi sau đó
  - worker nhận `{ id } & WorkerBody`. Lỗi Postgres (`COPY` → `22P04`, `22021`) đi qua `error` → `SqlError`. Lỗi khác (`invalid identifier`) đi qua `fault` → `WorkerTaskError`.

Luật nạp lại:
1. Import do người dùng bấm chỉ được đăng ký khi thành công.
2. Lượt nạp lại bị **quá hạn** thì bảng bị xóa khỏi danh sách **đồng bộ, trước** `restart()`. Nhờ vậy lần restart đó không nạp lại nó nữa (không lặp).
3. Nạp lại bị lỗi (SQL hoặc worker) thì xóa bảng khỏi danh sách và báo.
4. Nạp lại bị một restart khác cắt ngang (`DbRestartError`) thì giữ lại, vì restart đó đã xếp lượt nạp lại cho nó.

- [ ] **Step 1: Viết test**

**Tạo `tests/clientImport.test.ts`:**
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

  it('tải parser vẫn đi ngoài hàng đợi, gửi { kind: parser, sql: "" } như cũ', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    void db.importCsv(REQ, FILE);
    const p = db.loadParser();
    expect(last().posted.map((x) => x.kind)).toEqual(['import', 'parser']);
    expect(last().posted[1]).toMatchObject({ kind: 'parser', sql: '' });
    last().answer(1, null);
    await expect(p).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/clientImport.test.ts`
Expected: FAIL — `IMPORT_TIMEOUT_MS` không được export / `db.importCsv is not a function`.

- [ ] **Step 3: Sửa `src/db/client.ts`**

**Sửa `src/db/client.ts`** — thay:
```ts
import type { LoadProgress } from './loadProgress';
```
bằng:
```ts
import type { ImportedTable, ImportRequest } from './import';
import type { LoadProgress } from './loadProgress';
```

**Sửa `src/db/client.ts`** — thay:
```ts
export const PARSER_TIMEOUT_MS = 60_000;
```
bằng:
```ts
export const PARSER_TIMEOUT_MS = 60_000;
/** Worst case in the spike (20 MB, 200k rows, 50 columns) took ~6.5 s in Node; the browser is slower. */
export const IMPORT_TIMEOUT_MS = 30_000;

/** Everything the worker accepts, minus the request id. */
export type WorkerBody =
  | { kind: RequestKind; sql: string }
  | { kind: 'import'; req: ImportRequest; file: Blob }
  | { kind: 'dropImport'; table?: string };
```

**Sửa `src/db/client.ts`** — thay:
```ts
interface Job {
  kind: RequestKind;
  sql: string;
  timeoutMs: number;
```
bằng:
```ts
interface Job {
  body: WorkerBody;
  timeoutMs: number;
```

**Sửa `src/db/client.ts`** — thay:
```ts
  onProgress?: (p: LoadProgress) => void;
  private worker!: Worker;
```
bằng:
```ts
  onProgress?: (p: LoadProgress) => void;
  /** Called when an imported table could not be re-imported after a restart; it is no longer replayed. */
  onImportDropped: (table: string, error: Error) => void = () => {};
  /** Imported tables (with their inferred types), replayed after every restart. */
  private imports = new Map<string, { req: ImportRequest; file: Blob }>();
  private worker!: Worker;
```

**Sửa `src/db/client.ts`** — thay:
```ts
  request<T>(kind: RequestKind, sql: string, timeoutMs = this.timeoutMs): Promise<T> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ kind, sql, timeoutMs, resolve: (r) => resolve(r as T), reject });
      this.pump();
    });
  }
```
bằng:
```ts
  request<T>(kind: RequestKind, sql: string, timeoutMs = this.timeoutMs): Promise<T> {
    return this.enqueue<T>({ kind, sql }, timeoutMs);
  }

  private enqueue<T>(body: WorkerBody, timeoutMs: number): Promise<T> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ body, timeoutMs, resolve: (r) => resolve(r as T), reject });
      this.pump();
    });
  }

  /** CSV → sandbox.<req.table>, through the query queue (never between a player's BEGIN and ROLLBACK). Only a successful import is replayed. */
  async importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable> {
    const t = await this.enqueue<ImportedTable>({ kind: 'import', req, file }, IMPORT_TIMEOUT_MS);
    this.imports.set(req.table, { req: { ...req, types: t.columns.map((c) => c.type) }, file });
    return t;
  }

  /** Drops one imported table, or every imported table when `table` is omitted. Forgotten for replay before it is sent. */
  dropImport(table?: string): Promise<void> {
    if (table === undefined) this.imports.clear();
    else this.imports.delete(table);
    return this.enqueue<void>({ kind: 'dropImport', table }, this.timeoutMs);
  }

  importedTables(): string[] {
    return [...this.imports.keys()];
  }

  /**
   * Queued right after start(), so replays run before anything sent later. A replay that fails
   * or times out is forgotten and reported (no restart loop); one cut short by another restart
   * stays registered and that restart replays it.
   */
  private replayImports(): void {
    for (const [table, { req, file }] of this.imports) {
      this.enqueue<ImportedTable>({ kind: 'import', req, file }, IMPORT_TIMEOUT_MS).catch((e: Error) => {
        if (e instanceof DbRestartError) return;
        this.imports.delete(table);
        this.onImportDropped(table, e);
      });
    }
  }
```

**Sửa `src/db/client.ts`** — thay:
```ts
      const job: Job = { kind: 'parser', sql: '', timeoutMs: PARSER_TIMEOUT_MS, resolve: () => resolve(), reject };
```
bằng:
```ts
      const job: Job = { body: { kind: 'parser', sql: '' }, timeoutMs: PARSER_TIMEOUT_MS, resolve: () => resolve(), reject };
```

**Sửa `src/db/client.ts`** — thay:
```ts
    this.side.set(id, { job, timer });
    this.worker.postMessage({ id, kind: job.kind, sql: job.sql });
```
bằng:
```ts
    this.side.set(id, { job, timer });
    this.worker.postMessage({ id, ...job.body });
```

**Sửa `src/db/client.ts`** — thay:
```ts
  /** Kills the worker, rejects every waiting query with DbRestartError, boots a fresh worker. */
  restart(): void {
    performance.mark('db:restart');
    this.worker.terminate();
    this.rejectAll(new DbRestartError());
    this.start();
  }
```
bằng:
```ts
  /** Kills the worker, rejects every waiting query with DbRestartError, boots a fresh worker and replays imported tables. */
  restart(): void {
    performance.mark('db:restart');
    this.worker.terminate();
    this.rejectAll(new DbRestartError());
    this.start();
    this.replayImports();
  }
```

**Sửa `src/db/client.ts`** — thay:
```ts
      this.inFlight = undefined;
      job.reject(new QueryTimeoutError(job.timeoutMs));
```
bằng:
```ts
      this.inFlight = undefined;
      // Forget a timed-out import before restart() replays the others, or it would loop.
      // Only the registered entry: a timed-out *replacement* keeps the old file replayable.
      const b = job.body;
      if (b.kind === 'import' && this.imports.get(b.req.table)?.file === b.file) this.imports.delete(b.req.table);
      job.reject(new QueryTimeoutError(job.timeoutMs));
```

**Sửa `src/db/client.ts`** — thay:
```ts
    this.inFlight = { id, job, timer };
    this.worker.postMessage({ id, kind: job.kind, sql: job.sql });
```
bằng:
```ts
    this.inFlight = { id, job, timer };
    this.worker.postMessage({ id, ...job.body });
```

- [ ] **Step 4: Sửa `src/db/worker.ts`**

**Sửa `src/db/worker.ts`** — thay:
```ts
import type { RequestKind } from './client';
```
bằng:
```ts
import type { WorkerBody } from './client';
import { dropImport, importCsv } from './import';
```

**Sửa `src/db/worker.ts`** — thay:
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
bằng:
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

**Sửa `src/db/worker.ts`** — thay:
```ts
onmessage = (e: MessageEvent<{ id: number; kind: RequestKind; sql: string }>) => {
  const { id, kind, sql } = e.data;
  if (kind === 'parser') return void loadParser(id);
```
bằng:
```ts
onmessage = (e: MessageEvent<{ id: number } & WorkerBody>) => {
  const { id } = e.data;
  const body: WorkerBody = e.data;
  if (body.kind === 'parser') return void loadParser(id);
```

**Sửa `src/db/worker.ts`** — thay:
```ts
      postMessage({ type: 'result', id, result: await handle(db, kind, sql) });
```
bằng:
```ts
      postMessage({ type: 'result', id, result: await handle(db, body) });
```
Phần gửi lỗi (`sqlErrorInfo(err)` → `error`, còn lại → `fault`) giữ nguyên. Lỗi `COPY` mang theo `code` (`22P04`, `22021`) giống lỗi query, và đến main thread thành `SqlError`.

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/clientImport.test.ts tests/client.test.ts && npx tsc --noEmit`
Expected: PASS (9 test mới + toàn bộ test client cũ, vì tin nhắn `run`/`parser` vẫn có `kind` + `sql`), `tsc` không lỗi.

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
- Consumes: `ColumnType`, `COLUMN_TYPES`, `Delimiter`, `ImportRequest`, `ImportedTable`, `importCsv`, `dropImport` (Task 1); `inspectCsv`, `ImportProblem` (Task 2); `DbRestartError`, `DbFailedError` (`src/db/client.ts`); `runSandboxed`, `QueryResult`; `freshDb` (tests)
- Produces:
  - `interface StoredImport { table: string; fileName: string; delimiter: Delimiter; columns: string[]; types: ColumnType[]; rows: number; file: Blob }`
  - `interface ImportStore { list(): Promise<StoredImport[]>; put(r: StoredImport): Promise<boolean>; remove(table: string): Promise<boolean>; clear(): Promise<boolean> }`: không bao giờ reject
  - `IDB_NAME = 'cargo-query'`, `IDB_STORE = 'imports'`, `isStoredImport(x: unknown): x is StoredImport`
  - `idbStore(): ImportStore`, `memoryStore(initial?: StoredImport[]): ImportStore & { records: Map<string, StoredImport> }`
  - `interface ImportDb { run(sql): Promise<QueryResult>; importCsv(req, file): Promise<ImportedTable>; dropImport(table?): Promise<void> }`: `DbClient` khớp theo cấu trúc
  - `type AddOutcome = { ok: true; table: ImportedTable; persisted: boolean } | { ok: false; problem: ImportProblem } | { ok: false; error: unknown }`
  - `importedCells(tables: ImportedTable[]): number` (I3)
  - `class MyData { tables: ImportedTable[]; constructor(db: ImportDb, store: ImportStore, onChange: (tables: ImportedTable[]) => void); restore(): Promise<{ table: string; error: unknown }[]>; add(file: Blob, fileName: string): Promise<AddOutcome>; remove(table: string): Promise<void>; clear(): Promise<void>; dropped(table: string): Promise<void> }`

Bản ghi IndexedDB:
- DB `cargo-query` version 1, store `imports`, `keyPath: 'table'`. Giá trị là `StoredImport` (Blob/File lưu trực tiếp nhờ structured clone).
- Lưu cả `types`, để lúc nạp lại không phải suy kiểu (spike: 0,9–3,4 s thay vì 3,0–6,5 s mỗi bảng).
- Đọc ra bản ghi nào cũng qua `isStoredImport`. Tên bảng và tên cột phải khớp regex định danh, kiểu phải thuộc `COLUMN_TYPES`.
- `restore()` nạp **tuần tự**, nên nếu một file làm worker quá hạn thì các file sau không bị `DbRestartError` hàng loạt.
- `main.ts` gọi `restore()` mà không chờ, nên `add`/`remove`/`clear` phải chờ nó xong trước. Nếu không: `tables` còn thiếu nên bảng thứ 6 lọt qua giới hạn, file mới cùng tên bị bản cũ ghi đè, và "Xóa toàn bộ" bị lượt nạp lại hồi sinh.
- `DbRestartError`/`DbFailedError` (DB chưa sẵn sàng) thì **giữ** bản ghi.
- Bản ghi trùng tên bảng game thì bỏ (I7).

- [ ] **Step 1: Viết test**

**Tạo `tests/myData.test.ts`:**
```ts
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { DbFailedError, DbRestartError } from '../src/db/client';
import { dropImport, importCsv } from '../src/db/import';
import { runSandboxed } from '../src/db/run';
import { MyData, importedCells, type ImportDb } from '../src/import/myData';
import { idbStore, isStoredImport, memoryStore, type StoredImport } from '../src/import/store';
import { freshDb } from './helpers';

const adapter = (pg: PGlite): ImportDb => ({
  run: (sql) => runSandboxed(pg, sql),
  importCsv: (req, file) => importCsv(pg, req, file),
  dropImport: (table) => dropImport(pg, table),
});

const CSV = new Blob(['Mã lô,Số lượng\nA,3\nB,4\n']);
const REC: StoredImport = { table: 'orders', fileName: 'orders.csv', delimiter: ',', columns: ['ref', 'qty'], types: ['text', 'text'], rows: 2, file: new Blob(['ref,qty\nA,1\nB,2\n']) };

async function setup(initial: StoredImport[] = []) {
  const pg = await freshDb();
  const store = memoryStore(initial);
  const changes: string[][] = [];
  const my = new MyData(adapter(pg), store, (ts) => changes.push(ts.map((t) => t.table)));
  return { pg, store, my, changes };
}

const count = async (pg: PGlite, table: string) => (await runSandboxed(pg, `SELECT count(*) FROM ${table}`)).rows[0][0];

/** A DbClient stand-in whose imports always fail with `error`. */
const failingDb = (error: Error): ImportDb => ({
  run: async () => ({ columns: ['table_name'], types: [25], rows: [['ports']] }),
  importCsv: async () => { throw error; },
  dropImport: async () => {},
});

describe('MyData', () => {
  it('add: nạp, lưu file gốc + kiểu cột vào store, báo thay đổi', async () => {
    const { pg, store, my, changes } = await setup();
    const r = await my.add(CSV, 'Lô hàng.csv');
    expect(r).toMatchObject({ ok: true, persisted: true, table: { table: 'lo_hang', rows: 2 } });
    expect(await count(pg, 'lo_hang')).toBe(2);
    expect(store.records.get('lo_hang')).toMatchObject({ fileName: 'Lô hàng.csv', delimiter: ',', columns: ['ma_lo', 'so_luong'], types: ['text', 'bigint'], rows: 2, file: CSV });
    expect(changes).toEqual([['lo_hang']]);
    expect(importedCells(my.tables)).toBe(4);
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

  it('restore: nạp lại với kiểu đã lưu (không suy lại), bỏ bản ghi hỏng và bản ghi trùng bảng game', async () => {
    const broken: StoredImport = { ...REC, table: 'broken', file: new Blob(['ref,qty\nA\n']) };
    const clash: StoredImport = { ...REC, table: 'ports' };
    const { pg, store, my, changes } = await setup([REC, broken, clash]);
    const failed = await my.restore();
    expect(failed.map((f) => f.table)).toEqual(['broken', 'ports']);
    expect([...store.records.keys()]).toEqual(['orders']);
    expect(changes).toEqual([['orders']]);
    expect((await runSandboxed(pg, 'SELECT max(qty) FROM orders')).types).toEqual([25]); // text: types from the store
    expect((await runSandboxed(pg, "SELECT to_regclass('sandbox.ports') IS NULL")).rows).toEqual([[true]]);
  });

  it('restore: DbRestartError và DbFailedError giữ bản ghi để thử lại lần tải trang sau', async () => {
    for (const error of [new DbRestartError(), new DbFailedError('boot failed')]) {
      const store = memoryStore([REC]);
      const my = new MyData(failingDb(error), store, () => {});
      expect((await my.restore()).map((f) => f.error)).toEqual([error]);
      expect(store.records.has('orders')).toBe(true);
    }
  });

  it('add / clear chờ restore xong: không lọt bảng thứ 6, xóa hết không bị lượt nạp lại hồi sinh', async () => {
    const five = ['t1', 't2', 't3', 't4', 't5'].map((table) => ({ ...REC, table }));
    const a = await setup(five);
    const restoring = a.my.restore(); // not awaited, like main.ts
    expect(await a.my.add(CSV, 'f.csv')).toEqual({ ok: false, problem: { kind: 'tooManyTables' } });
    await restoring;
    expect(a.my.tables).toHaveLength(5);
    const b = await setup(five);
    const again = b.my.restore();
    await b.my.clear();
    await again;
    expect(b.my.tables).toEqual([]);
    expect(b.store.records.size).toBe(0);
    expect((await runSandboxed(b.pg, "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'sandbox'")).rows).toEqual([[0]]);
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

describe('store', () => {
  it('isStoredImport chỉ nhận bản ghi hợp lệ (tên định danh, kiểu đã biết, đủ kiểu cho mỗi cột)', () => {
    expect(isStoredImport(REC)).toBe(true);
    expect(isStoredImport({ ...REC, columns: ['ref', 'Bad Name'] })).toBe(false);
    expect(isStoredImport({ ...REC, table: 'x"; DROP' })).toBe(false);
    expect(isStoredImport({ ...REC, types: ['text', 'json'] })).toBe(false);
    expect(isStoredImport({ ...REC, types: ['text'] })).toBe(false);
    expect(isStoredImport({ ...REC, rows: -1 })).toBe(false);
    expect(isStoredImport({ ...REC, file: 'abc' })).toBe(false);
    expect(isStoredImport(null)).toBe(false);
  });

  it('idbStore: không có IndexedDB (Node, chế độ riêng tư bị chặn) thì không ném lỗi', async () => {
    const s = idbStore();
    expect(await s.list()).toEqual([]);
    expect(await s.put(REC)).toBe(false);
    expect(await s.remove('a')).toBe(false);
    expect(await s.clear()).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/myData.test.ts`
Expected: FAIL — `Failed to resolve import "../src/import/myData"`.

- [ ] **Step 3: Viết `src/import/store.ts`**

**Tạo `src/import/store.ts`:**
```ts
import { COLUMN_TYPES, type ColumnType, type Delimiter } from '../db/import';

/** One imported CSV as kept in IndexedDB: the original file plus everything needed to replay it. Never leaves the browser. */
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

const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;
const isIdent = (s: unknown): boolean => typeof s === 'string' && IDENT.test(s);

/** IndexedDB content is outside our control (old versions, devtools edits): keep only well-formed records. */
export function isStoredImport(x: unknown): x is StoredImport {
  const r = x as StoredImport;
  return !!r && typeof r === 'object'
    && isIdent(r.table)
    && typeof r.fileName === 'string'
    && (r.delimiter === ',' || r.delimiter === ';')
    && Array.isArray(r.columns) && r.columns.length > 0 && r.columns.every(isIdent)
    && Array.isArray(r.types) && r.types.length === r.columns.length && r.types.every((t) => COLUMN_TYPES.includes(t))
    && Number.isInteger(r.rows) && r.rows >= 0
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

**Tạo `src/import/myData.ts`:**
```ts
import { DbFailedError, DbRestartError } from '../db/client';
import type { ImportedTable, ImportRequest } from '../db/import';
import type { QueryResult } from '../db/run';
import { inspectCsv, type ImportProblem } from './csv';
import type { ImportStore, StoredImport } from './store';

/** The part of DbClient that "My data" needs (a PGlite adapter in tests). */
export interface ImportDb {
  run(sql: string): Promise<QueryResult>;
  importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable>;
  dropImport(table?: string): Promise<void>;
}

export type AddOutcome =
  | { ok: true; table: ImportedTable; persisted: boolean }
  | { ok: false; problem: ImportProblem }
  | { ok: false; error: unknown };

/** Rows × columns over every imported table: the memory warning's measure (I3). */
export const importedCells = (tables: ImportedTable[]): number => tables.reduce((n, x) => n + x.rows * x.columns.length, 0);

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
  /** add/remove/clear wait for it: mid-restore, `tables` is partial (a 6th table would pass the limit, a cleared table would come back). */
  private restoring: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly db: ImportDb,
    private readonly store: ImportStore,
    private readonly onChange: (tables: ImportedTable[]) => void,
  ) {}

  private set(tables: ImportedTable[]): void {
    this.tables = tables;
    this.onChange(tables);
  }

  private async gameTables(): Promise<Set<string>> {
    return new Set((await this.db.run(GAME_TABLES_SQL)).rows.map((r) => String(r[0])));
  }

  /**
   * Page load: replays the stored files one by one (sequentially, so a timeout restart cannot
   * reject the ones after it). A file that fails, or whose name is now a game table (I7), is removed
   * from the store; one that only hit a restart or a failed boot stays stored for the next page load.
   */
  restore(): Promise<{ table: string; error: unknown }[]> {
    const p = this.replayStored();
    this.restoring = p;
    return p;
  }

  private async settled(): Promise<void> {
    await this.restoring.catch(() => {});
  }

  private async replayStored(): Promise<{ table: string; error: unknown }[]> {
    const failed: { table: string; error: unknown }[] = [];
    const stored = await this.store.list();
    if (stored.length === 0) return failed;
    let game: Set<string>;
    try {
      game = await this.gameTables();
    } catch (error) {
      return stored.map((r) => ({ table: r.table, error })); // DB not usable: keep every record
    }
    for (const r of stored) {
      try {
        if (game.has(r.table)) throw new Error(`name taken by a game table: ${r.table}`);
        const t = await this.db.importCsv({ table: r.table, columns: r.columns, delimiter: r.delimiter, types: r.types }, r.file);
        // Incremental, so a file the player adds while restore is still running is not wiped from the list.
        this.set([...this.tables.filter((x) => x.table !== t.table), t]);
      } catch (error) {
        if (!(error instanceof DbRestartError || error instanceof DbFailedError)) await this.store.remove(r.table);
        failed.push({ table: r.table, error });
      }
    }
    return failed;
  }

  async add(file: Blob, fileName: string): Promise<AddOutcome> {
    await this.settled();
    let imported: ImportedTable;
    let record: StoredImport;
    try {
      const inspection = await inspectCsv(file, fileName, await this.gameTables(), this.tables.map((t) => t.table));
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
    await this.settled();
    await this.store.remove(table);
    this.set(this.tables.filter((t) => t.table !== table));
    await this.db.dropImport(table).catch(ignoreRestart);
  }

  async clear(): Promise<void> {
    await this.settled();
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
Expected: PASS (9 test), `tsc` không lỗi.

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
- Consumes: `importCsv` (Task 1); `sanitizeIdent` (Task 2); `runExplain`, `runSandboxed`; `flattenPlan`, `runSteps`, `chartSpec`, `loadErMetadata`, `erDefinition`, `memoByKey`, `once` (HEAD); `seededDb` (tests)
- Produces: `clearMemos(): void` trong `src/viz/memo.ts`. Hàm này xóa cache của mọi `memoByKey` (EXPLAIN, Thứ tự thực thi, metadata ERD theo schema), **không** xóa `once()` (Mermaid, parser).

Lý do cần `clearMemos`: cache của Plan 1b đánh khóa theo **chuỗi SQL** (metadata ERD theo **tên schema**). Khi người dùng thay một bảng nạp bằng file khác cùng tên, cùng một câu SQL sẽ cho plan và số dòng khác. Vì vậy cache phải bị xóa mỗi lần dữ liệu nạp thay đổi (Task 6 gọi hàm này).

- [ ] **Step 1: Viết test**

**Tạo `tests/importViz.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import { importCsv } from '../src/db/import';
import { runExplain, runSandboxed } from '../src/db/run';
import { sanitizeIdent } from '../src/import/csv';
import { chartSpec } from '../src/viz/chart';
import { erDefinition, loadErMetadata } from '../src/viz/erd';
import { flattenPlan } from '../src/viz/plan';
import { runSteps } from '../src/viz/steps';
import { seededDb } from './helpers';

const LINES = ['ref,customer,eta,teu'];
for (let i = 1; i <= 300; i++) LINES.push(`R${i},KH ${i % 7},2026-${String((i % 12) + 1).padStart(2, '0')}-01,${i % 4}`);
const FILE = new Blob([LINES.join('\n') + '\n']);

let loaded: ReturnType<typeof seededDb> | undefined;
/** One seeded DB per file with my_orders imported once (Vitest runs a file's tests in order). */
function db() {
  loaded ??= seededDb().then(async (pg) => {
    await importCsv(pg, { table: 'my_orders', columns: ['ref', 'customer', 'eta', 'teu'], delimiter: ',' }, FILE);
    return pg;
  });
  return loaded;
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

  it('ERD (L36): tên cột hợp lệ với Postgres nhưng là từ khóa Mermaid đi qua mermaidName()', async () => {
    const pg = await db();
    const columns = ['Class', 'style', 'end'].map((h) => sanitizeIdent(h, 'x'));
    expect(columns).toEqual(['class', 'style', 'end_']);
    await importCsv(pg, { table: 'tags', columns, delimiter: ',' }, new Blob(['a,b,c\nx,y,z\n']));
    const { cols, cons } = await loadErMetadata((sql) => runSandboxed(pg, sql), 'sandbox');
    const def = erDefinition(cols, cons, ['tags'], new Set());
    expect(def).toContain('text _class');
    expect(def).toContain('text _style');
    expect(def).toContain('text end_');
    expect(def).not.toMatch(/^\s*style /m); // no highlight requested: no style line at all
  });
});
```

**Sửa `tests/memo.test.ts`** — thay:
```ts
import { memoByKey, once } from '../src/viz/memo';
```
bằng:
```ts
import { clearMemos, memoByKey, once } from '../src/viz/memo';
```

**Thêm vào cuối `tests/memo.test.ts`:**
```ts

describe('clearMemos', () => {
  it('xóa cache của mọi memoByKey, lần gọi sau nạp lại; once() giữ nguyên', async () => {
    let a = 0;
    let b = 0;
    let c = 0;
    const fa = memoByKey(async (k) => { a++; return k; });
    const fb = memoByKey(async (k) => { b++; return k; });
    const fc = once(async () => { c++; return 1; });
    await fa('sandbox');
    await fb('SELECT 1');
    await fc();
    clearMemos();
    await fa('sandbox');
    await fb('SELECT 1');
    await fc();
    expect([a, b, c]).toEqual([2, 2, 1]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận trạng thái**

Run: `npx vitest run tests/importViz.test.ts tests/memo.test.ts`
Expected:
- `memo.test.ts` FAIL — `clearMemos` không được export.
- `importViz.test.ts` nên PASS ngay (search_path đã có từ Task 1, `mermaidName` từ L36). Nếu test "Thứ tự thực thi" FAIL thì dừng và báo: spike chưa kiểm được `runSteps` trên schema `sandbox` (mục 3a). Không sửa `src/viz/steps.ts` trong plan này.

- [ ] **Step 3: Thêm `clearMemos` vào `src/viz/memo.ts`**

**Sửa `src/viz/memo.ts`** — thay:
```ts
export const MEMO_MAX = 20;
```
bằng:
```ts
export const MEMO_MAX = 20;

/** Every cache made by memoByKey (plans, steps, ER metadata), so imported data changes can drop them at once. */
const dataCaches = new Set<Map<string, unknown>>();

/** Drops every memoByKey cache: plans, steps and ER metadata are stale once imported tables change. once() is kept. */
export function clearMemos(): void {
  for (const c of dataCaches) c.clear();
}
```

**Sửa `src/viz/memo.ts`** — thay:
```ts
  const cache = new Map<string, Promise<T>>();
```
bằng:
```ts
  const cache = new Map<string, Promise<T>>();
  dataCaches.add(cache);
```

**Sửa `src/viz/memo.ts`** — thay:
```ts
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  const memo = memoByKey(() => load(), 1);
  return () => memo('');
}
```
bằng:
```ts
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  // Its own slot, not memoByKey: clearMemos() must not reload Mermaid or the parser.
  let p: Promise<T> | undefined;
  return () => {
    if (p) return p;
    const q = load();
    p = q;
    q.catch(() => {
      if (p === q) p = undefined;
    });
    return q;
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/importViz.test.ts tests/memo.test.ts && npx tsc --noEmit`
Expected: PASS (5 test `importViz` + test `memo` cũ và mới), `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/viz/memo.ts tests/memo.test.ts tests/importViz.test.ts
git commit -m "feat: viz tabs on sandbox tables; clearMemos for imported data changes"
```

---

### Task 6: Giao diện "Dữ liệu của tôi" trong Sandbox + nối vào app

**Files:**
- Create: `src/ui/myDataView.ts`
- Modify: `src/state.ts`, `src/ui/modes.ts`, `src/ui/vizTabs.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `docs/team/decision-log.md` (số đo bộ nhớ ở Step 9)

**Interfaces:**
- Consumes:
  - `MyData`, `AddOutcome`, `importedCells`, `idbStore` (Task 4);
  - `IMPORT_LIMITS`, `MEMORY_WARN_CELLS`, `ImportProblem` (Task 2);
  - `QueryTimeoutError`, `DbRestartError`, `DbClient.onImportDropped` (Task 3);
  - `clearMemos` (Task 5);
  - từ HEAD: `SqlError` (`src/db/run.ts`), `errorText` (`src/ui/feedback.ts`), `t`, `h`, `cx`, `session`, `unlockedTables`, `editorSchema`, `Column`, `WorkArea.setSchema`, `panel.refresh`, `rerender`, `registerMode`, `startSandbox`, `erdSvg`/`drawErd`/`load`/`ticketColor` (vizTabs)
- Produces:
  - `src/state.ts`: `schemaHooks: { extra?: () => Record<string, Column[]> }`; `editorSchema()` gộp thêm `schemaHooks.extra?.()`
  - `src/ui/myDataView.ts`: `initMyData(m: MyData, onRerender: () => void)`, `setMyDataStatus(text: string)`, `sandboxTables(): ImportedTable[]` (ngoài Sandbox trả `[]`), `visibleTables(): string[]`, `importErrorText(e: unknown): string`, `renderMyData(): HTMLElement`
  - card Trang chủ `mydata` (I2)
  - khóa i18n `mode.mydata`, `mode.mydataDesc`, `mydata.*`

Vị trí trên giao diện (spec §6b, §7b; I2, I4):
- Mục "Dữ liệu của tôi" nằm trong khung trái của Sandbox, ngay dưới phần giới thiệu. Mục này liệt kê từng bảng nạp kèm cột và kiểu, mỗi bảng có nút Xóa.
- Tab **Cột** giữ nguyên.
- Trong Sandbox, tab **ER** vẽ thêm các bảng nạp và autocomplete có thêm các bảng nạp.
- Ngoài Sandbox, bảng nạp vẫn truy vấn được (cùng `search_path`) nhưng không hiện ở đâu. Chấm điểm không bị ảnh hưởng vì bảng game luôn thắng khi trùng tên.

- [ ] **Step 1: Thêm khóa i18n**

**Sửa `src/i18n/vi.ts`** — thay:
```ts
export const vi = {
```
bằng:
```ts
export const vi = {
  'mode.mydata': 'Dữ liệu của tôi',
  'mode.mydataDesc': 'Nạp file CSV của bạn rồi thử SQL, Biểu đồ, EXPLAIN và Sơ đồ ER trên chính dữ liệu đó.',
  'mydata.title': 'Dữ liệu của tôi',
  'mydata.intro': 'Nạp file CSV (UTF-8, phân cách , hoặc ;, có dòng tiêu đề) để thử Chạy, Biểu đồ, Thứ tự thực thi, EXPLAIN, Luồng dữ liệu và Sơ đồ ER trên dữ liệu của bạn. Tối đa {mb} MB, {rows} dòng, {cols} cột mỗi file và {tables} bảng. File chỉ nằm trong trình duyệt này, không gửi đi đâu, và được tự nạp lại khi mở trang.',
  'mydata.memoryWarn': 'Dữ liệu đã nạp khá lớn: tab có thể dùng hơn 400 MB bộ nhớ và chạy chậm trên máy yếu. Nếu trang bị giật, hãy xóa bớt bảng không dùng.',
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
  'mydata.copyError': 'Postgres không đọc được file (lỗi gốc bên dưới). Kiểm tra mọi dòng có cùng số cột với dòng tiêu đề và file được lưu dạng UTF-8.',
  'mydata.lost': 'Bảng {table} không nạp lại được sau khi database khởi động lại, nên đã bị bỏ.',
  'mydata.restoreFailed': 'Không nạp lại được: {tables}.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
export const en: Record<Key, Msg> = {
```
bằng:
```ts
export const en: Record<Key, Msg> = {
  'mode.mydata': 'My data',
  'mode.mydataDesc': 'Load your own CSV files, then try SQL, Chart, EXPLAIN and the ER diagram on that data.',
  'mydata.title': 'My data',
  'mydata.intro': 'Load a CSV file (UTF-8, comma or semicolon separated, with a header row) to try Run, Chart, Execution order, EXPLAIN, Data flow and the ER diagram on your own data. Up to {mb} MB, {rows} rows and {cols} columns per file, {tables} tables in total. Files stay in this browser, are never uploaded, and are reloaded when you open the page.',
  'mydata.memoryWarn': 'Your imported data is large: this tab may use more than 400 MB of memory and run slowly on a weak machine. If the page stutters, delete the tables you do not need.',
  'mydata.drop': 'Choose a CSV file or drop it here',
  'mydata.loading': 'Loading {name}…',
  'mydata.done': (p) => `loaded table ${p.table} (${count('row', 'rows')({ n: p.rows })}, ${count('column', 'columns')({ n: p.cols })}). Type SELECT * FROM ${p.table} to see it.`,
  'mydata.notPersisted': 'This browser does not allow saving files, so the table will be gone after a reload.',
  'mydata.rows': count('row', 'rows'),
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
  'mydata.copyError': 'Postgres could not read the file (original error below). Check that every row has as many columns as the header and that the file is saved as UTF-8.',
  'mydata.lost': 'Table {table} could not be reloaded after the database restarted, so it was dropped.',
  'mydata.restoreFailed': 'Could not reload: {tables}.',
```
`count`/`num` đã có ở đầu `en.ts`. Message dạng hàm nhận số thô, nên phải tự format ("1,000 rows").

- [ ] **Step 2: Hook bảng nạp cho autocomplete (`src/state.ts`, I1)**

**Sửa `src/state.ts`** — thay:
```ts
/** Autocomplete: only unlocked tables (spec §4), with column types as detail. */
export function editorSchema(): SQLNamespace {
  const out: Record<string, SQLNamespace> = {};
  for (const table of unlockedTables()) {
    const cols = app.columns[table];
    if (cols) {
      out[table] = {
        self: { label: table, type: 'type', detail: 'table' },
        children: cols.map((c) => ({ label: c.name, type: 'property', detail: c.type })),
      };
    }
  }
  return out;
}
```
bằng:
```ts
/** Plan Import: imported tables for autocomplete, set by initMyData; returns {} outside Sandbox (I1). */
export const schemaHooks: { extra?: () => Record<string, Column[]> } = {};

/** Autocomplete: only unlocked tables (spec §4), with column types as detail, plus imported tables in Sandbox. */
export function editorSchema(): SQLNamespace {
  const tables: Record<string, Column[]> = {};
  for (const table of unlockedTables()) {
    const cols = app.columns[table];
    if (cols) tables[table] = cols;
  }
  Object.assign(tables, schemaHooks.extra?.()); // imported names never clash with game tables (`_my`)
  const out: Record<string, SQLNamespace> = {};
  for (const [table, cols] of Object.entries(tables)) {
    out[table] = {
      self: { label: table, type: 'type', detail: 'table' },
      children: cols.map((c) => ({ label: c.name, type: 'property', detail: c.type })),
    };
  }
  return out;
}
```
Không lời gọi `editorSchema()` nào phải sửa. `work.setTicket(…, force)` dựng lại editor mỗi khi đổi chế độ (`enter()` trong `modes.ts`, `selectTicket()` trong `main.ts`), và lúc đó `session.mode` đã đổi.

- [ ] **Step 3: Viết `src/ui/myDataView.ts`**

**Tạo `src/ui/myDataView.ts`:**
```ts
import { DbRestartError, QueryTimeoutError } from '../db/client';
import type { ImportedTable } from '../db/import';
import { SqlError } from '../db/run';
import { t } from '../i18n';
import { IMPORT_LIMITS, MEMORY_WARN_CELLS, type ImportProblem } from '../import/csv';
import { importedCells, type AddOutcome, type MyData } from '../import/myData';
import { session } from '../session';
import { schemaHooks, unlockedTables, type Column } from '../state';
import { cx } from '../theme';
import { h } from './dom';
import { errorText } from './feedback';

const MB = 1024 * 1024;
let my: MyData | undefined;
let rerender: () => void = () => {};
let status = '';
let busy = false;

/** Imported tables count only in Sandbox (spec §7b "Hiển thị", I4). */
export const sandboxTables = (): ImportedTable[] => (session.mode.kind === 'sandbox' && my ? my.tables : []);

/** Unlocked game tables, plus imported ones in Sandbox: what the ER tab draws. */
export const visibleTables = (): string[] => [...unlockedTables(), ...sandboxTables().map((x) => x.table)];

const sandboxColumns = (): Record<string, Column[]> => Object.fromEntries(sandboxTables().map((x) => [x.table, x.columns]));

/** Called once from main.ts after the MyData instance exists. */
export function initMyData(m: MyData, onRerender: () => void): void {
  my = m;
  rerender = onRerender;
  schemaHooks.extra = sandboxColumns; // editorSchema() adds imported tables in Sandbox (I1)
}

/** In memory only (I6). */
export function setMyDataStatus(text: string): void {
  status = text;
  rerender();
}

function problemText(p: ImportProblem): string {
  switch (p.kind) {
    case 'empty': return t('mydata.empty');
    case 'tooLarge': return t('mydata.tooLarge', { mb: Math.ceil(p.bytes / MB), max: IMPORT_LIMITS.maxBytes / MB });
    case 'tooManyRows': return t('mydata.tooManyRows', { n: p.rows, max: IMPORT_LIMITS.maxRows });
    case 'tooManyColumns': return t('mydata.tooManyColumns', { n: p.columns, max: IMPORT_LIMITS.maxColumns });
    case 'tooManyTables': return t('mydata.tooManyTables', { max: IMPORT_LIMITS.maxTables });
  }
}

/** Postgres' own message is shown unchanged under the explanation; other failures reuse the app's error text. */
export function importErrorText(e: unknown): string {
  if (e instanceof QueryTimeoutError) return t('mydata.timeout', { s: e.timeoutMs / 1000 });
  if (e instanceof DbRestartError) return t('mydata.restarted');
  if (e instanceof SqlError) return `${t('mydata.copyError')}\n${e.message}`;
  return errorText(e); // WorkerTaskError, DbFailedError, anything else
}

function outcomeText(r: AddOutcome): string {
  if (!r.ok) return 'problem' in r ? problemText(r.problem) : importErrorText(r.error);
  const done = t('mydata.done', { table: r.table.table, rows: r.table.rows, cols: r.table.columns.length });
  return r.persisted ? done : `${done} ${t('mydata.notPersisted')}`;
}

/** One file after another (I5); the file input is disabled meanwhile. */
async function addFiles(files: FileList | null | undefined): Promise<void> {
  if (!my || busy || !files || files.length === 0) return;
  busy = true;
  const lines: string[] = [];
  try {
    for (const f of Array.from(files)) {
      setMyDataStatus(t('mydata.loading', { name: f.name }));
      lines.push(`${f.name}: ${outcomeText(await my.add(f, f.name))}`);
    }
  } finally {
    busy = false;
    setMyDataStatus(lines.join('\n'));
  }
}

async function act(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    setMyDataStatus(importErrorText(e));
  }
}

/** Tables whose column list is open: rerender() (every Run) rebuilds the pane, so the open state lives here. */
const openTables = new Set<string>();

function tableItem(x: ImportedTable): HTMLElement {
  const toggle = (e: Event): void => {
    if ((e.currentTarget as HTMLDetailsElement).open) openTables.add(x.table);
    else openTables.delete(x.table);
  };
  return h('li', { class: 'flex items-start justify-between gap-2 border-b border-line py-1' },
    h('details', { class: 'min-w-0', open: openTables.has(x.table), ontoggle: toggle },
      h('summary', { class: 'cursor-pointer' }, h('code', {}, x.table), ' ', h('span', { class: 'text-sm text-muted' }, t('mydata.rows', { n: x.rows }))),
      h('ul', { class: 'mt-1 mb-0 list-none pl-4' },
        ...x.columns.map((c) => h('li', {}, h('code', {}, c.name), ' ', h('span', { class: 'text-sm text-muted' }, c.type))))),
    h('button', {
      type: 'button',
      'aria-label': t('mydata.deleteAria', { table: x.table }),
      onclick: () => void act(() => my!.remove(x.table)),
    }, t('mydata.delete')));
}

/** "My data" section of the Sandbox pane. Everything from the file (names, types, Postgres messages) is rendered as text. */
export function renderMyData(): HTMLElement {
  // `peer` + sr-only: the input keeps keyboard focus, the label shows the focus ring.
  const input = h('input', { type: 'file', accept: '.csv,text/csv', multiple: true, class: 'peer sr-only', id: 'mydata-file' });
  input.disabled = busy;
  input.addEventListener('change', () => void addFiles(input.files));
  const drop = h('label', {
    for: 'mydata-file',
    class: cx('block rounded-xl border-2 border-dashed border-line p-4 text-center',
      busy ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-accent',
      'peer-focus-visible:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent'),
  }, t('mydata.drop'));
  drop.addEventListener('dragover', (e) => e.preventDefault());
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    void addFiles(e.dataTransfer?.files);
  });
  const tables = my?.tables ?? [];
  return h('section', { class: 'mt-4 border-t border-line pt-3', 'aria-labelledby': 'mydata-title' },
    h('h3', { id: 'mydata-title', class: 'mt-0' }, t('mydata.title')),
    h('p', { class: 'mt-1 text-sm text-muted' }, t('mydata.intro', { mb: IMPORT_LIMITS.maxBytes / MB, rows: IMPORT_LIMITS.maxRows, cols: IMPORT_LIMITS.maxColumns, tables: IMPORT_LIMITS.maxTables })),
    importedCells(tables) >= MEMORY_WARN_CELLS
      ? h('p', { class: 'rounded-lg bg-accent-soft p-2 text-sm ring-1 ring-accent', role: 'note' }, t('mydata.memoryWarn'))
      : null,
    input,
    drop,
    h('p', { class: 'min-h-[1.5em] whitespace-pre-wrap text-sm', role: 'status' }, status),
    tables.length
      ? h('ul', { class: 'my-2 list-none p-0' }, ...tables.map(tableItem))
      : h('p', { class: 'text-sm text-muted' }, t('mydata.none')),
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

- [ ] **Step 4: Gắn vào khung Sandbox và Trang chủ (`src/ui/modes.ts`)**

**Sửa `src/ui/modes.ts`** — thay:
```ts
import type { WorkArea } from './work';
```
bằng:
```ts
import { renderMyData } from './myDataView';
import type { WorkArea } from './work';
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
    h('p', { class: 'text-[15px] leading-relaxed' }, t('sbx.intro')),
```
bằng:
```ts
    h('p', { class: 'text-[15px] leading-relaxed' }, t('sbx.intro')),
    renderMyData(),
```

**Thêm vào cuối `src/ui/modes.ts`:**
```ts
// Plan Import (L17, I2): "My data" opens the Sandbox, whose left pane holds the CSV import.
registerMode({
  id: 'mydata', order: 20, icon: '📂', tint: 'bg-cyan-100 dark:bg-cyan-950',
  title: 'mode.mydata', desc: 'mode.mydataDesc', open: () => startSandbox(),
});
```

- [ ] **Step 5: Tab ER vẽ bảng nạp trong Sandbox (`src/ui/vizTabs.ts`)**

**Sửa `src/ui/vizTabs.ts`** — thay:
```ts
import { app, selected, unlockedTables } from '../state';
```
bằng:
```ts
import { app, selected } from '../state';
```

**Sửa `src/ui/vizTabs.ts`** — thay:
```ts
import { renderFlow } from './flowView';
```
bằng:
```ts
import { renderFlow } from './flowView';
import { sandboxTables, visibleTables } from './myDataView';
```

**Sửa `src/ui/vizTabs.ts`** — thay:
```ts
      const tables = unlockedTables();
      // Tables the last run used: bold border in the open ticket's chapter colour (L36).
      const svg = erMetadata('public').then(({ cols, cons }) =>
        erdSvg(erDefinition(cols, cons, tables, tablesInQuery(app.lastRun?.sql ?? '', tables), ticketColor().hex)));
```
bằng:
```ts
      // Sandbox: imported tables too (schema `sandbox`); every name reaches Mermaid through mermaidName() (L36).
      const tables = visibleTables();
      const own = sandboxTables().length > 0 ? erMetadata('sandbox') : Promise.resolve({ cols: [], cons: [] });
      // Tables the last run used: bold border in the open ticket's chapter colour (L36).
      const svg = Promise.all([erMetadata('public'), own]).then(([pub, mine]) =>
        erdSvg(erDefinition([...pub.cols, ...mine.cols], [...pub.cons, ...mine.cons], tables, tablesInQuery(app.lastRun?.sql ?? '', tables), ticketColor().hex)));
```
Tên bảng nạp không bao giờ trùng tên bảng game (hậu tố `_my`; I7 cho bản ghi cũ), nên ghép hai danh sách cột theo tên bảng là an toàn.

- [ ] **Step 6: Nối vào `src/main.ts`**

**Sửa `src/main.ts`** — thay:
```ts
import { applyStatic, setLang, type Lang } from './i18n';
```
bằng:
```ts
import { applyStatic, setLang, t, type Lang } from './i18n';
import { MyData } from './import/myData';
import { idbStore } from './import/store';
```

**Sửa `src/main.ts`** — thay:
```ts
import { registerVizTabs } from './ui/vizTabs';
```
bằng:
```ts
import { registerVizTabs } from './ui/vizTabs';
import { initMyData, setMyDataStatus } from './ui/myDataView';
import { clearMemos } from './viz/memo';
```

**Thêm vào cuối `src/main.ts`:**
```ts

// "My data" (Plan Import): imported CSVs stay in this browser (IndexedDB) and are replayed into the sandbox schema.
const myData = new MyData(db, idbStore(), () => {
  clearMemos(); // cached plans, steps and ER metadata describe the old data
  work.setSchema(editorSchema());
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
Trong `main.ts`, tham số `t` của `onConclusion: (t) => …` và `complete(t: Ticket)` che hàm `t` đã import, nhưng chỉ trong phạm vi hai hàm đó. Khối mới nằm ở cấp module nên dùng đúng hàm `t`.

- [ ] **Step 7: Kiểm kiểu, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected:
- `tsc` không lỗi (kể cả `en.ts` đủ khóa `mode.mydata*`/`mydata.*`).
- Mọi test PASS, gồm `tests/i18n.test.ts`: placeholder VI/EN khớp, EN khác VI, không có chữ "boss".
- Build OK.

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

- [ ] **Step 9: Kiểm tay trên Edge (bắt buộc: IndexedDB và số đo trình duyệt không kiểm được trong Node)**

Run: `npm run dev`, mở **Edge** (L5).
1. **Trang chủ:** dưới "Chế độ khác" có card **Dữ liệu của tôi** (📂) nằm giữa Sandbox và Sổ tay. Bấm card → vào Sandbox. Nav "Sandbox" cũng vào đúng chỗ đó.
2. Khung trái có mục **Dữ liệu của tôi**, ô kéo thả và dòng "Chưa có bảng nào." Dùng Tab: khi focus vào ô chọn file thì viền ô đổi màu; Enter/Space mở hộp chọn file.
3. Nạp `don_hang.csv` → trạng thái "don_hang.csv: đã nạp bảng don_hang (1.000 dòng, 5 cột)…". Mở `<details>` của bảng → các cột `ma_lo text`, `khach_hang text`, `ngay_eta date`, `teu bigint`, `da_thanh_toan boolean`.
4. Gõ `SELECT khach_hang, sum(teu) FROM don_hang GROUP BY 1 ORDER BY 1` → Chạy. Kiểm:
   - tab Kết quả có 7 dòng;
   - **Biểu đồ** vẽ cột;
   - **EXPLAIN** và **Luồng dữ liệu** có `Seq Scan don_hang`;
   - **Thứ tự thực thi** có số dòng từng bước (1.000 → … → 7);
   - **Sơ đồ ER** có hộp `don_hang` cạnh các bảng game đã mở, viền đậm màu chương;
   - autocomplete gợi ý `don_hang` và các cột của nó.
5. Nạp `shipments.csv` → bảng tên `shipments_my`; `SELECT count(*) FROM shipments` vẫn ra 20.000.
6. Nạp `bad.csv` → trạng thái là câu giải thích + lỗi gốc `missing data for column "b"`; danh sách không có `bad`.
7. **IndexedDB:** mở DevTools → Application → IndexedDB → `cargo-query` → `imports`. Store có 2 bản ghi (`don_hang`, `shipments_my`), mỗi bản ghi có `file` (Blob) và `types`. Tab Network **không** có request nào mang nội dung file. **Tải lại trang** → vào Sandbox → 2 bảng vẫn còn, `SELECT count(*) FROM don_hang` = 1000.
8. Bấm **Xóa** ở `shipments_my` → bảng biến mất khỏi danh sách và khỏi IndexedDB; tải lại trang → vẫn không còn. Bấm "Xóa toàn bộ dữ liệu đã nhập" → hộp xác nhận → OK → danh sách rỗng, store rỗng, `SELECT * FROM don_hang` báo lỗi `42P01`.
9. **Timeout + nạp lại:** nạp lại `don_hang.csv`, rồi chạy `SELECT count(*) FROM shipments a, shipments b`. Sau 5 s app báo quá hạn và database khởi động lại. Ngay sau đó chạy `SELECT count(*) FROM don_hang` → vẫn ra 1000 (bảng đã được nạp lại trước query này).
10. **Thời gian và bộ nhớ (L5, I3).** Ghi số đo vào mô tả commit **và** thêm một dòng vào `docs/team/decision-log.md`, đánh dấu "cần user xem".
    - Nạp `big_10col.csv`, đo bằng đồng hồ từ lúc chọn file tới lúc có dòng "đã nạp". Mong đợi < 30 s (spike Node ~3 s).
    - Xóa toàn bộ, tải lại trang, rồi nạp `wide_50col.csv` 5 lần, mỗi lần đổi tên file (`w1.csv` … `w5.csv`). Từ file thứ 2 (≥ 20 triệu ô), dòng cảnh báo bộ nhớ phải hiện.
    - Mở Task Manager của Edge (Shift+Esc), đọc cột "Memory footprint" của tab cộng với dedicated worker. **Nếu > 400 MB: không đổi giới hạn trong code** (L5); chỉ ghi số đo. Nếu số đo cho thấy ngưỡng 20 triệu ô quá sớm hoặc quá muộn, ghi ngưỡng đề xuất vào cùng dòng log; đổi `MEMORY_WARN_CELLS` là việc của user.
    - Tải lại trang, đo thời gian từ lúc trang mở tới lúc 5 bảng nạp lại xong (spike Node: ~3,4 s mỗi bảng). Trong lúc đó bấm Chạy một query: query chờ rồi chạy (I8), không lỗi.
11. Nạp file thứ 6 (`don_hang.csv` khi đã có `w1`…`w5`) → "Đã có 5 bảng, là số tối đa…". Nạp `big_10col.csv` sau khi đổi tên thành `w3.csv` → thay bảng `w3`, không báo vượt.
12. **Chế độ riêng tư:** mở cửa sổ InPrivate (Edge) hoặc cửa sổ riêng tư của Firefox, vào Sandbox, nạp `don_hang.csv`. Nếu trình duyệt chặn IndexedDB thì trạng thái có thêm "Trình duyệt không cho lưu file…" và bảng vẫn dùng được. Console không có lỗi chưa bắt.
13. Bấm `EN` → mọi chữ trong mục chuyển sang tiếng Anh ("My data", "1,000 rows"…). Tên bảng/cột và lỗi Postgres giữ nguyên.
14. Bấm "Về Làm việc" (hoặc nav "Làm việc") → tab ER và autocomplete không còn bảng nạp; ticket chấm điểm như cũ. Vào Luyện tập → cũng không thấy bảng nạp.

- [ ] **Step 10: Commit**

```bash
git add src/ui/myDataView.ts src/ui/modes.ts src/ui/vizTabs.ts src/state.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts docs/team/decision-log.md
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

**Thêm vào cuối `CLAUDE.md`:**
```markdown

## Imported data (Plan Import)

- Player CSVs go to schema `sandbox` (`search_path = public, sandbox`, set once in `initDb`; game tables win on name clashes). Tables are `UNLOGGED`. The files never leave the browser: IndexedDB only, never uploaded, never copied into diagnostics (Plan 1c Task 11, if added).
- Flow: `inspectCsv` (`src/import/csv.ts`, main thread) checks every D3 limit (20 MB / 200k rows / 50 columns / 5 tables) and sanitises names to `[a-z0-9_]`: reserved words get `_`, game table names get `_my`. Then `DbClient.importCsv` runs worker `kind: 'import'` through the query queue (30 s timeout, `COPY … FROM '/dev/blob'`, type inference in SQL). Then `idbStore().put` keeps the original file plus the inferred types (IndexedDB `cargo-query` / `imports`, records checked by `isStoredImport` on read).
- `DbClient` replays imported tables after every `restart()`. A replay that fails or times out is dropped and reported (`onImportDropped`), never retried in a loop. `MyData.restore()` replays IndexedDB on page load, one file at a time; a restart or failed boot keeps the stored file.
- Identifiers are inlined into SQL only through `ident()` and types only through `COLUMN_TYPES` (`src/db/import.ts`). Names reach Mermaid only through `mermaidName()`.
- Imported tables show only in Sandbox (`src/ui/myDataView.ts`): the "My data" section, the ER tab (`visibleTables()`), and autocomplete (via `schemaHooks.extra` in `src/state.ts`). Home has a "My data" mode card. When imported data changes, call `clearMemos()` (EXPLAIN / steps / ER caches are keyed by SQL text and schema name; `once()` is not cleared).
- Memory: the D3 limits stay (L5). The panel warns from `MEMORY_WARN_CELLS` imported cells (I3).
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
