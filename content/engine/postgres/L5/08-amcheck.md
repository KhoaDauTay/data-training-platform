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
objectives:
  - { vi: "Chạy `bt_index_check` (kể cả `heapallindexed`) trên nhiều index trong một câu", en: "Run `bt_index_check` (including `heapallindexed`) on several indexes in one statement" }
  - { vi: "Kiểm heap bằng `verify_heapam` và đọc kết quả rỗng là \"không thấy hỏng\"", en: "Check the heap with `verify_heapam` and read an empty result as \"no corruption found\"" }
  - { vi: "Biết khác biệt giữa `bt_index_check` và `bt_index_parent_check`, và khóa mà mỗi hàm cần", en: "Know the difference between `bt_index_check` and `bt_index_parent_check`, and the lock each one needs" }
requires: [e-pg-l5-01]
sources:
  - https://www.postgresql.org/docs/18/amcheck.html
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
    - task: { vi: "Kiểm index GIN `invoices_tags_gin` bằng hàm kiểm GIN của amcheck (mới ở 18). Trả về tên index và status = 'ok'.", en: "Check the GIN index `invoices_tags_gin` with amcheck's GIN check function (new in 18). Return the index name and status = 'ok'." }
      solution: "SELECT 'invoices_tags_gin' AS relname, 'ok' AS status FROM (SELECT gin_index_check('invoices_tags_gin')) chk"
      check: rows
      hint: { vi: "Hàm `gin_index_check(regclass)`.", en: "The `gin_index_check(regclass)` function." }
quiz:
  - q: { vi: "Kiểm định kỳ trên production đang nhận ghi. Hàm nào hợp hơn?", en: "A periodic check on a production database that is taking writes. Which function fits better?" }
    options:
      - { vi: "`bt_index_check`: lấy `AccessShareLock` như một SELECT, không chặn ghi", en: "`bt_index_check`: takes `AccessShareLock` like a SELECT and does not block writes" }
      - { vi: "`bt_index_parent_check`: kiểm thêm quan hệ cha-con, nhưng lấy `ShareLock` nên chặn INSERT/UPDATE/DELETE", en: "`bt_index_parent_check`: also checks parent/child relationships, but takes `ShareLock`, which blocks INSERT/UPDATE/DELETE" }
    answer: 0
    why: { vi: "`bt_index_parent_check` kỹ hơn nhưng khóa mạnh hơn; dùng nó trên bản sao hoặc trong cửa sổ bảo trì. `heapallindexed` thêm kiểm \"mọi tuple heap đều có trong index\" với chi phí thời gian.", en: "`bt_index_parent_check` is more thorough but locks harder; run it on a replica or in a maintenance window. `heapallindexed` adds the check that every heap tuple is in the index, at a cost in time." }
  - q: { vi: "amcheck báo một index B-tree hỏng. Bước tiếp theo hợp lý?", en: "amcheck reports a corrupt B-tree index. A sensible next step?" }
    options:
      - { vi: "`REINDEX INDEX CONCURRENTLY` rồi kiểm lại, đồng thời tìm nguyên nhân (phần cứng, đổi collation hệ điều hành, lỗi phần mềm)", en: "`REINDEX INDEX CONCURRENTLY`, check again, and look for the cause (hardware, an OS collation change, a software bug)" }
      - { vi: "Bỏ qua, index sẽ tự sửa", en: "Ignore it, the index repairs itself" }
      - { vi: "Xóa bảng", en: "Drop the table" }
    answer: 0
    why: { vi: "Index dựng lại được từ heap. Một nguyên nhân hay gặp là thư viện collation của hệ điều hành đổi thứ tự sắp chuỗi sau khi nâng cấp: index `text` cũ không còn khớp thứ tự mới.", en: "An index can be rebuilt from the heap. A frequent cause is an OS collation library that changed string order after an upgrade: old `text` indexes no longer match the new order." }
---

## Ý chính

- `amcheck` kiểm tính đúng đắn cấu trúc: B-tree (`bt_index_check`, `bt_index_parent_check`), heap (`verify_heapam`) và từ 18 GIN (`gin_index_check`).
- `bt_index_check(index, heapallindexed)`: kiểm thứ tự khóa trong trang và giữa các trang anh em. Lấy `AccessShareLock`, dùng được khi đang có ghi. `heapallindexed = true` thêm kiểm mọi tuple heap cần có trong index đều có mặt.
- `bt_index_parent_check`: kiểm thêm quan hệ cha-con giữa các tầng; lấy `ShareLock` nên chặn ghi.
- `verify_heapam(rel)`: trả về một dòng cho mỗi vấn đề tìm thấy trong heap (ví dụ xmin/xmax không hợp lệ, TOAST hỏng). Không có dòng = không thấy hỏng.
- Kết quả "ok" không chứng minh không có lỗi, chỉ là không phát hiện. Chạy định kỳ (trên bản sao nếu có) để phát hiện sớm thay vì đợi câu truy vấn trả sai.

## Ví dụ

Kết quả thật trên PGlite:

```text
relname                status
invoices_customer_idx  ok
invoices_pkey          ok

problems
0

relname            status
invoices_tags_gin  ok
```

Các hàm kiểm trả về `void`; câu dùng `LATERAL` để gọi hàm cho từng index và chỉ in "ok" khi hàm không báo lỗi.

## Thực hành

Ba lần kiểm: B-tree, heap và GIN. Kỹ năng chuyên gia: đưa amcheck vào kiểm tra định kỳ, chọn đúng hàm theo khóa được phép, và biết xử lý khi nó báo hỏng.

# EN

## Key idea

- `amcheck` verifies structural correctness: B-tree (`bt_index_check`, `bt_index_parent_check`), heap (`verify_heapam`) and, since 18, GIN (`gin_index_check`).
- `bt_index_check(index, heapallindexed)`: checks key order within pages and between sibling pages. It takes `AccessShareLock`, so it can run while writes go on. `heapallindexed = true` also checks that every heap tuple that should be in the index is there.
- `bt_index_parent_check`: also checks parent/child relationships between levels; it takes `ShareLock`, so it blocks writes.
- `verify_heapam(rel)`: returns one row per problem found in the heap (for example invalid xmin/xmax, broken TOAST). No rows = no corruption found.
- An "ok" does not prove there is no error, only that none was detected. Run it periodically (on a replica if you have one) to catch problems early instead of waiting for a query to return wrong results.

## Example

Real output from PGlite:

```text
relname                status
invoices_customer_idx  ok
invoices_pkey          ok

problems
0

relname            status
invoices_tags_gin  ok
```

The check functions return `void`; the query uses `LATERAL` to call the function for each index and prints "ok" only when the function raised no error.

## Practice

Three checks: B-tree, heap and GIN. Expert skill: put amcheck into periodic checks, choose the right function for the lock you can afford, and know what to do when it reports corruption.
