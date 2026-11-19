---
id: e-pg-l2-08
engine: postgres
level: L2
module: index-types
title: BRIN cho dữ liệu ghi theo thời gian
title_en: BRIN for data written in time order
kind: predict
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-brin-ranges
objectives:
  - vi: Chọn BRIN cho cột tăng dần theo thứ tự ghi (thời gian đo, log), và giải thích vì sao index của 30 000 dòng chỉ chiếm vài trang.
    en: Choose BRIN for a column that grows in write order (measurement time, logs), and explain why the index for 30,000 rows takes only a few pages.
  - vi: 'Biết BRIN là index "thô": nó loại trừ khối trang, rồi phải kiểm lại từng dòng (`Recheck Cond`).'
    en: Know BRIN is a lossy index that rules out block ranges and then rechecks each row (`Recheck Cond`).
requires: [e-pg-l2-07]
sources:
  - https://www.postgresql.org/docs/18/brin.html
  - https://www.postgresql.org/docs/18/indexes-types.html
lab:
  setup: |
    CREATE TABLE readings (
      id bigint PRIMARY KEY,
      taken_at timestamptz NOT NULL,
      value numeric(6,2) NOT NULL
    );
    INSERT INTO readings
    SELECT g, timestamptz '2026-01-01 00:00+00' + g * interval '10 minutes', (g % 400) / 4.0
    FROM generate_series(1, 30000) AS g;
    CREATE INDEX readings_taken_brin ON readings USING brin (taken_at) WITH (pages_per_range = 8);
    ANALYZE readings;
  steps:
    - task:
        vi: "So kích thước: trả về số trang (`relpages`) của bảng `readings` và của index `readings_taken_brin`, sắp theo tên (`relname`)."
        en: "Compare sizes: return the page count (`relpages`) of table `readings` and of index `readings_taken_brin`, ordered by name (`relname`)."
      solution: SELECT relname, relpages FROM pg_class WHERE relname IN ('readings', 'readings_taken_brin') ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "`pg_class` có cột `relname` và `relpages`; lọc bằng `IN (...)`."
        en: "`pg_class` has columns `relname` and `relpages`; filter with `IN (...)`."
predict:
  sql: SELECT count(*) FROM readings WHERE taken_at >= timestamptz '2026-03-01 00:00+00' AND taken_at < timestamptz '2026-03-02 00:00+00'
  expect: { node: Bitmap Index Scan, index: readings_taken_brin }
  q:
    vi: "30 000 số đo, mỗi 10 phút một số, ghi theo đúng thứ tự thời gian. Có index BRIN trên `taken_at`. Đếm số đo của một ngày thì kế hoạch là gì?"
    en: "30,000 readings, one every 10 minutes, written in time order. There is a BRIN index on `taken_at`. What is the plan for counting one day's readings?"
  options:
    - { vi: "Seq Scan: BRIN chỉ là bản tóm tắt, không dùng để tìm được", en: "Seq Scan: BRIN is only a summary and cannot be used for lookups" }
    - { vi: "Bitmap Heap Scan với `Recheck Cond`, qua Bitmap Index Scan trên `readings_taken_brin`", en: "Bitmap Heap Scan with `Recheck Cond`, over a Bitmap Index Scan on `readings_taken_brin`" }
    - { vi: "Index Scan trả đúng 144 dòng, không cần kiểm lại", en: "Index Scan returning exactly 144 rows, no recheck needed" }
  answer: 1
  why:
    vi: "BRIN lưu min/max của `taken_at` cho mỗi khối 8 trang. Vì dữ liệu ghi theo thời gian, chỉ một hai khối có khoảng giao với ngày cần đếm. Bitmap Index Scan đánh dấu các khối đó (planner ước 1250 dòng, tức vài khối), Bitmap Heap Scan đọc chúng và `Recheck Cond` lọc lại từng dòng, còn 144. BRIN không bao giờ trỏ thẳng tới dòng, nên không có Index Scan."
    en: "BRIN stores the min/max of `taken_at` for each 8-page block range. Because data was written in time order, only one or two ranges overlap the day. The Bitmap Index Scan marks those ranges (the planner estimates 1250 rows, a few ranges), the Bitmap Heap Scan reads them and `Recheck Cond` filters each row, leaving 144. BRIN never points at individual rows, so there is no plain Index Scan."
---
## Ý chính

BRIN (Block Range INdex) không lưu từng dòng. Nó chia bảng thành các khối liên tiếp gồm `pages_per_range` trang (mặc định 128) và với mỗi khối chỉ lưu một bản tóm tắt, thường là min và max của cột.

- Truy vấn khoảng: khối nào có [min, max] không giao với khoảng cần tìm thì bỏ qua cả khối; các khối còn lại được đọc và kiểm lại từng dòng.
- Index cực nhỏ: một dòng tóm tắt cho mỗi khối, thay vì một mục cho mỗi dòng như B-tree.
- Chỉ hiệu quả khi giá trị tương quan với vị trí vật lý trong bảng: dữ liệu ghi theo thời gian, id tăng dần. Nếu giá trị bị xáo trộn, mọi khối đều có min nhỏ và max lớn, và BRIN không loại được khối nào.

Opclass khác: `minmax-multi` (nhiều khoảng mỗi khối), `bloom`, `inclusion` (cho kiểu hình học, range).

## Ví dụ

```sql
SELECT round(corr(id, extract(epoch FROM taken_at))::numeric, 3) AS physical_order FROM readings;
```

Kết quả 1.000: thứ tự ghi trùng thứ tự thời gian, đúng điều kiện để BRIN có ích.

## Thực hành

Đoán kế hoạch đếm số đo của một ngày, xem kế hoạch thật, rồi so số trang của bảng và của index BRIN.

# EN

## Key idea

BRIN (Block Range INdex) does not store individual rows. It divides the table into consecutive ranges of `pages_per_range` pages (128 by default) and keeps only a summary per range, usually the min and max of the column.

- Range queries: a range whose [min, max] does not overlap the search is skipped entirely; the remaining ranges are read and each row is rechecked.
- A tiny index: one summary row per range, instead of one entry per row like a B-tree.
- Only effective when values correlate with the physical position in the table: data written in time order, increasing ids. If values are shuffled, every range has a small min and a large max, and BRIN rules out nothing.

Other opclasses: `minmax-multi` (several intervals per range), `bloom`, `inclusion` (for geometric and range types).

## Example

```sql
SELECT round(corr(id, extract(epoch FROM taken_at))::numeric, 3) AS physical_order FROM readings;
```

Result 1.000: write order matches time order, exactly the condition for BRIN to help.

## Practice

Guess the plan for counting one day's readings, see the real plan, then compare the page counts of the table and of the BRIN index.
