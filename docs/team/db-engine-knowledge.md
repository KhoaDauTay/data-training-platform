# Bản đồ kiến thức: khu "Database Engine" (PostgreSQL, MySQL/InnoDB + MariaDB, MongoDB, DynamoDB)

Người viết: agent Research · 2026-11-20 · **Chỉ là tài liệu nghiên cứu**. Không sửa `src/`, `content/`, test hay `decision-log.md`.

Tài liệu này là "danh mục nguồn" mà `product-design-db-engine.md` (R5, §2, §4, spike E-S1/E-S2) chờ. Nó có ba phần:

- **§1:** kết quả đo PGlite 0.5.16 thật. Đây là các số "đo" mà product design cần.
- **§2–§6:** đề cương theo thứ tự phụ thuộc. Mỗi chủ đề có mục tiêu học, sự thật kèm nguồn, mức thực hành trong trình duyệt và phần phải giải thích bằng sơ đồ.
- **§7–§8:** khoảng trống, chỗ phải sửa trong product design, và danh sách nguồn.

**Quy ước:**

- `[Sn]` trỏ tới §8. Mọi số liệu đều dẫn nguồn chính thức (docs, README, mã nguồn) và đã được mở đọc ngày 2026-11-20.
- Câu có nhãn **(chưa đối chiếu)** là kiến thức chung chưa mở nguồn. Phải kiểm tra trước khi viết vào bài.
- **(đo)** là kết quả chạy thật trên máy này, PGlite 0.5.16 trong Node 24.

**Phiên bản được mô tả:**

| Engine | Phiên bản |
|---|---|
| PostgreSQL | 18 (PGlite 0.5.16 = **PostgreSQL 18.6**, đo) |
| MySQL | 8.4 LTS |
| MariaDB | 11.x (KB hiện hành) |
| MongoDB | Manual hiện hành (8.x) |
| DynamoDB | Developer Guide hiện hành |

Prose tiếng Việt, thuật ngữ giữ tiếng Anh.

---

## 0. Tóm tắt một trang

| Engine | Mô-đun (thứ tự phụ thuộc) | Chạy thật trong trình duyệt |
|---|---|---|
| **Nền chung (C)** | C1 Phân cấp lưu trữ, trang · C2 Cây B/B+ · C3 Log trước, phục hồi · C4 Đồng thời: khóa vs MVCC · C5 Cost model, thống kê | Chỉ sơ đồ + ví dụ PGlite |
| **PostgreSQL (P)** | P1 Từ SQL tới đĩa · P2 Heap, trang, TOAST · P3 MVCC · P4 VACUUM, HOT, freeze, visibility map · P5 WAL, buffer · P6 B-tree sâu · P7 Các loại index khác · P8 Index nâng cao (partial, expression, unique, concurrent, index-only) · P9 GEO (PostGIS) · P10 Full-text, trigram, jsonb · P11 Vector (pgvector) · P12 Thống kê, planner, partitioning | **Có**, rất sâu: `pageinspect`, `pg_visibility`, `amcheck`, `pg_walinspect`, `pg_buffercache`, `pg_freespacemap`, `bloom`, `btree_gin/gist`, `pg_trgm`, `pg_stat_statements` (đo); PostGIS 3.6.2 và pgvector 0.8.7 qua **gói riêng** (đo) |
| **MySQL/InnoDB (M)** + MariaDB | M1 Server layer vs storage engine · M2 Clustered PK B+tree, secondary index · M3 Trang, fill, merge · M4 Undo, MVCC, purge · M5 Redo, doublewrite · M6 Khóa record/gap/next-key · M7 AHI, covering, invisible/descending · M8 FULLTEXT, SPATIAL · M9 EXPLAIN / optimizer · M10 MariaDB khác ở đâu | **Không** (không có engine WASM đã kiểm chứng). Sơ đồ + `EXPLAIN` ghi sẵn |
| **MongoDB (G)** | G1 Document model, BSON · G2 WiredTiger · G3 Index cơ bản + ESR · G4 Multikey, wildcard, text, geo, hashed · G5 Thuộc tính index (unique, partial, sparse, TTL, hidden) · G6 Planner, explain · G7 Aggregation · G8 Schema design patterns · G9 Transactions | Chờ spike (mingo không có index/planner) |
| **DynamoDB (D)** | D1 Bảng, item, khóa · D2 Partition, adaptive capacity · D3 Đọc/ghi, consistency, capacity unit · D4 Query vs Scan, biểu thức · D5 LSI/GSI, projection · D6 Access-pattern-first, single-table · D7 Conditional write, transactions · D8 Streams, TTL | Chỉ mô phỏng tự viết |

**Ba phát hiện chính (đo):**

1. PGlite 0.5.16 cho **quan sát bên trong thật**: line pointer, HOT redirect, `xmin/xmax`, B-tree meta, visibility map, WAL record, `Buffers:` trong EXPLAIN, `Heap Fetches: 0`. Không cần mô phỏng cho phần lớn track Postgres.
2. **pgvector và PostGIS có cho PGlite**, khác với điều `product-design-db-engine.md` §0/§2.2/§4.1 đang ghi. Gói pgvector nặng ~50 KB nén, PostGIS ~20 MB.
3. **`pg_overexplain` không dùng được** dù có tarball. Product design §0 đang liệt kê nó là "có".

---

## 1. PGlite 0.5.16 thật sự có gì (đo, 2026-11-20)

### 1.1 Cách đo

- **Script tạm**, đã xóa sau khi đo: tạo `PGlite.create({ extensions })`, `CREATE EXTENSION`, rồi gọi **một hàm thật** của từng extension.
- **`version()`:** `PostgreSQL 18.6 (PGlite 0.5.16) on wasm32-unknown-emscripten … 32-bit`.
- **Thiết lập đọc được:**
  - `block_size` = 8192, `shared_buffers` = 128MB;
  - `wal_level` = replica, `autovacuum` = on, `max_parallel_workers_per_gather` = 0;
  - `pg_stat_activity` chỉ có **1** dòng, `backend_type` = `standalone backend`.
- **Danh sách extension trên site PGlite:** [S1]. Danh sách tarball đọc trực tiếp từ `node_modules/@electric-sql/pglite/dist`.

### 1.2 Bảng extension

Cột "Gọi thử" là một lệnh thật đã chạy và có kết quả. Kích thước là kích thước tarball `.tar.gz`, đọc bằng `stat`.

| Extension | Đường import | Cỡ tarball | Gọi thử (đo) | Dùng cho mô-đun |
|---|---|---|---|---|
| `pageinspect` | `@electric-sql/pglite/contrib/pageinspect` | 16 KB | `heap_page_items(get_raw_page('t',0))`, `bt_metap`, `bt_page_items`, `brin_page_items` | P2, P3, P4, P6, P7 |
| `pg_visibility` | `…/contrib/pg_visibility` | 4.5 KB | `pg_visibility_map('t')` → `all_visible`/`all_frozen` theo block | P4, P8 |
| `amcheck` | `…/contrib/amcheck` | 21 KB | `bt_index_check('t_pkey')` | P6 |
| `pg_walinspect` | `…/contrib/pg_walinspect` | 4.6 KB | `pg_get_wal_records_info(lsn1, lsn2)` → `resource_manager`, `record_type`, `fpi_length`, `block_ref` | P5 |
| `pg_buffercache` | `…/contrib/pg_buffercache` | 4.5 KB | `count(*)` = 16384 buffer (128 MB / 8 KB) | P1, P5 |
| `pg_freespacemap` | `…/contrib/pg_freespacemap` | 1.6 KB | `pg_freespace('t')` → byte trống mỗi trang | P2, P4 |
| `bloom` | `…/contrib/bloom` | 5.4 KB | `CREATE INDEX … USING bloom` | P7 |
| `btree_gin` / `btree_gist` | `…/contrib/btree_gin`, `…/btree_gist` | 5.4 / 22 KB | `CREATE EXTENSION` | P7 |
| `pg_trgm` | `…/contrib/pg_trgm` | 15 KB | `gin(v gin_trgm_ops)`, `gist(v gist_trgm_ops)` | P10 |
| `pg_stat_statements` | `…/contrib/pg_stat_statements` | (có) | `calls`, `query` được ghi **mà không cần preload** | P12 |
| `cube`, `earthdistance`, `hstore`, `ltree`, `pg_surgery`, `pgcrypto`… | `…/contrib/<tên>` | (có) | `CREATE EXTENSION` OK | P9 (bản nhẹ), phụ |
| **`vector` (pgvector 0.8.7)** | gói riêng `@electric-sql/pglite-pgvector` **@0.0.17** | ~50 KB | HNSW + IVFFlat tạo được; `ORDER BY e <-> … LIMIT 5` → `Index Scan … Order By` | P11 |
| **`postgis` (3.6.2, GEOS 3.14, PROJ 9.7)** | gói riêng `@electric-sql/pglite-postgis` **@0.2.16** | **~20 MB** | geography + GiST: `ST_DWithin` → `Index Cond: (g && _st_expand(…))`; geometry + GiST KNN `<->` → `Index Scan … Order By` | P9 |
| `pg_overexplain` | tarball có, **không** có `contrib/pg_overexplain.js` | – | `LOAD 'pg_overexplain'` → *could not access file* | **không dùng được** |

**Ghi chú về phiên bản gói:**

- Bản mới nhất `pglite-pgvector@0.0.18` và `pglite-postgis@0.2.17` có peer `@electric-sql/pglite` = **0.5.17**. Với 0.5.16 phải ghim **0.0.17 / 0.2.16** (`npm view … peerDependencies`, đo).
- Repo ghim PGlite chính xác, nên nâng PGlite thì nâng cặp extension cùng lúc.
- Trang extension cũng ghi PostGIS là "18.8 MB" và còn issue trạng thái #916 [S1].

### 1.3 Quan sát bên trong được gì (đo)

| Hiện tượng | Câu SQL | Kết quả thật |
|---|---|---|
| Tuple cũ/mới sau UPDATE | `heap_page_items` (cùng phiên, trước VACUUM) | `lp 1: t_xmin 752, t_xmax 753, t_ctid (0,84)` → phiên bản mới ở lp 84; `t_infomask2` = 16386 (cờ HOT_UPDATED) |
| HOT chain sau VACUUM | cùng câu, sau `VACUUM t` | `lp 1: lp_flags 2 (REDIRECT), lp_off 84`, các cột tuple = NULL. Line pointer chuyển hướng, không còn tuple |
| Bộ đếm HOT | `pg_stat_force_next_flush()` rồi `pg_stat_user_tables` | `n_tup_upd 3, n_tup_hot_upd 3, n_dead_tup 3`. **Phải flush trước**, không thì đọc ra 0 |
| Visibility map | `pg_visibility_map('t')` sau VACUUM | `all_visible = true` mọi block, `all_frozen = false` |
| Index-only scan | `EXPLAIN (ANALYZE, BUFFERS) SELECT id …` | `Index Only Scan … Heap Fetches: 0 … Index Searches: 1 … Buffers: shared hit=3` |
| Bitmap scan | `EXPLAIN (ANALYZE, BUFFERS) SELECT * … BETWEEN` | `Bitmap Heap Scan … Heap Blocks: exact=1`, `Bitmap Index Scan` |
| Thống kê | `pg_stats` | `n_distinct -1`, `histogram_bounds {1,20,40,…}` |
| fillfactor | `pg_class.reloptions` | `{fillfactor=70}`; `pg_freespace` thấy ~2.7 KB trống mỗi trang |
| B-tree | `bt_metap('t_pkey')` | `root 3, level 1, allequalimage true` (dedup an toàn) |
| BRIN | `brin_page_items(get_raw_page('t_id_idx',2),'t_id_idx')` | `{1 .. 2000}` cho range block 0 |

### 1.4 Ba mức thực hành

Cột "Thực hành" ở §2–§6 dùng ba mức. Ranh giới mức do **mô hình chạy của game** quyết định, không phải do PGlite: `runSandboxed` chạy một câu trong `BEGIN … ROLLBACK`.

- **A: chạy ngay.** Một câu đọc duy nhất trên một bảng đã seed: catalog, `EXPLAIN`, các hàm đọc của `pageinspect`, `pg_visibility`, `pg_stats`. Điều kiện: extension đã nạp lúc tạo PGlite. Hiện `initEngine` chưa nạp, nên cần thêm `extensions` + `CREATE EXTENSION` vào schema mới.
- **B: cần request kịch bản mới,** giống `lab`/`runLab`. Đó là mọi thứ nhiều bước hoặc phải tồn tại sau câu:
  - `UPDATE` rồi soi trang;
  - `VACUUM` (đo: `VACUUM cannot run inside a transaction block`, SQLSTATE 25001);
  - `pg_stat_force_next_flush()` + đọc bộ đếm;
  - tạo index rồi giữ lại;
  - so WAL trước/sau một ghi.

  Worker chạy một kịch bản cố định do nội dung định nghĩa, tên đối tượng lấy từ hằng số, không lấy từ chữ người chơi. Xong thì dọn (DROP schema hoặc dựng lại).
- **C: chỉ sơ đồ hoặc hoạt hình.**
  - PGlite **một backend** (đo), nên không có hai phiên đồng thời, lock wait, deadlock, `CREATE INDEX CONCURRENTLY` thật, autovacuum worker (đo: `last_autovacuum` NULL, chỉ có `standalone backend`), parallel query (`max_parallel_workers_per_gather = 0`), replication.
  - Toàn bộ MySQL/MariaDB, MongoDB, DynamoDB cũng ở mức C, trừ khi spike tìm được runtime trung thực.

---

## 2. Nền chung (C): học trước mọi engine

Mục tiêu là mô hình tư duy chung, để khi sang engine nào người học chỉ hỏi "engine này chọn khác ở đâu".

| # | Chủ đề | Mục tiêu học (người học làm được) | Sự thật chính | Thực hành |
|---|---|---|---|---|
| C1 | Phân cấp lưu trữ, trang | Giải thích vì sao DB đọc theo **trang** cố định chứ không theo dòng; ước lượng số trang của một bảng | PG trang 8 KB [S2]; InnoDB trang mặc định 16 KB [S20] | A: `pg_relation_size / 8192` = `relpages` (đo: 25 trang cho 2000 dòng, ff 70) |
| C2 | Cây B/B+ | Vẽ cây cho một dãy khóa, chỉ ra nút gốc/nội/lá, split, vì sao chiều cao nhỏ | PG B-tree là Lehman–Yao (chưa đối chiếu, xem `src/backend/access/nbtree/README` [S11]); InnoDB index là B-tree, trừ spatial dùng R-tree [S20]; MongoDB index dùng B-tree [S30] | A: `bt_metap` (level, root) |
| C3 | Ghi log trước | Nói đúng luật WAL: log phải bền trước khi trang dữ liệu được ghi; REDO khi crash | Câu gốc của PG [S8]; WiredTiger journal + checkpoint [S31] | B: `pg_walinspect` trước/sau một `INSERT` |
| C4 | Đồng thời | Phân biệt khóa và đa phiên bản; biết mỗi engine giữ "bản cũ" ở đâu (heap PG, undo InnoDB, snapshot WiredTiger) | [S5][S21][S31] | C (một backend) |
| C5 | Cost model, thống kê | Đọc được "chi phí planner" là đơn vị ước lượng, không phải mili giây; biết thống kê đến từ đâu | [S10] | A: `EXPLAIN`, `pg_stats` |

**Sơ đồ cần có:**

- C1: trang ↔ đĩa ↔ buffer;
- C2: chèn và split theo bước (product design §5.3 đã có wireframe);
- C3: dòng thời gian WAL flush vs page flush khi COMMIT, crash, replay;
- C4: hai giao dịch, ba engine, mỗi engine giữ bản cũ ở một chỗ khác nhau.

---

## 3. PostgreSQL (P): track sâu nhất

Thứ tự phụ thuộc: P1 → P2 → P3 → P4 → P5. Sau đó P6 → P7 → P8. Nhánh song song P9/P10/P11 cần P7. P12 cần P6 + C5.

Chín mô-đun của product design §2.2 ánh xạ như sau:

| Product design §2.2 | Ở đây |
|---|---|
| 1 | P1 |
| 2 | P2 |
| 3 | P3 |
| 4 | P4 |
| 5 | P5 |
| 6 | P6 + P8 |
| 7 | P7 |
| 8 | P9 + P10 + P11 |
| 9 | P12 |

### P1. Từ câu SQL tới đĩa
- **Mục tiêu:** kể đúng parser → rewriter → planner → executor; biết shared buffers là cache trang dùng chung.
- **Sự thật:** trang 8 KB, đổi được lúc biên dịch [S2]. PG 18 có hệ thống I/O bất đồng bộ (`io_method`, `pg_aios`) [S12].
- **Thực hành:** A, `pg_buffercache` đếm buffer của một quan hệ.
- **Sơ đồ:** đường đi của một câu qua bốn tầng.

### P2. Heap, trang, tuple, TOAST, fillfactor
- **Mục tiêu:**
  - đọc một trang bằng `heap_page_items`;
  - giải thích `ctid`, line pointer, `pd_lower/pd_upper`;
  - đoán khi nào một giá trị bị TOAST;
  - chọn fillfactor cho bảng hay UPDATE.
- **Sự thật:**
  - Header trang 24 byte: `pd_lsn`, `pd_checksum`, `pd_lower`, `pd_upper`, `pd_special`, `pd_prune_xid`…
  - ItemId 4 byte.
  - Header tuple cố định 23 byte (`t_xmin`, `t_xmax`, `t_cid`, `t_ctid` 6 byte, `t_infomask2`, `t_infomask`, `t_hoff`) [S2].
  - TOAST bật khi dòng rộng hơn `TOAST_TUPLE_THRESHOLD` (thường 2 kB) và ép tới `TOAST_TUPLE_TARGET` (thường 2 kB, chỉnh được `toast_tuple_target`).
  - Chunk khoảng 2000 byte. Con trỏ TOAST 18 byte. Giá trị tối đa 1 GB.
  - 4 chiến lược `PLAIN | EXTENDED | EXTERNAL | MAIN` [S3]. Phương thức nén qua `default_toast_compression` [S3].
- **Thực hành:**
  - A: `heap_page_items`, `pg_freespace`, `pg_column_size`.
  - B: so trang trước/sau UPDATE.
- **Sơ đồ:** trang 8 KB với line pointer mọc từ đầu, tuple mọc từ cuối. Product design đã có wireframe "Bên trong" vẽ từ kết quả thật.

### P3. MVCC
- **Mục tiêu:**
  - giải thích UPDATE = tuple mới + đánh dấu `xmax` tuple cũ;
  - đọc `xmin/xmax` để biết ai thấy phiên bản nào;
  - nói vì sao reader không chặn writer.
- **Sự thật:**
  - `t_xmin` là XID chèn, `t_xmax` là XID xóa, `t_ctid` trỏ tới phiên bản mới hơn [S2].
  - Đo: sau UPDATE, tuple cũ có `t_xmax 753` và `t_ctid (0,84)`.
- **Thực hành:**
  - A: `SELECT xmin, xmax, ctid, *` (cột hệ thống).
  - B: UPDATE rồi `heap_page_items` trong cùng kịch bản.
  - C: hai phiên đồng thời, snapshot, các mức cô lập.
- **Sơ đồ:** hai giao dịch trên cùng dòng, ai thấy gì theo thời gian.

### P4. VACUUM, HOT, freeze, visibility map
- **Mục tiêu:**
  - kể 4 lý do VACUUM;
  - giải thích HOT (khi nào xảy ra, vì sao fillfactor giúp);
  - đọc visibility map;
  - hiểu wraparound và freeze.
- **Sự thật:**
  - VACUUM để (1) thu hồi chỗ, (2) cập nhật thống kê, (3) cập nhật visibility map, (4) chống wraparound XID/multixact [S5].
  - XID 32 bit, so modulo 2³². Mỗi bảng phải được vacuum ít nhất một lần mỗi ~2 tỉ giao dịch.
  - Cảnh báo khi còn ~40 triệu. Từ chối ghi khi còn < 3 triệu.
  - `autovacuum_freeze_max_age` mặc định 200 triệu [S5].
  - Freeze là một bit cờ từ 9.4, giữ nguyên `xmin` [S5].
  - HOT cần hai điều: (a) UPDATE không đổi cột nào mà index (trừ index summarizing, trong lõi chỉ BRIN) dùng; (b) trang cũ còn đủ chỗ. Giảm fillfactor tăng khả năng HOT [S4].
  - Visibility map nhỏ hơn heap "bốn bậc độ lớn" [S6].
- **Thực hành:**
  - B (bắt buộc, vì `VACUUM` không chạy trong transaction, đo): UPDATE → `heap_page_items` (thấy cờ HOT) → `VACUUM` → `lp_flags = 2` redirect (đo) → `pg_visibility_map`.
  - B: tỉ lệ HOT qua `n_tup_hot_upd` (cần `pg_stat_force_next_flush()`, đo).
  - C: autovacuum, wraparound thật.
- **Sơ đồ:** chuỗi HOT trước/sau prune; đồng hồ XID quay vòng; bit all-visible/all-frozen.

### P5. WAL, checkpoint, buffer
- **Mục tiêu:** đọc một bản ghi WAL; giải thích LSN, `pd_lsn` trên trang, full-page image; vì sao commit chỉ cần fsync WAL.
- **Sự thật:**
  - Luật WAL, REDO, fsync tuần tự, nhiều commit chung một fsync, PITR [S8].
  - `pd_lsn` = byte kế sau bản ghi WAL cuối sửa trang [S2].
  - Checkpoint, full-page writes và cỡ segment **chưa đối chiếu**: trang [S8] không nói. Phải đọc `wal-configuration.html` / `wal-internals.html` trước khi viết số.
- **Thực hành:** B, `pg_current_wal_lsn()` trước/sau một ghi, rồi `pg_get_wal_records_info` (đo: thấy `Heap INSERT+INIT`, `fpi_length`, `blkref`). C: crash và replay.
- **Sơ đồ:** dòng thời gian COMMIT. Câu hỏi sắp thứ tự trong product design §2.2 dùng được.

### P6. B-tree sâu
- **Mục tiêu:**
  - đọc `bt_metap`/`bt_page_items`;
  - giải thích deduplication (posting list) và bottom-up deletion;
  - thiết kế index nhiều cột đúng thứ tự;
  - biết skip scan của PG 18.
- **Sự thật:**
  - **Deduplication:** bật mặc định, gộp bản trùng thành posting list, làm lười khi trang đầy. Tắt bằng `deduplicate_items = off`.
    - Không an toàn cho `numeric`, `jsonb`, `float4/8`, collation không xác định, `char`.
    - Không dùng cho kiểu container và **mọi index có `INCLUDE`** [S7].
    - Đo: `bt_metap.allequalimage = true` trên khóa `int`.
  - **Bottom-up deletion:** từ PG 14, dọn "version churn" khi sắp split [S7].
  - **Skip scan (PG 18):** index nhiều cột dùng được cả khi cột đầu không có điều kiện [S12]. EXPLAIN ANALYZE có thêm số lượt tra index, hiển thị "Index Searches" (đo) [S12].
  - B-tree hỗ trợ `< <= = >= >`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'foo%'` neo đầu [S9].
- **Thực hành:**
  - A: `bt_metap`, `bt_page_items`, `bt_index_check` (amcheck).
  - A: đoán kế hoạch, index lab có sẵn (`runLab`).
- **Sơ đồ:** split trang lá; posting list; skip scan nhảy qua các giá trị cột đầu.

### P7. Các loại index khác

| Loại | Toán tử, mục đích [S9] | Chi tiết |
|---|---|---|
| Hash | chỉ `=`, băm 32 bit | |
| GiST | hạ tầng nhiều chiến lược, hình học 2D (`&&`, `@>`, `<@`, `<<`…) | **KNN `ORDER BY … <-> … LIMIT`** |
| SP-GiST | cây không cân bằng (quadtree, k-d, radix) | KNN với opclass có toán tử thứ tự |
| GIN | inverted index cho giá trị nhiều thành phần | opclass `array_ops`, `jsonb_ops` (thêm `? ?| ?&`), `jsonb_path_ops` (chỉ `@> @? @@`, nhanh hơn), `tsvector_ops`. Pending list `fastupdate` được dọn khi VACUUM/autoanalyze, `gin_clean_pending_list` hoặc vượt `gin_pending_list_limit` [S13]. PG 18 build GIN song song [S12] |
| BRIN | tóm tắt mỗi dải block | opclass minmax, minmax-multi (`values_per_range` mặc định 32), inclusion, bloom (`false_positive_rate` mặc định 0.01). `autosummarize` mặc định off. `brin_summarize_new_values()`. Hiệu quả khi giá trị tương quan với thứ tự vật lý [S14] |
| bloom (contrib) | chỉ `=` | chữ ký mặc định 80 bit, 2 bit mỗi cột; opclass sẵn cho `int4`, `text`; lossy; không UNIQUE, không tìm NULL; hợp bảng nhiều cột lọc tổ hợp tùy ý [S15] |

- **Mục tiêu:** chọn đúng loại index theo toán tử của câu hỏi; biết loại nào lossy (recheck).
- **Thực hành:** A, `CREATE INDEX` mọi loại trên đều chạy (đo) trong lab có sẵn; `brin_page_items` (đo); `EXPLAIN` thấy `Recheck Cond`.

### P8. Index nâng cao: index-only, covering, partial, expression, unique, concurrent
- **Mục tiêu:** biết khi nào có Index Only Scan; dùng `INCLUDE`; viết partial và expression index; hiểu `CONCURRENTLY` đổi gì.
- **Sự thật:**
  - Index-only cần: (1) loại index hỗ trợ (B-tree luôn có; GiST/SP-GiST một số opclass; **GIN không**); (2) câu chỉ dùng cột có trong index.
  - Lợi chỉ khi phần lớn trang heap có bit all-visible.
  - `INCLUDE` chỉ cho B-tree, GiST, SP-GiST. Cột INCLUDE không thuộc khóa unique, không là biểu thức [S6].
  - `CREATE INDEX CONCURRENTLY` không dùng được trên bảng partitioned. Cách làm: `ON ONLY` + build từng partition + `ATTACH` [S16].
  - Partial và expression index: [S17] **(chưa đối chiếu chi tiết)**.
- **Thực hành:**
  - A: `Heap Fetches: 0` (đo), partial/expression qua index lab.
  - B: so `Heap Fetches` trước/sau VACUUM.
  - C: `CONCURRENTLY` (hai pha, chờ giao dịch khác; cần nhiều phiên).
- **Sơ đồ:** index-only scan hỏi visibility map trước khi về heap.

### P9. GEO: kiểu hình học lõi → PostGIS
- **Mục tiêu:**
  - phân biệt `geometry` (mặt phẳng) và `geography` (cầu, mét);
  - hiểu SRID;
  - biết index chỉ chứa **bounding box** (lọc thô, rồi lọc chính xác);
  - viết KNN `<->`;
  - chọn GiST / SP-GiST / BRIN.
- **Sự thật [S18]:**
  - `geography` dùng spheroid mặc định, kết quả hàm đo bằng mét, chỉ nhận SRID địa lý. Không ghi SRID thì geography mặc định 4326, geometry mặc định 0.
  - **GiST** = R-tree trên GiST, đa năng nhất.
  - **BRIN** nhỏ, build nhanh, nhưng chậm hơn khi truy vấn. Cần dữ liệu đã sắp theo không gian, không tự cập nhật, **không hỗ trợ kNN**.
  - **SP-GiST** cho quad-tree/k-d tree, lossy.
- **Đo:**
  - geography + GiST cho `ST_DWithin` thành `Index Cond: (g && _st_expand(...))` + `Filter: st_dwithin(...)`, tức là lọc thô bằng hộp rồi lọc chính xác.
  - geometry + **GiST** cho KNN `<->` thành `Index Scan … Order By`.
  - Cùng câu trên bảng chỉ có **SP-GiST** cho `Seq Scan + Sort` (20k điểm). Phải đọc lại trang PostGIS về KNN cho SP-GiST trước khi dạy SP-GiST làm KNN.
- **Bản nhẹ không cần PostGIS:** kiểu `point/box/polygon/circle` lõi + GiST/SP-GiST + KNN [S9]; `cube` + `earthdistance` (có trong gói, đo).
- **Thực hành:** A với PostGIS **nếu** chấp nhận tải ~20 MB lười (D-E6 product design đặt trần ~3 MB, nên hiện **không đạt**). Mặc định chỉ dùng bản nhẹ.

### P10. Full-text, trigram, jsonb
- **Mục tiêu:** dựng `tsvector`/`tsquery`, xếp hạng; index GIN cho FTS; tìm mờ bằng trigram; chọn `jsonb_ops` hay `jsonb_path_ops`.
- **Sự thật:**
  - `tsvector_ops`, `jsonb_ops` vs `jsonb_path_ops` [S13].
  - Index cho FTS (GIN vs GiST) [S19] **(chưa đối chiếu)**.
  - `pg_trgm` có `gin_trgm_ops` và `gist_trgm_ops` (đo: cả hai tạo được).
- **Thực hành:** A.

### P11. Vector: pgvector
- **Mục tiêu:** hiểu ANN là xấp xỉ; chọn HNSW hay IVFFlat; chỉnh `ef_search`/`probes`; biết bẫy lọc sau index.
- **Sự thật [S24]:**
  - `vector` lưu tới 16 000 chiều, index tới 2 000. `halfvec` index tới 4 000. `bit` index tới 64 000. `sparsevec` HNSW tới 1 000 phần tử khác 0.
  - HNSW mặc định `m = 16`, `ef_construction = 64`, `hnsw.ef_search = 40`.
  - IVFFlat: `lists` ≈ rows/1000 (≤ 1M dòng), `ivfflat.probes` mặc định 1.
  - Toán tử: `<->` L2, `<#>` âm tích vô hướng, `<=>` cosine, `<+>` L1, `<~>` Hamming, `<%>` Jaccard.
  - 0.8.0 thêm iterative scan (`hnsw.iterative_scan`, `hnsw.max_scan_tuples` = 20 000).
  - WHERE được áp **sau** index scan, nên có thể trả ít dòng hơn LIMIT.
- **Thực hành:** A khi nạp gói 50 KB (đo: HNSW được chọn cho `ORDER BY e <-> … LIMIT 5`).
- **Sơ đồ:** đồ thị HNSW nhiều tầng, cụm IVFFlat.

### P12. Thống kê, planner, EXPLAIN, partitioning
- **Mục tiêu:**
  - đọc `pg_stats` (MCV, histogram, `n_distinct`);
  - giải thích ước lượng sai và sửa bằng `CREATE STATISTICS`;
  - đọc các nút EXPLAIN;
  - thiết kế partition và thấy pruning.
- **Sự thật:**
  - `reltuples`/`relpages` chỉ cập nhật bởi VACUUM/ANALYZE/một số DDL.
  - `default_statistics_target` = 100.
  - Extended stats: `dependencies`, `ndistinct`, `mcv` [S10].
  - PG 18: `EXPLAIN ANALYZE` tự kèm `BUFFERS` (đo); bỏ self-join thừa; OR → mảng; Right Semi Join; incremental sort trong merge join [S12].
  - Partition: range/list/hash. Pruning lúc lập kế hoạch và lúc chạy (`Subplans Removed`). Index trên bảng cha là "ảo". UNIQUE/PK phải chứa mọi cột partition key [S16].
- **Thực hành:**
  - A: `pg_stats`, `EXPLAIN`, `pg_stat_statements` (đo).
  - B: `CREATE STATISTICS` + `ANALYZE` rồi so ước lượng.
  - C: parallel plans (0 worker, đo).

---

## 4. MySQL / InnoDB (M) và MariaDB

Thứ tự: M1 → M2 → M3 → M4 → M5 → M6, rồi M7–M9, M10 cuối.

**Thực hành: mức C toàn bộ.** Mỗi mô-đun nên có một **lab "cùng câu trên PGlite"** để so: cùng bảng, cùng câu, khác cách lưu.

| # | Chủ đề | Mục tiêu | Sự thật kèm nguồn |
|---|---|---|---|
| M1 | Server layer vs storage engine | Biết InnoDB là một storage engine cắm dưới tầng SQL | (chưa đối chiếu; xem chương "Alternative Storage Engines" của MySQL 8.4) |
| M2 | Clustered index | Giải thích bảng **là** cây B+ theo PK; vì sao PK ngắn và tăng dần tốt hơn | Thứ tự chọn clustered index: PK → UNIQUE đầu tiên mà mọi cột NOT NULL → `GEN_CLUST_INDEX` trên row ID 6 byte. Mỗi bản ghi secondary index chứa **cột PK**; PK dài làm mọi secondary index to ra [S22] |
| M3 | Trang, fill, merge | Ước lượng độ đầy trang khi chèn tuần tự vs ngẫu nhiên | Trang mặc định 16 KB (`innodb_page_size`). Chèn tuần tự để trống 1/16 nên trang ~15/16 đầy; ngẫu nhiên 1/2–15/16. Sorted index build theo `innodb_fill_factor`. `MERGE_THRESHOLD` mặc định 50% [S20] |
| M4 | Undo, MVCC, purge | So "bản cũ trong undo" (InnoDB) với "bản cũ trong heap" (PG) | Cột ẩn `DB_TRX_ID` 6 B, `DB_ROLL_PTR` 7 B, `DB_ROW_ID` 6 B. Insert undo bỏ khi commit; update undo giữ tới khi không snapshot nào cần. **Purge** xóa vật lý. Secondary index không có cột ẩn: bản cũ bị delete-mark rồi purge, và khi đó **covering index không dùng được** [S21] |
| M5 | Redo, doublewrite | So redo log với WAL; doublewrite chống ghi rách trang | Mặc định 8.4: `innodb_doublewrite_files` 2, `innodb_doublewrite_pages` 128, `innodb_log_buffer_size` 64 MiB [S23]. Cơ chế chi tiết redo (chưa đối chiếu) |
| M6 | Khóa | Phân biệt record, gap, next-key, insert-intention, AUTO-INC, predicate lock (SPATIAL); giải thích vì sao REPEATABLE READ chặn phantom | Định nghĩa và ví dụ `BETWEEN 10 AND 20 FOR UPDATE` chặn chèn 15. Mặc định REPEATABLE READ + next-key lock [S25] |
| M7 | AHI, covering, invisible, descending | Biết AHI tự xây từ mẫu truy cập; ẩn index để thử trước khi xóa; dùng index DESC cho ORDER BY trộn chiều | AHI dựng từ **tiền tố khóa**, theo trang hay truy cập; `innodb_adaptive_hash_index_parts` = 8 (tối đa 512) [S26]. **Mặc định AHI = OFF ở 8.4** (8.0 là ON) [S23]. Invisible: vẫn được bảo trì, unique vẫn ép, PK không ẩn được, `use_invisible_indexes` [S27]. Descending: chỉ BTREE, không HASH/FULLTEXT/SPATIAL; EXPLAIN ghi `Backward index scan` [S28] |
| M8 | FULLTEXT, SPATIAL | So FULLTEXT InnoDB với GIN của PG; SPATIAL (R-tree) với GiST | FULLTEXT là inverted index trong **6 bảng phụ** chia theo ký tự đầu; `FTS_DOC_ID` tăng dần, khoảng cách tối đa 65535; xóa chỉ ghi vào `FTS_*_DELETED`, dọn bằng `OPTIMIZE TABLE` + `innodb_optimize_fulltext_only`; chỉ thấy dữ liệu đã commit [S29]. SPATIAL: cột NOT NULL, optimizer chỉ dùng khi cột có **thuộc tính SRID** [S34] |
| M9 | EXPLAIN, optimizer | Đọc `type`, `key`, `Extra`; dùng `FORMAT=TREE` và `EXPLAIN ANALYZE` | TRADITIONAL (mặc định), JSON, TREE. Chỉ TREE thấy hash join. `EXPLAIN ANALYZE` **chạy thật**, luôn TREE, cho thời gian và rows thật mỗi iterator [S33] |
| M10 | MariaDB khác ở đâu | Không coi MariaDB = MySQL | Xem bảng dưới |

**MariaDB khác ở đâu:**

- **Ignored indexes (10.6):** `ALTER TABLE … ALTER INDEX k IGNORED`, tương đương invisible của MySQL. Hint trỏ tới index bị ignore thì báo lỗi [S35].
- **`innodb_adaptive_hash_index`:** mặc định OFF. Kiểu enum (`IF_SPECIFIED`) từ 13.1.1.
- **`innodb_change_buffering`:** deprecated 10.9, **gỡ ở 11.0** [S36]. MySQL 8.4 vẫn giữ biến này, chỉ đổi mặc định thành `none` [S23].
- **Vector:** kiểu `VECTOR(n)` + `VECTOR INDEX` (HNSW sửa đổi, `M` 3–200, euclidean/cosine) từ 11.7, GA ở 11.8 LTS. Chỉ dùng index cho `ORDER BY distance … LIMIT` [S37].
- **Descending index:** làm ở MDEV-13756 (nhánh 10.8). Có báo cáo optimizer không luôn chọn index DESC (MDEV-27419) [S38]. **Chưa có trang KB chính thức đọc được**, nên coi là chưa đối chiếu.
- **Tài liệu khác biệt theo cặp phiên bản:** [S39].

---

## 5. MongoDB (G)

Thứ tự: G1 → G2 → G3 → G4 → G5 → G6. Song song có G7 (cần G1) và G8 (cần G3, G7). G9 cuối.

| # | Chủ đề | Mục tiêu | Sự thật kèm nguồn |
|---|---|---|---|
| G1 | Document model, BSON | Mô hình hóa một thực thể thành tài liệu; biết giới hạn | Tài liệu BSON tối đa **16 MiB** (lớn hơn thì GridFS); lồng tối đa **100** tầng; namespace 255 byte (235 nếu shard) [S40] |
| G2 | WiredTiger | Giải thích document-level concurrency, snapshot MVCC, checkpoint, journal, nén, cache | Optimistic concurrency, intent lock cấp global/db/collection, xung đột thì retry. Snapshot đầu mỗi thao tác. **Checkpoint mỗi 60 s**. Journal (WAL) snappy. Nén collection **snappy**, index **prefix compression**, time-series **zstd**. Cache mặc định max(50% (RAM − 1 GB), 256 MB) [S31] |
| G3 | Index cơ bản, compound, **ESR** | Xếp khóa compound theo Equality → Sort → Range; biết biến thể ERS | `_id` unique tự có, không xóa được; index là B-tree [S30]. Tối đa **64** index mỗi collection, **32** trường mỗi compound [S40]. ESR: `$ne/$nin/$regex` là range. `$in` + sort: < 201 phần tử thì như equality (`SORT_MERGE`), ≥ 201 như range; ngưỡng không cam kết [S41] |
| G4 | Multikey, wildcard, text, geo, hashed | Biết index nào hợp dữ liệu nào và bẫy của nó | Multikey tự tạo khi trường là mảng, mỗi phần tử một khóa. Compound multikey: **tối đa một trường mảng mỗi tài liệu**. Cover chỉ khi không trả trường mảng và không `$elemMatch` [S42]. Wildcard `$**`: sparse, bỏ `_id`, không hỗ trợ `$text`, chậm hơn index nhắm đích [S43]. 2dsphere: GeoJSON trên cầu, luôn sparse; compound 2d chỉ một trường vị trí; phiên bản 4 mặc định từ 8.3 [S44]. Text, hashed (chưa đối chiếu, trang con của [S30]) |
| G5 | Thuộc tính index | Dùng unique, partial, sparse, TTL, hidden đúng chỗ | TTL: tác vụ nền chạy **mỗi 60 s**, chỉ trường date (mảng thì lấy ngày sớm nhất); **không compound**; không trên `_id`; `expireAfterSeconds` 0..2147483647 [S45]. Partial/sparse/hidden (chưa đối chiếu) |
| G6 | Planner, explain | Đọc `IXSCAN/FETCH/SORT/COLLSCAN`, `keysExamined/docsExamined/nReturned`; hiểu plan cache | Multi-planner chọn plan trả nhiều kết quả nhất trong thời gian thử với ít việc nhất. Từ **8.3** có cost-based ranker làm dự phòng. Plan cache: trạng thái Missing → Inactive → Active, xóa khi có DDL. Index filter deprecated ở 8.0, thay bằng `setQuerySettings`. `explain()` không dùng và không ghi cache [S46]. Tên stage và verbosity (chưa đối chiếu, trang explain-results) |
| G7 | Aggregation pipeline | Viết `$match → $group → $sort → $project`, `$lookup`, `$unwind`; biết stage đầu nào dùng index | (chưa đối chiếu: `aggregation-pipeline` và `aggregation-pipeline-optimization`) |
| G8 | Schema design patterns | Nhúng vs tham chiếu; chọn pattern | Manual hiện liệt kê 6 pattern: Computed Values, Group Data, Polymorphic, Schema Versioning, Archive, Single Collection [S47]. Các tên cũ (bucket, outlier, subset, extended reference…) **không còn** trên trang này. Nếu dạy thì dẫn trang khác hoặc gọi đúng tên mới |
| G9 | Transactions | Biết thao tác một tài liệu luôn atomic; khi nào cần multi-document | Đa tài liệu: replica set từ FCV 4.0, sharded từ 4.2. Read concern `snapshot` + write concern `majority`. Tốn hơn ghi một tài liệu, "không thay thế thiết kế schema tốt" [S48]. Mặc định `transactionLifetimeLimitSeconds` **60 s** [S40] |

**Thực hành:**

- **Cú pháp truy vấn:** mingo, chờ spike E-S3 của product design.
- **Index, planner, WiredTiger:** mức C. Dùng `explain` ghi sẵn từ MongoDB thật, có ghi phiên bản.

**Sơ đồ:**

- multikey nổ khóa;
- ESR: index scan có/không SORT;
- vòng đời plan cache;
- checkpoint + journal.

---

## 6. DynamoDB (D)

Thứ tự: D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8.

**Thực hành: mức C**, dùng mô phỏng TS (product design §4.4). Mọi công thức mô phỏng phải lấy đúng số dưới đây.

| # | Chủ đề | Mục tiêu | Sự thật kèm nguồn |
|---|---|---|---|
| D1 | Bảng, item, khóa | Chọn khóa đơn (PK) hay kép (PK + SK); tính cỡ item | Item tối đa **400 KB**, gồm cả độ dài **tên** thuộc tính. Partition key 1–2048 byte, sort key 1–1024 byte. Lồng tối đa 32 tầng. Number 38 chữ số [S50] |
| D2 | Partition, adaptive capacity | Giải thích hash(PK) → partition; item collection sắp theo SK; hot partition | Hàm băm nội bộ trên partition key. Cùng PK thì nằm gần nhau, tăng dần theo SK (item collection). Không có LSI thì collection được chia qua nhiều partition [S51]. Throttle khi một partition vượt **3000 thao tác đọc / 1000 ghi**. Adaptive capacity tăng **ngay**, cô lập item nóng; **không** tách collection khi bảng có LSI. Burst giữ tới **300 s** capacity chưa dùng [S52] |
| D3 | Đọc/ghi, consistency, đơn vị capacity | Tính RCU/WCU; chọn eventual hay strong | 1 RCU = 1 strong hoặc 2 eventual/s cho item ≤ 4 KB. 1 WCU = 1 ghi/s cho ≤ 1 KB. Giao dịch ×2 [S50]. Eventual mặc định, rẻ bằng nửa. Strong chỉ trên bảng và LSI, **không** trên GSI hay stream. Isolation read-committed. Global tables: MREC (mặc định) / MRSC [S53] |
| D4 | Query vs Scan, biểu thức | Viết `KeyConditionExpression`; biết FilterExpression lọc **sau** khi đọc | Query/Scan trả tối đa **1 MB** mỗi lần, phân trang bằng `LastEvaluatedKey`. Biểu thức ≤ 4 KB, ≤ 300 toán tử, `IN` ≤ 100 toán hạng. BatchGet 100 item / 16 MB, BatchWrite 25 / 16 MB [S50] |
| D5 | LSI, GSI, projection | Chọn LSI hay GSI; chọn projection | GSI: khóa tùy ý, thêm/xóa lúc nào cũng được, **chỉ eventual**, throughput riêng, chỉ đọc được thuộc tính đã project. LSI: cùng PK, **chỉ tạo khi tạo bảng**, giới hạn **10 GB** mỗi giá trị PK, dùng throughput bảng, tự lấy thuộc tính không project [S54]. Hạn mức: 5 LSI (cố định), 20 GSI (mặc định, tăng được), 100 thuộc tính `INCLUDE` cộng dồn [S49]. **Vector index** mới: 5 mỗi bảng, 4096 chiều, tính vào quota GSI [S49] |
| D6 | Access-pattern-first, single-table | Liệt kê access pattern **trước**, rồi thiết kế khóa; giữ ít bảng | "Đừng thiết kế schema trước khi biết câu hỏi". Giữ càng ít bảng càng tốt. Nguyên tắc: để dữ liệu liên quan cạnh nhau, dùng thứ tự sort, rải tải tránh hot spot, dùng GSI [S55] |
| D7 | Conditional write, transactions | Dùng `ConditionExpression` cho ghi lạc quan; biết giá của giao dịch | `TransactWriteItems`/`TransactGetItems`: ≤ 100 item, ≤ 4 MB, không hai hành động trên cùng item, một account/Region. Mỗi item **2 lần đọc/ghi** ngầm (prepare + commit), tốn cả khi bị hủy. Client token idempotent **10 phút**. Serializable với Put/Update/Delete/GetItem, read-committed với Query/Scan/BatchGet. Không xuyên Region [S56][S50]. Conditional write chi tiết (chưa đối chiếu) |
| D8 | Streams, TTL | Dùng stream cho CDC; dùng TTL dọn dữ liệu | Stream giữ **24 h**. Mỗi record xuất hiện đúng một lần. Thứ tự đảm bảo **theo item**, không theo partition. 4 view type (`KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`). Một shard ứng với một partition. ≤ 2 reader mỗi shard [S57]. TTL: Number epoch **giây**, xóa trong vòng "vài ngày", **không tốn WCU**, hiện trong stream như service deletion, item hết hạn vẫn có thể đọc thấy nên phải lọc [S58] |

**Sơ đồ:**

- hash ring / partition sáng theo tải;
- adaptive capacity tách partition nóng;
- GSI cập nhật bất đồng bộ;
- prepare/commit của giao dịch.

---

## 7. Khoảng trống, rủi ro, chỗ phải sửa

### 7.1 Sửa trong `product-design-db-engine.md`

| Chỗ | Đang ghi | Đúng (đo/nguồn) |
|---|---|---|
| §0, §4.1: `pg_overexplain` có trong gói | có | tarball có nhưng **không nạp được**: `LOAD` báo lỗi, không có `contrib/*.js` (đo) |
| §0, §2.2 mô-đun 8, §4.1 E-S2: "không có pgvector, PostGIS" | không có | **có**, qua gói riêng ghim **pglite-pgvector@0.0.17 / pglite-postgis@0.2.16** cho PGlite 0.5.16 (đo). pgvector ~50 KB tarball, trong trần D-E6. PostGIS ~20 MB, **vượt** trần ~3 MB của D-E6 |
| §2.2 mô-đun 1–2, 4–6: "cần spike E-S1" | chờ | `pageinspect`, `pg_visibility`, `pg_walinspect`, `pg_buffercache`, `amcheck` **chạy** trong PGlite Node (đo). Còn phải đo trong **Web Worker trình duyệt** (tải tarball qua `fetch`) |
| §2.2 mô-đun 3 | "UPDATE rồi thấy dòng cũ/mới" | đúng (đo). Lưu ý `pg_stat_*` cần `pg_stat_force_next_flush()` mới có số |
| §2.2 mô-đun 2 | "Postgres 17/18" | PGlite 0.5.16 = **18.6** (đo); dẫn `/docs/18/` |

### 7.2 Khoảng trống lớn nhất

1. **Không có runtime trung thực cho MySQL, MongoDB (index/planner) và DynamoDB.**
   - Ba engine này chỉ ở mức C.
   - Mọi "đoán kế hoạch" phải dùng output ghi sẵn từ server thật. Cần một script chụp ngoài app, ghi phiên bản, và bị chặn khi đổi phiên bản.
   - Chưa kiểm chứng có engine WASM tương thích MySQL/Mongo nào, việc này thuộc `spike-nosql-browser.md`.
2. **Đồng thời không chạy được ở đâu cả:** PGlite một backend (đo). MVCC hai phiên, lock wait, deadlock, gap lock, `CONCURRENTLY`, autovacuum, parallel query đều chỉ là hoạt hình. Đây là phần "bên trong" khó nhất và dễ dạy sai nhất.
3. **Mức B cần một request kịch bản mới trong worker** (VACUUM, UPDATE + soi trang, flush stats). Việc này đụng `runSandboxed` (`BEGIN → ROLLBACK`) và luật "một câu". Product design §4.1 đã dự kiến `engineLab`. Tài liệu này xác nhận nhu cầu bằng lỗi 25001 đo được.
4. **Extension phải nạp lúc tạo PGlite.** Thêm `extensions` vào `initEngine` làm tải thêm. Hiện chưa có cơ chế nạp lười sau boot (chưa đối chiếu với API PGlite). Cần spike: nạp hết các contrib nhỏ (tổng < 100 KB) hay tạo PGlite thứ hai cho Engine.
5. **PostGIS 20 MB:** chỉ khả thi như tải tùy chọn có nút bấm. Nếu không thì P9 dùng kiểu hình học lõi + `cube`/`earthdistance`, và PostGIS chỉ là bài đọc.
6. **Chưa đối chiếu:** checkpoint/full-page writes/cỡ segment WAL; partial/expression index chi tiết; FTS index; mặc định autovacuum threshold; MongoDB text/hashed/partial/sparse/hidden, aggregation, tên stage explain; DynamoDB conditional write; redo log InnoDB; descending index MariaDB (chỉ có Jira). Phải đọc trước khi viết bài.
7. **Nguồn trôi:** MongoDB 8.3 đổi planner và `2dsphereIndexVersion`; MySQL 8.4 đổi hàng loạt mặc định (AHI, change buffering, io_capacity); DynamoDB thêm vector index. Mỗi bài cần dòng "đúng với phiên bản X, kiểm ngày Y".

---

## 8. Nguồn

Tất cả đã mở đọc ngày 2026-11-20, trừ khi ghi khác.

**PGlite**

- [S1] PGlite Extensions: https://pglite.dev/extensions/
- Gói npm (đo bằng `npm view`): `@electric-sql/pglite@0.5.16`, `@electric-sql/pglite-pgvector@0.0.17`, `@electric-sql/pglite-postgis@0.2.16`.

**PostgreSQL 18**

- [S2] Database Page Layout: https://www.postgresql.org/docs/18/storage-page-layout.html
- [S3] TOAST: https://www.postgresql.org/docs/18/storage-toast.html
- [S4] Heap-Only Tuples (HOT): https://www.postgresql.org/docs/18/storage-hot.html
- [S5] Routine Vacuuming: https://www.postgresql.org/docs/18/routine-vacuuming.html
- [S6] Index-Only Scans and Covering Indexes: https://www.postgresql.org/docs/18/indexes-index-only-scans.html
- [S7] B-Tree Indexes (implementation, dedup, bottom-up deletion): https://www.postgresql.org/docs/18/btree.html
- [S8] Write-Ahead Logging: https://www.postgresql.org/docs/18/wal-intro.html
- [S9] Index Types: https://www.postgresql.org/docs/18/indexes-types.html
- [S10] Statistics Used by the Planner: https://www.postgresql.org/docs/18/planner-stats.html
- [S11] nbtree README (mã nguồn, chưa mở): https://github.com/postgres/postgres/blob/master/src/backend/access/nbtree/README
- [S12] Release 18: https://www.postgresql.org/docs/18/release-18.html
- [S13] GIN Indexes: https://www.postgresql.org/docs/18/gin.html
- [S14] BRIN Indexes: https://www.postgresql.org/docs/18/brin.html
- [S15] bloom: https://www.postgresql.org/docs/18/bloom.html
- [S16] Table Partitioning: https://www.postgresql.org/docs/18/ddl-partitioning.html
- [S17] Partial Indexes / Indexes on Expressions (chưa mở): https://www.postgresql.org/docs/18/indexes-partial.html, https://www.postgresql.org/docs/18/indexes-expressional.html
- [S19] Preferred Index Types for Text Search (chưa mở): https://www.postgresql.org/docs/18/textsearch-indexes.html

**PostGIS, pgvector**

- [S18] PostGIS, Data Management (geometry/geography, SRID, spatial indexes): https://postgis.net/docs/using_postgis_dbmanagement.html
- [S24] pgvector README: https://github.com/pgvector/pgvector/blob/master/README.md

**MySQL 8.4**

- [S20] InnoDB Physical Structure: https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html
- [S21] InnoDB Multi-Versioning: https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html
- [S22] Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html
- [S23] What Is New in MySQL 8.4 (bảng đổi mặc định InnoDB): https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html
- [S25] InnoDB Locking: https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html
- [S26] Adaptive Hash Index: https://dev.mysql.com/doc/refman/8.4/en/innodb-adaptive-hash.html
- [S27] Invisible Indexes: https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html
- [S28] Descending Indexes: https://dev.mysql.com/doc/refman/8.4/en/descending-indexes.html
- [S29] InnoDB Full-Text Indexes: https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html
- [S33] EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.4/en/explain.html
- [S34] Spatial Index Optimization: https://dev.mysql.com/doc/refman/8.4/en/spatial-index-optimization.html

**MariaDB**

- [S35] Ignored Indexes: https://mariadb.com/docs/server/ha-and-performance/optimization-and-tuning/optimization-and-indexes/ignored-indexes
- [S36] InnoDB System Variables: https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-system-variables
- [S37] Vector Overview: https://mariadb.com/docs/server/reference/sql-structure/vectors/vector-overview
- [S38] MDEV-13756 (descending indexes): https://jira.mariadb.org/browse/MDEV-13756 · MDEV-27419: https://jira.mariadb.org/browse/MDEV-27419
- [S39] MariaDB vs MySQL Compatibility: https://mariadb.com/kb/en/mariadb-vs-mysql-compatibility/

**MongoDB**

- [S30] Indexes: https://www.mongodb.com/docs/manual/indexes/
- [S31] WiredTiger Storage Engine: https://www.mongodb.com/docs/manual/core/wiredtiger/
- [S40] Limits and Thresholds: https://www.mongodb.com/docs/manual/reference/limits/
- [S41] ESR Guideline: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- [S42] Multikey Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
- [S43] Wildcard Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/
- [S44] 2dsphere Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/
- [S45] TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- [S46] Query Plans: https://www.mongodb.com/docs/manual/core/query-plans/
- [S47] Schema Design Patterns: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/
- [S48] Transactions: https://www.mongodb.com/docs/manual/core/transactions/

**DynamoDB**

- [S49] Service Quotas: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- [S50] Constraints: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- [S51] Partitions and Data Distribution: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
- [S52] Burst and Adaptive Capacity: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
- [S53] Read Consistency: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- [S54] Secondary Indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
- [S55] NoSQL Design for DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
- [S56] Transactions: How It Works: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- [S57] DynamoDB Streams: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- [S58] Time to Live: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
