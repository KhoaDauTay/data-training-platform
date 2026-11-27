---
id: e-pg-l5-08
engine: postgres
level: L5
module: integrity
title: "Kiểm index và heap bằng amcheck"
title_en: "Verifying indexes and heap with amcheck"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Chạy `bt_index_check` (kể cả `heapallindexed`) trên nhiều index trong một câu", en: "Run `bt_index_check` (including `heapallindexed`) on several indexes in one statement" }
  - { vi: "Kiểm heap bằng `verify_heapam` và đọc kết quả rỗng là \"không thấy hỏng\"", en: "Check the heap with `verify_heapam` and read an empty result as \"no corruption found\"" }
  - { vi: "Biết khác biệt giữa `bt_index_check` và `bt_index_parent_check`, và lock mà mỗi hàm cần", en: "Know the difference between `bt_index_check` and `bt_index_parent_check`, and the lock each one needs" }
requires: [e-pg-l5-01]
sources:
  - { url: https://www.postgresql.org/docs/18/amcheck.html, title_vi: "amcheck: kiểm tra index và bảng có hỏng không" }
viz: pg-btree
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS amcheck;
    DROP TABLE IF EXISTS invoices CASCADE;
    CREATE TABLE invoices (id int PRIMARY KEY, customer_id int NOT NULL, total int NOT NULL, tags text[] NOT NULL);
    INSERT INTO invoices SELECT g, g % 300, (g * 31) % 9000, ARRAY['k' || g % 5] FROM generate_series(1, 15000) g;
    CREATE INDEX invoices_customer_idx ON invoices (customer_id);
    CREATE INDEX invoices_tags_gin ON invoices USING gin (tags);
    UPDATE invoices SET total = total + 1 WHERE id % 10 = 0;
  steps:
    - task: { vi: "Kiểm mọi index B-tree của bảng `invoices` bằng `bt_index_check` với `heapallindexed` = true. Trả về tên index và cột status = 'ok' cho mỗi index kiểm xong (hàm báo lỗi nếu thấy hỏng). Sắp theo tên.", en: "Check every B-tree index of `invoices` with `bt_index_check` and `heapallindexed` = true. Return the index name and a status column = 'ok' for each index checked (the function raises an error if it finds corruption). Order by name." }
      solution: "SELECT c.relname, 'ok' AS status FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_am a ON a.oid = c.relam, LATERAL (SELECT bt_index_check(i.indexrelid, true)) chk WHERE i.indrelid = 'invoices'::regclass AND a.amname = 'btree' ORDER BY c.relname"
      check: rows
      ordered: true
      hint: { vi: "Lấy các index từ `pg_index`, lọc AM là btree qua `pg_am`, gọi hàm trong `LATERAL`.", en: "Take the indexes from `pg_index`, keep access method btree through `pg_am`, call the function in a `LATERAL`." }
    - task: { vi: "Kiểm heap của `invoices` bằng `verify_heapam` và đếm số vấn đề tìm thấy (một cột).", en: "Check the heap of `invoices` with `verify_heapam` and count the problems found (one column)." }
      solution: "SELECT count(*) AS problems FROM verify_heapam('invoices')"
      check: rows
      hint: { vi: "`verify_heapam` trả về một dòng cho mỗi vấn đề; không có dòng nào là tốt.", en: "`verify_heapam` returns one row per problem; no rows is good." }
    - task: { vi: "Kiểm index GIN `invoices_tags_gin` bằng hàm kiểm GIN của amcheck, `gin_index_check(index)` (mới ở 18). Trả về tên index và status = 'ok'.", en: "Check the GIN index `invoices_tags_gin` with amcheck's GIN check function, `gin_index_check(index)` (new in 18). Return the index name and status = 'ok'." }
      solution: "SELECT 'invoices_tags_gin' AS relname, 'ok' AS status FROM (SELECT gin_index_check('invoices_tags_gin')) chk"
      check: rows
      hint: { vi: "Hàm `gin_index_check(regclass)`.", en: "The `gin_index_check(regclass)` function." }
quiz:
  - q: { vi: "Kiểm định kỳ trên production đang nhận ghi. Hàm nào hợp hơn?", en: "A periodic check on a production database that is taking writes. Which function fits better?" }
    options:
      - { vi: "`bt_index_check`: lấy `AccessShareLock` như một SELECT, không chặn ghi", en: "`bt_index_check`: takes `AccessShareLock` like a SELECT and does not block writes" }
      - { vi: "`bt_index_parent_check`: kiểm thêm quan hệ cha-con, nhưng lấy `ShareLock` nên chặn INSERT/UPDATE/DELETE", en: "`bt_index_parent_check`: also checks parent/child relationships, but takes `ShareLock`, which blocks INSERT/UPDATE/DELETE" }
    answer: 0
    trap: 1
    why: { vi: "Kiểm kỹ hơn nghe tốt hơn, nhưng `bt_index_parent_check` giữ `ShareLock` suốt lúc chạy, nên mọi INSERT/UPDATE/DELETE trên bảng phải chờ: không hợp với production đang nhận ghi. Dùng nó trên bản sao (replica) hoặc trong giờ bảo trì. `bt_index_check` chỉ lấy `AccessShareLock`, cùng mức với một SELECT, nên ghi vẫn chạy. Muốn kiểm thêm \"mọi dòng trong bảng đều có mục index\", bật `heapallindexed`; đổi lại chạy lâu hơn.", en: "A more thorough check sounds better, but `bt_index_parent_check` holds `ShareLock` while it runs, so every INSERT/UPDATE/DELETE on the table waits: not suited to a production database taking writes. Use it on a replica or in a maintenance window. `bt_index_check` only takes `AccessShareLock`, the same level as a SELECT, so writes keep running. To also check that every table row has an index entry, turn on `heapallindexed`; it takes longer." }
  - q: { vi: "amcheck báo một index B-tree hỏng. Bước tiếp theo hợp lý?", en: "amcheck reports a corrupt B-tree index. A sensible next step?" }
    options:
      - { vi: "`REINDEX INDEX CONCURRENTLY` rồi kiểm lại, đồng thời tìm nguyên nhân (phần cứng, đổi collation hệ điều hành, lỗi phần mềm)", en: "`REINDEX INDEX CONCURRENTLY`, check again, and look for the cause (hardware, an OS collation change, a software bug)" }
      - { vi: "Bỏ qua, index sẽ tự sửa", en: "Ignore it, the index repairs itself" }
      - { vi: "Xóa bảng", en: "Drop the table" }
    answer: 0
    trap: 1
    why: { vi: "\"Index tự sửa\" nghe hợp lý vì Postgres tự dọn được nhiều thứ, nhưng VACUUM và bottom-up deletion chỉ xóa mục chết, không sửa được một cây hỏng. Xóa bảng thì mất dữ liệu, trong khi chỉ index hỏng: index là bản dẫn xuất, dựng lại được từ bảng. Vì thế `REINDEX INDEX CONCURRENTLY` (dựng lại mà không chặn ghi), kiểm lại, rồi tìm nguyên nhân. Nguyên nhân hay gặp: nâng cấp hệ điều hành đổi thư viện collation (quy tắc sắp chuỗi), nên index `text` cũ không còn khớp thứ tự mới.", en: "\"It repairs itself\" sounds right because Postgres cleans up many things by itself, but VACUUM and bottom-up deletion only remove dead items; they cannot fix a broken tree. Dropping the table loses data, while only the index is broken: an index is derived data that can be rebuilt from the table. So `REINDEX INDEX CONCURRENTLY` (rebuild without blocking writes), check again, then find the cause. A frequent one: an OS upgrade changes the collation library (the string sort rules), so old `text` indexes no longer match the new order." }
---

## Mở bài

Sau khi nâng cấp hệ điều hành, một câu tìm khách theo tên bỗng không ra dòng nào, dù dòng đó vẫn nằm trong bảng. Index có thể đã hỏng mà không ai báo. Bài này dùng `amcheck` để hỏi thẳng Postgres: cấu trúc này còn đúng không?

## Ý chính

`amcheck` là extension kiểm tính đúng đắn của cấu trúc lưu trữ: B-tree (`bt_index_check`, `bt_index_parent_check`), heap (`verify_heapam`) và từ PostgreSQL 18 là GIN (`gin_index_check`). Hàm kiểm index trả về `void` và báo lỗi khi thấy hỏng; `verify_heapam` trả về một dòng cho mỗi vấn đề, không dòng nào nghĩa là không thấy hỏng.

`bt_index_check` kiểm thứ tự khóa trong từng trang và giữa các trang anh em. Nó lấy `AccessShareLock`, giống một SELECT, nên chạy được khi đang có ghi. Thêm `heapallindexed = true` thì nó còn kiểm mọi tuple heap cần có trong index đều có mặt. `bt_index_parent_check` kiểm thêm quan hệ cha-con giữa các tầng, nhưng lấy `ShareLock` nên chặn ghi trong lúc chạy.

Nhiều người nghĩ amcheck nói "ok" nghĩa là dữ liệu chắc chắn lành. Thật ra nó chỉ nói không phát hiện lỗi nào trong những gì nó kiểm. Vì thế chạy nó định kỳ (trên bản sao nếu có) để phát hiện sớm, thay vì đợi một câu truy vấn trả sai.

Khi amcheck báo hỏng: dựng lại index bằng `REINDEX INDEX CONCURRENTLY`, kiểm lại, và tìm nguyên nhân. Hay gặp nhất là thư viện collation của hệ điều hành đổi thứ tự sắp chuỗi sau khi nâng cấp.

## Cú pháp

```sql
CREATE EXTENSION [ IF NOT EXISTS ] amcheck;
SELECT bt_index_check(index regclass [, heapallindexed boolean ]);
SELECT bt_index_parent_check(index regclass [, heapallindexed boolean ]);
SELECT gin_index_check(index regclass);
SELECT * FROM verify_heapam(relation regclass [, startblock => n, endblock => n ]);
```

- `heapallindexed`: thêm kiểm mọi tuple heap có trong index; chậm hơn.
- `startblock`, `endblock`: chỉ kiểm một đoạn trang heap, phải nằm trong bảng.
- Hàm `bt_*` chỉ nhận B-tree, `gin_index_check` chỉ nhận GIN, `verify_heapam` chỉ nhận bảng.

## Ví dụ

Kiểm kỹ khóa chính, kể cả quan hệ cha-con và độ phủ heap:

```sql
SELECT 'invoices_pkey' AS index_name, 'ok' AS status
FROM (SELECT bt_index_parent_check('invoices_pkey', true)) AS chk;
```

Hàm trả `void`, nên câu bọc nó trong một truy vấn con và chỉ in "ok" khi hàm không báo lỗi.

Gọi trực tiếp, kết quả là một dòng rỗng:

```sql
SELECT bt_index_check('invoices_customer_idx');
```

Một dòng với giá trị rỗng nghĩa là kiểm xong, không có lỗi.

Kiểm heap của mọi bảng trong schema `public`:

```sql
SELECT c.relname, count(v.blkno) AS problems
FROM pg_class AS c
LEFT JOIN LATERAL verify_heapam(c.oid) AS v ON true
WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
GROUP BY c.relname ORDER BY c.relname;
```

`invoices` có 0 vấn đề. `LEFT JOIN` giữ lại cả bảng không có dòng lỗi nào.

## Lỗi hay gặp

Gọi `bt_index_check` cho mọi index của bảng mà không lọc loại:

```sql
-- ERROR 0A000: expected "btree" index as targets for verification
SELECT c.relname
FROM pg_index AS i JOIN pg_class AS c ON c.oid = i.indexrelid,
  LATERAL (SELECT bt_index_check(i.indexrelid)) AS chk
WHERE i.indrelid = 'invoices'::regclass;
```

Bảng có cả index GIN. Lọc theo `pg_am.amname` và gọi hàm hợp với từng loại.

Đưa index cho hàm kiểm heap:

```sql
-- ERROR 42809: cannot check relation "invoices_pkey"
SELECT * FROM verify_heapam('invoices_pkey');
```

`verify_heapam` nhận bảng (và materialized view, TOAST), không nhận index.

Kiểm một đoạn trang vượt quá bảng:

```sql
-- ERROR 22023: ending block number must be between 0 and 154
SELECT * FROM verify_heapam('invoices', startblock => 0, endblock => 500);
```

Bảng chỉ có 155 trang. Lấy số trang từ `pg_relation_size` chia 8192 trước khi chia đoạn.

## Thực hành

Ba lần kiểm trên bảng `invoices`: mọi index B-tree với `heapallindexed`, heap bằng `verify_heapam`, rồi index GIN; sau đó hai câu hỏi.

## Tóm tắt

- `amcheck` kiểm cấu trúc B-tree, heap và từ 18 là GIN.
- `bt_index_check` không chặn ghi; `bt_index_parent_check` kỹ hơn nhưng chặn ghi.
- Hàm kiểm index báo lỗi khi thấy hỏng; `verify_heapam` trả một dòng cho mỗi vấn đề.
- "Không thấy lỗi" không phải là bằng chứng không có lỗi: chạy định kỳ.
- Index hỏng thì `REINDEX INDEX CONCURRENTLY` và tìm nguyên nhân.

# EN

## Opening

After an operating system upgrade, a search for a customer by name suddenly returns no row, although the row is still in the table. An index may have gone corrupt without anyone noticing. This lesson uses `amcheck` to ask Postgres directly: is this structure still correct?

## Key idea

`amcheck` is an extension that verifies the structural correctness of storage: B-tree (`bt_index_check`, `bt_index_parent_check`), heap (`verify_heapam`) and, since PostgreSQL 18, GIN (`gin_index_check`). The index check functions return `void` and raise an error when they find corruption; `verify_heapam` returns one row per problem, and no rows means no corruption found.

`bt_index_check` checks key order within each page and between sibling pages. It takes `AccessShareLock`, like a SELECT, so it can run while writes go on. With `heapallindexed = true` it also checks that every heap tuple that should be in the index is there. `bt_index_parent_check` also checks parent/child relationships between levels, but it takes `ShareLock`, so it blocks writes while it runs.

Many people think an "ok" from amcheck means the data is surely sound. In fact it only says no error was detected in what it checked. That is why you run it periodically (on a replica if you have one) to catch problems early, instead of waiting for a query to return wrong results.

When amcheck reports corruption: rebuild the index with `REINDEX INDEX CONCURRENTLY`, check again, and look for the cause. The most frequent one is an OS collation library that changed string order after an upgrade.

## Syntax

```sql
CREATE EXTENSION [ IF NOT EXISTS ] amcheck;
SELECT bt_index_check(index regclass [, heapallindexed boolean ]);
SELECT bt_index_parent_check(index regclass [, heapallindexed boolean ]);
SELECT gin_index_check(index regclass);
SELECT * FROM verify_heapam(relation regclass [, startblock => n, endblock => n ]);
```

- `heapallindexed`: also checks that every heap tuple is in the index; slower.
- `startblock`, `endblock`: check only a span of heap pages, which must lie inside the table.
- The `bt_*` functions only take B-trees, `gin_index_check` only GIN, `verify_heapam` only tables.

## Example

A thorough check of the primary key, including parent/child links and heap coverage:

```sql
SELECT 'invoices_pkey' AS index_name, 'ok' AS status
FROM (SELECT bt_index_parent_check('invoices_pkey', true)) AS chk;
```

The function returns `void`, so the query wraps it in a subquery and prints "ok" only when the function raised no error.

Called directly, the result is one empty row:

```sql
SELECT bt_index_check('invoices_customer_idx');
```

One row with an empty value means the check finished with no error.

Check the heap of every table in schema `public`:

```sql
SELECT c.relname, count(v.blkno) AS problems
FROM pg_class AS c
LEFT JOIN LATERAL verify_heapam(c.oid) AS v ON true
WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
GROUP BY c.relname ORDER BY c.relname;
```

`invoices` has 0 problems. The `LEFT JOIN` keeps tables that have no problem rows.

## Common mistakes

Calling `bt_index_check` on every index of a table without filtering by type:

```sql
-- ERROR 0A000: expected "btree" index as targets for verification
SELECT c.relname
FROM pg_index AS i JOIN pg_class AS c ON c.oid = i.indexrelid,
  LATERAL (SELECT bt_index_check(i.indexrelid)) AS chk
WHERE i.indrelid = 'invoices'::regclass;
```

The table also has a GIN index. Filter on `pg_am.amname` and call the function that fits each type.

Passing an index to the heap check:

```sql
-- ERROR 42809: cannot check relation "invoices_pkey"
SELECT * FROM verify_heapam('invoices_pkey');
```

`verify_heapam` takes tables (and materialized views, TOAST tables), not indexes.

Checking a span of pages past the end of the table:

```sql
-- ERROR 22023: ending block number must be between 0 and 154
SELECT * FROM verify_heapam('invoices', startblock => 0, endblock => 500);
```

The table has only 155 pages. Get the page count from `pg_relation_size` divided by 8192 before splitting the work.

## Practice

Three checks on table `invoices`: every B-tree index with `heapallindexed`, the heap with `verify_heapam`, then the GIN index; then two questions.

## Recap

- `amcheck` verifies B-tree, heap and, since 18, GIN structures.
- `bt_index_check` does not block writes; `bt_index_parent_check` is more thorough but blocks writes.
- The index checks raise an error on corruption; `verify_heapam` returns one row per problem.
- "No error found" is not proof of no error: run it periodically.
- For a corrupt index, `REINDEX INDEX CONCURRENTLY` and look for the cause.
