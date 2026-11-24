---
id: e-pg-l5-21
engine: postgres
level: L5
module: multi-tenant
title: "Khách rời đi: xuất dữ liệu, xóa sạch và chứng minh"
title_en: "Offboarding a tenant: export, delete and prove it"
kind: lab
runtime: browser
minutes: 22
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
objectives:
  - { vi: "Xuất dữ liệu của một khách ra CSV bằng `COPY (SELECT …) TO` kèm bảng đếm (manifest)", en: "Export one tenant's data to CSV with `COPY (SELECT …) TO` along with a count manifest" }
  - { vi: "Xóa một khách bằng khóa ngoại ghép `ON DELETE CASCADE`, hoặc `DETACH` phân vùng của nó", en: "Delete a tenant through composite `ON DELETE CASCADE` foreign keys, or `DETACH` its partition" }
  - { vi: "Chứng minh không còn dòng nào ở mọi bảng có cột `tenant_id`, kể cả bảng không có khóa ngoại", en: "Prove that no row is left in every table with a `tenant_id` column, including tables without a foreign key" }
requires: [e-pg-l5-20]
sources:
  - https://www.postgresql.org/docs/18/sql-copy.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/ddl-partitioning.html
  - https://www.postgresql.org/docs/18/functions-xml.html
lab:
  setup: |
    -- Lantern Market: seller 7 is leaving. tenant_id = the seller.
    CREATE TABLE sellers (tenant_id int PRIMARY KEY, name text NOT NULL);
    CREATE TABLE products (tenant_id int NOT NULL REFERENCES sellers ON DELETE CASCADE, id int NOT NULL, name text NOT NULL, PRIMARY KEY (tenant_id, id));
    CREATE TABLE seller_orders (tenant_id int NOT NULL, id int NOT NULL, product_id int NOT NULL, qty int NOT NULL, PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id) ON DELETE CASCADE);
    CREATE INDEX seller_orders_product_idx ON seller_orders (tenant_id, product_id);
    -- payouts were added later, without a foreign key
    CREATE TABLE payouts (tenant_id int NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
    INSERT INTO sellers SELECT g, 'seller ' || g FROM generate_series(1, 8) g;
    INSERT INTO products SELECT g % 8 + 1, g, 'product ' || g FROM generate_series(1, 80) g;
    INSERT INTO seller_orders SELECT p.tenant_id, o, p.id, o % 5 + 1 FROM generate_series(1, 400) o JOIN products p ON p.id = o % 80 + 1;
    INSERT INTO payouts SELECT g % 8 + 1, g, g * 1000 FROM generate_series(1, 24) g;
  steps:
    - task: { vi: "Xuất đơn của người bán 7 (tenant_id, id, product_id, qty; theo id) ra file `/tmp/seller_7_orders.csv` dạng CSV có dòng tiêu đề. Chấm bằng nội dung file đọc lại qua `pg_read_file`.", en: "Export seller 7's orders (tenant_id, id, product_id, qty; by id) to the file `/tmp/seller_7_orders.csv` as CSV with a header line. Graded on the file's contents read back with `pg_read_file`." }
      solution: "COPY (SELECT tenant_id, id, product_id, qty FROM seller_orders WHERE tenant_id = 7 ORDER BY id) TO '/tmp/seller_7_orders.csv' WITH (FORMAT csv, HEADER)"
      after: "SELECT pg_read_file('/tmp/seller_7_orders.csv') AS file"
      check: rows
      hint: { vi: "`COPY (SELECT … WHERE tenant_id = 7 ORDER BY id) TO '/tmp/…' WITH (FORMAT csv, HEADER)`.", en: "`COPY (SELECT … WHERE tenant_id = 7 ORDER BY id) TO '/tmp/…' WITH (FORMAT csv, HEADER)`." }
    - task: { vi: "Lập bảng đếm trước khi xóa: một dòng, bốn cột tenant_id (= 7), products, orders, payouts: số dòng của người bán 7 trong ba bảng đó.", en: "Build the manifest before deleting: one row, four columns tenant_id (= 7), products, orders, payouts: seller 7's row count in those three tables." }
      solution: "SELECT 7 AS tenant_id, (SELECT count(*) FROM products WHERE tenant_id = 7) AS products, (SELECT count(*) FROM seller_orders WHERE tenant_id = 7) AS orders, (SELECT count(*) FROM payouts WHERE tenant_id = 7) AS payouts"
      check: rows
      hint: { vi: "Ba truy vấn con `count(*)`, mỗi cái lọc `tenant_id = 7`.", en: "Three `count(*)` sub-queries, each filtered on `tenant_id = 7`." }
      fact:
        vi: "10 sản phẩm, 50 đơn, 3 lần chi trả: con số để đối chiếu với file xuất và để kiểm sau khi xóa."
        en: "10 products, 50 orders, 3 payouts: the figures to check the export against and to verify after the delete."
        probe: SELECT (SELECT count(*) FROM products WHERE tenant_id = 7), (SELECT count(*) FROM seller_orders WHERE tenant_id = 7), (SELECT count(*) FROM payouts WHERE tenant_id = 7)
        expect: [[10, 50, 3]]
    - task: { vi: "Xóa người bán 7 bằng một câu trên bảng `sellers`; khóa ngoại `ON DELETE CASCADE` lo phần còn lại. Chấm bằng số dòng của người bán 7 còn trong `sellers`, `products`, `seller_orders` sau câu của bạn.", en: "Delete seller 7 with one statement on table `sellers`; the `ON DELETE CASCADE` foreign keys do the rest. Graded on seller 7's rows left in `sellers`, `products`, `seller_orders` after your statement." }
      solution: "DELETE FROM sellers WHERE tenant_id = 7"
      after: "SELECT 7 AS tenant_id, (SELECT count(*) FROM sellers WHERE tenant_id = 7) AS sellers, (SELECT count(*) FROM products WHERE tenant_id = 7) AS products, (SELECT count(*) FROM seller_orders WHERE tenant_id = 7) AS orders"
      check: rows
      hint: { vi: "`DELETE FROM sellers WHERE tenant_id = 7`.", en: "`DELETE FROM sellers WHERE tenant_id = 7`." }
    - task: { vi: "Chứng minh trên MỌI bảng có cột `tenant_id` trong schema `public`, không chỉ các bảng bạn nhớ: tenant_id (= 7), table_name, rows_left (số dòng của người bán 7). Lấy tên bảng từ `information_schema.columns`; đếm động bằng `query_to_xml(format('SELECT count(*) AS n FROM %I WHERE tenant_id = 7', table_name), false, true, '')` rồi đọc `/row/n` bằng `xpath`. Sắp theo table_name.", en: "Prove it on EVERY table with a `tenant_id` column in schema `public`, not only the ones you remember: tenant_id (= 7), table_name, rows_left (seller 7's rows). Take the table names from `information_schema.columns`; count dynamically with `query_to_xml(format('SELECT count(*) AS n FROM %I WHERE tenant_id = 7', table_name), false, true, '')` and read `/row/n` with `xpath`. Order by table_name." }
      solution: "SELECT 7 AS tenant_id, c.table_name::text AS table_name, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM %I WHERE tenant_id = 7', c.table_name), false, true, '')))[1]::text::int AS rows_left FROM information_schema.columns c WHERE c.column_name = 'tenant_id' AND c.table_schema = 'public' ORDER BY c.table_name"
      check: rows
      ordered: true
      hint: { vi: "`(xpath('/row/n/text()', query_to_xml(format(…), false, true, '')))[1]::text::int`, một dòng cho mỗi bảng trong `information_schema.columns`.", en: "`(xpath('/row/n/text()', query_to_xml(format(…), false, true, '')))[1]::text::int`, one row per table in `information_schema.columns`." }
      fact:
        vi: "`payouts` còn 3 dòng: bảng này không có khóa ngoại tới `sellers`, nên CASCADE không chạm tới nó. Khóa ngoại chỉ dọn những gì nó nối tới."
        en: "`payouts` still holds 3 rows: it has no foreign key to `sellers`, so CASCADE never reached it. A foreign key only cleans up what it links."
        probe: SELECT count(*) FROM payouts WHERE tenant_id = 7
        expect: [[3]]
    - task: { vi: "Xóa nốt dòng của người bán 7 trong `payouts`. Chấm bằng chính câu chứng minh của bước trước chạy sau câu của bạn: mọi bảng phải về 0.", en: "Delete seller 7's remaining rows in `payouts`. Graded on the previous step's proof query run after your statement: every table must reach 0." }
      solution: "DELETE FROM payouts WHERE tenant_id = 7"
      after: "SELECT 7 AS tenant_id, c.table_name::text AS table_name, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM %I WHERE tenant_id = 7', c.table_name), false, true, '')))[1]::text::int AS rows_left FROM information_schema.columns c WHERE c.column_name = 'tenant_id' AND c.table_schema = 'public' ORDER BY c.table_name"
      check: rows
      ordered: true
      hint: { vi: "`DELETE FROM payouts WHERE tenant_id = 7`.", en: "`DELETE FROM payouts WHERE tenant_id = 7`." }
quiz:
  - q: { vi: "Mọi khóa ngoại tới `sellers` đều `ON DELETE CASCADE`. Bạn xóa một người bán. Dữ liệu của họ đã sạch ở mọi nơi chưa?", en: "Every foreign key to `sellers` is `ON DELETE CASCADE`. You delete one seller. Is their data gone everywhere?" }
    options:
      - { vi: "Rồi: CASCADE xóa mọi dòng có `tenant_id` đó", en: "Yes: CASCADE removes every row with that `tenant_id`" }
      - { vi: "Chưa chắc: CASCADE chỉ đi theo khóa ngoại", en: "Not necessarily: CASCADE only follows foreign keys" }
      - { vi: "Rồi, miễn là các bảng đều đã bật RLS", en: "Yes, as long as every table has RLS on" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì CASCADE trông như \"xóa tất cả của khách này\", nhưng nó chỉ đi theo đúng các khóa ngoại đã khai báo. Lab có bảng `payouts` thêm sau, không có khóa ngoại, nên còn nguyên 3 dòng. Chứng minh bằng câu quét mọi bảng có `tenant_id`, và kiểm từng kho khác ngoài database.", en: "It sounds right because CASCADE looks like \"delete everything of this tenant\", but it only follows the foreign keys that were declared. The lab's `payouts` table was added later without one, so its 3 rows stay. Prove it with a query over every table with `tenant_id`, and check every store outside the database too." }
  - q: { vi: "Thứ tự nào đúng khi một khách rời đi?", en: "Which order is right when a tenant leaves?" }
    options:
      - { vi: "Xóa ngay, khi cần thì lấy lại từ bản sao lưu", en: "Delete at once, restore from backup if needed" }
      - { vi: "Khóa truy cập, xuất kèm bảng đếm, đối chiếu, rồi xóa", en: "Suspend, export with a manifest, verify, then delete" }
      - { vi: "Xóa trước, rồi xuất lại dữ liệu từ log", en: "Delete first, then rebuild the export from the logs" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì bản sao lưu có đủ dữ liệu, nhưng khôi phục bản sao lưu vật lý là khôi phục mọi khách, không phải một khách. Xuất trước, đối chiếu số đếm với file, rồi mới xóa; nhật ký kiểm toán thì giữ lại sau khi khách đi.", en: "It sounds right because the backup holds all the data, but restoring a physical backup restores every tenant, not one. Export first, check the counts against the file, and only then delete; the audit trail is kept after the tenant has gone." }
---
## Mở bài

Người bán số 7 ở Chợ Lồng Đèn đóng cửa hàng và yêu cầu dữ liệu của mình rồi xóa sạch. Một câu `DELETE` trên `sellers` trông như đủ, nhưng ai dám ký rằng không còn dòng nào? Bài này xuất, xóa và chứng minh bằng chính database.

## Ý chính

Một khách rời đi qua bốn bước: tạm khóa truy cập, xuất dữ liệu kèm bảng đếm (manifest), đối chiếu, rồi mới xóa. Xuất bằng `COPY (SELECT … WHERE tenant_id = …) TO`; đường dẫn file nằm trên máy chủ database (trong lab là bộ nhớ của tab).

Xóa theo thứ tự ngược khóa ngoại, hoặc để khóa ngoại ghép `(tenant_id, …) ON DELETE CASCADE` làm việc đó. Khách lớn nằm riêng một phân vùng thì `DETACH` rồi `DROP` phân vùng đó, nhanh như nhau dù có bao nhiêu dòng (xem `e-pg-l4-20`).

Nhiều người nghĩ CASCADE xóa "mọi thứ của khách này". Thật ra nó chỉ đi theo các khóa ngoại đã khai báo: bảng thêm sau mà thiếu khóa ngoại vẫn giữ nguyên dữ liệu. Chứng minh phải quét mọi bảng có cột `tenant_id`, lấy danh sách từ `information_schema.columns` và đếm động bằng `format('%I')`. Ngoài database còn bộ nhớ đệm, chỉ mục tìm kiếm, kho file và bản sao phân tích: mỗi nơi cần cách xóa riêng.

## Cú pháp

```sql
COPY (SELECT … FROM t
      WHERE tenant_id = 7)
  TO '/tmp/t7.csv'
  WITH (FORMAT csv, HEADER);
FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE CASCADE
ALTER TABLE t DETACH PARTITION t_7;
```

- `COPY … TO 'file'`: file trên máy chủ, đường dẫn tuyệt đối.
- `ON DELETE CASCADE`: xóa dòng cha thì xóa luôn dòng con nối tới nó.
- `DETACH PARTITION`: tách phân vùng thành bảng riêng, rồi `DROP` được.

## Ví dụ

Xuất sản phẩm của người bán 7 rồi đọc lại đầu file:

```sql
COPY (SELECT * FROM products
      WHERE tenant_id = 7 ORDER BY id)
  TO '/tmp/t7_products.csv'
  WITH (FORMAT csv, HEADER);
SELECT left(pg_read_file(
  '/tmp/t7_products.csv'), 60) AS head;
```

Xóa người bán, CASCADE dọn sản phẩm và đơn:

```sql
DELETE FROM sellers WHERE tenant_id = 7;
SELECT count(*) AS orders_left
FROM seller_orders WHERE tenant_id = 7;
```

Quét mọi bảng có `tenant_id`:

```sql
SELECT c.table_name::text,
  (xpath('/row/n/text()',
    query_to_xml(format(
      'SELECT count(*) AS n FROM %I
       WHERE tenant_id = 7',
      c.table_name), false, true, '')
  ))[1]::text::int AS n
FROM information_schema.columns c
WHERE c.column_name = 'tenant_id'
  AND c.table_schema = 'public'
ORDER BY 1;
```

`payouts` còn 3 dòng. Khách lớn có phân vùng riêng thì tách ra:

```sql
CREATE TABLE events (
  tenant_id int, id int)
  PARTITION BY LIST (tenant_id);
CREATE TABLE events_t5
  PARTITION OF events
  FOR VALUES IN (5);
CREATE TABLE events_rest
  PARTITION OF events DEFAULT;
INSERT INTO events
  SELECT g % 8 + 1, g
  FROM generate_series(1, 80) g;
ALTER TABLE events
  DETACH PARTITION events_t5;
SELECT count(*) AS t5_left FROM events
WHERE tenant_id = 5;
```

`events_t5` giờ là một bảng riêng: lưu trữ hay `DROP` đều tức thì.

## Lỗi hay gặp

Kiểm bằng những bảng mình nhớ:

```sql
-- WRONG: only the tables you remember
SELECT count(*) AS rows_left
FROM seller_orders WHERE tenant_id = 7;
```

```sql
-- FIX: the table nobody linked
SELECT count(*) AS rows_left
FROM payouts WHERE tenant_id = 7;
```

Câu sai báo 0 và trông như xong; `payouts` vẫn còn 3. Xuất ra đường dẫn tương đối:

```sql
-- ERROR 42602
COPY payouts TO 'payouts_7.csv';
```

`COPY` tới file cần đường dẫn tuyệt đối trên máy chủ. Muốn tải về máy khách thì dùng `COPY … TO STDOUT` (lệnh `\copy` của psql).

## Thực hành

Năm bước trên dữ liệu người bán: xuất đơn ra CSV, bảng đếm, xóa bằng CASCADE, chứng minh trên mọi bảng có `tenant_id`, rồi dọn bảng bị sót. Bước ghi được chấm bằng câu đọc chạy ngay sau.

## Tóm tắt

- Thứ tự: tạm khóa, xuất kèm bảng đếm, đối chiếu, rồi mới xóa.
- `COPY (SELECT … WHERE tenant_id = …) TO` xuất một khách; file nằm trên máy chủ.
- CASCADE chỉ đi theo khóa ngoại; bảng không nối tới vẫn giữ dữ liệu.
- Chứng minh bằng câu quét mọi bảng có `tenant_id`; phân vùng riêng thì `DETACH` rồi `DROP`.
- Đọc tiếp: `e-pg-l5-22`, bản đồ chủ đề `e-ds-l4-09`.

# EN

## Opening

Lantern Market seller 7 is closing the shop and asks for its data, then a full delete. One `DELETE` on `sellers` looks like enough, but who would sign that no row is left? This lesson exports, deletes and proves it with the database itself.

## Key idea

A tenant leaves in four steps: suspend access, export the data with a count manifest, verify, and only then delete. Export with `COPY (SELECT … WHERE tenant_id = …) TO`; the file path is on the database server (in the lab, the tab's memory).

Delete in reverse foreign key order, or let composite `(tenant_id, …) ON DELETE CASCADE` foreign keys do it. A big tenant in its own partition is removed with `DETACH` then `DROP` of that partition, equally fast however many rows it holds (see `e-pg-l4-20`).

Many people think CASCADE deletes "everything of this tenant". In fact it only follows the foreign keys that were declared: a table added later without one keeps its data. The proof must scan every table with a `tenant_id` column, taking the list from `information_schema.columns` and counting dynamically with `format('%I')`. Outside the database there are caches, search indexes, file stores and analytics copies: each needs its own way to delete.

## Syntax

```sql
COPY (SELECT … FROM t
      WHERE tenant_id = 7)
  TO '/tmp/t7.csv'
  WITH (FORMAT csv, HEADER);
FOREIGN KEY (tenant_id, product_id)
  REFERENCES products (tenant_id, id)
  ON DELETE CASCADE
ALTER TABLE t DETACH PARTITION t_7;
```

- `COPY … TO 'file'`: a file on the server, absolute path.
- `ON DELETE CASCADE`: deleting a parent row deletes the child rows linked to it.
- `DETACH PARTITION`: turns the partition into a table of its own, which you can then `DROP`.

## Example

Export seller 7's products and read back the start of the file:

```sql
COPY (SELECT * FROM products
      WHERE tenant_id = 7 ORDER BY id)
  TO '/tmp/t7_products.csv'
  WITH (FORMAT csv, HEADER);
SELECT left(pg_read_file(
  '/tmp/t7_products.csv'), 60) AS head;
```

Delete the seller; CASCADE cleans up products and orders:

```sql
DELETE FROM sellers WHERE tenant_id = 7;
SELECT count(*) AS orders_left
FROM seller_orders WHERE tenant_id = 7;
```

Scan every table with `tenant_id`:

```sql
SELECT c.table_name::text,
  (xpath('/row/n/text()',
    query_to_xml(format(
      'SELECT count(*) AS n FROM %I
       WHERE tenant_id = 7',
      c.table_name), false, true, '')
  ))[1]::text::int AS n
FROM information_schema.columns c
WHERE c.column_name = 'tenant_id'
  AND c.table_schema = 'public'
ORDER BY 1;
```

`payouts` still holds 3 rows. A big tenant with its own partition is detached:

```sql
CREATE TABLE events (
  tenant_id int, id int)
  PARTITION BY LIST (tenant_id);
CREATE TABLE events_t5
  PARTITION OF events
  FOR VALUES IN (5);
CREATE TABLE events_rest
  PARTITION OF events DEFAULT;
INSERT INTO events
  SELECT g % 8 + 1, g
  FROM generate_series(1, 80) g;
ALTER TABLE events
  DETACH PARTITION events_t5;
SELECT count(*) AS t5_left FROM events
WHERE tenant_id = 5;
```

`events_t5` is now a table of its own: archiving it or running `DROP` is instant.

## Common mistakes

Checking the tables you remember:

```sql
-- WRONG: only the tables you remember
SELECT count(*) AS rows_left
FROM seller_orders WHERE tenant_id = 7;
```

```sql
-- FIX: the table nobody linked
SELECT count(*) AS rows_left
FROM payouts WHERE tenant_id = 7;
```

The wrong one says 0 and looks done; `payouts` still holds 3. Exporting to a relative path:

```sql
-- ERROR 42602
COPY payouts TO 'payouts_7.csv';
```

`COPY` to a file needs an absolute path on the server. To download to the client, use `COPY … TO STDOUT` (psql's `\copy`).

## Practice

Five steps on the sellers' data: export the orders to CSV, the manifest, delete through CASCADE, prove it on every table with `tenant_id`, then clean the table that was missed. The write steps are graded on a read that runs right after them.

## Recap

- The order: suspend, export with a manifest, verify, and only then delete.
- `COPY (SELECT … WHERE tenant_id = …) TO` exports one tenant; the file is on the server.
- CASCADE only follows foreign keys; a table nobody linked keeps its data.
- Prove it with a query over every table with `tenant_id`; a partition of its own takes `DETACH` then `DROP`.
- Read next: `e-pg-l5-22`, the topic map `e-ds-l4-09`.
