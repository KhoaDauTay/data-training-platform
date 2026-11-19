# Bản đồ kiến thức: khu "Database Engine" (PostgreSQL, MongoDB, DynamoDB)

Người viết: agent Research · 2026-11-20 · **Chỉ là tài liệu nghiên cứu**. Không sửa `src/`, `content/`, test hay `decision-log.md`.

**Phạm vi (user chốt 2026-11-20):** chỉ giữ ba engine, mỗi engine là một **thang đầy đủ từ người mới (L1) tới chuyên gia bên trong (L5)**.

- **PostgreSQL:** đầy đủ từ beginner tới mức cao nhất.
- **MongoDB:** đầy đủ từ beginner tới mức cao nhất.
- **DynamoDB:** dựa trên thư viện chạy trong trình duyệt. Phần nào cần backend thì để "pending".
- **MySQL/MariaDB bị bỏ.** Bản trước của tài liệu này (commit `7ccb566`) có phần InnoDB, ai cần thì xem lại ở đó.

Tài liệu này là "danh mục nguồn" mà `product-design-db-engine.md` (R5, §2, §4, spike E-S1/E-S2) chờ. Nó dùng cùng runtime đã chọn trong `spike-nosql-browser.md`:

| Engine | Runtime trong trình duyệt |
|---|---|
| PostgreSQL | PGlite |
| MongoDB | `mingo` (không có index, không có explain) |
| DynamoDB | `@dynoxide/wasm-engine` (không có `TransactWriteItems`, nạp ~1 ms/item) |

**Quy ước:**

- `[Sn]` trỏ tới §8. Mọi số liệu đều dẫn nguồn chính thức và đã được mở đọc ngày 2026-11-20, trừ chỗ ghi khác.
- **(chưa đối chiếu)** là kiến thức chung chưa mở nguồn. Phải kiểm trước khi viết vào bài.
- **(đo)** là kết quả chạy thật trên máy này, PGlite 0.5.16 trong **Node 24**. Chưa đo trong Web Worker của trình duyệt.
- Ghi chú học tập riêng của user chỉ được dùng để **kiểm độ phủ và thứ tự chủ đề**. Không có sự thật nào lấy từ đó. Mọi sự thật đều dựng lại từ docs chính thức.

**Phiên bản được mô tả:**

| Engine | Phiên bản |
|---|---|
| PostgreSQL | 18 (PGlite 0.5.16 = **PostgreSQL 18.6**, đo) |
| MongoDB | Manual hiện hành. Trang đã nhắc tới 8.3 và 9.0, nên mỗi bài phải ghi "đúng với phiên bản X" |
| DynamoDB | Developer Guide hiện hành |

**Ký hiệu thực hành** (chi tiết ở §1.4):

| Ký hiệu | Nghĩa |
|---|---|
| **H** | Chạy thật trong trình duyệt. **H-A**: một câu đọc trong `runSandboxed`. **H-B**: cần request kịch bản mới trong worker |
| **D** | Sơ đồ, hoạt hình, bài đọc hoặc output ghi sẵn từ server thật |
| **BE** | Muốn thực hành thật thì cần backend. Dự án chỉ cho phép backend Python, và hiện chưa có |

---

## 0. Tóm tắt một trang

| Engine | L1 Người mới | L2 Thực hành | L3 Hiệu năng / mô hình | L4 Đồng thời / quy mô | L5 Bên trong, vận hành | % bài chạy thật trong trình duyệt |
|---|---|---|---|---|---|---|
| **PostgreSQL** | DDL, kiểu, ràng buộc, transaction, EXPLAIN đầu tiên | Mọi loại index, FTS, jsonb, trigram, EXPLAIN ANALYZE | Trang, heap, TOAST, MVCC, HOT, VACUUM, WAL | Lock, isolation, SSI, cost model, thống kê, join planning, partitioning, parallel, JIT | Nội tạng từng index AM, amcheck, replication, logical decoding, RLS, tuning, extension | **~77 %** (51/66 bài) |
| **MongoDB** | BSON, CRUD, toán tử truy vấn | Update operator, pipeline update, aggregation, mô hình nhúng/tham chiếu, validation | Index mọi loại, ESR, covered, explain, plan cache | Concern, causal consistency, transaction, pattern, change stream, TTL | WiredTiger, replication, election, sharding, time series | **~45 %** (27/60) |
| **DynamoDB** | Bảng, item, khóa, CRUD, Query vs Scan | Biểu thức, conditional write, batch, PartiQL, phép tính RCU/WCU | LSI/GSI, projection, single-table, mọi mẫu khóa | Partition, adaptive capacity, hot partition, write sharding, transaction, capacity mode | Streams, TTL, global tables, backup (đọc) | **~66 %** (35/53) |

**Phát hiện chính (đo):**

1. PGlite cho **quan sát bên trong thật**, gồm:
   - line pointer, HOT redirect, `xmin/xmax`;
   - B-tree meta, GIN metapage, GiST page items, BRIN ranges;
   - visibility map, WAL record;
   - `Buffers:` trong EXPLAIN, sort tràn đĩa (`external merge Disk: 1976kB`);
   - RLS qua `SET ROLE`, advisory lock trong `pg_locks`.

   Phần lớn thang Postgres không cần mô phỏng.
2. PGlite **không có**:
   - nhiều phiên đồng thời (một backend);
   - parallel query (đặt `max_parallel_workers_per_gather = 2` vẫn không ra `Gather`);
   - JIT (`pg_jit_available() = false`);
   - logical decoding (`wal_level` = replica, nên tạo slot báo lỗi).

   Đây là phần "BE" của Postgres.
3. **pgvector 0.8.7 và PostGIS 3.6.2 chạy được trong PGlite** qua gói riêng, ghim `@electric-sql/pglite-pgvector@0.0.17` / `@electric-sql/pglite-postgis@0.2.16` (đo). Product design hiện **không** dùng hai gói này: PostGIS ~20 MB vượt trần ~3 MB của D-E6, và thêm dependency cần user duyệt. Thang dưới đây coi chúng là **tùy chọn**. Nếu không bật, P9/P11 là bài đọc + bản nhẹ (`cube`, `earthdistance`, kiểu hình học lõi).
4. `pg_overexplain` có tarball nhưng **không có wrapper chính thức**. Tự viết wrapper thì chạy được (đo).

---

## 1. PGlite 0.5.16 thật sự có gì (đo, 2026-11-20)

### 1.1 Cách đo

- **Script tạm**, đã xóa sau khi đo: tạo `PGlite.create({ extensions })`, `CREATE EXTENSION`, rồi gọi **một hàm thật** của từng extension.
- **`version()`:** `PostgreSQL 18.6 (PGlite 0.5.16) on wasm32-unknown-emscripten … 32-bit`.
- **Thiết lập đọc được:**
  - `block_size` = 8192, `shared_buffers` = 128MB;
  - `wal_level` = replica, `autovacuum` = on;
  - `max_parallel_workers_per_gather` = 0, `jit` = on nhưng `pg_jit_available()` = false;
  - `pg_stat_activity` chỉ có **1** dòng, `backend_type` = `standalone backend`.
- **Danh sách extension trên site PGlite:** [S1]. Tarball đọc trực tiếp từ `node_modules/@electric-sql/pglite/dist`.

### 1.2 Bảng extension

Cột "Gọi thử" là một lệnh thật đã chạy và có kết quả. Cỡ là kích thước tarball `.tar.gz`.

| Extension | Đường import | Cỡ | Gọi thử (đo) | Cấp |
|---|---|---|---|---|
| `pageinspect` | `@electric-sql/pglite/contrib/pageinspect` | 16 KB | `heap_page_items(get_raw_page(…))`, `bt_metap`, `bt_page_items`, `brin_page_items`, `gin_metapage_info`, `gist_page_items` | L3, L5 |
| `pg_visibility` | `…/contrib/pg_visibility` | 4.5 KB | `pg_visibility_map('t')` → `all_visible`/`all_frozen` | L3 |
| `amcheck` | `…/contrib/amcheck` | 21 KB | `bt_index_check('t_pkey')` | L5 |
| `pg_walinspect` | `…/contrib/pg_walinspect` | 4.6 KB | `pg_get_wal_records_info(lsn1, lsn2)` → `resource_manager`, `record_type`, `fpi_length`, `block_ref` | L3, L5 |
| `pg_buffercache` | `…/contrib/pg_buffercache` | 4.5 KB | `count(*)` = 16384 buffer (128 MB / 8 KB) | L3 |
| `pg_freespacemap` | `…/contrib/pg_freespacemap` | 1.6 KB | `pg_freespace('t')` | L3 |
| `bloom` | `…/contrib/bloom` | 5.4 KB | `CREATE INDEX … USING bloom` | L2 |
| `btree_gin` / `btree_gist` | `…/contrib/btree_gin`, `…/btree_gist` | 5.4 / 22 KB | `CREATE EXTENSION` | L2 |
| `pg_trgm` | `…/contrib/pg_trgm` | 15 KB | `gin(v gin_trgm_ops)`, `gist(v gist_trgm_ops)` | L2 |
| `pg_stat_statements` | `…/contrib/pg_stat_statements` | (có) | ghi cả `vacuum t` chạy **trước** `CREATE EXTENSION`. Tùy chọn `extensions` nạp module lúc boot, đóng vai `shared_preload_libraries` | L5 |
| `cube`, `earthdistance`, `hstore`, `pg_surgery` | `…/contrib/<tên>` | (có) | chỉ `CREATE EXTENSION` OK | L2 (GEO nhẹ) |
| `ltree`, `pgcrypto` | `…/contrib/<tên>` | (có) | `'a.b.c'::ltree`; `digest('x','sha256')` | phụ |
| `vector` (pgvector 0.8.7) | gói riêng `@electric-sql/pglite-pgvector@0.0.17` | ~50 KB | HNSW + IVFFlat; `ORDER BY e <-> … LIMIT 5` → `Index Scan … Order By` | L2 tùy chọn |
| `postgis` (3.6.2, GEOS 3.14, PROJ 9.7) | gói riêng `@electric-sql/pglite-postgis@0.2.16` | **~20 MB** | geography + GiST: `ST_DWithin` → `Index Cond: (g && _st_expand(…))`; geometry + GiST KNN → `Index Scan … Order By` | L2 tùy chọn |
| `pg_overexplain` | tarball có, **không** có `contrib/*.js`; tự viết `{ name, setup: async () => ({ bundlePath }) }` như `contrib/pageinspect.js` | (có) | `LOAD` OK; `EXPLAIN (DEBUG)` in `Plan Node ID`, `PlannedStmt`; `EXPLAIN (RANGE_TABLE)` in `RTI 1…`, `Relation Lock Mode` | L5 tùy chọn |

**Ghi chú về phiên bản gói:**

- Bản mới nhất `pglite-pgvector@0.0.18` / `pglite-postgis@0.2.17` có peer `@electric-sql/pglite` = **0.5.17**. Với 0.5.16 phải ghim **0.0.17 / 0.2.16** (đo).
- Nâng PGlite thì nâng cặp extension cùng lúc.
- Trang extension ghi PostGIS "18.8 MB", còn issue trạng thái #916 [S1].

### 1.3 Quan sát bên trong được gì (đo)

| Hiện tượng | Câu SQL | Kết quả thật |
|---|---|---|
| Tuple cũ/mới sau UPDATE | `heap_page_items` (cùng phiên, trước VACUUM) | `lp 1: t_xmin 752, t_xmax 753, t_ctid (0,84)`; `t_infomask2` = 16386 (cờ HOT_UPDATED) |
| HOT chain sau VACUUM | cùng câu, sau `VACUUM t` | `lp 1: lp_flags 2 (REDIRECT), lp_off 84`, cột tuple = NULL |
| Bộ đếm HOT | `pg_stat_force_next_flush()` rồi `pg_stat_user_tables` | `n_tup_upd 3, n_tup_hot_upd 3, n_dead_tup 3`. **Phải flush trước**, không thì đọc ra 0 |
| Visibility map | `pg_visibility_map('t')` sau VACUUM | `all_visible = true`, `all_frozen = false` |
| Index-only scan | `EXPLAIN (ANALYZE, BUFFERS) SELECT id …` | `Index Only Scan … Heap Fetches: 0 … Index Searches: 1 … Buffers: shared hit=3` |
| Bitmap scan | `EXPLAIN (ANALYZE, BUFFERS) … BETWEEN` | `Bitmap Heap Scan … Heap Blocks: exact=1` |
| Sort tràn đĩa | `SET work_mem='64kB'` + `EXPLAIN ANALYZE … ORDER BY v` | `Sort Method: external merge Disk: 1976kB`, `temp read=728 written=770` |
| GIN | `gin_metapage_info(get_raw_page('gi',0))` | `n_pending_pages 0, n_entries 10, n_data_pages 7` |
| GiST | `gist_page_items(get_raw_page('gs',0),'gs')` | khóa là hộp bao `(22,14),(0,0)` |
| BRIN | `brin_page_items(…)` | `{1 .. 2000}` cho range block 0 |
| B-tree | `bt_metap('t_pkey')` | `root 3, level 1, allequalimage true` |
| Thống kê | `pg_stats` | `n_distinct -1`, `histogram_bounds {1,20,40,…}` |
| RLS | `ENABLE ROW LEVEL SECURITY` + policy `id < 5` + `SET ROLE alice` | `count = 4` |
| Prepared | `PREPARE s(int) …; EXPLAIN EXECUTE s(5)` | `Index Scan using t_pkey` |
| Advisory lock | `pg_advisory_lock(42)` rồi `pg_locks` | `advisory / ExclusiveLock` |
| Parallel | `SET max_parallel_workers_per_gather=2; EXPLAIN SELECT count(*)` | `Aggregate → Seq Scan`, **không** có `Gather` |
| JIT | `pg_jit_available()` | `false` |
| Logical decoding | `pg_create_logical_replication_slot('s1','test_decoding')` | lỗi *logical decoding requires "wal_level" >= "logical"* |

### 1.4 Ba mức thực hành của Postgres

Ranh giới mức do **mô hình chạy của game** quyết định, không phải do PGlite: `runSandboxed` chạy một câu trong `BEGIN … ROLLBACK`.

- **H-A, chạy ngay:** một câu đọc duy nhất trên bảng đã seed. Gồm catalog, `EXPLAIN`, hàm đọc của `pageinspect`, `pg_stats`.
  - Điều kiện: extension đã nạp lúc tạo PGlite.
  - Hiện repo tạo PGlite bằng `new PGlite()`, không có `extensions` (`src/db/snapshot.ts`), và `initEngine` (`src/db/init.ts`) chỉ dựng `sandbox`.
  - Index lab có sẵn (`runLab`) nhận mọi `CREATE [UNIQUE] INDEX` không `CONCURRENTLY` (`isCreateIndex`, `src/planCheck.ts`). Index cần opclass của extension (`gin_trgm_ops`, `bloom`) thì phải nạp extension trước.
- **H-B, cần request kịch bản mới** (giống `lab`). Gồm:
  - `UPDATE` rồi soi trang;
  - `VACUUM` (đo: *VACUUM cannot run inside a transaction block*, SQLSTATE 25001);
  - `pg_stat_force_next_flush()` + đọc bộ đếm;
  - giữ index;
  - so WAL trước/sau;
  - `SET ROLE` nhiều bước;
  - `PREPARE`/`EXECUTE`.

  Kịch bản cố định do nội dung định nghĩa, tên đối tượng lấy từ hằng số.
- **D:** mọi thứ cần nhiều phiên, worker nền, LLVM hoặc `wal_level = logical`.
  - Nhiều phiên: lock wait, deadlock, SSI, `CONCURRENTLY`.
  - Worker nền: autovacuum, parallel.
  - Chưa kiểm: PGlite có khởi động được với `wal_level = logical` không. Đây là một spike nhỏ đáng làm.

### 1.5 Runtime NoSQL (theo `spike-nosql-browser.md`, không đo lại ở đây)

**MongoDB: `mingo` 7.2.7** [S97], MIT, ~35 KB gz cả worker.

- Có: query, projection, update, aggregation.
- **Không có index, không có `explain()`.** Ghi chạy trên bản sao `structuredClone` rồi bỏ.
- Đo trong spike: mọi truy vấn < 250 ms trên 20k tài liệu.
- Chưa kiểm trong spike: `$jsonSchema`, `$merge`/`$out`, pipeline update đủ stage. Phải kiểm trước khi xếp bài L2 vào H.

**DynamoDB: `@dynoxide/wasm-engine` 1.7.0** [S98], Rust + SQLite → WASM, ~1,2 MB gz.

- Có:
  - CreateTable có GSI/LSI;
  - Get/Put/Update/Delete;
  - Query/Scan có `ConsumedCapacity`, `ScannedCount`, `LastEvaluatedKey`;
  - PartiQL `ExecuteStatement`/`ExecuteTransaction`;
  - `ValidationException` khi dùng từ dành riêng.
- `TransactWriteItems` trả `UnsupportedOperation`.
- Nạp ~1 ms/item.
- Chưa kiểm: Streams, TTL, `TransactGetItems`, throttling. Emulator một nút gần như chắc chắn không mô phỏng throttle theo partition. Đây là nhận định, chưa đo.

---

## 2. Nền chung (C): học trước cả ba engine

| # | Chủ đề | Mục tiêu học | Sự thật chính | Thực hành |
|---|---|---|---|---|
| C1 | Trang và phân cấp lưu trữ | Giải thích vì sao DB đọc theo trang; ước lượng số trang | PG trang 8 KB [S2] | H-A: `pg_relation_size/8192` = `relpages` (đo: 25 trang cho 2000 dòng, ff 70) |
| C2 | Cây B/B+ | Vẽ cây, split, vì sao cây thấp | Index PG mặc định B-tree [S9]; index MongoDB là B-tree [S30] | H-A: `bt_metap` |
| C3 | Ghi log trước | Luật WAL, REDO | [S8]; journal + checkpoint của WiredTiger [S31] | H-B: `pg_walinspect` |
| C4 | Đồng thời | Khóa vs đa phiên bản; mỗi engine giữ bản cũ ở đâu | heap PG [S5]; snapshot WiredTiger [S31]; DynamoDB read-committed [S53] | D |
| C5 | Phân tán | Hash vs range partitioning; nhân bản; quorum | Partition DynamoDB [S51]; shard key MongoDB [S86]; streaming replication PG [S67] | D |
| C6 | Cost model | "Chi phí" là đơn vị ước lượng, không phải ms | [S62] | H-A |

---

## 3. PostgreSQL: thang L1 → L5

Tiên quyết: lộ trình SQL của app (General). Ghi chú chi tiết từng chủ đề (P1–P17) ở §3.6.

### 3.1 L1 Người mới: "Dùng Postgres đúng cách"

- **Tiên quyết:** SELECT/JOIN/GROUP BY.
- **Ước lượng:** 10 bài, **10 H**.
- **Mục tiêu:**
  - tạo bảng với kiểu phù hợp (`numeric` vs `float8`, `timestamptz`, `text`, `jsonb`, `uuid` + `uuidv7()` mới ở 18 [S12]);
  - ràng buộc (PK, FK, UNIQUE, CHECK, NOT NULL), `NULLS NOT DISTINCT` [S70];
  - schema và `search_path`;
  - transaction `BEGIN/COMMIT/ROLLBACK`, savepoint;
  - generated column, ảo là mặc định ở 18 [S12];
  - index B-tree đầu tiên;
  - đọc `EXPLAIN` cơ bản (Seq Scan vs Index Scan, `cost=…`).
- **Thực hành:** H-A, lab và index lab có sẵn.

### 3.2 L2 Thực hành: "Chọn đúng index, đọc đúng kế hoạch"

- **Tiên quyết:** L1.
- **Ước lượng:** 14 bài, 13 H + 1 D (`CONCURRENTLY`). Thêm 3 bài nếu bật PostGIS/pgvector.
- **Mục tiêu:**
  - B-tree nhiều cột: luật cột đầu, skip scan ở 18 [S71];
  - `INCLUDE` và index-only [S6];
  - partial, expression, unique index [S70];
  - Hash, GIN (`jsonb_ops`/`jsonb_path_ops`, mảng), GiST, SP-GiST, BRIN, bloom [S9][S13][S14][S15];
  - full-text (`tsvector`, `tsquery`, GIN vs GiST) [S72] và `pg_trgm`;
  - `EXPLAIN (ANALYZE, BUFFERS)` (BUFFERS mặc định ở 18 [S12]);
  - `pg_stats` cơ bản;
  - GEO bản nhẹ (kiểu lõi + KNN GiST [S9], `earthdistance`);
  - tùy chọn: PostGIS [S18][S73], pgvector [S74].
- **Thực hành:** H-A + index lab. `CREATE INDEX CONCURRENTLY` là D vì cần phiên khác [S70].

### 3.3 L3 Bên trong lưu trữ: "Một dòng nằm ở đâu, sống bao lâu"

- **Tiên quyết:** L2.
- **Ước lượng:** 12 bài, 9 H-B + 3 D.
- **Mục tiêu:**
  - trang (header 24 B, line pointer 4 B, tuple header 23 B) [S2];
  - TOAST (ngưỡng ~2 kB, 4 chiến lược, 1 GB) [S3];
  - MVCC qua `xmin/xmax/ctid`;
  - HOT và fillfactor [S4];
  - VACUUM, visibility map, FSM [S5];
  - freeze và wraparound (D);
  - WAL: record, LSN, full-page write, checkpoint (`checkpoint_timeout` 5 min, `max_wal_size` 1 GB) [S69];
  - shared buffers và `pg_buffercache`;
  - sort/hash tràn đĩa theo `work_mem` (4MB mặc định [S65], đo được `external merge`).
- **D:** wraparound thật, crash rồi replay, nhịp checkpoint.

### 3.4 L4 Đồng thời và planner: "Vì sao chọn kế hoạch này, ai chặn ai"

- **Tiên quyết:** L3.
- **Ước lượng:** 14 bài, 8 H + 6 D.
- **H (8):**
  - cost model, 5 hằng số [S62];
  - `pg_stats` sâu (MCV, histogram, correlation);
  - extended statistics [S10];
  - thứ tự join, `join_collapse_limit`/GEQO [S62];
  - `plan_cache_mode` generic vs custom (đo `PREPARE`);
  - partitioning và pruning [S16];
  - bảng lock mode qua `pg_locks` trong một phiên;
  - advisory lock (đo).
- **D (6):**
  - các mức cô lập và hiện tượng [S61];
  - SSI và `SIReadLock` [S61];
  - row lock 4 mức và chờ khóa [S60];
  - deadlock [S60];
  - parallel query (`Gather`) [S64];
  - JIT [S63].
- Cả 6 bài D sẽ thành H nếu có **backend Python + PostgreSQL thật**: nhiều kết nối, có LLVM, có worker.

### 3.5 L5 Chuyên gia: "Nội tạng index, nhân bản, bảo mật, tinh chỉnh"

- **Tiên quyết:** L4.
- **Ước lượng:** 16 bài, 11 H + 5 D.
- **H (11):**
  - B-tree: split, dedup, bottom-up deletion, qua `bt_page_items` [S7];
  - GIN: pending list và `fastupdate`, qua `gin_metapage_info` [S13];
  - BRIN: summarization, `autosummarize`, `brin_summarize_new_values` [S14];
  - GiST/SP-GiST: hộp bao vs quad/k-d, qua `gist_page_items` (SP-GiST chưa có hàm pageinspect, nên chỉ D, chưa đối chiếu);
  - `amcheck`;
  - WAL đào sâu: `fpi_length` sau checkpoint;
  - RLS: `USING`/`WITH CHECK`, permissive/restrictive, `FORCE`, `BYPASSRLS` [S68], đo với `SET ROLE`;
  - `pg_stat_statements`;
  - giám sát `pg_stat_*`;
  - tinh chỉnh bộ nhớ (`work_mem`, `maintenance_work_mem` 64MB [S65]);
  - `pg_overexplain` (tùy chọn).
- **D (5):**
  - streaming replication, sync/async, hot standby, slot [S67];
  - logical decoding và slot giữ WAL [S66];
  - autovacuum trong sản xuất;
  - backup và PITR [S8];
  - HA/failover.
- Nếu có backend: replication cần **hai** server, logical decoding cần `wal_level = logical`.

### 3.6 Ghi chú chủ đề Postgres (nguồn và chi tiết)

**P1 Từ SQL tới đĩa.**

- parser → rewriter → planner → executor.
- Trang 8 KB, đổi được lúc biên dịch [S2].
- PG 18 có AIO: `io_method` mặc định `worker`, `effective_io_concurrency` 16 [S65][S12].

**P2 Heap, trang, TOAST.**

- Header trang 24 byte (`pd_lsn`, `pd_checksum`, `pd_lower`, `pd_upper`, `pd_special`, `pd_prune_xid`…). ItemId 4 byte. Header tuple 23 byte (`t_xmin`, `t_xmax`, `t_cid`, `t_ctid` 6 byte, `t_infomask2`, `t_infomask`, `t_hoff`) [S2].
- TOAST bật khi dòng > `TOAST_TUPLE_THRESHOLD` (thường 2 kB), ép tới `TOAST_TUPLE_TARGET` (`toast_tuple_target`).
- Chunk ~2000 byte, con trỏ 18 byte, tối đa 1 GB.
- `PLAIN | EXTENDED | EXTERNAL | MAIN`. Nén qua `default_toast_compression` / `COMPRESSION` [S3]. Tên phương thức (pglz, lz4): chưa đối chiếu.

**P3 MVCC.**

- `t_xmin` là XID chèn, `t_xmax` là XID xóa, `t_ctid` trỏ phiên bản mới hơn [S2].
- Đo: tuple cũ có `t_xmax 753`, `t_ctid (0,84)`.

**P4 VACUUM, HOT, freeze.**

- **Bốn lý do VACUUM:** chỗ trống, thống kê, visibility map, wraparound. `VACUUM FULL` cần `ACCESS EXCLUSIVE` [S5].
- **Wraparound:**
  - XID 32 bit. Phải vacuum mỗi bảng trong ~2 tỉ giao dịch.
  - Cảnh báo khi còn ~40 triệu. Chỉ cho đọc khi còn < 3 triệu.
  - `autovacuum_freeze_max_age` = 200 triệu. Freeze là bit cờ, giữ `xmin` [S5].
  - Không có autovacuum cho partitioned/temp table [S5].
- **HOT cần hai điều:** không đổi cột được index (trừ index summarizing, tức BRIN), và trang còn chỗ. fillfactor thấp giúp HOT [S4].
- **Visibility map** nhỏ hơn heap ~4 bậc [S6].

**P5 WAL.**

- Luật WAL, REDO, fsync tuần tự, nhóm commit, PITR [S8].
- **Checkpoint:** mọi trang bẩn được flush + bản ghi checkpoint. Chạy mỗi `checkpoint_timeout` (5 min) hoặc khi sắp vượt `max_wal_size` (1 GB).
- `full_page_writes`: lần sửa đầu tiên mỗi trang sau checkpoint thì ghi cả trang [S69].
- `pd_lsn` [S2].
- Segment 16 MB: trang [S67] nhắc "16MB segment" (cỡ mặc định thì chưa đối chiếu ở trang cấu hình).

**P6 B-tree.**

- **Dedup:** mặc định bật, tắt bằng `deduplicate_items`.
  - Không áp cho `numeric`, `jsonb`, `float`, collation không xác định, container type.
  - Không áp cho **mọi index có `INCLUDE`** [S7].
- **Bottom-up deletion** từ 14 [S7].
- **Skip scan (18):** ví dụ `(x,y)` + `WHERE y = 7700`, chỉ khi `x` ít giá trị [S71][S12].
- **Luật cột đầu:** equality trên các cột đầu + inequality trên cột đầu tiên không có equality [S71].
- Tối đa 32 cột kể cả INCLUDE. Chỉ B-tree, GiST, GIN, BRIN cho nhiều cột [S71].
- fillfactor B-tree mặc định 90 [S70].

**P7 Các AM khác.**

| AM | Nguồn | Chi tiết |
|---|---|---|
| Hash | [S9] | chỉ `=`, băm 32 bit |
| GiST | [S9] | hình học 2D, **KNN** `ORDER BY … <-> … LIMIT` |
| SP-GiST | [S9] | quadtree, k-d, radix; KNN với opclass có toán tử thứ tự |
| GIN | [S13] | opclass `array_ops`, `jsonb_ops` (thêm `? ?\| ?&`), `jsonb_path_ops` (`@> @? @@`, nhanh hơn), `tsvector_ops`. Pending list được dọn khi VACUUM/autoanalyze, khi gọi `gin_clean_pending_list` hoặc khi vượt `gin_pending_list_limit` [S13]. Build song song từ 18 [S12] |
| BRIN | [S14][S70] | `pages_per_range` 128; minmax, minmax-multi (`values_per_range` 32), inclusion, bloom (`false_positive_rate` 0.01); `autosummarize` off |
| bloom | [S15] | 80 bit, 2 bit/cột; `int4`, `text`; chỉ `=`; không UNIQUE, không NULL |

**P8 Index nâng cao.**

- **Index-only** cần AM hỗ trợ (B-tree luôn có; GiST/SP-GiST một số opclass; **GIN không**) và câu chỉ dùng cột trong index. Chỉ lợi khi phần lớn trang có bit all-visible [S6].
- **`INCLUDE`:** chỉ B-tree, GiST, SP-GiST; không biểu thức [S6].
- **Partial:** `WHERE`, kể cả UNIQUE trên một tập con. Expression: `((lower(title)))` [S70].
- **`CONCURRENTLY`:**
  - index được ghi là *invalid* trong một transaction, rồi quét bảng **hai** lần trong hai transaction nữa;
  - phải chờ mọi giao dịch có thể dùng bảng;
  - lỗi thì để lại index invalid (vẫn tốn chi phí cập nhật);
  - không chạy trong transaction block [S70];
  - không dùng trên bảng partitioned (dùng `ON ONLY` + `ATTACH`) [S16];
  - lấy `SHARE UPDATE EXCLUSIVE`, còn `CREATE INDEX` thường lấy `SHARE` [S60].

**P9 GEO.**

- **Lõi:** `point/box/polygon/circle` + GiST/SP-GiST [S9]; `cube`/`earthdistance`.
- **PostGIS:**
  - `geometry` (mặt phẳng) vs `geography` (spheroid mặc định, mét, chỉ SRID địa lý; mặc định 4326); geometry không SRID là 0.
  - Index chỉ chứa **bounding box**.
  - GiST là R-tree trên GiST, đa năng nhất. BRIN nhỏ, cần dữ liệu đã sắp, không kNN. SP-GiST cho quad/k-d [S18].
- **KNN `<->` của PostGIS** [S73]:
  - chỉ dùng **GiST** 2D;
  - chỉ trong `ORDER BY`;
  - một phía phải là **hằng**;
  - KNN thật từ 2.2.0; geography tính trên cầu (không spheroid).
- **Đo:** SP-GiST không được chọn cho KNN, khớp với [S73].

**P10 FTS, trigram, jsonb.**

- **GIN là kiểu index FTS được khuyên dùng:** inverted, không lưu trọng số nên truy vấn có trọng số phải recheck.
- **GiST lossy:** chữ ký `siglen` mặc định 124 byte, tối đa 2024; build GIN nhanh hơn khi tăng `maintenance_work_mem` [S72].
- `jsonb_ops` vs `jsonb_path_ops` [S13].
- `pg_trgm` có cả GIN và GiST (đo).

**P11 pgvector 0.8.7** [S74], README ở tag `v0.8.7`:

- **Index tối đa:** `vector` 2 000 chiều, `halfvec` 4 000, `bit` 64 000, `sparsevec` 1 000 phần tử khác 0. Giới hạn lưu 16 000 chiều chỉ thấy ở README `master`, chưa đối chiếu với 0.8.7.
- **HNSW:** `m` 16, `ef_construction` 64, `hnsw.ef_search` 40.
- **IVFFlat:** `lists` ≈ rows/1000 (≤ 1M dòng) hoặc √rows; `probes` 1, nên bắt đầu ở √lists.
- **Toán tử:** `<-> <#> <=> <+> <~> <%>`.
- **Lọc:** WHERE áp **sau** index. Iterative scan từ 0.8.0 (`hnsw.iterative_scan`, `hnsw.max_scan_tuples`).

**P12 Planner, thống kê, partitioning.**

- **Hằng số chi phí** [S62]:

  | Hằng số | Mặc định |
  |---|---|
  | `seq_page_cost` | 1.0 |
  | `random_page_cost` | 4.0 |
  | `cpu_tuple_cost` | 0.01 |
  | `cpu_index_tuple_cost` | 0.005 |
  | `cpu_operator_cost` | 0.0025 |
  | `effective_cache_size` | 4GB |
  | `default_statistics_target` | 100 |
  | `geqo_threshold` | 12 |
  | `from_collapse_limit` / `join_collapse_limit` | 8 |
  | `plan_cache_mode` | `auto` |

- `reltuples`/`relpages` chỉ cập nhật khi VACUUM/ANALYZE/một số DDL. Extended stats: `dependencies`, `ndistinct`, `mcv` [S10].
- **PG 18** [S12]: bỏ self-join thừa; OR → mảng; Right Semi Join; incremental sort trong merge join; bỏ cột GROUP BY phụ thuộc hàm.
- **Partitioning:** range/list/hash. Pruning lúc plan và lúc chạy (`Subplans Removed`). Index cha "ảo". UNIQUE/PK phải chứa mọi cột khóa partition [S16].

**P13 Lock và isolation.**

- **8 lock mode cấp bảng:**

  | Lock mode | Ai lấy |
  |---|---|
  | `ACCESS SHARE` | SELECT |
  | `ROW SHARE` | SELECT … FOR … |
  | `ROW EXCLUSIVE` | INSERT/UPDATE/DELETE/MERGE |
  | `SHARE UPDATE EXCLUSIVE` | VACUUM, ANALYZE, CIC |
  | `SHARE` | CREATE INDEX |
  | `SHARE ROW EXCLUSIVE` | CREATE TRIGGER |
  | `EXCLUSIVE` | REFRESH MV CONCURRENTLY |
  | `ACCESS EXCLUSIVE` | DROP/TRUNCATE/VACUUM FULL… |

  Chỉ `ACCESS EXCLUSIVE` chặn SELECT thường.
- **4 khóa dòng:** `FOR UPDATE` > `FOR NO KEY UPDATE` > `FOR SHARE` > `FOR KEY SHARE`.
- **Deadlock:** tự phát hiện và hủy một bên. Phòng bằng thứ tự khóa nhất quán.
- **Advisory lock:** cấp phiên hoặc cấp giao dịch. Bẫy `LIMIT` [S60]. `deadlock_timeout` mặc định (chưa đối chiếu).
- **Isolation:**
  - Read Uncommitted chạy như Read Committed. Read Committed là mặc định: snapshot mỗi câu.
  - Repeatable Read = snapshot isolation, có thể báo *could not serialize access due to concurrent update*.
  - Serializable = **SSI**, lỗi `40001`, phải retry.
  - Predicate lock `SIReadLock` không chặn và không gây deadlock; seq scan lấy predicate lock cấp quan hệ; `READ ONLY DEFERRABLE` [S61].

**P14 Replication và logical decoding.**

- **Streaming:** standby replay WAL; mặc định bất đồng bộ (trễ thường < 1 s).
- **Đồng bộ:** `synchronous_standby_names` (`FIRST n` / `ANY n`) với `synchronous_commit` (`remote_write`, `on`, `remote_apply`). Hot standby. Slot vật lý giữ WAL, giới hạn bằng `max_slot_wal_keep_size` [S67].
- **Logical decoding:** slot mỗi database, tên duy nhất toàn cluster, bền qua crash; chỉ lưu vị trí lúc checkpoint nên **có thể gửi lặp**; mỗi lúc chỉ một receiver.
- **Slot bị bỏ quên** giữ WAL và catalog, cực đoan thì dẫn tới wraparound. Có exported snapshot, đồng bộ slot cho failover [S66]. Plugin `test_decoding`/`pgoutput` (chưa đối chiếu).

**P15 Parallel query và JIT.**

- **Parallel:** `Gather`/`Gather Merge`, leader cũng làm việc.
  - Mặc định: `max_parallel_workers_per_gather` 2, `max_parallel_workers` 8, `max_worker_processes` 8 [S64][S65].
  - Khi nào **không** song song: mục 15.2 (chưa đối chiếu).
- **JIT** cần build có LLVM.
  - Các mốc chi phí: `jit_above_cost` 100000; `jit_inline_above_cost` và `jit_optimize_above_cost` cùng 500000 [S62][S63].
  - EXPLAIN in `JIT: Inlining/Optimization/Expressions/Deforming` [S63].

**P16 RLS và bảo mật.**

- Bật RLS mà không có policy thì **từ chối hết**.
- `USING` (dòng thấy được) vs `WITH CHECK` (dòng ghi được). Chỉ `USING` thì nó cũng làm `WITH CHECK`.
- Permissive gộp `OR`, restrictive gộp `AND`.
- Chủ bảng bỏ qua RLS trừ khi `FORCE`. Superuser và `BYPASSRLS` luôn bỏ qua. Kiểm tra ràng buộc (unique, FK) cũng bỏ qua RLS.
- `row_security = off` báo lỗi chứ không bỏ qua [S68].

**P17 Tinh chỉnh và giám sát.**

- Mặc định: `shared_buffers` 128MB, `work_mem` 4MB, `maintenance_work_mem` 64MB [S65].
- Giám sát: `pg_stat_statements`, `pg_stat_user_tables` (cần flush, đo).

---

## 4. MongoDB: thang L1 → L5

Runtime: **mingo** cho truy vấn, update, aggregation. Index, explain, replication, sharding không có trong trình duyệt.

### 4.1 L1 Người mới: "Tài liệu và CRUD"

- **Ước lượng:** 10 bài, **10 H**.
- **Mục tiêu:**
  - mô hình tài liệu, kiểu BSON (ObjectId, Date, Decimal128…: chưa đối chiếu trang `bson-types`);
  - giới hạn 16 MiB và 100 tầng lồng [S40];
  - `insertOne/Many`, `find` + projection, `updateOne/Many` (`$set`, `$inc`, `$push`, `$addToSet`, `$pull`, upsert), `deleteMany`;
  - toán tử truy vấn (`$eq/$gt/$in/$exists/$type/$regex/$elemMatch`, dot notation, truy vấn mảng);
  - `sort/limit/skip`, `countDocuments`;
  - thao tác trên **một** tài liệu luôn atomic [S48].

### 4.2 L2 Thực hành: "Biến đổi dữ liệu"

- **Ước lượng:** 14 bài, 12 H + 2 D.
- **Mục tiêu:**
  - update operator đủ bộ (positional `$`, `arrayFilters`: chưa đối chiếu);
  - **pipeline update** (`$set/$addFields`, `$unset/$project`, `$replaceRoot/$replaceWith`, `$$NOW`, bẫy `$literal`) [S89];
  - aggregation: `$match/$project/$group/$sort/$limit/$unwind/$lookup/$facet/$bucket/$setWindowFields` (mingo chạy được, đo trong spike);
  - nhúng vs tham chiếu;
  - schema validation `$jsonSchema`: mặc định từ chối tài liệu sai, có thể chỉ cảnh báo [S88]. Mức `strict/moderate` và hành động `error/warn` chưa đối chiếu ở trang con.
- **D (2):** `$merge`/`$out` và validation level, nếu mingo không làm được (chưa kiểm).

### 4.3 L3 Hiệu năng: "Index, explain, planner"

- **Ước lượng:** 12 bài, **0 H + 12 D** (explain ghi sẵn từ mongod thật, hoặc planner mô phỏng theo luật có ghi rõ "mô phỏng").
- **Mục tiêu:**
  - `_id` unique, không xóa được; index là B-tree [S30]; tối đa 64 index, 32 trường mỗi compound [S40];
  - **ESR**: `$ne/$nin/$regex` là range; `$in` + sort < 201 phần tử thì như equality (`SORT_MERGE`) [S41];
  - **multikey**: tối đa một trường mảng mỗi tài liệu trong compound; cover chỉ khi không trả mảng và không `$elemMatch` [S42];
  - **covered query**: `IXSCAN` không nằm dưới `FETCH` [S76];
  - **partial**: tập toán tử; truy vấn phải chứa điều kiện lọc; không kết hợp với `sparse`; unique chỉ áp lên tài liệu được index [S77];
  - **sparse, hidden**: chưa đối chiếu;
  - **TTL**: luồng nền 60 s, chỉ date, không compound, không `_id` [S45];
  - **wildcard** `$**`: sparse, không `$text` [S43];
  - **text**: một index mỗi collection; docs khuyên dùng MongoDB Search thay thế [S78];
  - **2dsphere/2d** [S44];
  - **hashed**: dùng cho sharding, không mảng, không unique, cắt số thực về int 64, không cover [S79];
  - **explain**: `queryPlanner/executionStats/allPlansExecution`; `nReturned`, `totalKeysExamined`, `totalDocsExamined`; stage `COLLSCAN/IXSCAN/FETCH/SORT/EXPRESS_*` [S76];
  - **planner**: multi-planner + CBR dự phòng từ 8.3; plan cache Missing → Inactive → Active; DDL xóa cache; `setQuerySettings` thay index filter [S46];
  - **tối ưu aggregation**: dời `$match` lên trước; gộp `$sort+$limit`; gộp `$lookup+$unwind`; stage nào dùng được index [S75]. Giới hạn 100 MB mỗi stage, `allowDiskUse`, 1000 stage [S80].
- **BE:** mongod thật (Python + pymongo) biến cả 12 bài thành H.

### 4.4 L4 Nhất quán, giao dịch, mẫu thiết kế

- **Ước lượng:** 12 bài, 5 H + 7 D.
- **H (5):**
  - 6 pattern chính thức: Computed, Group Data, Polymorphic, Schema Versioning, Archive, Single Collection [S47];
  - di chuyển schema theo phiên bản.
- **D (7):**
  - write concern (`w`, `j`, `wtimeout`; mặc định ngầm `w: majority`, ngoại lệ khi có arbiter) [S82];
  - read concern (`local` mặc định, `available`, `majority`, `linearizable`, `snapshot`) [S83];
  - read preference (chưa đối chiếu);
  - causal consistency: 4 đảm bảo, chỉ đủ cả 4 khi dùng `majority` + `majority` [S81];
  - transaction đa tài liệu (replica set FCV 4.0, sharded 4.2; `snapshot` + `majority`; giới hạn 60 s) [S48][S40];
  - change streams (cần replica set; chỉ thay đổi đã majority-commit; resume token `resumeAfter`/`startAfter`; `updateLookup`; pre/post image từ 6.0) [S84];
  - TTL đang chạy.
- **BE:** replica set thật (ít nhất một nút ở chế độ replica set) cho transaction và change streams.

### 4.5 L5 Bên trong và phân tán

- **Ước lượng:** 12 bài, **0 H + 12 D**.
- **Mục tiêu:**
  - **WiredTiger:** document-level concurrency, xung đột thì retry, snapshot, checkpoint 60 s, journal snappy, nén snappy/prefix/zstd, cache max(50%(RAM−1GB), 256MB) [S31];
  - **replication và election:** `electionTimeoutMillis` 10 s, trung vị ~12 s, heartbeat 2 s, 50 thành viên / 7 phiếu, priority, rollback [S85];
  - **sharding:** shard key (cardinality, frequency, monotonic → hashed), scatter-gather, `reshardCollection` (5.0), `refineCollectionShardKey`, `analyzeShardKey` (7.0) [S86]; chunk và balancer (chưa đối chiếu);
  - **time series:** `timeField`/`metaField`, bucket, định dạng cột, index tự tạo trên meta+time, giới hạn update [S87];
  - **chỉ đọc:** Atlas Search, Vector Search [S78].
- **BE:** replica set cần 3 tiến trình; sharding cần config server + mongos + shard. Nặng cho backend Python học tập, nên giữ D kể cả khi có backend, trừ election/oplog.

---

## 5. DynamoDB: thang L1 → L5

Runtime: **@dynoxide/wasm-engine**. Giữ mỗi bài ≤ 1–2k item vì nạp ~1 ms/item (spike).

### 5.1 L1 Người mới: "Bảng, item, khóa"

- **Ước lượng:** 9 bài, **9 H**.
- **Mục tiêu:**
  - mô hình tư duy (truy vấn theo khóa, không JOIN);
  - item tối đa **400 KB, tính cả tên thuộc tính**;
  - PK 1–2048 B, SK 1–1024 B; lồng 32 tầng [S50];
  - khóa đơn vs kép; hash(PK) → partition, item collection sắp theo SK [S51];
  - `PutItem/GetItem/UpdateItem` (upsert)/`DeleteItem`, `ReturnValues` [S96];
  - Query vs Scan; 1 MB mỗi lần; phân trang bằng `LastEvaluatedKey` [S50];
  - `ProjectionExpression`.

### 5.2 L2 Thực hành: "Biểu thức và chi phí"

- **Ước lượng:** 12 bài, 11 H + 1 D.
- **Mục tiêu:**
  - `KeyConditionExpression`; `FilterExpression` lọc **sau** khi đọc (spike: `Count 20, ScannedCount 1000`);
  - `UpdateExpression` SET/REMOVE/ADD/DELETE; alias từ dành riêng;
  - giới hạn biểu thức: 4 KB, 300 toán tử, `IN` 100 [S50];
  - **conditional write:** chống lost update; `ConditionalCheckFailedException`; `ReturnValuesOnConditionCheckFailure`; **vẫn tốn WCU khi điều kiện sai**; idempotent nếu kiểm đúng thuộc tính đang sửa [S96];
  - atomic counter không idempotent [S96];
  - batch: Get 100 / 16 MB, Write 25 / 16 MB, không có Update [S50][S96];
  - **PartiQL**: `ExecuteStatement`, batch, transaction (DynamoDB chỉ hỗ trợ một tập con) [S93];
  - **tính cỡ item:** chuỗi = byte tên + byte UTF-8; số ≈ tên + 1 B mỗi 2 chữ số + 1; List/Map +3 B và +1 B mỗi phần tử; lưu trữ +100 B mỗi item [S94];
  - **RCU/WCU:** 1 RCU = 1 strong hoặc 2 eventual/s cho ≤ 4 KB; 1 WCU = 1 KB [S50]; dynoxide trả `ConsumedCapacity`.
- **D:** eventual vs strong. Emulator một nút không cho thấy đọc cũ [S53].

### 5.3 L3 Mô hình: "Access pattern trước, khóa sau"

- **Ước lượng:** 12 bài, 11 H + 1 D.
- **Mục tiêu:**
  - **LSI vs GSI** [S54]:
    - GSI: khóa tùy ý, thêm/xóa lúc nào cũng được, **chỉ eventual**, throughput riêng, chỉ đọc thuộc tính đã project;
    - LSI: chỉ tạo cùng bảng, **10 GB** mỗi PK, strong được;
    - 5 LSI, 20 GSI, 100 thuộc tính `INCLUDE` [S49].
  - Projection `KEYS_ONLY/INCLUDE/ALL`; sparse index (chưa đối chiếu ở `bp-indexes-general-sparse`).
  - **Access-pattern-first**, ít bảng nhất có thể, giữ dữ liệu liên quan cạnh nhau, dùng thứ tự sort, rải tải [S55].
  - Single-table design.
  - **Sort key phân cấp** `country#region#…`; phiên bản `v0_` [S92].
  - **Adjacency list** (nhiều-nhiều) + GSI đảo ngược; materialized graph, GSI overloading [S95].
- **D:** độ trễ lan truyền của GSI.

### 5.4 L4 Quy mô và giao dịch

- **Ước lượng:** 12 bài, 4 H + 8 D.
- **H (4):**
  - write sharding hậu tố ngẫu nhiên vs hậu tố tính được, và giá phải trả khi đọc [S91];
  - PartiQL `ExecuteTransaction`;
  - bài tính chi phí giao dịch (×2) [S50].
- **D (8):**
  - partition: throttle khi > **3000 đọc / 1000 ghi** mỗi partition;
  - adaptive capacity (tăng ngay, cô lập item nóng, không tách collection khi có LSI);
  - burst 300 s [S52];
  - hot partition;
  - `TransactWriteItems`/`TransactGetItems`: ≤ 100 item, 4 MB, không hai hành động trên một item, prepare + commit, token 10 phút, serializable vs read-committed, không xuyên Region [S56][S50]; dynoxide không hỗ trợ;
  - capacity mode: **on-demand là mặc định và được khuyên dùng**; provisioned + auto scaling [S90];
  - quota: 40k RCU/WCU mỗi bảng [S49].
- **BE?** Throttle và adaptive capacity chỉ có trên DynamoDB thật. Backend Python không tái tạo trung thực được (nhận định). `TransactWriteItems` có thể có trong emulator khác (DynamoDB Local, moto: chưa kiểm). Vì vậy **pending** đúng như user cho phép.

### 5.5 L5 Sự kiện và vận hành

- **Ước lượng:** 8 bài, **0 H + 8 D**. Nếu dynoxide có Streams/TTL thì 2 bài đầu thành H (chưa kiểm).
- **Mục tiêu:**
  - **Streams:** giữ 24 h; mỗi record đúng một lần; thứ tự **theo item**; 4 view type; một shard ứng với một partition; ≤ 2 reader mỗi shard [S57];
  - **TTL:** epoch giây; xóa "trong vòng vài ngày"; **không tốn WCU**; hiện trong stream như service deletion; phải lọc item đã hết hạn [S58];
  - **global tables** MREC/MRSC [S53];
  - vector index (5 mỗi bảng, 4096 chiều) [S49];
  - PITR/backup, DAX (chỉ đọc).

---

## 6. Kết luận theo engine

Tính theo số bài ước lượng ở §3–§5. H gồm cả H-B, tức cần request worker mới.

| Engine | Tổng bài | H (trình duyệt) | D (sơ đồ/đọc/ghi sẵn) | Trong D, thành H nếu có backend Python | Kết luận |
|---|---|---|---|---|---|
| **PostgreSQL** | 66 (+3 tùy chọn) | **51 (77 %)** | 15 (23 %) | ~11 (17 %): isolation, SSI, khóa dòng, deadlock, parallel, JIT, CIC, replication, logical decoding, failover, autovacuum | **GO đầy đủ L1–L5 trong trình duyệt.** L3/L5 cần request kịch bản mới (H-B). Phần đồng thời là sơ đồ cho tới khi có backend |
| **MongoDB** | 60 | **27 (45 %)** | 33 (55 %) | ~27 (45 %): toàn bộ L3, L4 phần concern/transaction/change stream, L5 phần replication/WiredTiger | **GO L1–L2 (và pattern ở L4).** L3 hiệu năng là bài đọc + explain ghi sẵn: đây là lỗ lớn nhất, chỉ backend mongod mới vá được. Sharding vẫn là sơ đồ dù có backend |
| **DynamoDB** | 53 | **35 (66 %)** | 18 (34 %) | ít: emulator khác có thể thêm `TransactWriteItems`; throttle/adaptive/global tables chỉ có trên AWS thật | **GO L1–L3 với dynoxide.** L4–L5 phần lớn là đọc. **Pending** `TransactWriteItems` và Streams/TTL cho tới khi kiểm dynoxide hoặc có backend |

---

## 7. Khoảng trống, rủi ro, chỗ phải sửa

### 7.1 Sửa trong `product-design-db-engine.md`

| Chỗ | Đang ghi | Đúng (đo/nguồn) |
|---|---|---|
| §0, §4.1: `pg_overexplain` có trong gói | có | có tarball, **không có wrapper chính thức**; tự viết wrapper thì chạy (đo) |
| §0, §2.2 mô-đun 8, §4.1 E-S2: "không có pgvector, PostGIS" | không có | **có** qua gói riêng ghim `0.0.17` / `0.2.16` (đo). pgvector ~50 KB (trong trần D-E6); PostGIS ~20 MB (**vượt** trần) |
| §2.2 mô-đun 1–2, 4–6: "cần spike E-S1" | chờ | các extension inspect chạy trong PGlite **Node** (đo). Còn phải đo trong Web Worker trình duyệt |
| §2.2 mô-đun 2 | "Postgres 17/18" | PGlite 0.5.16 = **18.6** |
| §2.3 MySQL, §2.6 MariaDB | track MySQL | **user bỏ MySQL/MariaDB** (2026-11-20) |

### 7.2 Khoảng trống lớn nhất

1. **Đồng thời ở cả ba engine là D.**
   - PGlite một backend.
   - mingo không có replica set.
   - dynoxide một nút, không throttle.

   Đây là phần "bên trong" khó và dễ dạy sai nhất. Cần hoạt hình làm cẩn thận, kèm output ghi sẵn từ server thật có ghi phiên bản.
2. **MongoDB L3 không có runtime:** không index, không explain. Chỉ backend Python + mongod thật mới vá được.
3. **Request H-B cho Postgres:** VACUUM, UPDATE rồi soi trang, flush stats. Việc này đụng luật "một câu, `BEGIN … ROLLBACK`" của `runSandboxed`.
4. **Nạp extension lúc tạo PGlite:** cần chọn giữa nạp mọi contrib nhỏ (< 100 KB) hay tạo một PGlite riêng cho khu Engine. Spike nhỏ thêm: PGlite có khởi động được với `wal_level = logical` không (mở khóa P14 logical decoding).
5. **Chưa kiểm ở runtime NoSQL:**
   - mingo: `$jsonSchema`, `$merge/$out`;
   - dynoxide: Streams, TTL, `TransactGetItems`.
6. **Chưa đối chiếu:**
   - Postgres: tên phương thức nén TOAST, cỡ segment WAL mặc định, `deadlock_timeout`, điều kiện parallel (15.2), pageinspect cho SP-GiST, plugin logical;
   - MongoDB: kiểu BSON, positional/`arrayFilters`, sparse/hidden index, validation level/action, read preference, chunk/balancer;
   - DynamoDB: sparse index.
7. **Nguồn trôi:**
   - MongoDB manual đã nói tới 8.3 (CBR, 2dsphere v4) và 9.0 (time series một namespace, `$match` dời trước `$lookup`);
   - DynamoDB vừa thêm vector index và bulk put.

   Mỗi bài cần dòng "đúng với phiên bản X, kiểm ngày Y".

---

## 8. Nguồn

Đã mở đọc ngày 2026-11-20, trừ chỗ ghi "chưa mở".

**PGlite và runtime**

- [S1] PGlite Extensions: https://pglite.dev/extensions/
- [S97] mingo (npm, 7.2.7): https://www.npmjs.com/package/mingo
- [S98] @dynoxide/wasm-engine (npm, 1.7.0): https://www.npmjs.com/package/@dynoxide/wasm-engine · https://dynoxide.dev
- Số đo runtime NoSQL: `docs/team/spike-nosql-browser.md` (repo này).

**PostgreSQL 18**

- [S2] Page Layout: https://www.postgresql.org/docs/18/storage-page-layout.html
- [S3] TOAST: https://www.postgresql.org/docs/18/storage-toast.html
- [S4] HOT: https://www.postgresql.org/docs/18/storage-hot.html
- [S5] Routine Vacuuming: https://www.postgresql.org/docs/18/routine-vacuuming.html
- [S6] Index-Only Scans: https://www.postgresql.org/docs/18/indexes-index-only-scans.html
- [S7] B-Tree: https://www.postgresql.org/docs/18/btree.html
- [S8] WAL intro: https://www.postgresql.org/docs/18/wal-intro.html
- [S9] Index Types: https://www.postgresql.org/docs/18/indexes-types.html
- [S10] Planner Statistics: https://www.postgresql.org/docs/18/planner-stats.html
- [S12] Release 18: https://www.postgresql.org/docs/18/release-18.html
- [S13] GIN: https://www.postgresql.org/docs/18/gin.html
- [S14] BRIN: https://www.postgresql.org/docs/18/brin.html
- [S15] bloom: https://www.postgresql.org/docs/18/bloom.html
- [S16] Partitioning: https://www.postgresql.org/docs/18/ddl-partitioning.html
- [S60] Explicit Locking: https://www.postgresql.org/docs/18/explicit-locking.html
- [S61] Transaction Isolation: https://www.postgresql.org/docs/18/transaction-iso.html
- [S62] Query Planning config: https://www.postgresql.org/docs/18/runtime-config-query.html
- [S63] JIT decision: https://www.postgresql.org/docs/18/jit-decision.html
- [S64] Parallel Query: https://www.postgresql.org/docs/18/how-parallel-query-works.html
- [S65] Resource Consumption config: https://www.postgresql.org/docs/18/runtime-config-resource.html
- [S66] Logical Decoding concepts: https://www.postgresql.org/docs/18/logicaldecoding-explanation.html
- [S67] Log-Shipping Standby / Streaming Replication: https://www.postgresql.org/docs/18/warm-standby.html
- [S68] Row Security Policies: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
- [S69] WAL Configuration: https://www.postgresql.org/docs/18/wal-configuration.html
- [S70] CREATE INDEX: https://www.postgresql.org/docs/18/sql-createindex.html
- [S71] Multicolumn Indexes: https://www.postgresql.org/docs/18/indexes-multicolumn.html
- [S72] Text Search Indexes: https://www.postgresql.org/docs/18/textsearch-indexes.html

**PostGIS, pgvector**

- [S18] PostGIS Data Management: https://postgis.net/docs/using_postgis_dbmanagement.html
- [S73] PostGIS `<->`: https://postgis.net/docs/geometry_distance_knn.html
- [S74] pgvector README tại tag v0.8.7: https://github.com/pgvector/pgvector/blob/v0.8.7/README.md

**MongoDB**

- [S30] Indexes: https://www.mongodb.com/docs/manual/indexes/
- [S31] WiredTiger: https://www.mongodb.com/docs/manual/core/wiredtiger/
- [S40] Limits: https://www.mongodb.com/docs/manual/reference/limits/
- [S41] ESR: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- [S42] Multikey: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
- [S43] Wildcard: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/
- [S44] 2dsphere: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- [S45] TTL: https://www.mongodb.com/docs/manual/core/index-ttl/
- [S46] Query Plans: https://www.mongodb.com/docs/manual/core/query-plans/
- [S47] Schema Design Patterns: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/
- [S48] Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- [S75] Aggregation Optimization: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- [S76] Explain Results: https://www.mongodb.com/docs/manual/reference/explain-results/
- [S77] Partial Indexes: https://www.mongodb.com/docs/manual/core/index-partial/
- [S78] Text Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- [S79] Hashed Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/
- [S80] Aggregation Limits: https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/
- [S81] Causal Consistency: https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
- [S82] Write Concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- [S83] Read Concern: https://www.mongodb.com/docs/manual/reference/read-concern/
- [S84] Change Streams: https://www.mongodb.com/docs/manual/changeStreams/
- [S85] Replica Set Elections: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- [S86] Choose a Shard Key: https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
- [S87] Time Series: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- [S88] Schema Validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- [S89] Updates with Aggregation Pipeline: https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/

**DynamoDB**

- [S49] Service Quotas: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- [S50] Constraints: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- [S51] Partitions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
- [S52] Burst and Adaptive Capacity: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
- [S53] Read Consistency: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- [S54] Secondary Indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
- [S55] NoSQL Design: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
- [S56] Transactions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- [S57] Streams: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- [S58] TTL: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- [S90] Capacity Modes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
- [S91] Write Sharding: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- [S92] Sort Keys: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
- [S93] PartiQL: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.html
- [S94] Item Sizes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CapacityUnitCalculations.html
- [S95] Adjacency Lists / Graphs: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html
- [S96] Working with Items (conditional writes, counters, batch): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
