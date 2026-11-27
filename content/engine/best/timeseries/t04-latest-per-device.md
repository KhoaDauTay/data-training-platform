---
id: e-bp-t04
engine: best
track: timeseries
level: L1
module: t
title: "Giá trị mới nhất tính theo từng thiết bị"
title_en: "The latest value is per device"
kind: quiz
minutes: 3
objectives:
  - vi: "Lấy số đo mới nhất của mỗi thiết bị bằng `DISTINCT ON (device) … ORDER BY device, ts DESC`."
    en: "Get each device's latest reading with `DISTINCT ON (device) … ORDER BY device, ts DESC`."
avoid:
  vi: "So với thời điểm mới nhất của cả bảng: thiết bị gửi trễ một chút biến mất khỏi bảng theo dõi."
  en: "Comparing with the newest instant of the whole table: a device that reports slightly later vanishes from the dashboard."
requires: [e-ts-l1-05]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT
  - https://www.postgresql.org/docs/18/indexes-ordering.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE readings (device text, ts timestamptz, temp numeric);
    INSERT INTO readings VALUES ('rf-1', '2026-10-31 09:30+00', 4.0), ('rf-1', '2026-10-31 10:00+00', 4.1), ('rf-2', '2026-10-31 09:00+00', 5.0), ('rf-2', '2026-10-31 09:30+00', 5.2), ('rf-3', '2026-10-31 10:00+00', 3.8);
  bad: |
    SELECT device, temp FROM readings
    WHERE ts = (SELECT max(ts)
      FROM readings)
  good: |
    SELECT DISTINCT ON (device)
      device, temp
    FROM readings
    ORDER BY device, ts DESC
  expect: null
quiz:
  - q:
      vi: "Với `DISTINCT ON (device)`, phần nào quyết định dòng nào được giữ cho mỗi thiết bị?"
      en: "With `DISTINCT ON (device)`, what decides which row is kept for each device?"
    options:
      - { vi: "`ORDER BY device, ts DESC`: dòng đầu tiên của mỗi thiết bị theo thứ tự đó", en: "`ORDER BY device, ts DESC`: the first row of each device in that order" }
      - { vi: "Dòng được chèn vào bảng sau cùng", en: "The row inserted into the table last" }
      - { vi: "Dòng có `temp` lớn nhất", en: "The row with the highest `temp`" }
    answer: 0
    why:
      vi: "PostgreSQL không nhớ thứ tự chèn, và `DISTINCT ON` không tự nhìn vào `temp`. Nó giữ dòng đầu tiên của mỗi nhóm `device` theo đúng `ORDER BY` bạn viết; `ts DESC` đặt số đo mới nhất lên đầu, nên đó là dòng được giữ. Thiếu `ts DESC` thì dòng được giữ là bất kỳ dòng nào PostgreSQL gặp trước."
      en: "PostgreSQL does not remember insert order, and `DISTINCT ON` does not look at `temp` by itself. It keeps the first row of each `device` group in exactly the `ORDER BY` you wrote; `ts DESC` puts the newest reading first, so that is the row kept. Without `ts DESC` the kept row is whichever one PostgreSQL meets first."
---

## Ý chính

"Số đo mới nhất" là mới nhất của từng thiết bị: `SELECT DISTINCT ON (device) … ORDER BY device, ts DESC`. Một index trên `(device, ts DESC)` giúp câu này nhanh khi bảng lớn.

## Vì sao

- `WHERE ts = (SELECT max(ts) FROM readings)` chỉ giữ các thiết bị gửi đúng vào thời điểm mới nhất của cả bảng.
- Thiết bị gửi theo chu kỳ khác, hoặc trễ vài giây, sẽ biến mất khỏi bảng theo dõi, đúng lúc người vận hành cần thấy nó.
- `DISTINCT ON (device)` giữ một dòng cho mỗi thiết bị: dòng đầu tiên theo `ORDER BY device, ts DESC`, tức số đo mới nhất của chính nó.
- Bản Không nên trả 2 thiết bị (`rf-1`, `rf-3`). Bản Nên trả cả 3, gồm `rf-2` với số đo lúc 09:30.

# EN

## Key idea

"The latest reading" means the latest of each device: `SELECT DISTINCT ON (device) … ORDER BY device, ts DESC`. An index on `(device, ts DESC)` keeps it fast on a large table.

## Why

- `WHERE ts = (SELECT max(ts) FROM readings)` keeps only the devices that reported at exactly the table's newest instant.
- A device on another schedule, or a few seconds late, vanishes from the dashboard, just when the operator needs to see it.
- `DISTINCT ON (device)` keeps one row per device: the first in `ORDER BY device, ts DESC`, which is its own newest reading.
- The Avoid version returns 2 devices (`rf-1`, `rf-3`). The Prefer version returns all 3, including `rf-2` with its 09:30 reading.
