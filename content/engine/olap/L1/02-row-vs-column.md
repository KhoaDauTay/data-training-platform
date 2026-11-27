---
id: e-ol-l1-02
engine: olap
level: L1
module: workload
title: "Lưu theo dòng và lưu theo cột"
title_en: "Row storage and column storage"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: ol-row-column, at: idea }]
objectives:
  - vi: Giải thích vì sao kho lưu theo dòng phải đọc cả dòng, kể cả cột không cần, khi gộp một cột.
    en: Explain why a row store reads whole rows, unused columns included, when it aggregates one column.
  - vi: Đo số byte của một cột và của cả dòng bằng `pg_column_size`.
    en: Measure the bytes of one column and of whole rows with `pg_column_size`.
  - vi: Dựng một bảng hẹp chỉ giữ cột cần, như một cột riêng của kho lưu theo cột.
    en: Build a narrow table holding only the needed column, like one column of a column store.
requires: [e-ol-l1-01]
sources:
  - { url: "https://clickhouse.com/docs/intro", title: "ClickHouse docs: What is ClickHouse?", title_vi: "Tài liệu ClickHouse: ClickHouse là gì?" }
  - { url: "https://www.postgresql.org/docs/18/storage-page-layout.html", title: "PostgreSQL 18 docs: Database Page Layout", title_vi: "Cấu trúc trang dữ liệu" }
  - { url: "https://www.postgresql.org/docs/18/functions-admin.html", title: "PostgreSQL 18 docs: Database Object Size Functions", title_vi: "Hàm quản trị hệ thống" }
lab:
  setup: |
    CREATE TABLE shipments (
      id int PRIMARY KEY,
      port text, teu int,
      notes text
    );
    INSERT INTO shipments
    SELECT i,
      (ARRAY['VNDAD','VNSGN','VNHPH'])
        [1 + i % 3],
      1 + i % 4,
      repeat('n', 200)
    FROM generate_series(1, 2000) AS i;
  steps:
    - task:
        vi: "Cột `teu` chiếm bao nhiêu byte trên cả bảng? Trả một cột `teu_bytes`."
        en: "How many bytes does the `teu` column take over the whole table? Return one column `teu_bytes`."
      solution: |
        SELECT sum(pg_column_size(teu))
          AS teu_bytes
        FROM shipments;
      check: rows
      hint:
        vi: "`sum(pg_column_size(teu))` trên `shipments`."
        en: "`sum(pg_column_size(teu))` on `shipments`."
    - task:
        vi: "Một kho lưu theo dòng đọc cả dòng. Cả các dòng chiếm bao nhiêu byte? Trả `row_bytes`."
        en: "A row store reads whole rows. How many bytes do the whole rows take? Return `row_bytes`."
      solution: |
        SELECT sum(pg_column_size(s.*))
          AS row_bytes
        FROM shipments s;
      check: rows
      hint:
        vi: "Đặt bí danh `s` cho bảng rồi đo `pg_column_size(s.*)`, cộng lại."
        en: "Alias the table as `s`, measure `pg_column_size(s.*)` and sum it."
    - task:
        vi: "Dựng bảng hẹp `col_teu` chỉ có `id` và `teu`, lấy từ `shipments`, như một cột lưu riêng."
        en: "Build a narrow table `col_teu` with only `id` and `teu`, taken from `shipments`, like a column stored apart."
      solution: |
        CREATE TABLE col_teu AS
        SELECT id, teu FROM shipments;
      after: |
        SELECT count(*) AS n, sum(teu) AS teu,
          pg_relation_size('col_teu')
            < pg_relation_size('shipments')
            AS smaller
        FROM col_teu
      check: rows
      hint:
        vi: "`CREATE TABLE col_teu AS SELECT id, teu FROM shipments`."
        en: "`CREATE TABLE col_teu AS SELECT id, teu FROM shipments`."
quiz:
  - q:
      vi: "Bảng có 4 cột, `notes` chiếm gần hết mỗi dòng. Ở kho lưu theo dòng, `SELECT sum(teu)` đọc những gì?"
      en: "The table has 4 columns and `notes` takes most of each row. In a row store, what does `SELECT sum(teu)` read?"
    options:
      - { vi: "Chỉ các giá trị của cột `teu`", en: "Only the values of column `teu`" }
      - { vi: "Mọi trang của bảng, cả `notes`", en: "Every page of the table, `notes` too" }
      - { vi: "Chỉ chỉ mục khóa chính", en: "Only the primary key index" }
    answer: 1
    trap: 0
    why:
      vi: "Câu chỉ nhắc `teu`, nên dễ nghĩ nó chỉ đọc cột đó, nhưng ở kho lưu theo dòng các cột của một dòng nằm liền nhau trong cùng một trang. Muốn lấy `teu` của mọi dòng thì phải đọc mọi trang, kéo theo cả `notes`. Chỉ mục khóa chính không chứa `teu`, nên không trả lời được câu này."
      en: "The query names only `teu`, so it is tempting to think it reads just that column, but in a row store a row's columns sit side by side in the same page. Getting `teu` from every row means reading every page, `notes` included. The primary key index does not hold `teu`, so it cannot answer this query."
  - q:
      vi: "Vì sao kho lưu theo cột nén tốt hơn kho lưu theo dòng?"
      en: "Why does a column store compress better than a row store?"
    options:
      - { vi: "Nó dùng thuật toán nén mạnh hơn", en: "It uses a stronger compression algorithm" }
      - { vi: "Nó bỏ các dòng trùng nhau", en: "It drops duplicate rows" }
      - { vi: "Các giá trị cùng kiểu nằm liền nhau", en: "Values of one type sit together" }
    answer: 2
    trap: 0
    why:
      vi: "Thuật toán nén có thể là cùng một loại; điều khác là dữ liệu được đưa vào. Một cột chỉ chứa giá trị cùng kiểu và thường lặp lại (cảng `VNDAD` nhiều lần), nên nén được nhiều. Một dòng trộn số, chữ và ngày, khó nén hơn. Kho lưu theo cột không bỏ dòng trùng: mọi dòng vẫn còn."
      en: "The compression algorithm can be the same kind; what differs is the data fed to it. A column holds values of one type that often repeat (port `VNDAD` many times), so it compresses well. A row mixes numbers, text and dates and compresses worse. A column store does not drop duplicate rows: every row is still there."
---
## Mở bài

Báo cáo TEU của Cargo Query chỉ cần cột `teu`, nhưng bảng `shipments` còn cột `notes` dài 200 ký tự mỗi dòng. Bài này đo xem một kho lưu theo dòng phải đọc thêm bao nhiêu vì cột đó.

## Ý chính

Ở **kho lưu theo dòng** (row store) như PostgreSQL, các cột của một dòng nằm liền nhau trong một trang 8 KB. Đọc một cột của mọi dòng là đọc mọi trang, nên các cột không cần cũng bị đọc theo.

Ở **kho lưu theo cột** (column store) như ClickHouse, mỗi cột được lưu riêng: tài liệu ClickHouse viết rằng giá trị của mỗi cột được lưu liên tiếp nhau, nên lọc và gộp trên cột nhanh hơn nhiều. Câu gộp `teu` chỉ đọc cột `teu`. Đổi lại, đọc trọn một dòng phải ghép lại từ mọi cột, nên kho theo cột không hợp với việc mở từng lô.

PostgreSQL không lưu theo cột, nhưng ta đo được chênh lệch bằng `pg_column_size`: số byte của một cột so với số byte của cả dòng. Một bảng hẹp chỉ giữ cột cần là cách bắt chước gần nhất.

## Cú pháp

```sql
SELECT sum(pg_column_size(teu))
  AS teu_bytes
FROM shipments;
```

- `pg_column_size(x)` trả số byte giá trị `x` chiếm khi lưu.
- `pg_column_size(s.*)` với `s` là bí danh bảng đo cả dòng.
- `pg_relation_size('t')` trả số byte các trang của bảng `t`.

## Ví dụ

Số byte của cột `teu` và của cột `notes`.

```sql
SELECT sum(pg_column_size(teu))
    AS teu_bytes,
  sum(pg_column_size(notes))
    AS notes_bytes
FROM shipments;
```

Bảng chiếm bao nhiêu trang 8 KB.

```sql
SELECT pg_relation_size('shipments')
  / 8192 AS pages;
```

## Lỗi hay gặp

Đo một cột rồi nghĩ đó là lượng PostgreSQL đọc. Kho lưu theo dòng đọc cả dòng.

```sql
-- WRONG: what a column store reads
SELECT sum(pg_column_size(teu))
  AS bytes_read
FROM shipments;
```

```sql
-- FIX: what a row store reads
SELECT sum(pg_column_size(s.*))
  AS bytes_read
FROM shipments s;
```

Gọi `pg_column_size(*)`: dấu sao một mình không phải một giá trị, nên PostgreSQL tìm một hàm không nhận đối số và không thấy.

```sql
-- ERROR 42883: no such function
SELECT pg_column_size(*)
FROM shipments;
```

## Thực hành

Ba bước: đo cột `teu`, đo cả dòng, rồi dựng bảng hẹp `col_teu` và so cỡ của nó với `shipments`.

## Tóm tắt

- Kho lưu theo dòng để các cột của một dòng liền nhau, nên đọc một cột là đọc mọi trang.
- Kho lưu theo cột lưu mỗi cột riêng, nên câu gộp chỉ đọc các cột nó nhắc tới.
- `pg_column_size` đo một cột hoặc cả dòng; `pg_relation_size` đo cả bảng.
- Kho theo cột hợp với báo cáo, không hợp với việc mở từng dòng.

# EN

## Opening

Cargo Query's TEU report needs only the `teu` column, but the `shipments` table also has a `notes` column of 200 characters per row. This lesson measures how much more a row store has to read because of that column.

## Key idea

In a **row store** such as PostgreSQL, a row's columns sit side by side in an 8 KB page. Reading one column of every row means reading every page, so the unused columns are read too.

In a **column store** such as ClickHouse, each column is stored apart: the ClickHouse docs say the values of each column are stored one after the other, so filters and aggregations on a column are much faster. An aggregate on `teu` reads only `teu`. In exchange, reading one whole row means putting it back together from every column, so a column store does not suit opening one shipment at a time.

PostgreSQL does not store columns apart, but we can measure the difference with `pg_column_size`: the bytes of one column against the bytes of whole rows. A narrow table holding only the needed column is the closest imitation.

## Syntax

```sql
SELECT sum(pg_column_size(teu))
  AS teu_bytes
FROM shipments;
```

- `pg_column_size(x)` returns the bytes value `x` takes when stored.
- `pg_column_size(s.*)`, with `s` the table alias, measures the whole row.
- `pg_relation_size('t')` returns the bytes of table `t`'s pages.

## Example

The bytes of column `teu` and of column `notes`.

```sql
SELECT sum(pg_column_size(teu))
    AS teu_bytes,
  sum(pg_column_size(notes))
    AS notes_bytes
FROM shipments;
```

How many 8 KB pages the table takes.

```sql
SELECT pg_relation_size('shipments')
  / 8192 AS pages;
```

## Common mistakes

Measuring one column and thinking that is what PostgreSQL reads. A row store reads whole rows.

```sql
-- WRONG: what a column store reads
SELECT sum(pg_column_size(teu))
  AS bytes_read
FROM shipments;
```

```sql
-- FIX: what a row store reads
SELECT sum(pg_column_size(s.*))
  AS bytes_read
FROM shipments s;
```

Calling `pg_column_size(*)`: a bare star is not a value, so PostgreSQL looks for a function with no argument and finds none.

```sql
-- ERROR 42883: no such function
SELECT pg_column_size(*)
FROM shipments;
```

## Practice

Three steps: measure column `teu`, measure whole rows, then build the narrow table `col_teu` and compare its size with `shipments`.

## Recap

- A row store keeps a row's columns together, so reading one column reads every page.
- A column store keeps each column apart, so an aggregate reads only the columns it names.
- `pg_column_size` measures one column or a whole row; `pg_relation_size` measures a table.
- A column store suits reports, not opening one row at a time.
