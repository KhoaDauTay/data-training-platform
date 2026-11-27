---
id: e-bp-t05
engine: best
track: timeseries
level: L3
module: t
title: "Lọc thời gian bằng khoảng, không bọc cột trong phép đổi kiểu"
title_en: "Filter time with a range, not a cast on the column"
kind: quiz
minutes: 4
objectives:
  - vi: "Viết điều kiện ngày trên cột thời gian dạng khoảng nửa mở (`ts >= … AND ts < …`), để index BRIN hoặc B-tree trên `ts` được dùng."
    en: "Write a day condition on a time column as a half-open range (`ts >= … AND ts < …`), so a BRIN or B-tree index on `ts` can be used."
avoid:
  vi: "`WHERE ts::date = …`: index trên `ts` bị bỏ qua, PostgreSQL đọc cả bảng số đo."
  en: "`WHERE ts::date = …`: the index on `ts` is ignored, and PostgreSQL reads the whole readings table."
requires: [e-ts-l3-03]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/brin.html
  - https://www.postgresql.org/docs/18/indexes-expressional.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine-hb
  check: plan
  setup: |
    CREATE TABLE readings_big (id int, ts timestamptz, temp numeric);
    INSERT INTO readings_big SELECT i, timestamptz '2026-01-01 00:00+00' + i * interval '5 minutes', 4 + i % 7 FROM generate_series(1, 50000) AS i;
    CREATE INDEX readings_big_ts_brin ON readings_big USING brin (ts);
    VACUUM ANALYZE readings_big;
  bad: |
    SELECT count(*) FROM readings_big
    WHERE ts::date = DATE '2026-03-01'
  good: |
    SELECT count(*) FROM readings_big
    WHERE ts >= timestamptz '2026-03-01 00:00+00'
      AND ts < timestamptz '2026-03-02 00:00+00'
  expect: { table: readings_big, bad: Seq Scan, good: Bitmap Heap Scan }
quiz:
  - q:
      vi: "Bảng có index BRIN trên `ts`. Vì sao `WHERE ts::date = DATE '2026-03-01'` không dùng được index đó?"
      en: "The table has a BRIN index on `ts`. Why can `WHERE ts::date = DATE '2026-03-01'` not use it?"
    options:
      - { vi: "Vì index lưu giá trị của `ts`, còn điều kiện so một biểu thức tính từ `ts`", en: "Because the index stores values of `ts`, while the condition compares an expression computed from `ts`" }
      - { vi: "Vì BRIN chỉ dùng được cho số nguyên", en: "Because BRIN only works on integers" }
      - { vi: "Vì bảng quá nhỏ nên planner bỏ index", en: "Because the table is too small, so the planner skips the index" }
    answer: 0
    why:
      vi: "BRIN dùng được cho thời gian, và bản Nên chạy trên cùng bảng 50 000 dòng mà vẫn dùng index, nên kích thước không phải lý do. Index trên `ts` sắp xếp hoặc tóm tắt giá trị của chính `ts`; `ts::date` là một giá trị khác, tính từng dòng, nên planner không tra index được và đọc tuần tự (Seq Scan). Viết khoảng nửa mở trên chính cột `ts` thì planner đọc qua index (Bitmap Heap Scan)."
      en: "BRIN works on time, and the Prefer version runs on the same 50,000-row table and still uses the index, so size is not the reason. An index on `ts` sorts or summarises the values of `ts` itself; `ts::date` is a different value, computed per row, so the planner cannot look it up in the index and reads sequentially (Seq Scan). Written as a half-open range on the `ts` column itself, the planner goes through the index (Bitmap Heap Scan)."
---

## Ý chính

Muốn lấy "ngày 1/3" trên cột `timestamptz`, viết khoảng nửa mở trên chính cột đó: `ts >= '2026-03-01' AND ts < '2026-03-02'`. Không bọc cột trong `::date`, `date_trunc` hay hàm nào khác.

## Vì sao

- Index (B-tree, hoặc BRIN như ở đây) được xây trên giá trị của `ts`. Điều kiện trên `ts::date` là trên một giá trị khác, nên index không giúp được.
- BRIN rất hợp với bảng số đo chèn theo thời gian: nó nhớ khoảng thời gian của từng nhóm trang, nên bỏ qua được gần hết bảng.
- Khoảng nửa mở (`>=` đầu, `<` cuối) không mất số đo nào ở nửa đêm và không đếm trùng giữa hai ngày.
- Cả hai bản đếm 288 dòng (24 giờ × 12 lần đo). Bản Không nên đọc `readings_big` bằng Seq Scan, bản Nên bằng Bitmap Heap Scan qua index BRIN.

# EN

## Key idea

To get "1 March" from a `timestamptz` column, write a half-open range on the column itself: `ts >= '2026-03-01' AND ts < '2026-03-02'`. Do not wrap the column in `::date`, `date_trunc` or any other function.

## Why

- The index (B-tree, or BRIN as here) is built on the values of `ts`. A condition on `ts::date` is on a different value, so the index cannot help.
- BRIN suits readings inserted in time order: it remembers the time range of each group of pages, so it can skip almost the whole table.
- A half-open range (`>=` at the start, `<` at the end) loses no reading at midnight and never counts one twice across two days.
- Both versions count 288 rows (24 hours × 12 readings). The Avoid version reads `readings_big` with a Seq Scan, the Prefer version with a Bitmap Heap Scan through the BRIN index.
