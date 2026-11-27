---
id: e-bp-t02
engine: best
track: timeseries
level: L1
module: t
title: "Khung giờ trống phải hiện là 0"
title_en: "Empty time buckets must show as 0"
kind: quiz
minutes: 4
objectives:
  - vi: "Sinh đủ các khung giờ bằng `generate_series` rồi `LEFT JOIN` dữ liệu vào, để khung không có số đo hiện ra với số đếm 0."
    en: "Generate every bucket with `generate_series`, then `LEFT JOIN` the data, so buckets without readings show with a count of 0."
avoid:
  vi: "`GROUP BY` khung giờ: giờ cảm biến im lặng biến mất khỏi kết quả, biểu đồ nối thẳng qua nó."
  en: "A plain `GROUP BY` on the bucket: the hour a sensor went silent disappears, and the chart draws straight across it."
requires: [e-ts-l1-04]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-srf.html
  - https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE readings (device text, ts timestamptz, temp numeric);
    INSERT INTO readings VALUES ('rf-1', '2026-10-31 08:05+00', 4.0), ('rf-1', '2026-10-31 08:35+00', 4.2), ('rf-1', '2026-10-31 09:10+00', 4.1), ('rf-1', '2026-10-31 11:20+00', 6.5);
  bad: |
    SELECT date_trunc('hour', ts) AS h,
      count(*) AS n
    FROM readings GROUP BY 1
  good: |
    SELECT g.h, count(r.ts) AS n
    FROM generate_series(
      timestamptz '2026-10-31 08:00+00',
      timestamptz '2026-10-31 11:00+00',
      interval '1 hour') AS g(h)
    LEFT JOIN readings r
      ON date_trunc('hour', r.ts) = g.h
    GROUP BY g.h
  expect: null
quiz:
  - q:
      vi: "Trong bản Nên, vì sao viết `count(r.ts)` chứ không phải `count(*)`?"
      en: "In the Prefer version, why `count(r.ts)` rather than `count(*)`?"
    options:
      - { vi: "Vì `count(*)` đếm cả dòng của khung trống (cột `r` là NULL) thành 1", en: "Because `count(*)` counts the empty bucket's row (with `r` columns NULL) as 1" }
      - { vi: "Vì `count(*)` chậm hơn `count(r.ts)`", en: "Because `count(*)` is slower than `count(r.ts)`" }
      - { vi: "Vì `count(*)` không dùng được cùng `LEFT JOIN`", en: "Because `count(*)` cannot be used with `LEFT JOIN`" }
    answer: 0
    why:
      vi: "`count(*)` chạy được với `LEFT JOIN`, và tốc độ không phải lý do ở đây. Khung 10:00 không có số đo vẫn có một dòng sau `LEFT JOIN`, với mọi cột của `r` là NULL; `count(*)` đếm dòng đó thành 1. `count(r.ts)` chỉ đếm giá trị khác NULL, nên khung 10:00 ra 0, đúng là không có số đo nào."
      en: "`count(*)` works with `LEFT JOIN`, and speed is not the point here. The 10:00 bucket has no reading but still has one row after the `LEFT JOIN`, with every `r` column NULL; `count(*)` counts that row as 1. `count(r.ts)` only counts non-NULL values, so the 10:00 bucket gives 0, which is true: there was no reading."
---

## Ý chính

Muốn mỗi khung thời gian đều có mặt, sinh danh sách khung trước (`generate_series`) rồi `LEFT JOIN` dữ liệu vào. Đếm bằng `count(r.ts)` (một cột của bảng dữ liệu) để khung trống ra 0.

## Vì sao

- `GROUP BY` chỉ tạo nhóm cho giá trị có trong dữ liệu. Giờ không có số đo nào thì không có nhóm, nên biến mất.
- Một khung biến mất trông giống "mọi thứ bình thường", trong khi thật ra cảm biến mất kết nối. Biểu đồ còn nối thẳng qua chỗ trống.
- `generate_series(start, stop, interval '1 hour')` trả mọi khung; `LEFT JOIN` giữ khung kể cả khi không khớp dòng nào.
- Bản Không nên trả 3 dòng (thiếu 10:00). Bản Nên trả 4 dòng, khung 10:00 có `n = 0`.

# EN

## Key idea

To have every time bucket present, generate the buckets first (`generate_series`) and `LEFT JOIN` the data to them. Count with `count(r.ts)` (a column of the data table) so empty buckets give 0.

## Why

- `GROUP BY` only creates groups for values that exist in the data. An hour with no reading has no group, so it disappears.
- A missing bucket looks like "all is well", while the sensor actually lost its connection. The chart also draws a straight line across the hole.
- `generate_series(start, stop, interval '1 hour')` returns every bucket; `LEFT JOIN` keeps a bucket even when no row matches.
- The Avoid version returns 3 rows (10:00 is missing). The Prefer version returns 4 rows, with `n = 0` for 10:00.
