# Spike ES1–ES3: runtime cho khu Database Engine

Ngày 2026-11-20, nhánh `v22-engine`. Đây là tiêu chí thoát của hàng **SPIKE** trong `roadmap-v22-v30.md` ("`spike-engine.md` có kết luận GO/NO-GO cho ES1–ES3"). Chỉ có tài liệu, không đổi mã app.

Khi roadmap được viết, chưa có runtime nào. Giờ cả ba đã có trên `v22-engine`: ENG-PGLAB (L230, L249), ENG-MONGO (L240–L242, L250), ENG-DYNAMO (L245, L246, L251), cộng `spike-nosql-browser.md`. Vì vậy spike này **kiểm lại** những gì đã xây, đo lại trong Node, và trả lời những câu roadmap hỏi mà chưa ai trả lời.

Mỗi con số mang một trong ba nhãn:

- **[đo lại]**: đo hôm nay trong Node 24.18 bằng script ở phụ lục (máy dùng chung, nên ghi khoảng).
- **[đã đo]**: trích từ L230/L245/L246 hoặc `spike-nosql-browser.md` (Edge headless), không đo lại.
- **[chưa đo]**: chưa có số; cần trình duyệt.

## Kết luận

| Spike | Verdict | Một dòng |
|---|---|---|
| **ES1** PGlite extension trong Web Worker | **GO** (Node; 5/6 contrib đã chạy trong worker trình duyệt qua e2e), **GO có điều kiện** cho trình duyệt: RAM điện thoại 375 và `btree_gin` trong trình duyệt chưa đo | 6 contrib roadmap hỏi đều nạp và chạy; `engineLab` ngoài transaction + `VACUUM` + `pageinspect` chạy đúng. Hai PGlite (game + lab), không gộp |
| **ES2** mingo: `$jsonSchema`, `$merge/$out`, pipeline update, `arrayFilters` | **GO** cho pipeline update và `arrayFilters` (thư viện + runner). **NO-GO** cho `$jsonSchema` (cần validator ngoài, runner không có). **NO-GO trong runner** cho `$merge/$out` (thư viện chạy, nhưng runner làm bẩn dữ liệu gốc: lỗi, xem §2.3) | Bài `$jsonSchema` và `$merge/$out` giữ `runtime: docs` như hiện tại |
| **ES3** dynoxide: Streams, TTL, `TransactGetItems` | **GO** cho `TransactGetItems` (gốc trong engine). **NO-GO** cho Streams, TTL và `TransactWriteItems`, cả 1.5.0 (đang ghim) lẫn 1.7.0 | Dạy giao dịch ghi bằng PartiQL `ExecuteTransaction` (nguyên tử, đã thử). Streams/TTL là D + dòng "cần backend" |

**EN summary.** ES1 is a GO. In Node, PGlite 0.5.16 loads and runs all six requested contribs (pageinspect, pg_trgm, bloom, btree_gin, btree_gist, cube + earthdistance). Each boots from a template in about 0.4–0.9 s, and extensions add at most ~0.15 s, which is within noise. An engineLab with setup outside a transaction, then DELETE, VACUUM and heap_page_items, runs in 15–17 ms after boot. Each instance reserves 189 MiB of wasm heap, and a second instance adds about 200 MiB RSS. Phone RAM at 375 px is not measured yet. ES2 is split. Pipeline updates and arrayFilters work in both mingo and the app runner. `$jsonSchema` needs an external validator (Ajv, a new dependency), so it stays NO-GO. `$merge`/`$out` work in mingo, but the runner passes the pristine seed arrays to `collectionResolver`: a player's `$out`/`$merge` mutates the cached dataset for later runs. That is a bug, not fixed here. ES3 is split. `TransactGetItems` works natively. Streams, TTL and `TransactWriteItems` return `UnsupportedOperation` in both 1.5.0 and 1.7.0. PartiQL `ExecuteTransaction` is atomic and is the hands-on substitute.

## ES1: PGlite extension trong Web Worker

### 1.1 Đã có gì

Worker lab riêng: `src/engine/pglab/pglabWorker.ts` + `session.ts` (L230, L249).

- Mỗi lab boot một DB mới từ một template cluster dump một lần.
- Setup tách từng câu bằng `splitSql`, chạy ngoài transaction, nên VACUUM, CHECKPOINT và ANALYZE đều chạy được.
- Nạp lười 15 contrib.
- Các bài Postgres có `setup` đã qua e2e 195/195 (L248–L252) **[đã đo]**. Năm trong sáu contrib roadmap hỏi có bài nạp trong `setup`, nên đã chạy trong worker trình duyệt qua e2e đó: `bloom` (`L2/09-bloom`), `btree_gist` (`L2/10-ranges-exclusion`), `pg_trgm` (`L2/13-trigram`, `L2/17`), `cube` + `earthdistance` (`L2/16-geo-knn`); thêm `pageinspect` (L3/02, 03, 05, 07, 09, 10, 13, 15; L5/01–06). `btree_gin` chưa bài nào nạp: chạy trong Node (dưới), trong trình duyệt **[chưa đo]**.

### 1.2 Số đo

| Đo | Kết quả |
|---|---|
| `PGlite.create()` lần đầu (initdb) | 1,76–2,00 s **[đo lại]**; L230 ghi ~2,7–3 s **[đã đo]** |
| Template `dumpDataDir('gzip')` | 0,49–0,52 s, **4,31 MiB** **[đo lại]** |
| Boot DB mới từ template, không extension (n = 10) | 432–889 ms **[đo lại]**; L230 ghi 0,4–0,5 s **[đã đo]** |
| Boot + `CREATE EXTENSION` (n = 3 mỗi dòng, 2 lượt) | pageinspect 671–991 · pg_trgm 707–802 · bloom 691–816 · btree_gin 775–826 · btree_gist 790–1037 · cube + earthdistance 685–799 ms **[đo lại]** |
| Chi phí thêm của một extension | khoảng +0–150 ms, nằm trong độ nhiễu của boot **[đo lại]** |
| Tarball (gz, như tải về) | pageinspect 16 KB · pg_trgm 16 · bloom 5,5 · btree_gin 5,5 · btree_gist 22 · cube 15 · earthdistance 2,4 KB; cả 6 cộng lại ~83 KB. Nhóm `pgext` 131/145 KB gồm 13 contrib, trừ pgcrypto 1,1 MB **[đã đo, L230]** |
| Heap wasm mỗi instance (`HEAP8.byteLength`) | **189 MiB**, không đổi sau boot/lab **[đo lại]** |
| RSS Node: một instance / thêm instance thứ hai (7 extension) | ~320–450 MiB / **+199–201 MiB** **[đo lại]** |
| RAM trên điện thoại giả lập 375 (Chrome/Edge, CDP `Performance.getMetrics` / `performance.measureUserAgentSpecificMemory`) | **[chưa đo]** |
| Boot thêm trong worker trình duyệt (ngoài số L230) | **[chưa đo]** riêng cho 6 extension; L230 đo pglab trong Edge headless |

Mỗi extension đều có một câu thử chức năng **[đo lại]**:

- `heap_page_items(get_raw_page(...))` trả 1 dòng.
- `similarity('postgres','postgress')` = 0,727.
- Index `bloom(a, c)` với `enable_seqscan=off` trả đúng 1 dòng.
- `CREATE INDEX … USING gin(int)` chạy được (btree_gin).
- `EXCLUDE USING gist (room WITH =, during WITH &&)` chạy được (btree_gist).
- `earth_distance(ll_to_earth(Đà Nẵng), ll_to_earth(TP.HCM))` = 610 km.

### 1.3 Prototype `engineLab` (setup ngoài transaction + VACUUM + pageinspect)

Một DB mới. Setup chạy từng câu bằng `query()`: `CREATE TABLE … WITH (autovacuum_enabled = off)`, rồi chèn 10 dòng. Sau đó `UPDATE` 1 dòng, `DELETE` 3 dòng, `VACUUM acc`, và đọc `heap_page_items` sau mỗi bước **[đo lại]** (script chỉ đếm `t_xmax` trước VACUUM):

| Lúc | Line pointer | `lp_flags` | `t_xmax ≠ 0` |
|---|---|---|---|
| Sau INSERT | 10 | 10 × normal | — |
| Trước VACUUM | 11 (UPDATE thêm một phiên bản) | 11 × normal | 4 |
| Sau VACUUM | 10 (lp cuối bị cắt) | 7 normal, 3 unused | — |

- Boot lab 630–643 ms. Setup + UPDATE + DELETE + VACUUM + 3 lần pageinspect mất **15–17 ms**.
- xid/LSN cuối giống hệt giữa hai lượt (`758`, `0/17831F8`), nên nội dung có thể ghi số xid cụ thể.
- `VACUUM` trong `BEGIN … COMMIT` và trong một `exec` nhiều câu đều trả **25001** "VACUUM cannot run inside a transaction block". Đây là lý do setup phải tách từng câu, và lý do lab không dùng `runSandboxed` (`BEGIN … ROLLBACK`).

### 1.4 Một PGlite hay hai

**Hai, và giữ hai.**

- `main.ts:81` luôn tạo `DbClient` của game lúc boot, kể cả trên `#/engine`. Nó boot rỗng và chỉ seed khi trang cần (v12.0 P1).
- Bài Engine không `setup` chạy trên schema `lab` của DB game (`pgLabRunner`). Bài có `setup` chạy trên worker pglab riêng (`PgLabClient`).
- Lý do không gộp:
  - lab cần DB mới, có VACUUM/CHECKPOINT và không có `ROLLBACK`;
  - snapshot của game (L143) yêu cầu không ai ghi vào DB;
  - timeout 5 s của game ≠ 20 s của lab.
- Giá phải trả: khi cả hai cùng sống, thêm ~200 MiB RSS trong Node.
- **Việc cho PG-EXT / v23** (chưa đo): đo trong trình duyệt ở 375. Nếu vượt, đóng worker pglab khi rời trang bài (`PgLabClient.reset()`), hoặc không boot worker game trên `#/engine` khi người chơi chưa mở domain nào.

### 1.5 Danh sách cho PG-EXT (roadmap v23)

Nạp lười theo bài, đúng như `EXTENSIONS` trong `src/engine/pglab/session.ts`: `pg_trgm`, `bloom`, `btree_gin`, `btree_gist`, `cube`, `earthdistance` (6/6 GO), cộng `pageinspect` cho L3.

- Roadmap đặt PG-EXT ở `src/db/worker.ts`, tức DB game. **Đề xuất** cho người điều phối (chưa phải quyết định): **giữ extension ở worker pglab**, không nạp vào DB game. DB game chạy `BEGIN … ROLLBACK` và có snapshot, nên nạp extension ở đó có thể phải bump `SNAPSHOT_FORMAT`.
- Fallback ES1 NO-GO (roadmap §4) **không cần dùng**.

## ES2: mingo 7.2.6

Thử hai lớp: thư viện `mingo` gọi thẳng, và runner của app (`runMongo` trong `src/engine/mongo/engineMongo.ts`, chạy qua jiti). **Chưa so với `mongod` thật**: kết luận "giống MongoDB" dựa vào tài liệu MongoDB, không dựa vào bộ golden.

### 2.1 Kết quả

| Tính năng | Thư viện mingo | Runner app | Verdict |
|---|---|---|---|
| `$jsonSchema` (find và `$match`) | lỗi `$jsonSchema requires 'jsonSchemaValidator' option to be defined.` Có validator truyền vào thì chạy (thử với validator đồ chơi: lọc đúng `[1]`) | lỗi như trên (runner không truyền validator) | **NO-GO**: cần Ajv (dependency mới) + ánh xạ `bsonType` → JSON Schema. Validation lúc `insert` (`collMod`/`validator`) mingo không có, phải tự viết |
| `$out` | chạy, cần `collectionResolver` | chạy, nhưng làm bẩn dữ liệu gốc (§2.3) | **NO-GO trong runner** tới khi sửa |
| `$merge` (`merge`, pipeline `whenMatched` với `$$new`, `fail`; `replace` thử qua runner) | đúng cả 3 trường hợp thử trên thư viện | chạy (`replace` đúng), nhưng làm bẩn dữ liệu gốc | như trên |
| Pipeline update (`[{ $set }, { $unset }]`, `$$NOW`) | đúng (`matchedCount 2`, `$$NOW` là `Date`) | đúng (`kind: 'write'`, seed không đổi) | **GO** |
| `arrayFilters` (`$[x]`), `$[]`, `$` vị trí | đúng | đúng cả ba | **GO** |

Mọi thao tác trên chạy dưới 5 ms với 3 tài liệu **[đo lại]**. Số đo trên 20k tài liệu nằm ở `spike-nosql-browser.md` §2.2 **[đã đo]**.

### 2.2 Ca biên mingo ≠ MongoDB

Tiêu chí của roadmap v27 (MongoDB L1–L2) cấm các ca này trong bài lab. Đã thấy trong spike này:

1. `$out` không phải stage cuối vẫn chạy (`[{ $out: 'tmp' }, { $count: 'n' }]` → `{ n: 3 }`). `mongod` báo "$out can only be the final stage".
2. `aggregate` có `$out`/`$merge` trả lại các tài liệu. `mongod` trả cursor rỗng.
3. `$out` vào một collection đã có thì **nối thêm** tài liệu, kèm `_id` trùng. `mongod` thay cả collection.
4. `arrayFilters` có định danh không dùng tới không báo lỗi. `mongod` báo "The array filter for identifier 'y' was not used in the update".
5. `$jsonSchema` không có validator thì báo lỗi, thay vì lọc.
6. Không có index thật và không có `explain()` (`spike-nosql-browser.md` §2.2). `createIndex` chỉ lưu metadata.

### 2.3 Lỗi tìm thấy (chưa sửa, chuyển cho ENG-MONGO)

`runMongo` chép collection chính của lệnh (`structuredClone`), nhưng truyền `collectionResolver: (n) => ds.collections[n]`, tức **mảng gốc** của dataset đã cache.

- `db.users.aggregate([{ $match: { a: 1 } }, { $out: 'users' }])` làm seed từ 2 thành 3 tài liệu (`_id: 1` hai lần). Lần chạy sau vẫn thấy 3 tài liệu.
- `$merge` vào `dst` ghi đè `dst` gốc.
- Đã xác nhận trên đường của app: `loadDataset(<setup JSON>)` trả **cùng một object** đã cache cho mọi lần gọi, nên sau một `$out` mọi lần chạy sau (`find`, `$[]`, `$`) thấy 3 tài liệu, `_id: 1` hai lần.
- Hậu quả: cách "mỗi lần chạy bắt đầu từ dữ liệu gốc" (L241) bị phá cho tới khi worker restart.
- Hướng sửa:
  - resolver trả bản sao theo lượt chạy (`structuredClone` khi được hỏi lần đầu, giữ trong `Map` của lượt chạy);
  - hoặc parser chặn `$out`/`$merge` với mã lỗi riêng.
- Nội dung hiện tại không chấm hai stage này: `L2/14-merge-out` là `runtime: docs`, `L4/02` chỉ nhắc trong văn. Nhưng ô "Chạy" của mọi lab aggregate vẫn nhận chúng.

## ES3: dynoxide

Repo ghim **1.5.0** (L245; 1.5.0 ra 2026-10-23). Roadmap ghi "1.7". 1.7.0 ra 2026-11-17, mới 3 ngày, nên chưa đủ luật "≥ 2 tuần"; 1.6.0 (2026-11-07) cũng chưa đủ. 1.7.0 được tải vào thư mục nháp riêng chỉ để chạy cùng bộ thử. Repo không đổi.

### 3.1 Kết quả (engine thô, không qua wrapper của app)

Lệnh `open` của engine tự báo `capabilities` (1.5.0 và 1.7.0 giống nhau): `CreateTable DeleteTable DescribeTable UpdateTable ListTables PutItem GetItem DeleteItem UpdateItem Query Scan BatchGetItem BatchWriteItem TransactGetItems ExecuteStatement BatchExecuteStatement ExecuteTransaction SearchVectors`.

| Thao tác | 1.5.0 | 1.7.0 | Verdict |
|---|---|---|---|
| `TransactGetItems` (3 Get, một key không có) | OK 3–4 ms, `Responses` theo thứ tự (`{}` cho key thiếu), `ConsumedCapacity` 6 RCU (2 × 3 Get, giống DynamoDB) | như 1.5.0 | **GO** (thực hành được) |
| `TransactWriteItems` | `UnsupportedOperation: Operation 'TransactWriteItems' is not supported by the wasm engine` | như 1.5.0 | **NO-GO** |
| PartiQL `ExecuteTransaction` (UPDATE + INSERT) | OK ~13 ms; cả hai câu áp dụng | như 1.5.0 | **GO** (thay cho TransactWriteItems) |
| `ExecuteTransaction` có một câu hỏng (INSERT trùng khóa) | `TransactionCanceledException … [None, DuplicateItem]`; câu UPDATE trước đó **không** áp dụng (nguyên tử) | như 1.5.0 | **GO** cho bài "tất cả hoặc không" |
| `CreateTable` có `StreamSpecification`; `UpdateTable` bật stream | `UnsupportedOperation: 'streams' is not supported by this build of the engine` | như 1.5.0 | **NO-GO** |
| `ListStreams`, `DescribeStream`, `GetShardIterator`, `GetRecords` | `UnsupportedOperation` | như 1.5.0 | **NO-GO** |
| `UpdateTimeToLive`, `DescribeTimeToLive` | `UnsupportedOperation` | như 1.5.0 | **NO-GO**; item có `exp` = 1000 (năm 1970) vẫn đọc được |
| Tên bảng 1 ký tự | `ValidationException … length greater than or equal to 3` (giống AWS) | | ghi chú cho nội dung |
| Import + `open` + lệnh đầu tiên (`CreateTable` có stream, bị từ chối) | 148–170 ms (Node) | 262 ms (một lượt) | **[đo lại]** |

**Đối chiếu với log:**

- L251 ghi "Thêm `TransactGetItems`, `TransactWriteItems`, `ExecuteTransaction`". Đúng ra: wrapper (`types.ts` `DYNAMO_OPS`, `engine.ts` `WRITES`/`CAPACITY`, `runner.ts` `WRITE`) **cho phép gửi** cả ba; không file nào giả lập `TransactWriteItems`, và `tests/dynamo.test.ts` không thử nó.
- `TransactGetItems` và `ExecuteTransaction` chạy gốc trong engine.
- `TransactWriteItems` đi qua wrapper rồi engine trả `UnsupportedOperation`. Wrapper không giả lập. Người học sẽ thấy lỗi đó nếu gõ nó.

### 3.2 Cho C-DY (roadmap v29)

| Chủ đề | Hình thức |
|---|---|
| `TransactGetItems` | **H** (lab) |
| Giao dịch ghi | **H** bằng `ExecuteTransaction`. `TransactWriteItems` là **D** + dòng BE (bài `dynamodb/L4/11-transactions` đang là `runtime: docs`, giữ) |
| Streams | **D** + dòng BE (`dynamodb/L5/01-streams`) |
| TTL | **D** + dòng BE; nếu cần, lab chỉ minh họa bằng `FilterExpression` trên `exp < :now` |

## Còn "pending (cần backend)" theo L215 / L219 D-E13

L215: DynamoDB dựa thư viện, phần cần backend để pending. MongoDB phần cần `mongod` dùng sơ đồ + kết quả ghi sẵn. D-E13: không làm backend Python trước v30.

- **DynamoDB:**
  - `TransactWriteItems`, Streams (`ListStreams/DescribeStream/GetShardIterator/GetRecords`, `StreamSpecification`), TTL (`UpdateTimeToLive/DescribeTimeToLive`, xóa hết hạn): engine trả `UnsupportedOperation` (đo ở trên).
  - Global tables, PITR/backup, DAX, capacity mode/adaptive capacity/partition thật: không có trong engine.
  - Bài `runtime: docs` hiện có: L1 ×3, L2 ×5, L3 ×3, L4 ×5, L5 ×5.
- **MongoDB:**
  - Index thật, `explain()`/plan cache, collation, sparse/hidden/text/2dsphere/wildcard;
  - validation khi ghi (`$jsonSchema` validator);
  - `$out/$merge` (tới khi sửa §2.3);
  - write/read concern, causal consistency, transaction nhiều tài liệu, change streams;
  - WiredTiger, replica set/failover, sharding, time series.
  - Bài `runtime: docs`: L1 ×1, L2 ×4, L3 ×15, L4 ×7, L5 ×8.
- **Postgres:** đa số không cần backend; ngoại lệ ở dòng "Chỉ sơ đồ" dưới.
  - 17 bài `runtime: docs` (L1 ×3, L2 ×1, L3 ×5, L4 ×5, L5 ×3) là lựa chọn nội dung (khái niệm/quiz). Lab chạy được nếu muốn: ES1 cho thấy pageinspect và VACUUM chạy; `pg_walinspect` đã có bài lab (L3/13, L5/09; L230/L249).
  - **Chỉ sơ đồ (cần server thật):** một PGlite là một kết nối, và hai instance là hai cluster riêng, không tranh khóa của nhau. Vì vậy khóa nhiều session, deadlock, isolation/SSI giữa hai giao dịch (L4/10–13) và replication, PITR, failover (L5/14) không có lab thật trong trình duyệt.
  - pgvector: được phép theo D-E11, chưa làm. PostGIS: không làm.

## Việc còn mở

1. **[chưa đo]** RAM và thời gian boot của worker pglab + worker game trên điện thoại giả lập 375 (CDP, profile lạnh). Đây là điều kiện để ES1 thành GO hoàn toàn trên trình duyệt.
2. Sửa §2.3 (resolver chép theo lượt chạy, hoặc chặn `$out/$merge`), kèm test: seed không đổi sau `$out`/`$merge`.
3. Bộ golden mingo ↔ `mongod` (`spike-nosql-browser.md` §2.2), để kiểm các ca §2.2 trước v27.
4. Nâng dynoxide chỉ sau ≥ 2 tuần. Bộ thử ES3 ở phụ lục cho thấy 1.7.0 không thêm Streams/TTL/TransactWriteItems, nên không có lý do nâng vì ES3.

## Phụ lục: cách đo

Script ở `scratchpad/spikeeng/`, không nằm trong repo. `node_modules` là junction tới `int-wt/node_modules`.

- `es1.mjs`:
  - `PGlite.create()` → `dumpDataDir('gzip')` → 5 lần `PGlite.create({ loadDataDir })`;
  - mỗi extension 3 lần boot + `CREATE EXTENSION` + một câu thử;
  - lab: setup từng câu, `UPDATE`, `DELETE`, `VACUUM`, `heap_page_items` 3 lần, thử `BEGIN; VACUUM` và `exec` nhiều câu (25001);
  - hai instance cùng lúc, đọc `process.memoryUsage().rss` và `db.mod.HEAP8.byteLength`.
- `es2c.mjs`: `loadDataset(<setup JSON>)` rồi `runMongo` nhiều lần (đường của app), `$merge replace`, `$[]`, `$` qua runner.
- `es2.mjs`: `find/aggregate/updateMany/updateOne` của mingo với từng tính năng, rồi `runMongo(ds, src)` qua `jiti` với dataset trong bộ nhớ và kiểm seed sau mỗi lệnh. `es2b.mjs`: `$out` vào chính collection → seed 2 → 3 tài liệu.
- `es3.mjs`:
  - nạp `@dynoxide/wasm-engine/worker` vào global scope như `engine.ts` (vá `fetch` file://, `postMessage` → router);
  - `call('open', { name: 'lab', ephemeral: true })`;
  - `call('execute', { op, request })` cho từng thao tác.
  - `es3v.mjs` là cùng script với đường dẫn worker tham số, chạy trên 1.7.0 (`npm pack` vào thư mục riêng).

Kết quả thô chính (lượt 2 của `es1.mjs`):

```
fresh PGlite.create (initdb) 1756 ms; wasm heap 189 MiB rss 319 MiB
dumpDataDir gzip 488 ms, size 4.31 MiB
boot from template ms (n=5) 432, 607, 767, 636, 653
ext pageinspect 744,690,729 · pg_trgm 707,720,749 · bloom 816,739,747 · btree_gin 775,826,788 · btree_gist 842,1037,816 · cube+earthdistance 721,745,685
engineLab boot 643 ms; setup+UPDATE+DELETE+VACUUM+3x pageinspect 17 ms
  before VACUUM 11 lp, flags {"1":11} xmax set on 4
  after VACUUM  10 lp, flags {"0":3,"1":7}
  VACUUM inside BEGIN → 25001 VACUUM cannot run inside a transaction block
second instance (7 ext) adds rss 199 MiB; heaps 189 MiB / 189 MiB
```
