---
id: e-ol-l2-04
engine: olap
level: L2
module: columnar
title: "Nén, thực thi theo lô và vì sao SELECT * tốn"
title_en: "Compression, batch execution and why SELECT * costs"
kind: concept
runtime: docs
minutes: 20
figures: [{ name: ol-runs, at: idea }]
objectives:
  - vi: Giải thích vì sao một cột nén tốt, và vì sao sắp xếp dữ liệu làm nó nén tốt hơn nữa.
    en: Explain why a column compresses well, and why sorting the data makes it compress even better.
  - vi: Hiểu thực thi theo lô (vectorized execution) xử lý nhiều giá trị một lúc thay vì từng dòng.
    en: Understand that vectorized execution processes many values at once instead of one row at a time.
  - vi: Thấy vì sao `SELECT *` trên kho lưu theo cột đọc và giải nén mọi cột.
    en: See why `SELECT *` on a column store reads and decompresses every column.
requires: [e-ol-l1-02]
sources:
  - { url: "https://clickhouse.com/docs/concepts/why-clickhouse-is-so-fast", title: "ClickHouse docs: Why is ClickHouse so fast?" }
  - { url: "https://clickhouse.com/docs/intro", title: "ClickHouse docs: What is ClickHouse?" }
  - { url: "https://www.postgresql.org/docs/18/functions-window.html", title: "PostgreSQL 18 docs: Window Functions" }
demo_setup: |
  CREATE TABLE cargo (
    id int PRIMARY KEY,
    port text, teu int,
    notes text
  );
  INSERT INTO cargo
  SELECT i,
    (ARRAY['VNDAD','VNSGN','VNHPH'])
      [1 + i * 7 % 3],
    1 + i % 4,
    repeat('n', 120)
  FROM generate_series(1, 3000) AS i;
quiz:
  - q:
      vi: "Cột `port` có 3 giá trị trên 3.000 dòng. Sắp theo `port` trước khi lưu thì số đoạn liền một giá trị (run) còn bao nhiêu?"
      en: "Column `port` has 3 values over 3,000 rows. Sorted by `port` before storing, how many runs of one value are left?"
    options:
      - { vi: "3.000, mỗi dòng một đoạn", en: "3,000, one per row" }
      - { vi: "1.000", en: "1,000" }
      - { vi: "3", en: "3" }
    answer: 2
    trap: 0
    why:
      vi: "3.000 đoạn là khi các cảng xen kẽ, như thứ tự ghi trong bảng ví dụ. Sắp theo `port` thì mọi dòng `VNDAD` liền nhau, rồi `VNHPH`, rồi `VNSGN`: còn đúng 3 đoạn, mỗi đoạn ghi được một lần cùng số lần lặp. 1.000 là số dòng của mỗi cảng, không phải số đoạn."
      en: "3,000 runs is when the ports alternate, as in the example table's insert order. Sorted by `port`, every `VNDAD` row sits together, then `VNHPH`, then `VNSGN`: exactly 3 runs remain, each written once with its repeat count. 1,000 is the row count of each port, not the number of runs."
  - q:
      vi: "Thực thi theo lô (vectorized execution) nhanh hơn chủ yếu vì sao?"
      en: "Why is vectorized execution faster, mainly?"
    options:
      - { vi: "Nó chạy trên GPU", en: "It runs on the GPU" }
      - { vi: "Xử lý theo lô, không từng dòng", en: "Batches of values, not single rows" }
      - { vi: "Nó bỏ qua các dòng trùng", en: "It skips duplicate rows" }
    answer: 1
    trap: 0
    why:
      vi: "Không cần GPU: tài liệu ClickHouse mô tả các toán tử trong kế hoạch truyền dữ liệu cho nhau theo lô thay vì từng dòng, nên tận dụng bộ nhớ đệm CPU và lệnh SIMD xử lý nhiều giá trị trong một lệnh. Kết quả vẫn đủ mọi dòng: thực thi theo lô không bỏ dòng trùng."
      en: "No GPU is needed: the ClickHouse docs describe plan operators passing data to each other in batches instead of single rows, which makes better use of CPU caches and lets SIMD instructions handle several values per instruction. The result still has every row: vectorized execution does not skip duplicates."
---
## Mở bài

Kho lưu theo cột không chỉ đọc ít cột hơn: nó còn nén từng cột rất mạnh và xử lý giá trị theo lô. Bài này đọc hai ý đó trong tài liệu ClickHouse, rồi đếm trên PostgreSQL vì sao thứ tự sắp xếp làm một cột dễ nén.

## Ý chính

**Nén.** Tài liệu ClickHouse viết rằng kho lưu theo cột đặc biệt hợp với nén: các giá trị cùng kiểu nằm liền nhau. Một cách nén đơn giản là ghi một đoạn lặp (run) một lần cùng số lần lặp. Cột `port` có 3 giá trị: ghi theo thứ tự chèn thì các cảng xen kẽ và gần như mỗi dòng là một đoạn; sắp theo `port` thì chỉ còn 3 đoạn. Dữ liệu nhỏ hơn thì đọc đĩa và mạng ít hơn.

**Thực thi theo lô** (vectorized execution). Các toán tử của kế hoạch truyền dữ liệu cho nhau theo lô thay vì từng dòng; CPU dùng bộ nhớ đệm tốt hơn và lệnh SIMD xử lý nhiều giá trị trong một lệnh.

**`SELECT *`** trên kho theo cột phải đọc, giải nén và ghép lại mọi cột, kể cả cột `notes` dài mà báo cáo không cần. Chọn đúng cột là cách rẻ nhất để báo cáo nhanh.

## Ví dụ

Theo thứ tự `id`, cột `port` bị cắt thành bao nhiêu đoạn liền một giá trị.

```sql
SELECT count(*) AS runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY id) AS prev
  FROM cargo
) r
WHERE prev IS DISTINCT FROM port;
```

Cột `port` có ít giá trị khác nhau so với số dòng: rất hợp để nén.

```sql
SELECT count(DISTINCT port) AS ports,
  count(*) AS row_count
FROM cargo;
```

## Lỗi hay gặp

Lưu theo thứ tự chèn rồi mong cột nén tốt. Sắp theo `port` trước thì số đoạn giảm từ hàng nghìn xuống 3.

```sql
-- WRONG: insert order, many runs
SELECT count(*) AS runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY id) AS prev
  FROM cargo
) r
WHERE prev IS DISTINCT FROM port;
```

```sql
-- FIX: sorted by port, 3 runs
SELECT count(*) AS runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY port, id) AS prev
  FROM cargo
) r
WHERE prev IS DISTINCT FROM port;
```

`SELECT *` cho một báo cáo cần hai cột: số byte phải đọc gồm cả `notes`.

```sql
-- WRONG: every column
SELECT sum(pg_column_size(c.*))
  AS bytes_read
FROM cargo c;
```

```sql
-- FIX: the two columns needed
SELECT sum(pg_column_size(port)
  + pg_column_size(teu))
  AS bytes_read
FROM cargo;
```

## Tóm tắt

- Một cột chứa giá trị cùng kiểu, hay lặp lại, nên nén tốt.
- Sắp xếp theo cột ít giá trị gom các giá trị lặp thành ít đoạn dài.
- Thực thi theo lô xử lý nhiều giá trị một lúc, dùng bộ nhớ đệm và SIMD.
- `SELECT *` đọc và giải nén mọi cột: chỉ chọn cột cần.

# EN

## Opening

A column store does not just read fewer columns: it also compresses each column hard and processes values in batches. This lesson reads those two ideas in the ClickHouse docs, then counts on PostgreSQL why sort order makes a column easy to compress.

## Key idea

**Compression.** The ClickHouse docs say column stores are particularly well suited to compression: values of the same type sit together. One simple scheme writes a run of repeats once with its repeat count. Column `port` has 3 values: in insert order the ports alternate and almost every row is a run of its own; sorted by `port`, only 3 runs are left. Smaller data means less disk and network reading.

**Vectorized execution.** The plan's operators pass data to each other in batches instead of single rows; the CPU uses its caches better and SIMD instructions handle several values per instruction.

**`SELECT *`** on a column store has to read, decompress and put back together every column, including the long `notes` column the report does not need. Picking the right columns is the cheapest way to a fast report.

## Example

In `id` order, how many runs of one value column `port` is cut into.

```sql
SELECT count(*) AS runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY id) AS prev
  FROM cargo
) r
WHERE prev IS DISTINCT FROM port;
```

Column `port` has few distinct values compared with its row count: a good fit for compression.

```sql
SELECT count(DISTINCT port) AS ports,
  count(*) AS row_count
FROM cargo;
```

## Common mistakes

Storing in insert order and expecting the column to compress well. Sorting by `port` first takes the runs from thousands down to 3.

```sql
-- WRONG: insert order, many runs
SELECT count(*) AS runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY id) AS prev
  FROM cargo
) r
WHERE prev IS DISTINCT FROM port;
```

```sql
-- FIX: sorted by port, 3 runs
SELECT count(*) AS runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY port, id) AS prev
  FROM cargo
) r
WHERE prev IS DISTINCT FROM port;
```

`SELECT *` for a report that needs two columns: the bytes read include `notes`.

```sql
-- WRONG: every column
SELECT sum(pg_column_size(c.*))
  AS bytes_read
FROM cargo c;
```

```sql
-- FIX: the two columns needed
SELECT sum(pg_column_size(port)
  + pg_column_size(teu))
  AS bytes_read
FROM cargo;
```

## Recap

- A column holds values of one type that often repeat, so it compresses well.
- Sorting by a low-cardinality column gathers repeats into a few long runs.
- Vectorized execution processes many values at once, using caches and SIMD.
- `SELECT *` reads and decompresses every column: select only what you need.
