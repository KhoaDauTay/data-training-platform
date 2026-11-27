---
id: e-ts-l3-03
engine: timeseries
level: L3
module: storage
title: Index BRIN cho cột thời gian
title_en: BRIN indexes on time
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ts-brin-append, at: idea }]
objectives:
  - vi: Tạo index BRIN trên cột thời gian của một bảng chỉ ghi thêm, và so cỡ của nó với B-tree.
    en: Create a BRIN index on the time column of an append-only table, and compare its size with a B-tree.
  - vi: Viết câu lọc một ngày mà BRIN dùng được.
    en: Write a one-day filter that BRIN can use.
  - vi: Kiểm `pg_stats.correlation` để biết thứ tự ghi có còn theo thời gian không.
    en: Check `pg_stats.correlation` to know whether write order still follows time.
requires: [e-ts-l3-02]
sources:
  - { url: https://www.postgresql.org/docs/18/brin.html, title_vi: "Index BRIN" }
  - { url: https://www.postgresql.org/docs/18/view-pg-stats.html, title_vi: "pg_stats" }
lab:
  setup: |
    CREATE TABLE gps (
      id bigint PRIMARY KEY,
      truck_id int NOT NULL,
      ts timestamptz NOT NULL,
      speed_kmh int NOT NULL
    );
    INSERT INTO gps
    SELECT g, 1 + g % 40,
      timestamptz '2026-10-01 00:00+00'
        + g * interval '1 minute',
      (g * 13) % 70
    FROM generate_series(1, 25000) g;
    ANALYZE gps;
  steps:
    - task:
        vi: "Tạo index BRIN `gps_ts_brin` trên cột `ts` của bảng `gps`, mỗi khối 8 trang (`pages_per_range = 8`)."
        en: "Create the BRIN index `gps_ts_brin` on column `ts` of table `gps`, 8 pages per range (`pages_per_range = 8`)."
      solution: |
        CREATE INDEX gps_ts_brin ON gps
          USING brin (ts)
          WITH (pages_per_range = 8)
      check: catalog
      hint:
        vi: "`CREATE INDEX gps_ts_brin ON gps USING brin (ts) WITH (pages_per_range = 8)`."
        en: "`CREATE INDEX gps_ts_brin ON gps USING brin (ts) WITH (pages_per_range = 8)`."
    - task:
        vi: "Ngày 10/10/2026 (UTC) có bao nhiêu điểm GPS và tốc độ trung bình bao nhiêu (làm tròn 1 chữ số)? Trả `points`, `avg_kmh`. Bài chấm cả tốc độ: đúng mà không dùng được `gps_ts_brin` là chưa đạt."
        en: "How many GPS points did 10 Oct 2026 (UTC) have, and what was the average speed (rounded to 1 decimal)? Return `points`, `avg_kmh`. Speed is graded too: a right answer that cannot use `gps_ts_brin` does not pass."
      solution: |
        SELECT count(*) AS points,
          round(avg(speed_kmh), 1) AS avg_kmh
        FROM gps
        WHERE ts >= '2026-10-10 00:00+00'
          AND ts < '2026-10-11 00:00+00'
      check: rows
      perf: { table: gps }
      slow: |
        SELECT count(*) AS points,
          round(avg(speed_kmh), 1) AS avg_kmh
        FROM gps
        WHERE date_trunc('day', ts)
          = '2026-10-10 00:00+00'
      hint:
        vi: "So thẳng `ts` với hai mốc: `>=` đầu ngày và `<` đầu ngày hôm sau."
        en: "Compare `ts` itself with two bounds: `>=` the start of the day and `<` the start of the next day."
    - task:
        vi: "Cột nào của `gps` có thứ tự giá trị đi theo thứ tự ghi, nên hợp với BRIN? Trả `attname` và `corr` (`correlation` trong `pg_stats`, làm tròn 2 chữ số) của hai cột `ts` và `truck_id`, xếp theo `attname`."
        en: "Which column of `gps` has values that follow write order, and so suits BRIN? Return `attname` and `corr` (the `correlation` in `pg_stats`, rounded to 2 decimals) of the two columns `ts` and `truck_id`, sorted by `attname`."
      solution: |
        SELECT attname,
          round(correlation::numeric, 2)
            AS corr
        FROM pg_stats
        WHERE tablename = 'gps'
          AND attname IN ('ts', 'truck_id')
        ORDER BY attname
      check: rows
      ordered: true
      hint:
        vi: "`pg_stats` có `tablename`, `attname` và `correlation`; ép `correlation::numeric` để `round` được."
        en: "`pg_stats` has `tablename`, `attname` and `correlation`; cast `correlation::numeric` so `round` can take it."
quiz:
  - q:
      vi: "Bảng `gps` 25.000 dòng ghi theo thời gian. Index BRIN trên `ts` (8 trang mỗi khối) cỡ 3 trang; B-tree cỡ bao nhiêu?"
      en: "Table `gps`, 25,000 rows written in time order. A BRIN index on `ts` (8 pages per range) takes 3 pages; how big is a B-tree?"
    options:
      - { vi: "Cũng khoảng 3 trang, vì cùng một cột", en: "About 3 pages too, because it is the same column" }
      - { vi: "Khoảng 71 trang, vì nó giữ một mục cho mỗi dòng", en: "About 71 pages, because it keeps one entry per row" }
      - { vi: "Nhỏ hơn BRIN, vì B-tree nén tốt hơn", en: "Smaller than BRIN, because a B-tree compresses better" }
    answer: 1
    trap: 0
    why:
      vi: "Cùng một cột nên dễ nghĩ hai index cỡ như nhau, nhưng B-tree giữ một mục (giá trị + vị trí dòng) cho mỗi dòng trong 25.000 dòng, nên ở lab này nó chiếm 71 trang. BRIN chỉ giữ min và max của `ts` cho mỗi khối 8 trang (block range); bảng 184 trang chỉ có 23 khối, nên index chỉ 3 trang, nhỏ hơn khoảng 24 lần (71 ÷ 3). B-tree không nén để nhỏ hơn BRIN được."
      en: "It is the same column, so it is easy to think both indexes are the same size, but a B-tree keeps one entry (value + row location) for each of the 25,000 rows, so in this lab it takes 71 pages. BRIN keeps only the min and max of `ts` for each block range of 8 pages; the 184-page table has only 23 ranges, so the index is 3 pages, about 24 times smaller (71 ÷ 3). A B-tree does not compress below a BRIN."
  - q:
      vi: "Thiết bị gửi bù dữ liệu của tuần trước vào cuối bảng mỗi đêm. Điều gì xảy ra với BRIN trên `ts`?"
      en: "Devices backfill last week's data at the end of the table every night. What happens to the BRIN on `ts`?"
    options:
      - { vi: "BRIN báo lỗi khi dòng về sai thứ tự", en: "BRIN raises an error when rows arrive out of order" }
      - { vi: "Không đổi gì, BRIN tự sắp lại dòng", en: "Nothing changes, BRIN re-sorts the rows itself" }
      - { vi: "Khối cuối có min–max rộng, bị đọc nhiều hơn", en: "The last ranges get a wide min–max and are read more" }
    answer: 2
    trap: 1
    why:
      vi: "BRIN không sắp lại dòng, nên \"không đổi gì\" là sai: nó chỉ tóm tắt bảng như đang nằm trên đĩa. Khi dòng của tuần trước được ghi vào cuối bảng, khối cuối chứa cả thời điểm mới lẫn cũ, nên khoảng min–max của nó phủ cả tuần, và mọi câu lọc trong tuần đó đều phải đọc khối này. Không có lỗi nào; index chỉ kém dần. `pg_stats.correlation` tụt khỏi 1 là dấu hiệu; opclass `minmax-multi` chịu được vài giá trị lạc chỗ (bài \"Bên trong BRIN: khoảng khối và tóm tắt\")."
      en: "BRIN never re-sorts rows, so \"nothing changes\" is wrong: it only summarises the table as it lies on disk. When last week's rows are written at the end of the table, the last range holds both new and old times, so its min–max spans the whole week, and every query filtering within that week must read this range. There is no error; the index just gets worse. A `pg_stats.correlation` dropping below 1 is the sign; the `minmax-multi` opclass tolerates a few stray values (lesson \"BRIN internals: block ranges and summarization\")."
---
## Mở bài

Bảng GPS của đội xe nhận một điểm mỗi phút, 25.000 điểm trong 17 ngày, luôn ghi thêm ở cuối theo thời gian. Bài `e-pg-l2-08` đã giới thiệu BRIN; bài này nhìn nó như một công cụ của dữ liệu chuỗi thời gian: khi nào nó hợp, và điều gì làm nó kém đi.

## Ý chính

**Ghi thêm theo thời gian là điều kiện của BRIN.** BRIN (Block Range INdex) chia bảng thành các khối liên tiếp gồm `pages_per_range` trang và chỉ giữ min, max của cột cho mỗi khối. Bảng chuỗi thời gian ghi dòng theo thời gian, nên mỗi khối chứa một khoảng giờ hẹp, và câu lọc một ngày bỏ qua được gần hết các khối.

**Rất nhỏ.** Một B-tree giữ một mục cho mỗi dòng; BRIN giữ một bản tóm tắt cho mỗi khối. Ở lab này BRIN chỉ 3 trang, B-tree 71 trang. Với bảng hàng tỷ dòng, khác biệt này là hàng chục GB.

**Thô, nên phải kiểm lại.** BRIN chỉ nói "khối này có thể có dòng khớp", nên kế hoạch là Bitmap Index Scan rồi Bitmap Heap Scan với `Recheck Cond`. Nó không hợp cho câu tìm một dòng, và không làm được ràng buộc duy nhất.

**Dữ liệu về sai thứ tự làm nó kém đi.** Gửi bù dữ liệu cũ vào cuối bảng làm khối cuối có khoảng min–max rộng. `pg_stats.correlation` gần 1 là tốt; tụt dần là dấu hiệu. Bài `e-pg-l5-05` nói về tóm tắt khối và opclass `minmax-multi`.

Hình cuối mục cho thấy các khối của bảng `gps` và ba khối có khoảng giao với ngày 10/10.

## Cú pháp

```sql
CREATE INDEX gps_ts_brin ON gps
  USING brin (ts)
  WITH (pages_per_range = 8);
-- a filter BRIN can use
WHERE ts >= '2026-10-10 00:00+00'
  AND ts < '2026-10-11 00:00+00'
-- does write order follow time?
SELECT correlation FROM pg_stats
WHERE tablename = 'gps'
  AND attname = 'ts';
```

- `pages_per_range` nhỏ: index lớn hơn một chút, loại được nhiều khối hơn.
- Bọc `ts` trong hàm (`date_trunc`, `::date`) thì BRIN, cũng như B-tree, không dùng được.

## Ví dụ

Cỡ của bảng, của BRIN và của B-tree trên cùng cột:

```sql
CREATE INDEX demo_brin ON gps
  USING brin (ts)
  WITH (pages_per_range = 8);
CREATE INDEX demo_btree ON gps (ts);
SELECT relname, relpages
FROM pg_class
WHERE relname IN ('gps', 'demo_brin',
  'demo_btree')
ORDER BY relname;
```

Kế hoạch của câu lọc một ngày dùng BRIN:

```sql
DROP INDEX demo_btree;
EXPLAIN (COSTS OFF)
SELECT count(*) FROM gps
WHERE ts >= '2026-10-10 00:00+00'
  AND ts < '2026-10-11 00:00+00';
```

## Lỗi hay gặp

Bọc `ts` trong `date_trunc`: BRIN không loại được khối nào.

```sql
-- WRONG: the function hides ts
EXPLAIN (COSTS OFF)
SELECT count(*) FROM gps
WHERE date_trunc('day', ts)
  = '2026-10-10 00:00+00';
```

```sql
-- FIX: compare ts with two bounds
EXPLAIN (COSTS OFF)
SELECT count(*) FROM gps
WHERE ts >= '2026-10-10 00:00+00'
  AND ts < '2026-10-11 00:00+00';
```

Dùng BRIN để chặn trùng:

```sql
-- ERROR 0A000
CREATE UNIQUE INDEX gps_id_brin
  ON gps USING brin (id);
```

## Thực hành

Ba câu: tạo index BRIN trên `ts`, tổng hợp một ngày sao cho vừa đúng vừa nhanh, và so `correlation` của `ts` với `truck_id`.

## Tóm tắt

- BRIN hợp với bảng ghi thêm theo thời gian: mỗi khối giữ một khoảng giờ hẹp.
- Nó rất nhỏ (3 trang so với 71 trang của B-tree ở đây), nhưng thô: luôn kiểm lại từng dòng.
- So thẳng `ts` với hai mốc; bọc cột trong hàm thì BRIN vô dụng.
- Dữ liệu gửi bù vào cuối bảng làm BRIN kém đi; theo dõi `pg_stats.correlation`.

# EN

## Opening

The fleet's GPS table receives one point a minute, 25,000 points in 17 days, always appended at the end in time order. Lesson `e-pg-l2-08` introduced BRIN; this lesson looks at it as a time-series tool: when it fits, and what makes it worse.

## Key idea

**Appending in time order is BRIN's condition.** BRIN (Block Range INdex) splits the table into consecutive ranges of `pages_per_range` pages and keeps only the column's min and max for each range. A time-series table writes rows in time order, so each range holds a narrow span of hours, and a one-day filter can skip almost every range.

**Very small.** A B-tree keeps one entry per row; BRIN keeps one summary per range. In this lab BRIN takes 3 pages, the B-tree 71. For a table with billions of rows, the difference is tens of GB.

**Lossy, so it rechecks.** BRIN only says "this range may hold matching rows", so the plan is a Bitmap Index Scan, then a Bitmap Heap Scan with `Recheck Cond`. It does not suit single-row lookups, and it cannot enforce uniqueness.

**Out-of-order data makes it worse.** Backfilling old data at the end of the table gives the last range a wide min–max. A `pg_stats.correlation` near 1 is good; a falling one is the warning sign. Lesson `e-pg-l5-05` covers range summarisation and the `minmax-multi` opclass.

The figure at the end of this section shows the ranges of table `gps` and the three ranges whose span meets 10 Oct.

## Syntax

```sql
CREATE INDEX gps_ts_brin ON gps
  USING brin (ts)
  WITH (pages_per_range = 8);
-- a filter BRIN can use
WHERE ts >= '2026-10-10 00:00+00'
  AND ts < '2026-10-11 00:00+00'
-- does write order follow time?
SELECT correlation FROM pg_stats
WHERE tablename = 'gps'
  AND attname = 'ts';
```

- A small `pages_per_range`: a slightly bigger index that rules out more ranges.
- Wrapping `ts` in a function (`date_trunc`, `::date`) defeats BRIN, just like a B-tree.

## Example

The size of the table, the BRIN and a B-tree on the same column:

```sql
CREATE INDEX demo_brin ON gps
  USING brin (ts)
  WITH (pages_per_range = 8);
CREATE INDEX demo_btree ON gps (ts);
SELECT relname, relpages
FROM pg_class
WHERE relname IN ('gps', 'demo_brin',
  'demo_btree')
ORDER BY relname;
```

The plan of a one-day filter using BRIN:

```sql
DROP INDEX demo_btree;
EXPLAIN (COSTS OFF)
SELECT count(*) FROM gps
WHERE ts >= '2026-10-10 00:00+00'
  AND ts < '2026-10-11 00:00+00';
```

## Common mistakes

Wrapping `ts` in `date_trunc`: BRIN cannot rule out any range.

```sql
-- WRONG: the function hides ts
EXPLAIN (COSTS OFF)
SELECT count(*) FROM gps
WHERE date_trunc('day', ts)
  = '2026-10-10 00:00+00';
```

```sql
-- FIX: compare ts with two bounds
EXPLAIN (COSTS OFF)
SELECT count(*) FROM gps
WHERE ts >= '2026-10-10 00:00+00'
  AND ts < '2026-10-11 00:00+00';
```

Using BRIN to block duplicates:

```sql
-- ERROR 0A000
CREATE UNIQUE INDEX gps_id_brin
  ON gps USING brin (id);
```

## Practice

Three questions: create a BRIN index on `ts`, summarise one day so the answer is both right and fast, and compare the `correlation` of `ts` with `truck_id`.

## Recap

- BRIN suits tables appended in time order: each range holds a narrow span of hours.
- It is tiny (3 pages against the B-tree's 71 here), but lossy: it always rechecks rows.
- Compare `ts` itself with two bounds; wrapping the column in a function makes BRIN useless.
- Backfilled data at the end of the table makes BRIN worse; watch `pg_stats.correlation`.
