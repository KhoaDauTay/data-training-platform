---
id: e-ds-l4-07
engine: design
level: L4
module: split
title: Tách bảng theo cột (vertical partitioning) - quan hệ 1:1 và TOAST
title_en: Splitting a table by columns (vertical partitioning) - 1:1 tables and TOAST
kind: lab
runtime: browser
minutes: 18
figures: [{ name: pg-toast-pointer, at: idea, variant: out }]
objectives:
  - vi: Nhận ra bảng "rộng" làm câu hay chạy đọc nhiều trang hơn cần, và đo nó bằng kích thước bảng và `Buffers`.
    en: Spot a "wide" table that makes the frequent query read more pages than it needs, and measure it with table size and `Buffers`.
  - vi: Tách các cột ít đọc sang bảng 1:1 có khóa chính đồng thời là khóa ngoại, và nối lại khi cần.
    en: Move rarely read columns into a 1:1 table whose primary key is also its foreign key, and join them back when needed.
  - vi: Biết TOAST chỉ dời giá trị lớn (khoảng trên 2 KB) ra ngoài, nên cột cỡ vừa vẫn làm bảng chính phình.
    en: Know that TOAST only moves large values (above about 2 KB) out of line, so medium-sized columns still bloat the main table.
requires: [e-ds-l4-02]
sources:
  - https://www.postgresql.org/docs/18/storage-toast.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/sql-vacuum.html
  - https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-DBSIZE
lab:
  setup: |
    CREATE TABLE customers_wide (
      id int PRIMARY KEY,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      tier text NOT NULL,
      bio text,
      avatar_svg text,
      prefs jsonb
    );
    INSERT INTO customers_wide
    SELECT g, 'c' || g || '@shop.vn', 'Customer ' || g, CASE WHEN g % 10 = 0 THEN 'gold' ELSE 'basic' END,
           'Bio ' || g || ': ' || (SELECT string_agg(md5((g * 100 + i)::text), ' ') FROM generate_series(1, 12) i),
           '<svg>' || (SELECT string_agg('<circle cx="' || (g * i) % 97 || '" r="' || i || '"/>', '') FROM generate_series(1, 20) i) || '</svg>',
           jsonb_build_object('lang', 'vi', 'newsletter', g % 2 = 0)
    FROM generate_series(1, 2000) g;
    ANALYZE customers_wide;
  steps:
    - task:
        vi: "Tạo bảng 1:1 `customer_profiles` giữ các cột ít đọc: `customer_id int` vừa là khóa chính vừa tham chiếu `customers_wide (id)`, rồi `bio text`, `avatar_svg text`, `prefs jsonb` theo đúng thứ tự đó."
        en: "Create the 1:1 table `customer_profiles` for the rarely read columns: `customer_id int` that is both the primary key and a reference to `customers_wide (id)`, then `bio text`, `avatar_svg text`, `prefs jsonb` in that order."
      solution: CREATE TABLE customer_profiles (customer_id int PRIMARY KEY REFERENCES customers_wide (id), bio text, avatar_svg text, prefs jsonb)
      check: catalog
      hint:
        vi: "Một cột mang hai ràng buộc: `customer_id int PRIMARY KEY REFERENCES customers_wide (id)`. Khóa chính trên khóa ngoại là thứ làm quan hệ thành 1:1."
        en: "One column carries two constraints: `customer_id int PRIMARY KEY REFERENCES customers_wide (id)`. A primary key on the foreign key is what makes the relationship 1:1."
    - task:
        vi: "Chép `bio`, `avatar_svg`, `prefs` của mọi khách sang `customer_profiles`. Bài chấm bằng số dòng và số `bio` khác NULL của bảng mới."
        en: "Copy every customer's `bio`, `avatar_svg`, `prefs` into `customer_profiles`. It is graded by the new table's row count and its count of non-NULL `bio`."
      solution: INSERT INTO customer_profiles SELECT id, bio, avatar_svg, prefs FROM customers_wide
      after: SELECT count(*) AS profiles, count(bio) AS with_bio FROM customer_profiles
      check: rows
      hint:
        vi: "`INSERT INTO customer_profiles SELECT id, … FROM customers_wide`: cột theo đúng thứ tự của bảng mới."
        en: "`INSERT INTO customer_profiles SELECT id, … FROM customers_wide`: columns in the new table's order."
    - task:
        vi: "Bỏ ba cột đã chuyển (`bio`, `avatar_svg`, `prefs`) khỏi `customers_wide` trong một lệnh."
        en: "Drop the three moved columns (`bio`, `avatar_svg`, `prefs`) from `customers_wide` in one command."
      solution: ALTER TABLE customers_wide DROP COLUMN bio, DROP COLUMN avatar_svg, DROP COLUMN prefs
      check: catalog
      hint:
        vi: "`ALTER TABLE … DROP COLUMN a, DROP COLUMN b, …`: các thao tác cách nhau bằng dấu phẩy."
        en: "`ALTER TABLE … DROP COLUMN a, DROP COLUMN b, …`: the actions are separated by commas."
    - task:
        vi: "Trang hồ sơ của các khách `gold` có mã từ 1 tới 50: mã, email, `bio`, xếp theo mã. Nối hai bảng lại."
        en: "The profile page of the `gold` customers with ids 1 to 50: id, email, `bio`, by id. Join the two tables back."
      solution: SELECT c.id, c.email, p.bio FROM customers_wide c JOIN customer_profiles p ON p.customer_id = c.id WHERE c.tier = 'gold' AND c.id <= 50 ORDER BY c.id
      check: rows
      ordered: true
      hint:
        vi: "Nối theo `p.customer_id = c.id`; mỗi khách có tối đa một hồ sơ nên không có dòng lặp."
        en: "Join on `p.customer_id = c.id`; each customer has at most one profile, so no row repeats."
quiz:
  - q:
      vi: "Bảng `customers` có cột `bio` khoảng 400 byte mỗi dòng. Postgres có TOAST, vậy cột này có làm câu lọc theo `tier` đọc thêm trang không?"
      en: "Table `customers` has a `bio` column of about 400 bytes per row. Postgres has TOAST, so does this column make a query filtering on `tier` read extra pages?"
    options:
      - { vi: "Không, TOAST tự dời mọi cột chữ ra ngoài", en: "No, TOAST moves every text column out of line by itself" }
      - { vi: "Có: TOAST chỉ ra tay khi dòng vượt khoảng 2 KB, nên giá trị 400 byte nằm ngay trong trang của bảng và mọi lần quét đều đọc nó", en: "Yes: TOAST only acts when a row passes about 2 KB, so a 400-byte value sits inside the table's pages and every scan reads it" }
      - { vi: "Chỉ khi cột có index", en: "Only if the column has an index" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì TOAST nổi tiếng là \"chỗ để chữ dài\", nhưng ngưỡng mặc định là khoảng 2 KB mỗi dòng. Trong lab, 2.000 khách chiếm 250 trang và bảng TOAST trống; bỏ các cột ít đọc thì câu đếm khách `gold` chỉ còn đọc 32 trang."
      en: "It sounds right because TOAST is known as \"where long text goes\", but the default threshold is about 2 KB per row. In the lab, 2,000 customers take 250 pages and the TOAST table is empty; without the rarely read columns, counting `gold` customers reads only 32 pages."
  - q:
      vi: "Tách bảng theo cột có làm bảng vi phạm dạng chuẩn không?"
      en: "Does splitting a table by columns break a normal form?"
    options:
      - { vi: "Có, đó là một kiểu phi chuẩn hóa", en: "Yes, it is a kind of denormalisation" }
      - { vi: "Không: mỗi sự thật vẫn nằm một chỗ, hai bảng cùng khóa; đây là quyết định lưu trữ vật lý, đổi lại mỗi lần đọc đủ hồ sơ cần một phép nối", en: "No: each fact still lives in one place, both tables share the key; it is a physical storage decision, paid for with a join whenever the full profile is read" }
      - { vi: "Có, vì bảng mới không có khóa riêng", en: "Yes, because the new table has no key of its own" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ cứ tách bảng là đổi dạng chuẩn. Thật ra phi chuẩn hóa là lưu lặp một sự thật; tách 1:1 không lặp gì, khóa chính của bảng mới chính là khóa ngoại. Cái giá nằm ở đọc: hồ sơ đầy đủ cần JOIN."
      en: "Many people think any split changes the normal form. In fact denormalising means storing a fact twice; a 1:1 split repeats nothing, the new table's primary key is the foreign key. The cost is on reads: the full profile needs a JOIN."
---
## Mở bài

Trang danh sách khách chỉ cần email và hạng, vậy mà mỗi lần lọc khách `gold` Postgres đọc qua cả tiểu sử, ảnh SVG và tùy chọn của từng người. Bảng không sai về chuẩn hóa, chỉ là quá rộng cho câu hay chạy. Tách nó theo cột là một quyết định thiết kế vật lý có giá và có lợi rõ ràng.

## Ý chính

Postgres đọc bảng theo trang 8 KB. Dòng càng rộng thì một trang chứa càng ít dòng, và câu quét theo `tier` phải đọc càng nhiều trang, dù nó không cần cột dài nào. **Tách bảng theo cột** (vertical partitioning) chuyển các cột ít đọc sang một bảng thứ hai cùng khóa: bảng chính hẹp, nhiều dòng mỗi trang; bảng phụ chỉ được đọc khi cần hồ sơ đầy đủ.

Bảng phụ là quan hệ 1:1: cột khóa vừa là khóa chính vừa là khóa ngoại tới bảng chính. Khóa chính chặn hai hồ sơ cho một khách; khóa ngoại chặn hồ sơ của khách không tồn tại. Tách 1:1 không lưu lặp gì, nên không phải phi chuẩn hóa; cái giá là một phép nối mỗi khi đọc đủ hồ sơ, và hai bảng phải ghi trong cùng transaction.

Nhiều người nghĩ TOAST đã làm việc này. Thật ra TOAST chỉ ra tay khi một dòng vượt khoảng 2 KB: nó nén rồi dời giá trị lớn sang bảng TOAST. Giá trị cỡ vài trăm byte vẫn nằm trong trang chính. TOAST tự động cho cột rất dài; tách bảng là việc của người thiết kế cho cột cỡ vừa, và cho dữ liệu cần quyền hay vòng đời riêng.

Hình cuối mục này cho thấy TOAST trên bảng `doc` của bài `e-pg-l3-03`: giá trị nén vừa thì ở lại trang, giá trị không nén được thì ra bảng TOAST, trang chỉ giữ con trỏ 18 byte.

## Cú pháp

```sql
CREATE TABLE side_table (
  key_column int PRIMARY KEY REFERENCES main_table (id),
  column_name data_type [, ...]
);
ALTER TABLE main_table DROP COLUMN column_name [, DROP COLUMN ...];
VACUUM FULL main_table;
pg_relation_size(regclass)  pg_column_size(any)
```

- `PRIMARY KEY REFERENCES …` trên cùng một cột: quan hệ 1:1, bảng phụ không có dòng mồ côi.
- `DROP COLUMN` chỉ đánh dấu cột đã xóa; bảng chỉ nhỏ lại khi được viết lại (`VACUUM FULL`, khóa cả bảng).
- `pg_relation_size(t)`: kích thước phần chính của bảng; `reltoastrelid` trong `pg_class` trỏ tới bảng TOAST của nó.

## Ví dụ

Đo bảng rộng: 250 trang, bảng TOAST trống vì mỗi dòng chỉ khoảng 1 KB.

```sql
SELECT pg_relation_size('customers_wide') AS heap_bytes, pg_relation_size(reltoastrelid) AS toast_bytes, relpages
FROM pg_class WHERE relname = 'customers_wide';
```

Cột nào chiếm chỗ: tiểu sử và SVG chiếm gần hết mỗi dòng.

```sql
SELECT avg(pg_column_size(c.*))::int AS row_bytes, avg(pg_column_size(bio))::int AS bio_bytes,
       avg(pg_column_size(avatar_svg))::int AS svg_bytes
FROM customers_wide c;
```

Tách thử thành bảng lõi và bảng hồ sơ, rồi so kích thước:

```sql
CREATE TABLE ex_core AS SELECT id, email, name, tier FROM customers_wide;
CREATE TABLE ex_profile AS SELECT id AS customer_id, bio, avatar_svg, prefs FROM customers_wide;
SELECT relname, pg_relation_size(oid) AS bytes FROM pg_class
WHERE relname IN ('customers_wide', 'ex_core', 'ex_profile') ORDER BY relname;
```

Cùng câu đếm khách `gold` trên bảng lõi chỉ đọc 32 trang (`Buffers: shared hit=32`), so với 250 trên bảng rộng.

```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT count(*) FROM ex_core WHERE tier = 'gold';
```

Còn giá trị thật sự lớn thì TOAST lo: 100 dòng 3.000 byte, phần chính chỉ một trang, phần còn lại ở bảng TOAST.

```sql
CREATE TABLE ex_big (id int, doc text);
ALTER TABLE ex_big ALTER COLUMN doc SET STORAGE EXTERNAL;
INSERT INTO ex_big SELECT g, repeat('x', 3000) FROM generate_series(1, 100) g;
SELECT pg_relation_size('ex_big') AS heap_bytes, pg_relation_size(reltoastrelid) AS toast_bytes FROM pg_class WHERE relname = 'ex_big';
```

## Lỗi hay gặp

Bỏ cột rồi tưởng bảng đã nhỏ lại:

```sql
-- WRONG: DROP COLUMN only marks the columns as dropped, the pages stay the same size
CREATE TABLE ex_wide2 AS SELECT * FROM customers_wide;
ALTER TABLE ex_wide2 DROP COLUMN bio, DROP COLUMN avatar_svg, DROP COLUMN prefs;
SELECT pg_relation_size('ex_wide2') AS bytes;
```

```sql
-- FIX: rewrite the table (VACUUM FULL takes an exclusive lock: plan a window for it)
VACUUM FULL ex_wide2;
SELECT pg_relation_size('ex_wide2') AS bytes;
```

Câu sai vẫn ra 2.097.152 byte; sau `VACUUM FULL` còn 139.264.

Bảng phụ thiếu khóa chính thì không còn là 1:1. Có khóa chính, hồ sơ thứ hai cho cùng khách bị từ chối:

```sql
CREATE TABLE ex_prof (customer_id int PRIMARY KEY REFERENCES customers_wide (id), bio text);
INSERT INTO ex_prof VALUES (1, 'first');
-- ERROR 23505: duplicate key value violates unique constraint "ex_prof_pkey"
INSERT INTO ex_prof VALUES (1, 'second');
```

Hồ sơ của khách không tồn tại bị khóa ngoại chặn:

```sql
-- ERROR 23503: insert or update on table "ex_prof" violates foreign key constraint "ex_prof_customer_id_fkey"
INSERT INTO ex_prof VALUES (99999, 'nobody');
```

## Thực hành

Bốn bước: tạo bảng 1:1 `customer_profiles`, chép ba cột sang, bỏ chúng khỏi bảng rộng, rồi nối hai bảng lại cho trang hồ sơ. Sau đó là hai câu hỏi.

## Tóm tắt

- Dòng rộng làm câu hay chạy đọc nhiều trang; tách cột ít đọc sang bảng 1:1 cùng khóa.
- Bảng phụ: khóa chính đồng thời là khóa ngoại; không lưu lặp gì, cái giá là JOIN khi đọc đủ hồ sơ.
- TOAST chỉ dời giá trị khi dòng vượt khoảng 2 KB; cột cỡ vừa vẫn ở trong trang chính (lab `e-pg-l3-03` soi TOAST tận nơi).
- `DROP COLUMN` không thu nhỏ bảng; cần viết lại bằng `VACUUM FULL` và chịu khóa cả bảng.

# EN

## Opening

The customer list page only needs the email and the tier, yet every time it filters `gold` customers Postgres reads through each person's bio, SVG picture and preferences. The table is not wrong by normalisation, only too wide for the frequent query. Splitting it by columns is a physical design decision with a clear cost and a clear gain.

## Key idea

Postgres reads a table in 8 KB pages. The wider the row, the fewer rows fit on a page, and the more pages a scan on `tier` must read, even though it needs none of the long columns. **Splitting a table by columns** (vertical partitioning) moves the rarely read columns into a second table with the same key: the main table is narrow, with many rows per page; the side table is read only when the full profile is needed.

The side table is a 1:1 relationship: its key column is both the primary key and a foreign key to the main table. The primary key blocks two profiles for one customer; the foreign key blocks a profile for a customer who does not exist. A 1:1 split stores nothing twice, so it is not denormalisation; the cost is a join whenever the full profile is read, and both tables must be written in the same transaction.

Many people think TOAST already does this. In fact TOAST only acts when a row passes about 2 KB: it compresses and moves large values to the TOAST table. A value of a few hundred bytes stays in the main page. TOAST is automatic for very long columns; a split is the designer's job for medium-sized columns, and for data that needs its own privileges or lifecycle.

The figure at the end of this section shows TOAST on the table `doc` from lesson `e-pg-l3-03`: a value that compresses enough stays on the page, one that does not moves to the TOAST table and the page keeps an 18-byte pointer.

## Syntax

```sql
CREATE TABLE side_table (
  key_column int PRIMARY KEY REFERENCES main_table (id),
  column_name data_type [, ...]
);
ALTER TABLE main_table DROP COLUMN column_name [, DROP COLUMN ...];
VACUUM FULL main_table;
pg_relation_size(regclass)  pg_column_size(any)
```

- `PRIMARY KEY REFERENCES …` on one column: a 1:1 relationship, no orphan rows in the side table.
- `DROP COLUMN` only marks the column as dropped; the table shrinks only when rewritten (`VACUUM FULL`, which locks the whole table).
- `pg_relation_size(t)`: the size of the table's main part; `reltoastrelid` in `pg_class` points to its TOAST table.

## Example

Measure the wide table: 250 pages, and an empty TOAST table because each row is only about 1 KB.

```sql
SELECT pg_relation_size('customers_wide') AS heap_bytes, pg_relation_size(reltoastrelid) AS toast_bytes, relpages
FROM pg_class WHERE relname = 'customers_wide';
```

Which columns take the space: the bio and the SVG take most of each row.

```sql
SELECT avg(pg_column_size(c.*))::int AS row_bytes, avg(pg_column_size(bio))::int AS bio_bytes,
       avg(pg_column_size(avatar_svg))::int AS svg_bytes
FROM customers_wide c;
```

Try the split into a core table and a profile table, then compare sizes:

```sql
CREATE TABLE ex_core AS SELECT id, email, name, tier FROM customers_wide;
CREATE TABLE ex_profile AS SELECT id AS customer_id, bio, avatar_svg, prefs FROM customers_wide;
SELECT relname, pg_relation_size(oid) AS bytes FROM pg_class
WHERE relname IN ('customers_wide', 'ex_core', 'ex_profile') ORDER BY relname;
```

The same count of `gold` customers on the core table reads only 32 pages (`Buffers: shared hit=32`), against 250 on the wide table.

```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT count(*) FROM ex_core WHERE tier = 'gold';
```

Truly large values are TOAST's job: 100 rows of 3,000 bytes, one page in the main part, the rest in the TOAST table.

```sql
CREATE TABLE ex_big (id int, doc text);
ALTER TABLE ex_big ALTER COLUMN doc SET STORAGE EXTERNAL;
INSERT INTO ex_big SELECT g, repeat('x', 3000) FROM generate_series(1, 100) g;
SELECT pg_relation_size('ex_big') AS heap_bytes, pg_relation_size(reltoastrelid) AS toast_bytes FROM pg_class WHERE relname = 'ex_big';
```

## Common mistakes

Dropping columns and assuming the table got smaller:

```sql
-- WRONG: DROP COLUMN only marks the columns as dropped, the pages stay the same size
CREATE TABLE ex_wide2 AS SELECT * FROM customers_wide;
ALTER TABLE ex_wide2 DROP COLUMN bio, DROP COLUMN avatar_svg, DROP COLUMN prefs;
SELECT pg_relation_size('ex_wide2') AS bytes;
```

```sql
-- FIX: rewrite the table (VACUUM FULL takes an exclusive lock: plan a window for it)
VACUUM FULL ex_wide2;
SELECT pg_relation_size('ex_wide2') AS bytes;
```

The wrong version still gives 2,097,152 bytes; after `VACUUM FULL` it is 139,264.

Without a primary key the side table is no longer 1:1. With one, a second profile for the same customer is refused:

```sql
CREATE TABLE ex_prof (customer_id int PRIMARY KEY REFERENCES customers_wide (id), bio text);
INSERT INTO ex_prof VALUES (1, 'first');
-- ERROR 23505: duplicate key value violates unique constraint "ex_prof_pkey"
INSERT INTO ex_prof VALUES (1, 'second');
```

The foreign key blocks a profile for a customer who does not exist:

```sql
-- ERROR 23503: insert or update on table "ex_prof" violates foreign key constraint "ex_prof_customer_id_fkey"
INSERT INTO ex_prof VALUES (99999, 'nobody');
```

## Practice

Four steps: create the 1:1 table `customer_profiles`, copy the three columns over, drop them from the wide table, then join the two tables back for the profile page. Then two questions.

## Recap

- Wide rows make the frequent query read many pages; move the rarely read columns into a 1:1 table with the same key.
- The side table: its primary key is also its foreign key; nothing is stored twice, the cost is a JOIN when reading the full profile.
- TOAST only moves values when a row passes about 2 KB; medium-sized columns stay in the main page (lab `e-pg-l3-03` looks at TOAST up close).
- `DROP COLUMN` does not shrink the table; it needs a rewrite with `VACUUM FULL` and its whole-table lock.
